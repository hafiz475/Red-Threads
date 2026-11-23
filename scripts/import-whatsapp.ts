import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { Entry, ZipFile } from 'yauzl';
import type { MediaEntry, PrivateArchive, PublicEnvelope } from '../src/archive/types';
import { buildCalendarDays, parseWhatsAppTranscript } from './lib/whatsapp';
import { applySourceTags, discoverMoments, discoverNicknames, discoverVocativeCandidates, type ReviewRules } from './lib/indexing';
import { deriveKey, KDF_INFO, KDF_ITERATIONS, MANIFEST_AAD, sealBytes, toBase64Url } from './lib/crypto';
import { entryStream, listEntries, openZip, readEntry } from './lib/zip';
import { promptHidden, promptVisible } from './lib/prompt';

const MEDIA_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.opus', '.m4a', '.aac', '.pdf']);
const CHUNK_BYTES = 8 * 1024 * 1024;
const TRANSCRIPT_LIMIT = 32 * 1024 * 1024;
const projectRoot = resolve(process.cwd());

interface Args {
  input: string;
  includeMedia: 'all' | 'none';
  mine?: string;
  reuseInvitation?: string;
  nextChapter?: string;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const input = get('--input') ?? argv.find((value) => !value.startsWith('-') && value.toLowerCase().endsWith('.zip'));
  if (!input) throw new Error('Usage: npm run import:whatsapp -- --input "C:\\Private\\export.zip" --include-media=all');
  const mediaArg = argv.find((value) => value.startsWith('--include-media='))?.split('=')[1] ?? get('--include-media') ?? 'all';
  if (mediaArg !== 'all' && mediaArg !== 'none') throw new Error('--include-media must be all or none.');
  return { input, includeMedia: mediaArg, mine: get('--mine'), reuseInvitation: get('--reuse-invitation'), nextChapter: get('--next-chapter') };
}

function assertPrivateInput(input: string): string {
  if (!isAbsolute(input)) throw new Error('The input ZIP path must be absolute.');
  const resolved = resolve(input);
  const within = relative(projectRoot, resolved);
  if (!within.startsWith('..') && !isAbsolute(within)) throw new Error('Move the private ZIP outside the project before importing.');
  if (extname(resolved).toLowerCase() !== '.zip') throw new Error('Input must be a WhatsApp ZIP export.');
  return resolved;
}

function mimeFor(extension: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.opus': 'audio/ogg; codecs=opus', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.pdf': 'application/pdf',
  };
  return map[extension] ?? 'application/octet-stream';
}

async function loadReview(): Promise<ReviewRules> {
  try {
    return JSON.parse(await readFile(join(projectRoot, '.private', 'nickname-review.json'), 'utf8')) as ReviewRules;
  } catch {
    return {};
  }
}

async function chooseMine(participants: string[], hint?: string): Promise<string> {
  if (hint) {
    if (!participants.includes(hint)) throw new Error('--mine does not match an exported participant.');
    return hint;
  }
  if (participants.length <= 1) return participants[0] ?? '';
  process.stdout.write('Private local participant selection (not saved to logs):\n');
  participants.forEach((participant, index) => process.stdout.write(`  ${index + 1}. ${participant}\n`));
  const answer = await promptVisible('Which number is you? ');
  const selected = participants[Number(answer) - 1];
  if (!selected) throw new Error('Invalid participant selection.');
  return selected;
}

async function invitationKey(args: Args, sourcePath: string): Promise<{ key: Buffer; recoveryPath: string; isNew: boolean }> {
  if (args.reuseInvitation) {
    const recoveryPath = resolve(args.reuseInvitation);
    const value = (await readFile(recoveryPath, 'utf8')).trim().split(/\s+/).at(-1) ?? '';
    const key = Buffer.from(value, 'base64url');
    if (key.length !== 32) throw new Error('The invitation recovery file is invalid.');
    return { key, recoveryPath, isNew: false };
  }
  const key = randomBytes(32);
  const recoveryPath = join(dirname(sourcePath), 'red-threads-invitation-key.txt');
  return { key, recoveryPath, isNew: true };
}

async function encryptMediaEntry(
  zip: ZipFile,
  entry: Entry,
  stage: string,
  key: Buffer,
  ivs: Set<string>,
): Promise<MediaEntry> {
  const extension = extname(entry.fileName).toLowerCase();
  const mediaId = `media_${randomBytes(12).toString('base64url')}`;
  const media: MediaEntry = {
    id: mediaId,
    sourceName: basename(entry.fileName),
    mime: mimeFor(extension),
    extension,
    size: entry.uncompressedSize,
    chunks: [],
  };
  const stream = await entryStream(zip, entry);
  let pending = Buffer.alloc(0);
  let index = 0;
  const flush = async (plain: Buffer) => {
    const objectId = randomBytes(16).toString('base64url');
    const aad = `red-threads:v1:media:${mediaId}:${index}`;
    const sealed = sealBytes(plain, key, aad);
    const ivHex = sealed.subarray(1, 13).toString('hex');
    if (ivs.has(ivHex)) throw new Error('Duplicate IV detected.');
    ivs.add(ivHex);
    const fileName = `${objectId}.bin`;
    await writeFile(join(stage, fileName), sealed);
    media.chunks.push({ objectId, path: `sealed/${fileName}`, plainBytes: plain.length, cipherBytes: sealed.length, index, aad });
    index += 1;
  };
  for await (const chunk of stream) {
    pending = Buffer.concat([pending, Buffer.from(chunk)]);
    while (pending.length >= CHUNK_BYTES) {
      await flush(pending.subarray(0, CHUNK_BYTES));
      pending = pending.subarray(CHUNK_BYTES);
    }
  }
  if (pending.length || index === 0) await flush(pending);
  return media;
}

async function replaceSealed(stage: string, envelope: PublicEnvelope): Promise<void> {
  const target = join(projectRoot, 'public', 'sealed');
  await mkdir(target, { recursive: true });
  await writeFile(join(stage, 'envelope.json'), `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  for (const name of await readdir(target)) {
    if (name === '.gitkeep') continue;
    await rm(join(target, name), { force: true });
  }
  for (const name of await readdir(stage)) await rename(join(stage, name), join(target, name));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = assertPrivateInput(args.input);
  const zip = await openZip(sourcePath);
  const stageRoot = join(projectRoot, '.private');
  const stage = join(stageRoot, `staging-${randomBytes(8).toString('hex')}`);
  await mkdir(stage, { recursive: true });
  try {
    const entries = await listEntries(zip);
    const transcriptEntry = entries.find((entry) => basename(entry.fileName).toLowerCase() === '_chat.txt');
    if (!transcriptEntry) throw new Error('No _chat.txt transcript was found in the ZIP.');
    const transcript = (await readEntry(zip, transcriptEntry, TRANSCRIPT_LIMIT)).toString('utf8');
    const initial = parseWhatsAppTranscript(transcript);
    const mine = await chooseMine(initial.participants, args.mine);
    const parsed = parseWhatsAppTranscript(transcript, mine);
    applySourceTags(parsed.messages);

    const pin = await promptHidden('Enter the private 8-digit PIN (hidden): ');
    const confirmation = await promptHidden('Enter it again (hidden): ');
    if (pin !== confirmation) throw new Error('PIN entries did not match.');
    if (!/^\d{8}$/.test(pin)) throw new Error('PIN must contain exactly eight digits.');

    const invitation = await invitationKey(args, sourcePath);
    const pinSalt = randomBytes(16);
    const hkdfSalt = randomBytes(32);
    const key = deriveKey(pin, invitation.key, pinSalt, hkdfSalt);
    const ivs = new Set<string>();

    const mediaEntries = entries.filter((entry) => MEDIA_EXTENSIONS.has(extname(entry.fileName).toLowerCase()));
    const media: MediaEntry[] = [];
    if (args.includeMedia === 'all') {
      let completed = 0;
      for (const entry of mediaEntries) {
        media.push(await encryptMediaEntry(zip, entry, stage, key, ivs));
        completed += 1;
        process.stdout.write(`\rEncrypting private media: ${completed}/${mediaEntries.length}`);
      }
      if (mediaEntries.length) process.stdout.write('\n');
    }

    const bySourceName = new Map(media.map((item) => [item.sourceName.toLocaleLowerCase('en'), item]));
    for (const message of parsed.messages) {
      if (!message.attachment) continue;
      const linked = bySourceName.get(basename(message.attachment.sourceName).toLocaleLowerCase('en'));
      if (linked) {
        message.attachment.mediaId = linked.id;
        linked.messageId ??= message.id;
      } else {
        message.attachment.missing = true;
      }
    }
    const review = await loadReview();
    const nicknames = discoverNicknames(parsed.messages, review);
    const nicknameCandidates = discoverVocativeCandidates(parsed.messages, nicknames);
    const archive: PrivateArchive = {
      version: 1,
      timezone: 'Asia/Kolkata',
      importedAt: new Date().toISOString(),
      participants: parsed.participants,
      mine,
      messages: parsed.messages,
      days: buildCalendarDays(parsed.messages),
      nicknames,
      nicknameCandidates,
      moments: discoverMoments(parsed.messages),
      media,
      firstMessageIds: parsed.messages.slice(0, 4).map((message) => message.id),
      nextChapterDate: args.nextChapter,
      warnings: parsed.warnings,
    };
    const manifestObject = randomBytes(16).toString('base64url');
    const manifestName = `${manifestObject}.bin`;
    const manifestSealed = sealBytes(Buffer.from(JSON.stringify(archive), 'utf8'), key, MANIFEST_AAD);
    const manifestIv = manifestSealed.subarray(1, 13).toString('hex');
    if (ivs.has(manifestIv)) throw new Error('Duplicate IV detected.');
    ivs.add(manifestIv);
    await writeFile(join(stage, manifestName), manifestSealed);
    const envelope: PublicEnvelope = {
      format: 'red-threads-sealed',
      version: 1,
      kdf: {
        name: 'PBKDF2-HMAC-SHA-256',
        iterations: KDF_ITERATIONS,
        pinSalt: toBase64Url(pinSalt),
        hkdfSalt: toBase64Url(hkdfSalt),
        info: KDF_INFO,
      },
      manifest: { path: `sealed/${manifestName}`, aad: MANIFEST_AAD },
    };
    await replaceSealed(stage, envelope);
    await mkdir(stageRoot, { recursive: true });
    const audit = {
      format: 'private-import-audit-v1',
      messages: archive.messages.length,
      calendarDays: archive.days.length,
      daysWithMessages: archive.days.filter((day) => day.messageIds.length).length,
      mediaInZip: mediaEntries.length,
      mediaEncrypted: archive.media.length,
      mediaMissingFromMessages: archive.messages.filter((message) => message.attachment?.missing).length,
      encryptedObjects: ivs.size,
      verifiedNicknameTerms: archive.nicknames.length,
      customVocativeCandidates: archive.nicknameCandidates.length,
      momentCandidates: archive.moments.length,
      warnings: archive.warnings.length,
    };
    await writeFile(join(stageRoot, 'archive-audit.private.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
    await writeFile(join(stageRoot, 'nickname-candidates.private.json'), `${JSON.stringify(nicknameCandidates.map((item) => ({ term: item.label, direction: item.direction, occurrences: item.evidence.length, messageIds: item.evidence.map((evidence) => evidence.messageId) })), null, 2)}\n`, 'utf8');
    if (invitation.isNew) {
      await writeFile(invitation.recoveryPath, `Red Threads invitation key — keep private and outside Git\n${toBase64Url(invitation.key)}\n`, { encoding: 'utf8', mode: 0o600 });
    }
    const url = `https://hafiz475.github.io/Red-Threads/#invite=${toBase64Url(invitation.key)}`;
    process.stdout.write('\nImport complete. Only ciphertext was written into public/sealed.\n');
    process.stdout.write(`Messages: ${audit.messages}; calendar days: ${audit.calendarDays}; encrypted media: ${audit.mediaEncrypted}/${audit.mediaInZip}.\n`);
    process.stdout.write(`Private invitation (share privately, never commit):\n${url}\n`);
    process.stdout.write(`Recovery key saved outside the repository: ${invitation.recoveryPath}\n`);
  } finally {
    zip.close();
    await rm(stage, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Import failed.';
  process.stderr.write(`Import stopped safely: ${message}\n`);
  process.exitCode = 1;
});
