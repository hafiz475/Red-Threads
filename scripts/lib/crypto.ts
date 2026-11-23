import { createCipheriv, createDecipheriv, hkdfSync, pbkdf2Sync, randomBytes } from 'node:crypto';

export const KDF_ITERATIONS = 650_000;
export const KDF_INFO = 'red-threads/archive/v1' as const;
export const MANIFEST_AAD = 'red-threads:v1:manifest' as const;

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

export function deriveKey(
  pin: string,
  invitationKey: Uint8Array,
  pinSalt: Uint8Array,
  hkdfSalt: Uint8Array,
  iterations = KDF_ITERATIONS,
): Buffer {
  if (!/^\d{8}$/.test(pin)) throw new Error('PIN must contain exactly eight digits.');
  if (invitationKey.byteLength !== 32) throw new Error('Invitation key must be 32 bytes.');
  const pinMaterial = pbkdf2Sync(pin, pinSalt, iterations, 32, 'sha256');
  return Buffer.from(hkdfSync('sha256', Buffer.concat([Buffer.from(invitationKey), pinMaterial]), hkdfSalt, KDF_INFO, 32));
}

export function sealBytes(plain: Uint8Array, key: Uint8Array, aad: string, iv = randomBytes(12)): Buffer {
  if (iv.byteLength !== 12) throw new Error('AES-GCM IV must be 96 bits.');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([1]), iv, ciphertext, tag]);
}

export function openBytes(sealed: Uint8Array, key: Uint8Array, aad: string): Buffer {
  const bytes = Buffer.from(sealed);
  if (bytes.length < 29 || bytes[0] !== 1) throw new Error('Invalid sealed object.');
  const iv = bytes.subarray(1, 13);
  const ciphertext = bytes.subarray(13, -16);
  const tag = bytes.subarray(-16);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

