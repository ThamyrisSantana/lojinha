/* Theme: dark by default; light or automatic (follows the device) can be chosen.
   The choice is saved in this browser; index.html applies it before the first paint. */
import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'auto';
const KEY = 'painel-tema';
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

function readChoice(): ThemeChoice {
  const t = document.documentElement.dataset.theme;
  return t === 'light' || t === 'dark' ? t : 'auto';
}

function subscribe(l: () => void) {
  listeners.add(l);
  const media = systemDark();
  media.addEventListener('change', l);
  return () => {
    listeners.delete(l);
    media.removeEventListener('change', l);
  };
}

export function useTheme() {
  const choice = useSyncExternalStore(subscribe, readChoice);
  const isDark = useSyncExternalStore(subscribe, () => (readChoice() === 'auto' ? systemDark().matches : readChoice() === 'dark'));

  const setTheme = useCallback((t: ThemeChoice) => {
    const html = document.documentElement;
    if (t === 'auto') delete html.dataset.theme;
    else html.dataset.theme = t;
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* private mode: the theme still applies for this visit */
    }
    notify();
  }, []);

  // Browser UI color (phone status bar) follows the page background.
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name=theme-color]');
    if (meta)
      meta.content = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || (isDark ? '#0C0C0D' : '#F2F2F2');
  }, [isDark]);

  return { choice, isDark, setTheme, toggle: () => setTheme(isDark ? 'light' : 'dark') };
}
