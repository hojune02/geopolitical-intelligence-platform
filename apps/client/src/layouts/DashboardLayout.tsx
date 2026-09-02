import { Outlet } from 'react-router';

import { FilterPanel } from '../components/filters/FilterPanel';

import { useUIStore } from '../stores/useUIStore';

export function DashboardLayout() {
  const filterPanelOpen = useUIStore((state) => state.filterPanelOpen);

  const toggleFilterPanel = useUIStore((state) => state.toggleFilterPanel);

  return (
    <div className="dashboard-layout">
      <aside className="filter-sidebar">
        <button onClick={toggleFilterPanel} type="button">
          {filterPanelOpen ? 'Hide filters' : 'Show filters'}
        </button>

        {filterPanelOpen ? <FilterPanel /> : null}
      </aside>

      <section className="dashboard-content">
        <Outlet />
      </section>
    </div>
  );
}
