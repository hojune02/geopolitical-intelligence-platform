import type { ReactNode } from 'react';

/*
 * A small inline-SVG icon set. Unicode symbols (arrows, triangles,
 * stars) fall back to whatever font each OS has and render at
 * inconsistent sizes beside DM Sans; SVG icons draw the same everywhere
 * and take the text colour.
 */
export type IconName =
  | 'search'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up-right'
  | 'up'
  | 'down'
  | 'star'
  | 'star-filled'
  | 'theme-system'
  | 'theme-light'
  | 'theme-dark'
  | 'briefing'
  | 'list'
  | 'map'
  | 'warning';

const PATHS: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" />
    </>
  ),
  'arrow-right': <path d="M2.5 8h11M9.5 4l4 4-4 4" />,
  'arrow-left': <path d="M13.5 8h-11M6.5 4l-4 4 4 4" />,
  'arrow-up-right': <path d="M4.5 11.5l7-7M5.5 4.5h6v6" />,
  up: <path d="M8 3.5 13 12H3z" fill="currentColor" stroke="none" />,
  down: <path d="M8 12.5 3 4h10z" fill="currentColor" stroke="none" />,
  star: <path d="m8 2.2 1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 6.5l4-.6z" />,
  'star-filled': (
    <path d="m8 2.2 1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 6.5l4-.6z" fill="currentColor" />
  ),
  'theme-system': (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" stroke="none" />
    </>
  ),
  'theme-light': (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
    </>
  ),
  'theme-dark': <path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" />,
  briefing: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  list: <path d="M3 4.5h10M3 8h10M3 11.5h10" />,
  map: <path d="M2 4l4-1.5 4 1.5 4-1.5v9.5L10 13.5 6 12l-4 1.5zM6 2.5V12M10 4v9.5" />,
  warning: (
    <>
      <path d="M8 2 14.5 13.5h-13z" />
      <path d="M8 6.5v3M8 11.5v.01" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  /** Accessible label; omit for decorative icons. */
  label?: string;
  className?: string;
}

export function Icon({ name, label, className }: IconProps) {
  return (
    <svg
      aria-hidden={label === undefined ? true : undefined}
      aria-label={label}
      className={className === undefined ? 'icon' : `icon ${className}`}
      fill="none"
      focusable="false"
      height="1em"
      role={label === undefined ? undefined : 'img'}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.4}
      viewBox="0 0 16 16"
      width="1em"
    >
      {PATHS[name]}
    </svg>
  );
}
