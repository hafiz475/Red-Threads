import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCalendarDays, parseWhatsAppTranscript } from '../scripts/lib/whatsapp';
import { applySourceTags, discoverNicknames, discoverVocativeCandidates } from '../scripts/lib/indexing';

const synthetic = [
  '[01/02/26, 11:59:58\u202fPM] Alex: Hello,\u200f star',
  'This is a multiline message.',
  '[01/02/26, 11:59:58 PM] River: Good night my genius',
  '[03/02/2026, 12:01:02 am] Alex: photo-one.jpg (file attached)',
  '[03/02/2026, 12:02:03 AM] Messages are end-to-end encrypted.',
].join('\n');

test('parses multiline, invisible spacing, duplicate timestamps, senders, systems and attachments in stable order', () => {
  const parsed = parseWhatsAppTranscript(synthetic, 'Alex');
  assert.equal(parsed.messages.length, 4);
  assert.equal(parsed.messages[0]?.text, 'Hello,\u200f star\nThis is a multiline message.');
  assert.equal(parsed.messages[0]?.side, 'mine');
  assert.equal(parsed.messages[1]?.side, 'theirs');
  assert.equal(parsed.messages[0]?.localDate, '2026-02-01');
  assert.equal(parsed.messages[0]?.hour, 23);
  assert.notEqual(parsed.messages[0]?.id, parsed.messages[1]?.id);
  assert.equal(parsed.messages[2]?.attachment?.sourceName, 'photo-one.jpg');
  assert.equal(parsed.messages[3]?.side, 'system');
  assert.deepEqual(parsed.messages.map((message) => message.sourceIndex), [0, 1, 2, 3]);
});

test('builds exact inclusive Day N values including empty days without UTC drift', () => {
  const parsed = parseWhatsAppTranscript(synthetic, 'Alex');
  applySourceTags(parsed.messages);
  const days = buildCalendarDays(parsed.messages);
  assert.deepEqual(days.map((day) => [day.dayNumber, day.date, day.messageIds.length]), [[1, '2026-02-01', 2], [2, '2026-02-02', 0], [3, '2026-02-03', 2]]);
});

test('nickname evidence retains spelling and direction', () => {
  const parsed = parseWhatsAppTranscript(synthetic, 'Alex');
  const names = discoverNicknames(parsed.messages);
  const item = names.find((name) => name.normalized === 'my genius');
  assert.equal(item?.label, 'my genius');
  assert.equal(item?.direction, 'theirs-to-mine');
  assert.equal(item?.evidence[0]?.messageId, parsed.messages[1]?.id);
});

test('repeated custom spellings enter the private review queue without becoming verified names', () => {
  const parsed = parseWhatsAppTranscript('[01/02/26, 9:00 PM] Alex: Moonbeaan 💕\n[01/02/26, 9:01 PM] Alex: Moonbeaan!\n[01/02/26, 9:02 PM] River: yes', 'Alex');
  const verified = discoverNicknames(parsed.messages);
  assert.equal(verified.some((item) => item.normalized === 'moonbeaan'), false);
  const candidates = discoverVocativeCandidates(parsed.messages, verified);
  assert.equal(candidates.find((item) => item.normalized === 'moonbeaan')?.direction, 'mine-to-theirs');
  assert.equal(candidates.find((item) => item.normalized === 'moonbeaan')?.evidence.length, 2);
});
