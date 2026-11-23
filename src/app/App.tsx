import { useEffect, useRef, useState } from 'react';
import type { PrivateArchive, PublicEnvelope } from '../archive/types';
import { captureInvitation } from '../crypto/invitation';
import { useMotionSettings } from '../hooks/useMotionSettings';
import { AppControls } from '../components/AppControls';
import { LockScreen } from '../features/lock/LockScreen';
import { StoryIntro } from '../features/intro/StoryIntro';
import { UniverseHome, type ViewName } from '../features/home/UniverseHome';
import { MemoryGarden } from '../features/calendar/MemoryGarden';
import { ConversationReader } from '../features/reader/ConversationReader';
import { SecretDictionary } from '../features/dictionary/SecretDictionary';
import { ThreadOfMoments } from '../features/moments/ThreadOfMoments';
import { OurGallery } from '../features/gallery/OurGallery';
import { NextChapter } from '../features/next/NextChapter';
import { MobileNav } from '../components/MobileNav';

type AppView = ViewName | 'intro';

function initialTheme(): 'light' | 'dark' {
  const saved = localStorage.getItem('rt-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function App() {
  const [invitation] = useState(() => captureInvitation());
  const [envelope, setEnvelope] = useState<PublicEnvelope>();
  const [envelopeState, setEnvelopeState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [archive, setArchive] = useState<PrivateArchive>();
  const [cryptoKey, setCryptoKey] = useState<CryptoKey>();
  const [view, setView] = useState<AppView>('intro');
  const [dayNumber, setDayNumber] = useState(1);
  const [targetMessageId, setTargetMessageId] = useState<string>();
  const [theme, setThemeState] = useState(initialTheme);
  const [moreOpen, setMoreOpen] = useState(false);
  const history = useRef<AppView[]>([]);
  const motion = useMotionSettings();
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}sealed/envelope.json`, { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 404) { setEnvelopeState('missing'); return; }
        if (!response.ok) throw new Error('Envelope unavailable');
        const value = await response.json() as PublicEnvelope;
        if (value.format !== 'red-threads-sealed' || value.version !== 1) throw new Error('Invalid envelope');
        setEnvelope(value);
        setEnvelopeState('ready');
      })
      .catch(() => setEnvelopeState('error'));
  }, []);
  const setTheme = (next: 'light' | 'dark') => { setThemeState(next); localStorage.setItem('rt-theme', next); };
  const unlock = (nextArchive: PrivateArchive, key: CryptoKey) => {
    setArchive(nextArchive);
    setCryptoKey(key);
    setDayNumber(1);
    history.current = [];
    setView(sessionStorage.getItem('rt-intro-seen') ? 'home' : 'intro');
  };
  const navigate = (next: ViewName) => {
    if (view === next) return;
    history.current.push(view);
    setTargetMessageId(undefined);
    if (next === 'reader') {
      const resume = localStorage.getItem('rt-resume-message');
      if (resume && archive) {
        const message = archive.messages.find((item) => item.id === resume);
        const day = archive.days.find((item) => item.date === message?.localDate);
        if (day) { setDayNumber(day.dayNumber); setTargetMessageId(resume); }
      }
    }
    setView(next);
  };
  const goBack = () => { setMoreOpen(false); setView(history.current.pop() ?? 'home'); };
  const openDay = (number: number) => { if (view !== 'reader') history.current.push(view); setDayNumber(Math.min(Math.max(number, 1), archive?.days.length ?? 1)); setTargetMessageId(undefined); setView('reader'); };
  const openMessage = (id: string) => {
    const message = archive?.messages.find((item) => item.id === id);
    const day = archive?.days.find((item) => item.date === message?.localDate);
    if (!message || !day) return;
    if (view !== 'reader') history.current.push(view);
    setDayNumber(day.dayNumber); setTargetMessageId(id); setView('reader');
  };
  const finishIntro = () => { sessionStorage.setItem('rt-intro-seen', 'true'); history.current = []; setView('home'); };
  const replayIntro = () => { history.current.push(view); setView('intro'); };
  const lock = () => { setArchive(undefined); setCryptoKey(undefined); setTargetMessageId(undefined); setMoreOpen(false); history.current = []; setView('intro'); };
  return (
    <div className="app" data-theme={theme}>
      {!archive || !cryptoKey ? (
        <><AppControls theme={theme} setTheme={setTheme} paused={motion.paused} setPaused={motion.setPaused} /><LockScreen invitation={invitation} envelope={envelope} envelopeState={envelopeState} animate={motion.shouldAnimate} onUnlock={unlock} /></>
      ) : (
        <>
          {view === 'intro' && <StoryIntro archive={archive} animate={motion.shouldAnimate} onDay={openDay} onHome={finishIntro} />}
          {view === 'home' && <UniverseHome archive={archive} onNavigate={navigate} onReplay={replayIntro} />}
          {view === 'calendar' && <MemoryGarden archive={archive} onBack={goBack} onDay={openDay} />}
          {view === 'reader' && <ConversationReader archive={archive} cryptoKey={cryptoKey} dayNumber={dayNumber} targetMessageId={targetMessageId} animate={motion.shouldAnimate} onBack={goBack} onDay={openDay} />}
          {view === 'dictionary' && <SecretDictionary archive={archive} onBack={goBack} onMessage={openMessage} />}
          {view === 'moments' && <ThreadOfMoments archive={archive} onBack={goBack} onMessage={openMessage} />}
          {view === 'gallery' && <OurGallery archive={archive} cryptoKey={cryptoKey} onBack={goBack} onMessage={openMessage} />}
          {view === 'next' && <NextChapter archive={archive} animate={motion.shouldAnimate} onBack={goBack} onFirst={() => openDay(1)} onContinue={() => navigate('reader')} />}
          {view !== 'intro' && <MobileNav view={view} moreOpen={moreOpen} setMoreOpen={setMoreOpen} onNavigate={navigate} onReplay={replayIntro} theme={theme} setTheme={setTheme} paused={motion.paused} setPaused={motion.setPaused} onLock={lock} />}
        </>
      )}
    </div>
  );
}
