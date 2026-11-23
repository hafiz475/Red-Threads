import { useMemo, useState } from 'react';
import { ChevronLeft, Images } from '../../components/Icons';
import type { PrivateArchive } from '../../archive/types';
import { MediaAsset } from './MediaAsset';

interface Props { archive: PrivateArchive; cryptoKey: CryptoKey; onBack: () => void; onMessage: (messageId: string) => void; }

const filters = ['all', 'photos', 'stickers', 'videos', 'voice notes', 'other'] as const;

export function OurGallery({ archive, cryptoKey, onBack, onMessage }: Props) {
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  const items = useMemo(() => archive.media.filter((media) => {
    if (filter === 'all') return true;
    if (filter === 'photos') return media.mime === 'image/jpeg' || media.mime === 'image/png';
    if (filter === 'stickers') return media.mime === 'image/webp';
    if (filter === 'videos') return media.mime.startsWith('video/');
    if (filter === 'voice notes') return media.mime.startsWith('audio/');
    return !media.mime.startsWith('image/') && !media.mime.startsWith('video/') && !media.mime.startsWith('audio/');
  }), [archive.media, filter]);
  return (
    <main className="page-shell gallery-page">
      <button className="back-button" onClick={onBack}><ChevronLeft /> Our universe</button>
      <header className="storybook-header compact"><p className="eyebrow">Opened only when you ask</p><h1>Our Gallery & Audio</h1><p>Each item remains ciphertext until this browser decrypts it on demand. Audio never autoplays.</p></header>
      <div className="filter-ribbon" role="group" aria-label="Gallery filters">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
      {!items.length ? <div className="empty-page"><Images /><h2>No files in this shelf</h2><p>The text archive remains complete even when media was not included.</p></div> : (
        <section className="scrapbook-grid">{items.map((media) => <article key={media.id} className="scrapbook-item"><MediaAsset media={media} cryptoKey={cryptoKey} />{media.messageId && <button className="text-button" onClick={() => onMessage(media.messageId!)}>Go to its message</button>}</article>)}</section>
      )}
    </main>
  );
}
