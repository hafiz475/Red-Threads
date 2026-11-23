import type { PrivateArchive, PublicEnvelope } from '../archive/types';
import { base64UrlToBytes, textBytes } from './encoding';

const IV_BYTES = 12;

export async function deriveArchiveKey(
  pin: string,
  invitationKey: Uint8Array,
  envelope: PublicEnvelope,
): Promise<CryptoKey> {
  if (!/^\d{8}$/.test(pin) || invitationKey.byteLength !== 32) throw new Error('Invalid credentials');
  const pinBase = await crypto.subtle.importKey('raw', textBytes(pin), 'PBKDF2', false, ['deriveBits']);
  const pinMaterial = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: base64UrlToBytes(envelope.kdf.pinSalt),
        iterations: envelope.kdf.iterations,
      },
      pinBase,
      256,
    ),
  );
  const combined = new Uint8Array(64);
  combined.set(invitationKey, 0);
  combined.set(pinMaterial, 32);
  const hkdfBase = await crypto.subtle.importKey('raw', combined, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: base64UrlToBytes(envelope.kdf.hkdfSalt),
      info: textBytes(envelope.kdf.info),
    },
    hkdfBase,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

export async function decryptSealedObject(
  bytes: ArrayBuffer,
  key: CryptoKey,
  aad: string,
): Promise<ArrayBuffer> {
  const data = new Uint8Array(bytes);
  if (data.byteLength < 1 + IV_BYTES + 16 || data[0] !== 1) throw new Error('Invalid sealed object');
  const iv = data.slice(1, 1 + IV_BYTES);
  const ciphertext = data.slice(1 + IV_BYTES);
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: textBytes(aad), tagLength: 128 },
    key,
    ciphertext,
  );
}

export async function unlockArchive(
  pin: string,
  invitationKey: Uint8Array,
  envelope: PublicEnvelope,
  baseUrl: string,
): Promise<{ archive: PrivateArchive; key: CryptoKey }> {
  const key = await deriveArchiveKey(pin, invitationKey, envelope);
  const response = await fetch(`${baseUrl}${envelope.manifest.path}`);
  if (!response.ok) throw new Error('Archive unavailable');
  const plain = await decryptSealedObject(await response.arrayBuffer(), key, envelope.manifest.aad);
  const archive = JSON.parse(new TextDecoder().decode(plain)) as PrivateArchive;
  if (archive.version !== 1 || archive.timezone !== 'Asia/Kolkata') throw new Error('Unsupported archive');
  return { archive, key };
}

