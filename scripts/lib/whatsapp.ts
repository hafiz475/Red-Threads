import { createHash } from 'node:crypto';
import type { ArchiveDay, ChatMessage, DayScene, SpeakerSide } from '../../src/archive/types';

const MARKS = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const SPACE = /[\u00a0\u202f]/g;
const BRACKETED = /^\[?(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)?\]?\s*(?:-|–|—)?\s*(.*)$/i;
const ATTACHMENT = /(?:<attached:\s*)?([^<>\r\n]+?\.(?:jpe?g|png|webp|gif|mp4|mov|opus|m4a|aac|pdf))(?:>|\s*\(file attached\))?/i;

export interface ParsedTranscript {
  messages: ChatMessage[];
  participants: string[];
  mine: string;
  warnings: string[];
}

function stableId(index: number, date: string, time: string, sender: string | undefined): string {
  const digest = createHash('sha256').update(`${index}\0${date}\0${time}\0${sender ?? ''}`).digest('base64url').slice(0, 13);
  return `m_${index.toString(36)}_${digest}`;
}

function parseHeader(line: string) {
  let structural = '';
  const sourceIndexForStructural: number[] = [];
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (MARKS.test(character)) { MARKS.lastIndex = 0; continue; }
    MARKS.lastIndex = 0;
    structural += SPACE.test(character) ? ' ' : character;
    SPACE.lastIndex = 0;
    sourceIndexForStructural.push(index);
  }
  const match = structural.match(BRACKETED);
  if (!match) return undefined;
  const [, dd, mm, yyRaw, hourRaw, minuteRaw, secondRaw = '0', meridiem, tailRaw] = match;
  if (!dd || !mm || !yyRaw || !hourRaw || !minuteRaw || tailRaw === undefined) return undefined;
  let hour = Number(hourRaw);
  if (meridiem) {
    hour %= 12;
    if (meridiem.toLowerCase() === 'pm') hour += 12;
  }
  const year = Number(yyRaw) + (yyRaw.length === 2 ? 2000 : 0);
  const date = `${year.toString().padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  const time = `${hour.toString().padStart(2, '0')}:${minuteRaw.padStart(2, '0')}:${secondRaw.padStart(2, '0')}`;
  const senderSplit = tailRaw.match(/^([^:]{1,160}):\s?([\s\S]*)$/);
  const tailStart = structural.length - tailRaw.length;
  const bodyStart = senderSplit ? tailStart + tailRaw.length - (senderSplit[2]?.length ?? 0) : tailStart;
  const exactText = line.slice(sourceIndexForStructural[bodyStart] ?? line.length);
  return {
    date,
    time,
    hour,
    minute: Number(minuteRaw),
    sender: senderSplit?.[1]?.trim(),
    text: exactText,
  };
}

export function parseWhatsAppTranscript(input: string, mineHint?: string): ParsedTranscript {
  const lines = input.replace(/^\ufeff/, '').split(/\r?\n/);
  const raw: Array<ReturnType<typeof parseHeader> & { sourceIndex: number; text: string }> = [];
  const warnings: string[] = [];
  let current: (typeof raw)[number] | undefined;
  for (const line of lines) {
    const header = parseHeader(line);
    if (header) {
      current = { ...header, sourceIndex: raw.length };
      raw.push(current);
    } else if (current) {
      current.text += `\n${line}`;
    } else if (line.trim()) {
      warnings.push('Ignored content before the first recognizable timestamp.');
    }
  }
  const participants = [...new Set(raw.flatMap((item) => (item?.sender ? [item.sender] : [])))];
  const mine = mineHint && participants.includes(mineHint) ? mineHint : participants[0] ?? '';
  const messages: ChatMessage[] = raw.flatMap((item) => {
    if (!item) return [];
    const side: SpeakerSide = item.sender ? (item.sender === mine ? 'mine' : 'theirs') : 'system';
    const attachmentMatch = item.text.match(ATTACHMENT);
    return [{
      id: stableId(item.sourceIndex, item.date, item.time, item.sender),
      sourceIndex: item.sourceIndex,
      localDate: item.date,
      localTime: item.time,
      hour: item.hour,
      minute: item.minute,
      sender: item.sender,
      side,
      text: item.text,
      attachment: attachmentMatch?.[1] ? { sourceName: attachmentMatch[1].trim() } : undefined,
      tags: [],
    }];
  });
  if (!messages.length) warnings.push('No recognizable messages were found.');
  return { messages, participants, mine, warnings: [...new Set(warnings)] };
}

function plusDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const utc = Date.UTC(year!, month! - 1, day! + days);
  return new Date(utc).toISOString().slice(0, 10);
}

export function daySceneFor(messages: ChatMessage[], seed: number): DayScene {
  const tags = new Set(messages.flatMap((message) => message.tags));
  const hour = messages[0]?.hour ?? 20;
  let kind: DayScene['kind'];
  if (tags.has('rain')) kind = 'reading-nook';
  else if (tags.has('chess')) kind = 'chess-table';
  else if (tags.has('flowers')) kind = 'flower-window';
  else if (tags.has('prayer')) kind = 'lantern-corridor';
  else if (hour < 11) kind = 'morning-room';
  else if (hour < 16) kind = 'storybook';
  else if (hour < 19) kind = 'golden-balcony';
  else kind = seed % 2 ? 'moonlit-terrace' : 'constellation-night';
  return { kind, accents: [...tags].slice(0, 4), seed };
}

export function buildCalendarDays(messages: ChatMessage[]): ArchiveDay[] {
  if (!messages.length) return [];
  const first = messages[0]!.localDate;
  const last = messages[messages.length - 1]!.localDate;
  const days: ArchiveDay[] = [];
  for (let cursor = first, index = 0; cursor <= last; cursor = plusDays(first, ++index)) {
    const onDay = messages.filter((message) => message.localDate === cursor);
    days.push({ dayNumber: index + 1, date: cursor, messageIds: onDay.map((message) => message.id), scene: daySceneFor(onDay, index + 1) });
    if (cursor === last) break;
  }
  return days;
}
