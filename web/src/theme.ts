import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'washflow-theme';

export function getSystemDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function storedTheme(): Theme {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && getSystemDark());
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

/** Tracks the web dashboard theme (light/dark/system) and applies it to <html>. */
export function useTheme(): { theme: Theme; cycleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(storedTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((current) => {
      if (current === 'system') return 'dark';
      if (current === 'dark') return 'light';
      return 'system';
    });
  }, []);

  return { theme, cycleTheme };
}

export const THEME_LABEL: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};
