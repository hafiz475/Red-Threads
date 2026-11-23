import { readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import type { PrivateArchive, PublicEnvelope } from '../src/archive/types';
import { deriveKey, fromBase64Url, openBytes } from './lib/crypto';
import { promptHidden } from './lib/prompt';

async function main() {
  const index = process.argv.indexOf('--recovery');
  const recovery = index >= 0 ? process.argv[index + 1] : process.argv.slice(2).find((value) => !value.startsWith('-'));
  if (!recovery || !isAbsolute(recovery)) throw new Error('Provide an absolute --recovery path outside the repository.');
  const root = resolve(process.cwd());
  const envelope = JSON.parse(await readFile(join(root, 'public', 'sealed', 'envelope.json'), 'utf8')) as PublicEnvelope;
  const recoveryText = await readFile(resolve(recovery), 'utf8');
  const invitation = fromBase64Url(recoveryText.trim().split(/\s+/).at(-1) ?? '');
  const pin = await promptHidden('Enter the private PIN to audit ciphertext (hidden): ');
  const key = deriveKey(pin, invitation, fromBase64Url(envelope.kdf.pinSalt), fromBase64Url(envelope.kdf.hkdfSalt), envelope.kdf.iterations);
  const manifestPath = join(root, 'public', envelope.manifest.path.replaceAll('/', '\\'));
  const archive = JSON.parse(openBytes(await readFile(manifestPath), key, envelope.manifest.aad).toString('utf8')) as PrivateArchive;
  let chunks = 0;
  let plainBytes = 0;
  for (const media of archive.media) for (const chunk of media.chunks) {
    const path = join(root, 'public', chunk.path.replaceAll('/', '\\'));
    const plain = openBytes(await readFile(path), key, chunk.aad);
    if (plain.length !== chunk.plainBytes) throw new Error('Encrypted media length invariant failed.');
    chunks += 1; plainBytes += plain.length;
  }
  process.stdout.write(`Encrypted archive verified without printing content: ${archive.messages.length} messages, ${archive.days.length} calendar days, ${archive.media.length} media files, ${chunks} media chunks, ${plainBytes} media bytes.\n`);
}

main().catch((error: unknown) => { process.stderr.write(`Encrypted audit failed closed: ${error instanceof Error ? error.message : 'unknown error'}\n`); process.exitCode = 1; });
