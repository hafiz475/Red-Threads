import { BookHeart, CalendarDays, GalleryHorizontalEnd, HeartHandshake, MessageCircleHeart, Sparkles } from '../../components/Icons';
import type { PrivateArchive } from '../../archive/types';

export type ViewName = 'home' | 'calendar' | 'reader' | 'dictionary' | 'moments' | 'gallery' | 'next';

interface Props {
  archive: PrivateArchive;
  onNavigate: (view: ViewName) => void;
  onReplay: () => void;
}

export function UniverseHome({ archive, onNavigate, onReplay }: Props) {
  const resume = localStorage.getItem('rt-resume-message');
  const routes = [
    { view: 'calendar' as const, icon: CalendarDays, title: 'Our Days', copy: 'A memory garden, one real calendar page at a time.' },
    { view: 'dictionary' as const, icon: MessageCircleHeart, title: 'Our Words', copy: 'The little names found across the whole story.' },
    { view: 'moments' as const, icon: Sparkles, title: 'Little Moments', copy: 'Source-linked stitches along the red thread.' },
    { view: 'gallery' as const, icon: GalleryHorizontalEnd, title: 'Our Gallery', copy: 'Photos, stickers, motion and voices—sealed until requested.' },
    { view: 'reader' as const, icon: BookHeart, title: resume ? 'Continue Reading' : 'Read from the Beginning', copy: 'Every recoverable message, still in its original order.' },
    { view: 'next' as const, icon: HeartHandshake, title: 'Our Next Chapter', copy: 'A quiet horizon for the pages still unwritten.' },
  ];
  return (
    <main className="universe-page page-shell">
      <header className="storybook-header">
        <p className="eyebrow">The thread is still here</p>
        <h1>Our Little Universe</h1>
        <p>Wander by day, by word, by photograph, or simply pick up where you left off.</p>
        <div className="header-meta">Last imported {new Date(archive.importedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
      </header>
      <section className="universe-map" aria-label="Story sections">
        <svg className="map-thread" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M110 85C330 5 375 245 620 150S980 235 800 380S475 355 330 480S125 650 460 650S780 540 925 665" /></svg>
        {routes.map(({ view, icon: Icon, title, copy }, index) => (
          <button key={view} className={`universe-card card-${index + 1}`} onClick={() => onNavigate(view)}>
            <span className="card-icon"><Icon /></span><strong>{title}</strong><span>{copy}</span>
          </button>
        ))}
      </section>
      <button className="text-button replay-intro" onClick={onReplay}>Watch our beginning again</button>
    </main>
  );
}
