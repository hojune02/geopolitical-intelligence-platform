import { NavLink, Outlet } from 'react-router';

import { CommandPalette } from '../components/ui/CommandPalette';

import { GlobalModal } from '../components/ui/GlobalModal';

import { Icon, type IconName } from '../components/ui/Icon';

import { openCommandPalette, shortcutLabel } from '../lib/palette';

import { useThemeStore, type ThemeMode } from '../stores/useThemeStore';

const THEME_ICON: Record<ThemeMode, IconName> = {
  system: 'theme-system',
  light: 'theme-light',
  dark: 'theme-dark',
};

const THEME_LABEL: Record<ThemeMode, string> = {
  system: 'Theme: follows system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');

export function AppLayout() {
  const themeMode = useThemeStore((state) => state.mode);

  const cycleTheme = useThemeStore((state) => state.cycle);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <NavLink aria-label="GIP. home" className="brand" to="/briefing">
            <span className="brand-mark">GIP.</span>

            <span className="brand-copy">
              <span className="brand-name">Geopolitical Intelligence</span>

              <span className="brand-subtitle">A daily briefing from GDELT</span>
            </span>
          </NavLink>
        </div>

        <div className="header-actions">
          <nav aria-label="Main" className="main-navigation">
            <NavLink className={navClass} to="/briefing">
              Briefing
            </NavLink>

            <NavLink className={navClass} end to="/dashboard">
              Events
            </NavLink>

            <NavLink className={navClass} to="/dashboard/heatmap">
              Map
            </NavLink>
          </nav>

          <button
            aria-label="Search countries"
            className="palette-trigger header-search"
            onClick={openCommandPalette}
            type="button"
          >
            <Icon className="search-icon" name="search" />
            <span className="search-label">Search countries</span>
            <kbd>{shortcutLabel()}</kbd>
          </button>

          <button
            aria-label={`${THEME_LABEL[themeMode]}. Switch theme`}
            className="theme-toggle"
            onClick={cycleTheme}
            title={THEME_LABEL[themeMode]}
            type="button"
          >
            <Icon name={THEME_ICON[themeMode]} />
          </button>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <GlobalModal />

      <CommandPalette />
    </div>
  );
}
