import { BookHeart, Calendar, Chat, GalleryHorizontalEnd, Heart, Home, LockKeyhole, MessageCircleHeart, Moments, Moon, More, Pause, Play, Sun, X } from './Icons';
import type { ViewName } from '../features/home/UniverseHome';

interface Props { view: ViewName | 'intro'; moreOpen: boolean; setMoreOpen: (open: boolean) => void; onNavigate: (view: ViewName) => void; onReplay: () => void; theme: 'light' | 'dark'; setTheme: (theme: 'light' | 'dark') => void; paused: boolean; setPaused: (paused: boolean) => void; onLock: () => void; }
const tabs = [{ view: 'home' as const, label: 'Home', Icon: Home }, { view: 'calendar' as const, label: 'Our Days', Icon: Calendar }, { view: 'reader' as const, label: 'Our Chats', Icon: Chat }, { view: 'moments' as const, label: 'Memories', Icon: Moments }];

export function MobileNav({ view, moreOpen, setMoreOpen, onNavigate, onReplay, theme, setTheme, paused, setPaused, onLock }: Props) {
  return <>
    {moreOpen && <div className="more-backdrop" onClick={() => setMoreOpen(false)} />}
    <aside className={`more-sheet ${moreOpen ? 'open' : ''}`} aria-hidden={!moreOpen} aria-label="More places and settings">
      <div className="sheet-handle" /><header><div><p className="eyebrow">Your private story</p><h2>More</h2></div><button className="icon-button" onClick={() => setMoreOpen(false)} aria-label="Close menu"><X /></button></header>
      <div className="more-grid">
        <button onClick={() => { onNavigate('dictionary'); setMoreOpen(false); }}><MessageCircleHeart /><span><strong>Our Words</strong><small>Every affectionate name</small></span></button>
        <button onClick={() => { onNavigate('gallery'); setMoreOpen(false); }}><GalleryHorizontalEnd /><span><strong>Our Gallery</strong><small>Sealed photos and media</small></span></button>
        <button onClick={() => { onNavigate('next'); setMoreOpen(false); }}><Heart /><span><strong>Next Chapter</strong><small>The pages ahead</small></span></button>
        <button onClick={() => { onReplay(); setMoreOpen(false); }}><BookHeart /><span><strong>Replay Beginning</strong><small>Watch the short intro</small></span></button>
      </div>
      <div className="setting-list">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun /> : <Moon />}<span><strong>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</strong><small>Change the reading theme</small></span></button>
        <button onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}<span><strong>{paused ? 'Resume motion' : 'Pause motion'}</strong><small>Keep the story comfortable</small></span></button>
        <button onClick={onLock}><LockKeyhole /><span><strong>Lock our story</strong><small>Clear the decrypted session</small></span></button>
      </div>
    </aside>
    <nav className="mobile-nav" aria-label="Primary navigation">
      {tabs.map(({ view: target, label, Icon }) => <button key={target} className={view === target ? 'active' : ''} onClick={() => onNavigate(target)} aria-current={view === target ? 'page' : undefined}><Icon /><span>{label}</span></button>)}
      <button className={moreOpen || ['dictionary','gallery','next'].includes(view) ? 'active' : ''} onClick={() => setMoreOpen(!moreOpen)}><More /><span>More</span></button>
    </nav>
  </>;
}
