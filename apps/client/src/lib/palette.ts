export const OPEN_PALETTE_EVENT = 'gip:open-palette';

export function openCommandPalette(): void {
  window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}
