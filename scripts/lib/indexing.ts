import { createHash } from 'node:crypto';
import type { ChatMessage, MomentEntry, NicknameEntry } from '../../src/archive/types';

const TERM_PATTERNS = [
  /\b(?:my\s+)?(?:love|dear|darling|sweetheart|baby|babe|cutie|beautiful|handsome|queen|king|princess|prince|genius|sunshine|angel)\b/giu,
  /\b(?:meri\s+)?(?:jaan|janu+|jaanu+|shona|sona|baccha|bacha|pagal|habibi|habibti)\b/giu,
  /\b(?:chellam|uyire|kanna|kanmani|thangam)\b/giu,
];

const TAG_PATTERNS: Array<[string, RegExp]> = [
  ['rain', /\brain(?:y|ing|s)?\b|baarish|barish/iu],
  ['chess', /\bchess\b|\bqueen\b/iu],
  ['ideas', /\bgenius\b|\bidea\b/iu],
  ['flowers', /\bflower|flowers|rose|petal|lavender\b/iu],
  ['prayer', /\bpray|prayer|dua|allah|inshaallah|alhamdulillah\b/iu],
  ['promise', /\bpromise|always|forever\b/iu],
  ['sweet', /\blove|miss|care|hug|kiss|jaan|dear|darling\b/iu],
  ['funny', /\b(?:haha|hehe|lol)\b|😂|🤣/iu],
  ['proposal', /\bpropos(?:e|ed|al|ing)\b|\bmarry|marriage|wedding\b/iu],
  ['red-thread', /red\s+threads?/iu],
];

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('base64url').slice(0, 12);
}

function compactExcerpt(text: string, max = 240): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function normalizeTerm(value: string): string {
  return value.toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
}

export function applySourceTags(messages: ChatMessage[]): void {
  for (const message of messages) {
    const tags = TAG_PATTERNS.filter(([, pattern]) => pattern.test(message.text)).map(([tag]) => tag);
    if (message.hour >= 0 && message.hour < 5) tags.push('late-night');
    if (message.attachment) {
      const extension = message.attachment.sourceName.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png'].includes(extension ?? '')) tags.push('photo');
      if (extension === 'webp') tags.push('sticker');
      if (['mp4', 'mov'].includes(extension ?? '')) tags.push('video');
      if (['opus', 'm4a', 'aac'].includes(extension ?? '')) tags.push('voice');
    }
    message.tags = [...new Set(tags)];
  }
}

export interface ReviewRules {
  allow?: Array<{ term: string; direction?: NicknameEntry['direction']; messageIds?: string[]; featured?: boolean }>;
  reject?: string[];
  merge?: Record<string, string>;
}

export function discoverNicknames(messages: ChatMessage[], review: ReviewRules = {}): NicknameEntry[] {
  const rejected = new Set((review.reject ?? []).map(normalizeTerm));
  const found = new Map<string, NicknameEntry>();
  for (const message of messages) {
    if (message.side === 'system' || !message.sender) continue;
    const direction = message.side === 'mine' ? 'mine-to-theirs' : 'theirs-to-mine';
    const matches = TERM_PATTERNS.flatMap((pattern) => [...message.text.matchAll(pattern)].map((match) => match[0]));
    for (const raw of matches) {
      const normalizedRaw = normalizeTerm(raw);
      if (rejected.has(normalizedRaw)) continue;
      const normalized = normalizeTerm(review.merge?.[normalizedRaw] ?? normalizedRaw);
      const key = `${direction}:${normalized}`;
      const item = found.get(key) ?? {
        id: `n_${shortHash(key)}`,
        label: raw,
        normalized,
        direction,
        variants: [],
        evidence: [],
        featured: false,
      };
      if (!item.variants.includes(raw)) item.variants.push(raw);
      if (!item.evidence.some((evidence) => evidence.messageId === message.id)) {
        item.evidence.push({ messageId: message.id, date: message.localDate, sender: message.sender, excerpt: compactExcerpt(message.text) });
      }
      found.set(key, item);
    }
  }
  for (const rule of review.allow ?? []) {
    const normalized = normalizeTerm(rule.term);
    const matching = messages.filter((message) =>
      (!rule.messageIds?.length || rule.messageIds.includes(message.id)) && normalizeTerm(message.text).includes(normalized),
    );
    for (const direction of rule.direction ? [rule.direction] : ['mine-to-theirs', 'theirs-to-mine'] as const) {
      const evidence = matching.filter((message) => direction === 'mine-to-theirs' ? message.side === 'mine' : message.side === 'theirs');
      if (!evidence.length) continue;
      const key = `${direction}:${normalized}`;
      found.set(key, {
        id: `n_${shortHash(key)}`,
        label: rule.term,
        normalized,
        direction,
        variants: [rule.term],
        evidence: evidence.map((message) => ({ messageId: message.id, date: message.localDate, sender: message.sender!, excerpt: compactExcerpt(message.text) })),
        featured: rule.featured ?? true,
      });
    }
  }
  return [...found.values()]
    .map((item) => ({ ...item, featured: item.featured || item.evidence.length >= 2 }))
    .sort((a, b) => b.evidence.length - a.evidence.length || a.label.localeCompare(b.label));
}

const VOCATIVE_STOPWORDS = new Set(['yes','yeah','yep','no','nope','okay','ok','sure','why','what','when','where','who','hello','hi','hey','thanks','thank you','good morning','good night','bye','hmm','haha','hehe','please','sorry']);

export function discoverVocativeCandidates(messages: ChatMessage[], verified: NicknameEntry[]): NicknameEntry[] {
  const verifiedKeys = new Set(verified.map((item) => `${item.direction}:${item.normalized}`));
  const candidates = new Map<string, NicknameEntry>();
  const patterns = [
    /^([\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}][\p{L}\p{M}'’.-]*){0,2})\s*[,!💕❤♥🥰😘]+/u,
    /(?:^|[,!?]\s+)([\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}][\p{L}\p{M}'’.-]*){0,2})\s*[!💕❤♥🥰😘]+$/u,
  ];
  for (const message of messages) {
    if (message.side === 'system' || !message.sender) continue;
    const line = message.text.split(/\r?\n/, 1)[0]?.trim() ?? '';
    if (!line || line.length > 90) continue;
    const direction = message.side === 'mine' ? 'mine-to-theirs' : 'theirs-to-mine';
    const terms = patterns.flatMap((pattern) => line.match(pattern)?.[1] ?? []).filter(Boolean);
    for (const term of terms) {
      const normalized = normalizeTerm(term);
      if (VOCATIVE_STOPWORDS.has(normalized) || normalized.length < 2 || verifiedKeys.has(`${direction}:${normalized}`)) continue;
      const key = `${direction}:${normalized}`;
      const item = candidates.get(key) ?? { id: `candidate_${shortHash(key)}`, label: term, normalized, direction, variants: [], evidence: [], featured: false };
      if (!item.variants.includes(term)) item.variants.push(term);
      if (!item.evidence.some((evidence) => evidence.messageId === message.id)) item.evidence.push({ messageId: message.id, date: message.localDate, sender: message.sender, excerpt: compactExcerpt(message.text) });
      candidates.set(key, item);
    }
  }
  return [...candidates.values()].filter((item) => item.evidence.length >= 2 || /[💕❤♥🥰😘]/u.test(item.evidence[0]?.excerpt ?? '')).sort((a, b) => b.evidence.length - a.evidence.length);
}

export function discoverMoments(messages: ChatMessage[]): MomentEntry[] {
  const detectors: Array<[string, string]> = [
    ['red-thread', 'The thread found its words'],
    ['rain', 'A little rain between the lines'],
    ['chess', 'Across the chessboard'],
    ['promise', 'Words to remember'],
    ['prayer', 'A quiet light'],
    ['proposal', 'A next-chapter conversation'],
    ['late-night', 'Under the same moon'],
    ['sweet', 'A soft little moment'],
    ['funny', 'The part that made us laugh'],
  ];
  const selected: MomentEntry[] = [];
  for (const [tag, title] of detectors) {
    for (const message of messages.filter((item) => item.tags.includes(tag)).slice(0, tag === 'sweet' ? 4 : 3)) {
      selected.push({
        id: `moment_${shortHash(`${tag}:${message.id}`)}`,
        title,
        messageId: message.id,
        date: message.localDate,
        excerpt: compactExcerpt(message.text),
        tag,
      });
    }
  }
  return selected.sort((a, b) => messages.findIndex((message) => message.id === a.messageId) - messages.findIndex((message) => message.id === b.messageId)).slice(0, 24);
}
