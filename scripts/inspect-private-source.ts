import { basename, extname, isAbsolute, resolve } from 'node:path';
import { parseWhatsAppTranscript, buildCalendarDays } from './lib/whatsapp';
import { applySourceTags, discoverMoments, discoverNicknames, discoverVocativeCandidates } from './lib/indexing';
import { listEntries, openZip, readEntry } from './lib/zip';

async function main() {
  const index = process.argv.indexOf('--input');
  const input = index >= 0 ? process.argv[index + 1] : process.argv.slice(2).find((value) => !value.startsWith('-') && value.toLowerCase().endsWith('.zip'));
  if (!input || !isAbsolute(input)) throw new Error('Provide an absolute private --input ZIP path.');
  const zip = await openZip(resolve(input));
  try {
    const entries = await listEntries(zip);
    const transcriptEntry = entries.find((entry) => basename(entry.fileName).toLowerCase() === '_chat.txt');
    if (!transcriptEntry) throw new Error('No transcript found.');
    const parsed = parseWhatsAppTranscript((await readEntry(zip, transcriptEntry, 32 * 1024 * 1024)).toString('utf8'));
    applySourceTags(parsed.messages);
    const mediaEntries = entries.filter((entry) => ['.jpg','.jpeg','.png','.webp','.gif','.mp4','.mov','.opus','.m4a','.aac','.pdf'].includes(extname(entry.fileName).toLowerCase()));
    const mediaNames = new Set(mediaEntries.map((entry) => basename(entry.fileName).toLocaleLowerCase('en')));
    const linked = parsed.messages.filter((message) => message.attachment && mediaNames.has(basename(message.attachment.sourceName).toLocaleLowerCase('en'))).length;
    const missing = parsed.messages.filter((message) => message.attachment && !mediaNames.has(basename(message.attachment.sourceName).toLocaleLowerCase('en'))).length;
    const days = buildCalendarDays(parsed.messages);
    const nicknames = discoverNicknames(parsed.messages);
    const report = {
      messages: parsed.messages.length,
      participantCount: parsed.participants.length,
      calendarDays: days.length,
      daysWithMessages: days.filter((day) => day.messageIds.length).length,
      mediaEntries: mediaEntries.length,
      mediaReferencesLinked: linked,
      mediaReferencesMissing: missing,
      verifiedNicknameTerms: nicknames.length,
      customVocativeCandidates: discoverVocativeCandidates(parsed.messages, nicknames).length,
      momentCandidates: discoverMoments(parsed.messages).length,
      parserWarnings: parsed.warnings.length,
    };
    process.stdout.write(`Private source inspection completed without printing content or identities.\n${JSON.stringify(report, null, 2)}\n`);
  } finally { zip.close(); }
}

main().catch((error: unknown) => { process.stderr.write(`Private inspection stopped: ${error instanceof Error ? error.message : 'unknown error'}\n`); process.exitCode = 1; });
