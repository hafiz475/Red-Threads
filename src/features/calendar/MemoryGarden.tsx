import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Leaf, Search, Star } from '../../components/Icons';
import type { PrivateArchive } from '../../archive/types';

interface Props { archive: PrivateArchive; onBack: () => void; onDay: (dayNumber: number) => void; }

function parts(iso: string) { const [year, month, day] = iso.split('-').map(Number); return { year: year!, month: month!, day: day! }; }
function monthLabel(year: number, month: number) { return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1))); }

export function MemoryGarden({ archive, onBack, onDay }: Props) {
  const first = parts(archive.days[0]?.date ?? '2000-01-01');
  const last = parts(archive.days.at(-1)?.date ?? '2000-01-01');
  const [cursor, setCursor] = useState({ year: first.year, month: first.month });
  const [jump, setJump] = useState('');
  const cells = useMemo(() => {
    const leading = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay();
    const count = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
    return [...Array.from({ length: leading }, () => undefined), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [cursor]);
  const move = (delta: number) => {
    const date = new Date(Date.UTC(cursor.year, cursor.month - 1 + delta, 1));
    const next = { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
    const serial = (value: typeof next) => value.year * 12 + value.month;
    if (serial(next) >= serial(first) && serial(next) <= serial(last)) setCursor(next);
  };
  const jumpToDay = () => {
    const number = Number(jump);
    if (number >= 1 && number <= archive.days.length) onDay(number);
  };
  return (
    <main className="page-shell garden-page">
      <button className="back-button" onClick={onBack}><ChevronLeft /> Our universe</button>
      <header className="storybook-header compact"><p className="eyebrow">A calendar made of little pages</p><h1>Our Days</h1><p>Every date stays where it belongs—including the quiet ones.</p></header>
      <section className="calendar-book" aria-label="Memory calendar">
        <div className="calendar-toolbar">
          <button className="icon-button" onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft /></button>
          <h2>{monthLabel(cursor.year, cursor.month)}</h2>
          <button className="icon-button" onClick={() => move(1)} aria-label="Next month"><ChevronRight /></button>
        </div>
        <div className="weekday-row">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {cells.map((day, index) => {
            if (!day) return <span key={`blank-${index}`} />;
            const iso = `${cursor.year}-${String(cursor.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const archiveDay = archive.days.find((item) => item.date === iso);
            return (
              <button key={iso} className={`calendar-day ${archiveDay ? 'in-story' : ''} ${archiveDay?.messageIds.length ? 'has-messages' : 'quiet-day'}`} disabled={!archiveDay} onClick={() => archiveDay && onDay(archiveDay.dayNumber)} title={archiveDay ? `Day ${archiveDay.dayNumber} · ${archiveDay.messageIds.length} messages` : undefined}>
                <span className="date-number">{day}</span>
                {archiveDay && <><strong>Day {archiveDay.dayNumber}</strong>{archiveDay.messageIds.length ? <Star /> : <Leaf />}</>}
              </button>
            );
          })}
        </div>
        <div className="calendar-jump">
          <label htmlFor="jump-day"><Search /> Jump to a day</label>
          <input id="jump-day" inputMode="numeric" value={jump} onChange={(event) => setJump(event.target.value.replace(/\D/g, ''))} placeholder="Day number" />
          <button className="glass-button" onClick={jumpToDay}>Open page</button>
          <button className="text-button" onClick={() => onDay(1)}>Start from the beginning</button>
        </div>
      </section>
    </main>
  );
}
