import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/*
 * Countries the reader pinned. Client-owned state, so it lives in
 * Zustand; persisted per browser (no account needed).
 */
interface WatchlistState {
  codes: string[];
  toggle: (code: string) => void;
  has: (code: string) => boolean;
}

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

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      codes: [],
      toggle: (code) => {
        set((state) => ({
          codes: state.codes.includes(code)
            ? state.codes.filter((existing) => existing !== code)
            : [...state.codes, code].slice(-12),
        }));
      },
      has: (code) => get().codes.includes(code),
    }),
    { name: 'gip-watchlist', storage: safeStorage },
  ),
);
