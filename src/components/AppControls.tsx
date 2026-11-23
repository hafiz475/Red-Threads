import { Moon, Pause, Play, Sun } from './Icons';

interface Props {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  paused: boolean;
  setPaused: (paused: boolean) => void;
}

export function AppControls({ theme, setTheme, paused, setPaused }: Props) {
  return (
    <div className="app-controls" aria-label="Display controls">
      <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        {theme === 'dark' ? <Sun /> : <Moon />}
      </button>
      <button className="icon-button" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume animations' : 'Pause animations'}>
        {paused ? <Play /> : <Pause />}
      </button>
    </div>
  );
}
