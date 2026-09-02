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
          <button aria-label="Toggle navigation" onClick={toggleSidebar} type="button">
            ☰
          </button>

          <NavLink className="brand" to="/dashboard">
            GeoIntel
          </NavLink>
        </div>

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
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <GlobalModal />
    </div>
  );
}
