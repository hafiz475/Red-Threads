import { ChevronLeft, History, Sparkles } from '../../components/Icons';
import type { PrivateArchive } from '../../archive/types';
import { IllustratedSky } from '../../components/IllustratedSky';

interface Props { archive: PrivateArchive; animate: boolean; onBack: () => void; onFirst: () => void; onContinue: () => void; }

export function NextChapter({ archive, animate, onBack, onFirst, onContinue }: Props) {
  const target = archive.nextChapterDate ? new Date(`${archive.nextChapterDate}T00:00:00`) : undefined;
  const future = target && target.getTime() > Date.now();
  const days = future ? Math.ceil((target!.getTime() - Date.now()) / 86_400_000) : undefined;
  return (
    <main className="next-page">
      <IllustratedSky phase="sunset" animate={animate} scene={{ kind: 'starry-rooftop', accents: [], seed: 99 }} />
      <button className="back-button floating" onClick={onBack}><ChevronLeft /> Our universe</button>
      <section className="next-card"><Sparkles className="large-sparkle" /><p className="eyebrow">The horizon is still becoming</p><h1>Our Next Chapter</h1>{days !== undefined && <p className="countdown">{days} days until the date we tucked into this story</p>}<p className="narrator-line">The best part? We haven't written every page yet.</p><div className="button-row"><button className="primary-button" onClick={onFirst}>Back to our first hello</button><button className="glass-button" onClick={onContinue}><History /> Continue where I left off</button></div></section>
    </main>
  );
}
