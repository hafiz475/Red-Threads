export type SpeakerSide = 'mine' | 'theirs' | 'system';

export interface AttachmentRef {
  sourceName: string;
  mediaId?: string;
  missing?: boolean;
}

export interface ChatMessage {
  id: string;
  sourceIndex: number;
  localDate: string;
  localTime: string;
  hour: number;
  minute: number;
  sender?: string;
  side: SpeakerSide;
  text: string;
  attachment?: AttachmentRef;
  tags: string[];
}

export interface ArchiveDay {
  dayNumber: number;
  date: string;
  messageIds: string[];
  scene: DayScene;
}

export type SceneKind =
  | 'reading-nook'
  | 'flower-window'
  | 'starry-rooftop'
  | 'morning-room'
  | 'golden-balcony'
  | 'cloudy-dusk'
  | 'moonlit-terrace'
  | 'constellation-night'
  | 'chess-table'
  | 'lantern-corridor'
  | 'storybook';

export interface DayScene {
  kind: SceneKind;
  accents: string[];
  seed: number;
}

export interface NicknameEvidence {
  messageId: string;
  date: string;
  sender: string;
  excerpt: string;
}

export interface NicknameEntry {
  id: string;
  label: string;
  normalized: string;
  direction: 'theirs-to-mine' | 'mine-to-theirs';
  variants: string[];
  evidence: NicknameEvidence[];
  featured: boolean;
}

export interface MomentEntry {
  id: string;
  title: string;
  messageId: string;
  date: string;
  excerpt: string;
  tag: string;
}

export interface EncryptedChunkRef {
  objectId: string;
  path: string;
  plainBytes: number;
  cipherBytes: number;
  index: number;
  aad: string;
}

export interface MediaEntry {
  id: string;
  sourceName: string;
  mime: string;
  extension: string;
  size: number;
  messageId?: string;
  chunks: EncryptedChunkRef[];
  missing?: boolean;
}

export interface PrivateArchive {
  version: 1;
  timezone: 'Asia/Kolkata';
  importedAt: string;
  participants: string[];
  mine: string;
  messages: ChatMessage[];
  days: ArchiveDay[];
  nicknames: NicknameEntry[];
  nicknameCandidates: NicknameEntry[];
  moments: MomentEntry[];
  media: MediaEntry[];
  firstMessageIds: string[];
  nextChapterDate?: string;
  warnings: string[];
}

export interface PublicEnvelope {
  format: 'red-threads-sealed';
  version: 1;
  kdf: {
    name: 'PBKDF2-HMAC-SHA-256';
    iterations: number;
    pinSalt: string;
    hkdfSalt: string;
    info: 'red-threads/archive/v1';
  };
  manifest: {
    path: string;
    aad: 'red-threads:v1:manifest';
  };
}
