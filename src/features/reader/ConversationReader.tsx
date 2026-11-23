import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Bookmark, ChevronLeft, ChevronRight, Filter, Pause, Play, Search, Snowflake, Star } from '../../components/Icons';
import type { ChatMessage, PrivateArchive } from '../../archive/types';
import { IllustratedSky } from '../../components/IllustratedSky';
import { phaseForHour } from '../../scenes/time';
import { MediaAsset } from '../gallery/MediaAsset';

type FilterName = 'Everything' | 'Her words' | 'My words' | 'Our names' | 'Firsts' | 'Sweet' | 'Funny' | 'Rain' | 'Promises' | 'Late night' | 'Photos' | 'Stickers' | 'Voice notes' | 'Videos' | 'Favorites';
const filters: FilterName[] = ['Everything','Her words','My words','Our names','Firsts','Sweet','Funny','Rain','Promises','Late night','Photos','Stickers','Voice notes','Videos','Favorites'];

interface Props {
  archive: PrivateArchive;
  cryptoKey: CryptoKey;
  dayNumber: number;
  targetMessageId?: string;
  animate: boolean;
  onBack: () => void;
  onDay: (day: number) => void;
}

function loadFavorites(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('rt-favorites') ?? '[]') as string[]); } catch { return new Set(); }
}

function matchesFilter(message: ChatMessage, filter: FilterName, names: Set<string>, favorites: Set<string>, firsts: Set<string>) {
  if (filter === 'Everything') return true;
  if (filter === 'Her words') return message.side === 'theirs';
  if (filter === 'My words') return message.side === 'mine';
  if (filter === 'Our names') return names.has(message.id);
  if (filter === 'Firsts') return firsts.has(message.id);
  if (filter === 'Sweet') return message.tags.includes('sweet');
  if (filter === 'Funny') return message.tags.includes('funny');
  if (filter === 'Rain') return message.tags.includes('rain');
  if (filter === 'Promises') return message.tags.includes('promise');
  if (filter === 'Late night') return message.tags.includes('late-night');
  if (filter === 'Photos') return message.tags.includes('photo');
  if (filter === 'Stickers') return message.tags.includes('sticker');
  if (filter === 'Voice notes') return message.tags.includes('voice');
  if (filter === 'Videos') return message.tags.includes('video');
  return favorites.has(message.id);
}

export function ConversationReader({ archive, cryptoKey, dayNumber, targetMessageId, animate, onBack, onDay }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const day = archive.days[Math.max(0, dayNumber - 1)] ?? archive.days[0];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterName>('Everything');
  const [favorites, setFavorites] = useState(loadFavorites);
  const [expanded, setExpanded] = useState<string>();
  const [frozenHour, setFrozenHour] = useState<number>();
  const [focusedHour, setFocusedHour] = useState(() => archive.messages.find((message) => message.id === day?.messageIds[0])?.hour ?? 20);
  const [replay, setReplay] = useState(false);
  const names = useMemo(() => new Set(archive.nicknames.flatMap((item) => item.evidence.map((evidence) => evidence.messageId))), [archive.nicknames]);
  const firsts = useMemo(() => new Set(archive.firstMessageIds), [archive.firstMessageIds]);
  const messages = useMemo(() => {
    const dayIds = new Set(day?.messageIds ?? []);
    const scope = query.trim() || filter !== 'Everything' ? archive.messages : archive.messages.filter((message) => dayIds.has(message.id));
    const normalizedQuery = query.toLocaleLowerCase();
    return scope.filter((message) => matchesFilter(message, filter, names, favorites, firsts) && (!normalizedQuery || message.text.toLocaleLowerCase().includes(normalizedQuery)));
  }, [archive.messages, day, query, filter, names, favorites, firsts]);
  const rowVirtualizer = useVirtualizer({ count: messages.length, getScrollElement: () => parentRef.current, estimateSize: () => 92, overscan: 8, getItemKey: (index) => messages[index]?.id ?? index });
  useEffect(() => {
    if (!targetMessageId) return;
    const index = messages.findIndex((message) => message.id === targetMessageId);
    if (index >= 0) window.setTimeout(() => rowVirtualizer.scrollToIndex(index, { align: 'center' }), 120);
  }, [targetMessageId, messages, rowVirtualizer]);
  const onScroll = () => {
    const visible = rowVirtualizer.getVirtualItems();
    const middle = visible[Math.floor(visible.length / 2)];
    const message = middle ? messages[middle.index] : undefined;
    if (message) { setFocusedHour(message.hour); localStorage.setItem('rt-resume-message', message.id); }
  };
  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('rt-favorites', JSON.stringify([...next]));
      return next;
    });
  };
  const phase = phaseForHour(frozenHour ?? focusedHour);
  const dateLabel = day ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${day.date}T00:00:00Z`)) : '';
  return (
    <main className="reader-page">
      <IllustratedSky phase={phase} scene={day?.scene} animate={animate} />
      <div className="reader-scrim" />
      <header className="reader-header">
        <button className="back-button" onClick={onBack}><ChevronLeft /> Our universe</button>
        <div><p className="eyebrow">{query || filter !== 'Everything' ? 'Searching the complete archive' : `Day ${day?.dayNumber}`}</p><h1>{query || filter !== 'Everything' ? 'Our conversation' : dateLabel}</h1></div>
        <div className="day-nav"><button className="icon-button" disabled={!day || day.dayNumber <= 1} onClick={() => onDay(day!.dayNumber - 1)} aria-label="Previous day"><ChevronLeft /></button><button className="icon-button" disabled={!day || day.dayNumber >= archive.days.length} onClick={() => onDay(day!.dayNumber + 1)} aria-label="Next day"><ChevronRight /></button></div>
      </header>
      <section className="reader-tools">
        <label className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search privately in memory" /></label>
        <label className="filter-select"><Filter /><select value={filter} onChange={(event) => setFilter(event.target.value as FilterName)}>{filters.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button className="glass-button small" onClick={() => setReplay(!replay)}>{replay ? <Pause /> : <Play />} {replay ? 'Pause replay' : 'Replay this exchange'}</button>
        <button className="glass-button small" onClick={() => setFrozenHour(frozenHour === undefined ? focusedHour : undefined)}><Snowflake /> {frozenHour === undefined ? 'Freeze this hour' : 'Follow conversation'}</button>
      </section>
      <div ref={parentRef} className={`message-scroll ${replay ? 'replaying' : ''}`} onScroll={onScroll}>
        {!messages.length && <div className="empty-conversation"><Star /><h2>{day?.messageIds.length ? 'No messages match this view' : 'No messages in this export for this day.'}</h2><p>{day?.messageIds.length ? 'Try another filter or search.' : 'Our thread is still here.'}</p></div>}
        <div className="virtual-canvas" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const message = messages[virtualRow.index]!;
            const media = message.attachment?.mediaId ? archive.media.find((item) => item.id === message.attachment?.mediaId) : undefined;
            return (
              <article key={message.id} data-index={virtualRow.index} ref={rowVirtualizer.measureElement} className={`message-row ${message.side} ${targetMessageId === message.id ? 'target-message' : ''}`} style={{ transform: `translateY(${virtualRow.start}px)`, '--replay-order': virtualRow.index % 8 } as React.CSSProperties}>
                <button className="message-bubble" onClick={() => setExpanded(expanded === message.id ? undefined : message.id)}><span className="message-text">{message.text}</span>{message.attachment?.missing && <span className="missing-attachment">Attachment was not recoverable from this export.</span>}</button>
                {media && <MediaAsset media={media} cryptoKey={cryptoKey} compact />}
                {expanded === message.id && <div className="message-details"><span>{message.sender ?? 'System'} · {message.localTime}</span><button onClick={() => toggleFavorite(message.id)}><Bookmark className={favorites.has(message.id) ? 'filled' : ''} /> {favorites.has(message.id) ? 'Saved' : 'Favorite'}</button></div>}
              </article>
            );
          })}
        </div>
      </div>
      <div className={`phase-indicator ${phase}`}>{frozenHour !== undefined ? 'Hour held' : 'Following the conversation'} · {phase}</div>
    </main>
  );
}
