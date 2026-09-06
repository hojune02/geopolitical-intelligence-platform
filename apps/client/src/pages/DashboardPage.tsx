import { Link, useLoaderData } from 'react-router';

import type { DashboardLoaderData } from '../router/loaders/dashboard.loader';

import { useUIStore } from '../stores/useUIStore';

import { useFilterStore } from '../stores/useFilterStore';

import { AnalyticsPanel } from '../components/analytics/AnalyticsPanel';

export function DashboardPage() {
  const { initialEvents } = useLoaderData<DashboardLoaderData>();

  const activePanel = useUIStore((state) => state.activePanel);

  const setActivePanel = useUIStore((state) => state.setActivePanel);

  const activeRegion = useFilterStore((state) => state.activeRegion);

  const conflictIntensity = useFilterStore((state) => state.conflictIntensity);

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Intelligence overview</p>

          <h1>Geopolitical Dashboard</h1>
        </div>

        <div className="active-filters">
          <span>
            Region: <strong>{activeRegion}</strong>
          </span>

          <span>
            Goldstein:{' '}
            <strong>
              {conflictIntensity.minGoldstein}
              {' → '}
              {conflictIntensity.maxGoldstein}
            </strong>
          </span>
        </div>

        <div className="stat">
          <span>Stored events</span>

          <strong>{initialEvents.meta.total}</strong>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Latest Events</h2>

          <span>API cache: {initialEvents.cache.hit ? 'hit' : 'miss'}</span>
        </div>

        <div className="panel-tabs">
          <button
            aria-pressed={activePanel === 'events'}
            onClick={() => {
              setActivePanel('events');
            }}
            type="button"
          >
            Events
          </button>

          <button
            aria-pressed={activePanel === 'analytics'}
            onClick={() => {
              setActivePanel('analytics');
            }}
            type="button"
          >
            Analytics
          </button>
        </div>
        {activePanel === 'events' ? (
          <div className="event-list">
            {initialEvents.data.map((event) => (
              <article className="event-card" key={event.id}>
                <div>
                  <strong>{event.actors.source.name ?? 'Unknown actor'}</strong>

                  {' → '}

                  <strong>{event.actors.target.name ?? 'Unknown actor'}</strong>
                </div>

                <p>Goldstein: {event.action.goldsteinScale}</p>

                <p>{event.location?.name ?? 'Unknown location'}</p>

                <Link to={`/events/${event.id}`}>View event</Link>
              </article>
            ))}
          </div>
        ) : (
          <AnalyticsPanel />
        )}
      </section>
    </section>
  );
}
