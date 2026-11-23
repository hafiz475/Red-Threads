import { useEffect, useState } from 'react';
import { LockKeyhole } from '../components/Icons';
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
    setView(sessionStorage.getItem('rt-intro-seen') ? 'home' : 'intro');
  };
  const navigate = (next: ViewName) => {
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
  const openDay = (number: number) => { setDayNumber(Math.min(Math.max(number, 1), archive?.days.length ?? 1)); setTargetMessageId(undefined); setView('reader'); };
  const openMessage = (id: string) => {
    const message = archive?.messages.find((item) => item.id === id);
    const day = archive?.days.find((item) => item.date === message?.localDate);
    if (!message || !day) return;
    setDayNumber(day.dayNumber); setTargetMessageId(id); setView('reader');
  };
  const finishIntro = () => { sessionStorage.setItem('rt-intro-seen', 'true'); setView('home'); };
  const lock = () => { setArchive(undefined); setCryptoKey(undefined); setTargetMessageId(undefined); setView('intro'); };
  return (
    <div className="app" data-theme={theme}>
      <AppControls theme={theme} setTheme={setTheme} paused={motion.paused} setPaused={motion.setPaused} />
      {!archive || !cryptoKey ? (
        <LockScreen invitation={invitation} envelope={envelope} envelopeState={envelopeState} animate={motion.shouldAnimate} onUnlock={unlock} />
      ) : (
        <>
          <button className="lock-again icon-button" onClick={lock} aria-label="Lock the private story"><LockKeyhole /></button>
          {view === 'intro' && <StoryIntro archive={archive} animate={motion.shouldAnimate} onDay={openDay} onHome={finishIntro} />}
          {view === 'home' && <UniverseHome archive={archive} onNavigate={navigate} onReplay={() => setView('intro')} />}
          {view === 'calendar' && <MemoryGarden archive={archive} onBack={() => setView('home')} onDay={openDay} />}
          {view === 'reader' && <ConversationReader archive={archive} cryptoKey={cryptoKey} dayNumber={dayNumber} targetMessageId={targetMessageId} animate={motion.shouldAnimate} onBack={() => setView('home')} onDay={openDay} />}
          {view === 'dictionary' && <SecretDictionary archive={archive} onBack={() => setView('home')} onMessage={openMessage} />}
          {view === 'moments' && <ThreadOfMoments archive={archive} onBack={() => setView('home')} onMessage={openMessage} />}
          {view === 'gallery' && <OurGallery archive={archive} cryptoKey={cryptoKey} onBack={() => setView('home')} onMessage={openMessage} />}
          {view === 'next' && <NextChapter archive={archive} animate={motion.shouldAnimate} onBack={() => setView('home')} onFirst={() => openDay(1)} onContinue={() => navigate('reader')} />}
        </>
      )}
    </div>
  );
}
