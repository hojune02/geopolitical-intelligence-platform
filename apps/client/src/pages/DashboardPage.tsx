import { Link } from 'react-router';

import { AnalyticsPanel } from '../components/analytics/AnalyticsPanel';
import { useEventData } from '../hooks/useEventData';
import { useFilterStore } from '../stores/useFilterStore';
import { useUIStore } from '../stores/useUIStore';

export function DashboardPage() {
  const { data: events, total, loading, error, cacheHit } = useEventData();

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
            Map region: <strong>{activeRegion}</strong>
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
          <span>Matching events</span>

          <strong>{total}</strong>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Latest Events</h2>

          <span>API cache: {cacheHit ? 'hit' : 'miss'}</span>
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
          <>
            {loading ? <p>Updating events…</p> : null}

            {error !== null ? <p role="alert">{error}</p> : null}

            {!loading && error === null && events.length === 0 ? (
              <p>No events match the current filters.</p>
            ) : null}

            <div className="event-list">
              {events.map((event) => (
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
          </>
        ) : (
          <AnalyticsPanel />
        )}
      </section>
    </section>
  );
}
