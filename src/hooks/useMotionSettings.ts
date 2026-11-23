import { useEffect, useState } from 'react';

export function useMotionSettings() {
  const [paused, setPaused] = useState(() => localStorage.getItem('rt-motion-paused') === 'true');
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const onMedia = () => setReduced(media.matches);
    const onVisibility = () => setVisible(document.visibilityState === 'visible');
    media.addEventListener('change', onMedia);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      media.removeEventListener('change', onMedia);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  const updatePaused = (value: boolean) => {
    setPaused(value);
    localStorage.setItem('rt-motion-paused', String(value));
  };
  return { paused, setPaused: updatePaused, shouldAnimate: !paused && !reduced && visible };
}

