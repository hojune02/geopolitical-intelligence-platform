/*
 * Colours that cannot come from CSS custom properties: SVG presentation
 * attributes (Recharts) and MapLibre paint expressions. Keep in step with
 * the tokens in index.css.
 */
export type ResolvedTheme = 'light' | 'dark';

export interface Palette {
  ink: string;
  gray: string;
  grid: string;
  axis: string;
  paper: string;
  cooperation: string;
  cooperationSoft: string;
  tension: string;
  violence: string;
  neutral: string;
  mapStyle: string;
  mapHalo: string;
}

export const PALETTES: Record<ResolvedTheme, Palette> = {
  light: {
    ink: '#111111',
    gray: '#666666',
    grid: '#e8e8e8',
    axis: '#111111',
    paper: '#ffffff',
    cooperation: '#2f7346',
    cooperationSoft: '#8fbf9c',
    tension: '#b8790f',
    violence: '#b3261e',
    neutral: '#111111',
    mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    mapHalo: '#ffffff',
  },
  dark: {
    ink: '#f2f2f0',
    gray: '#9a9a96',
    grid: '#2a2a28',
    axis: '#f2f2f0',
    paper: '#0f0f0e',
    cooperation: '#6fbf87',
    cooperationSoft: '#3f6e4d',
    tension: '#e0a74a',
    violence: '#ef6b5f',
    neutral: '#f2f2f0',
    mapStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    mapHalo: '#0f0f0e',
  },
};
