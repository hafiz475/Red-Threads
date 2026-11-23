import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FastForward, History } from '../../components/Icons';
import type { PrivateArchive } from '../../archive/types';

interface Props {
  archive: PrivateArchive;
  animate: boolean;
  onDay: (day: number) => void;
  onHome: () => void;
}

export function StoryIntro({ archive, animate, onDay, onHome }: Props) {
  const [beat, setBeat] = useState(0);
  const firstMessages = useMemo(() => archive.firstMessageIds.map((id) => archive.messages.find((message) => message.id === id)).filter(Boolean), [archive]);
  const featuredNames = archive.nicknames.filter((item) => item.featured).slice(0, 7);
  useEffect(() => {
    if (!animate) { setBeat(4); return; }
    const timers = [2200, 4700, 7600, 10400].map((delay, index) => window.setTimeout(() => setBeat(index + 1), delay));
    return () => timers.forEach(clearTimeout);
  }, [animate]);
  return (
    <main className="intro-screen">
      <img className="intro-painting" src={`${import.meta.env.BASE_URL}art/storybook-night.png`} alt="An illustrated woman reading beside a rainy window while a red thread reaches a young man under a starry sky" />
      <div className="intro-vignette" />
      <button className="skip-button" onClick={onHome}><FastForward /> Skip intro</button>
      <section className={`intro-story beat-${beat}`} aria-live="polite">
        <p className="intro-kicker">The beginning, exactly as it was written</p>
        <div className="intro-bubbles">
          {firstMessages.map((message, index) => message && (
            <blockquote key={message.id} className={`intro-bubble ${message.side}`} style={{ '--order': index } as React.CSSProperties}>{message.text}</blockquote>
          ))}
        </div>
        {beat >= 2 && <p className="narrator-line">Somewhere between that first hello and all the little things we called each other, this became ours.</p>}
        {beat >= 3 && <div className="floating-names" aria-label="Names from the archive">{featuredNames.map((name) => <span key={name.id}>{name.label}</span>)}</div>}
        {beat >= 4 && (
          <div className="intro-actions">
            <button className="primary-button" onClick={() => onDay(1)}><BookOpen /> Turn to Day 1</button>
            <button className="glass-button" onClick={() => onDay(archive.days.length)}><History /> Jump to our latest day</button>
          </div>
        )}
      </section>
    </main>
  );
}
