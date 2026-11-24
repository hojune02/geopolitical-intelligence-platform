import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { PALETTES, type Palette, type ResolvedTheme } from '../lib/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'gip-theme';

function systemTheme(): ResolvedTheme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? systemTheme() : mode;
}

function apply(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;
}

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

const safeStorage = createJSONStorage(() => {
  try {
    return window.localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };
  }
});

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolved: systemTheme(),
      setMode: (mode) => {
        const resolved = resolve(mode);
        apply(resolved);
        set({ mode, resolved });
      },
      cycle: () => {
        const next = ORDER[(ORDER.indexOf(get().mode) + 1) % ORDER.length] ?? 'system';
        get().setMode(next);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: safeStorage,
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        state?.setMode(state.mode);
      },
    },
  ),
);

/* Follow the OS setting live while in "system" mode. */
try {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { mode, setMode } = useThemeStore.getState();
    if (mode === 'system') {
      setMode('system');
    }
  });
} catch {
  // Older browsers: the theme still applies on the next load.
}

export function usePalette(): Palette {
  return PALETTES[useThemeStore((state) => state.resolved)];
}
