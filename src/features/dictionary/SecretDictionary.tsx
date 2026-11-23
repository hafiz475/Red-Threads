import { useState } from 'react';
import { ChevronLeft, Heart, MessageCircleHeart, Sparkles } from '../../components/Icons';
import type { NicknameEntry, PrivateArchive } from '../../archive/types';

interface Props { archive: PrivateArchive; onBack: () => void; onMessage: (messageId: string) => void; }

function NameNote({ item, onMessage }: { item: NicknameEntry; onMessage: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const evidence = item.evidence[0];
  return (
    <article className={`name-note ${open ? 'open' : ''}`}>
      <button onClick={() => setOpen(!open)} aria-expanded={open}><Heart /><strong>{item.label}</strong><span>{item.evidence.length} {item.evidence.length === 1 ? 'place' : 'places'} in our story</span></button>
      {open && evidence && <div className="note-evidence"><blockquote>{evidence.excerpt}</blockquote><button className="text-button" onClick={() => onMessage(evidence.messageId)}>Read where you said it</button></div>}
    </article>
  );
}

export function SecretDictionary({ archive, onBack, onMessage }: Props) {
  const [showAll, setShowAll] = useState(false);
  const mine = archive.nicknames.filter((item) => item.direction === 'mine-to-theirs');
  const theirs = archive.nicknames.filter((item) => item.direction === 'theirs-to-mine');
  const visible = (items: NicknameEntry[]) => showAll ? items : items.filter((item) => item.featured).slice(0, 12);
  return (
    <main className="page-shell dictionary-page">
      <button className="back-button" onClick={onBack}><ChevronLeft /> Our universe</button>
      <header className="storybook-header compact"><p className="eyebrow"><Sparkles /> Found in the real archive</p><h1>Our Secret Dictionary</h1><p>Every spelling stays itself. Every note leads back to the message that held it.</p></header>
      {archive.nicknames.length === 0 ? <div className="empty-page"><MessageCircleHeart /><h2>No reviewed names yet</h2><p>Run the local nickname review, then import again. The complete chat is still safe and readable.</p></div> : (
        <>
          <section className="notes-section"><h2>What you call me</h2><div className="notes-cloud">{visible(theirs).map((item) => <NameNote key={item.id} item={item} onMessage={onMessage} />)}</div></section>
          <section className="notes-section"><h2>What I call you</h2><div className="notes-cloud">{visible(mine).map((item) => <NameNote key={item.id} item={item} onMessage={onMessage} />)}</div></section>
          <button className="glass-button centered" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show the featured notes' : 'Unfold every reviewed name'}</button>
        </>
      )}
    </main>
  );
}
