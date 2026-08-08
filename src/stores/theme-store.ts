import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_OPTIONS: readonly ThemePreference[] = ['light', 'dark', 'system'];

export const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

interface ThemeState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  cycleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => {
        const index = THEME_OPTIONS.indexOf(get().theme);
        const next = THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length];
        set({ theme: next });
      },
    }),
    {
      name: 'washflow-theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
