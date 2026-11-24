export const OPEN_PALETTE_EVENT = 'gip:open-palette';

export function openCommandPalette(): void {
  window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}

/* ⌘K on Apple platforms, Ctrl K elsewhere. */
export function shortcutLabel(): string {
  try {
    return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl K';
  } catch {
    return 'Ctrl K';
  }
}
