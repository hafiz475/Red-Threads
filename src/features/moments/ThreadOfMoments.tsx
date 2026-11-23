import { ChevronLeft, CloudRain, Crown, MoonStar, Sparkles } from '../../components/Icons';
import type { PrivateArchive } from '../../archive/types';

interface Props { archive: PrivateArchive; onBack: () => void; onMessage: (messageId: string) => void; }

function MomentIcon({ tag }: { tag: string }) {
  if (tag === 'rain') return <CloudRain />;
  if (tag === 'chess') return <Crown />;
  if (tag === 'late-night') return <MoonStar />;
  return <Sparkles />;
}

export function ThreadOfMoments({ archive, onBack, onMessage }: Props) {
  return (
    <main className="page-shell moments-page">
      <button className="back-button" onClick={onBack}><ChevronLeft /> Our universe</button>
      <header className="storybook-header compact"><p className="eyebrow">Only what the source can hold</p><h1>The Thread of Moments</h1><p>Each card is tied to real words and opens at its exact place in the archive.</p></header>
      <section className="moments-thread">
        {archive.moments.map((moment, index) => (
          <article key={moment.id} className={`moment-card side-${index % 2}`}>
            <span className="moment-knot"><MomentIcon tag={moment.tag} /></span>
            <time>{moment.date}</time><h2>{moment.title}</h2><blockquote>{moment.excerpt}</blockquote>
            <button className="text-button" onClick={() => onMessage(moment.messageId)}>Open the original message</button>
          </article>
        ))}
      </section>
    </main>
  );
}
