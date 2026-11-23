import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, webcrypto } from 'node:crypto';
import type { PublicEnvelope } from '../src/archive/types';
import { deriveKey, KDF_INFO, MANIFEST_AAD, openBytes, sealBytes, toBase64Url } from '../scripts/lib/crypto';
import { decryptSealedObject, deriveArchiveKey } from '../src/crypto/browser';
import { unlockArchive } from '../src/crypto/browser';

Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
const syntheticPin = '86420913';

test('two-secret AES-GCM round trip and fail-closed invariants', () => {
  const invitation = randomBytes(32); const pinSalt = randomBytes(16); const hkdfSalt = randomBytes(32);
  const key = deriveKey(syntheticPin, invitation, pinSalt, hkdfSalt, 2_000);
  const sealed = sealBytes(Buffer.from('synthetic archive content'), key, MANIFEST_AAD);
  assert.equal(openBytes(sealed, key, MANIFEST_AAD).toString(), 'synthetic archive content');
  const wrongPinKey = deriveKey('13579024', invitation, pinSalt, hkdfSalt, 2_000);
  assert.throws(() => openBytes(sealed, wrongPinKey, MANIFEST_AAD));
  const wrongInviteKey = deriveKey(syntheticPin, randomBytes(32), pinSalt, hkdfSalt, 2_000);
  assert.throws(() => openBytes(sealed, wrongInviteKey, MANIFEST_AAD));
  assert.throws(() => openBytes(sealed, key, 'wrong-aad'));
  const tampered = Buffer.from(sealed); tampered[20] = tampered[20]! ^ 1;
  assert.throws(() => openBytes(tampered, key, MANIFEST_AAD));
});

test('every seal call receives a unique random 96-bit IV', () => {
  const key = randomBytes(32);
  const ivs = new Set(Array.from({ length: 200 }, () => sealBytes(randomBytes(8), key, 'synthetic').subarray(1, 13).toString('hex')));
  assert.equal(ivs.size, 200);
});

test('Node ciphertext decrypts with browser Web Crypto compatibility', async () => {
  const invitation = randomBytes(32); const pinSalt = randomBytes(16); const hkdfSalt = randomBytes(32);
  const iterations = 2_000;
  const envelope: PublicEnvelope = { format: 'red-threads-sealed', version: 1, kdf: { name: 'PBKDF2-HMAC-SHA-256', iterations, pinSalt: toBase64Url(pinSalt), hkdfSalt: toBase64Url(hkdfSalt), info: KDF_INFO }, manifest: { path: 'sealed/synthetic.bin', aad: MANIFEST_AAD } };
  const nodeKey = deriveKey(syntheticPin, invitation, pinSalt, hkdfSalt, iterations);
  const sealed = sealBytes(Buffer.from('browser-compatible'), nodeKey, MANIFEST_AAD);
  const browserKey = await deriveArchiveKey(syntheticPin, invitation, envelope);
  const plain = await decryptSealedObject(sealed.buffer.slice(sealed.byteOffset, sealed.byteOffset + sealed.byteLength), browserKey, MANIFEST_AAD);
  assert.equal(new TextDecoder().decode(plain), 'browser-compatible');
});

test('production KDF configuration is at least six hundred thousand iterations', async () => {
  const { KDF_ITERATIONS } = await import('../scripts/lib/crypto');
  assert.ok(KDF_ITERATIONS >= 600_000);
});

test('browser unlock reveals a synthetic manifest only after authenticated decryption', async () => {
  const invitation = randomBytes(32); const pinSalt = randomBytes(16); const hkdfSalt = randomBytes(32); const iterations = 2_000;
  const envelope: PublicEnvelope = { format: 'red-threads-sealed', version: 1, kdf: { name: 'PBKDF2-HMAC-SHA-256', iterations, pinSalt: toBase64Url(pinSalt), hkdfSalt: toBase64Url(hkdfSalt), info: KDF_INFO }, manifest: { path: 'sealed/synthetic.bin', aad: MANIFEST_AAD } };
  const archive = { version: 1, timezone: 'Asia/Kolkata', importedAt: '2026-01-01T00:00:00.000Z', participants: ['Alex', 'River'], mine: 'Alex', messages: [], days: [], nicknames: [], nicknameCandidates: [], moments: [], media: [], firstMessageIds: [], warnings: [] } as const;
  const key = deriveKey(syntheticPin, invitation, pinSalt, hkdfSalt, iterations);
  const sealed = sealBytes(Buffer.from(JSON.stringify(archive)), key, MANIFEST_AAD);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(sealed, { status: 200 });
  try {
    const unlocked = await unlockArchive(syntheticPin, invitation, envelope, '/Red-Threads/');
    assert.equal(unlocked.archive.timezone, 'Asia/Kolkata');
    await assert.rejects(() => unlockArchive('13579024', invitation, envelope, '/Red-Threads/'));
    const corrupt = Buffer.from(sealed); corrupt[corrupt.length - 1] = corrupt.at(-1)! ^ 1;
    globalThis.fetch = async () => new Response(corrupt, { status: 200 });
    await assert.rejects(() => unlockArchive(syntheticPin, invitation, envelope, '/Red-Threads/'));
  } finally { globalThis.fetch = originalFetch; }
});
