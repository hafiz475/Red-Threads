import { useState } from 'react';
import type { PrivateArchive } from '../archive/types';
import { MobileNav } from '../components/MobileNav';
import { MemoryGarden } from '../features/calendar/MemoryGarden';
import { UniverseHome, type ViewName } from '../features/home/UniverseHome';
import { ConversationReader } from '../features/reader/ConversationReader';

const messages = [
  { id: 'sample-1', sourceIndex: 0, localDate: '2026-11-23', localTime: '2:04 AM', hour: 2, minute: 4, sender: 'A', side: 'theirs' as const, text: 'The moon found our little conversation.', tags: ['late-night'] },
  { id: 'sample-2', sourceIndex: 1, localDate: '2026-11-23', localTime: '2:05 AM', hour: 2, minute: 5, sender: 'B', side: 'mine' as const, text: 'Then let’s leave a red thread here so we can always find it.', tags: ['sweet'] },
  { id: 'sample-3', sourceIndex: 2, localDate: '2026-11-23', localTime: '2:06 AM', hour: 2, minute: 6, sender: 'A', side: 'theirs' as const, text: 'Deal. One small light for every day.', tags: ['promise'] },
];
const archive: PrivateArchive = { version: 1, timezone: 'Asia/Kolkata', importedAt: '2026-11-23T00:00:00.000Z', participants: ['A','B'], mine: 'B', messages, days: [{ dayNumber: 1, date: '2026-11-23', messageIds: messages.map((message) => message.id), scene: { kind: 'moonlit-terrace', accents: ['moon'], seed: 7 } }], nicknames: [], nicknameCandidates: [], moments: [], media: [], firstMessageIds: ['sample-1','sample-2'], warnings: [] };

export function SyntheticPreview() {
  const params = new URLSearchParams(location.search);
  const initial = (params.get('screen') === 'chat' ? 'reader' : params.get('screen') === 'calendar' ? 'calendar' : 'home') as ViewName;
  const [view, setView] = useState<ViewName>(initial);
  const [moreOpen, setMoreOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(params.get('theme') === 'light' ? 'light' : 'dark');
  const [paused, setPaused] = useState(false);
  return <div className="app" data-theme={theme}>
    {view === 'home' && <UniverseHome archive={archive} onNavigate={setView} onReplay={() => undefined} />}
    {view === 'calendar' && <MemoryGarden archive={archive} onBack={() => setView('home')} onDay={() => setView('reader')} />}
    {view === 'reader' && <ConversationReader archive={archive} cryptoKey={{} as CryptoKey} dayNumber={1} animate={!paused} onBack={() => setView('home')} onDay={() => setView('reader')} />}
    {!['home','calendar','reader'].includes(view) && <UniverseHome archive={archive} onNavigate={setView} onReplay={() => undefined} />}
    <MobileNav view={view} moreOpen={moreOpen} setMoreOpen={setMoreOpen} onNavigate={setView} onReplay={() => undefined} theme={theme} setTheme={setTheme} paused={paused} setPaused={setPaused} onLock={() => undefined} />
  </div>;
}
