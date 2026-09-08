import { NavLink, Outlet } from 'react-router';

import { GlobalModal } from '../components/ui/GlobalModal';

import { useUIStore } from '../stores/useUIStore';

export function AppLayout() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <button
            aria-expanded={sidebarOpen}
            aria-label="Toggle navigation"
            className="menu-button"
            onClick={toggleSidebar}
            type="button"
          >
            <span aria-hidden="true" className="menu-glyph" />
          </button>

          <NavLink className="brand" to="/dashboard">
            <span aria-hidden="true" className="brand-mark">
              G
            </span>

            <span className="brand-copy">
              <span className="brand-name">Geopolitical Intelligence Platform</span>

              <span className="brand-subtitle">Global intelligence network</span>
            </span>
          </NavLink>
        </div>

        <div className="header-actions">
          <span className="system-status">
            <span aria-hidden="true" className="status-dot" />
            Network online
          </span>

          {sidebarOpen ? (
            <nav className="main-navigation">
              <NavLink
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                end
                to="/dashboard"
              >
                Dashboard
              </NavLink>

              <NavLink
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                to="/dashboard/heatmap"
              >
                Heatmap
              </NavLink>
            </nav>
          ) : null}
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <GlobalModal />
    </div>
  );
}
