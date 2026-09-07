import { Link, useLoaderData } from 'react-router';

import type { EventDetailLoaderData } from '../router/loaders/event-detail.loader';

import { useUIStore } from '../stores/useUIStore';

export function EventDetailPage() {
  const { event } = useLoaderData<EventDetailLoaderData>();

  const openEventModal = useUIStore((state) => state.openEventModal);

  return (
    <section>
      <p className="eyebrow">Event intelligence</p>

      <h1>{event.location?.name ?? `Event ${event.id}`}</h1>

      <section className="panel">
        <div>
          <p>GDELT Event ID</p>

          <code>{event.id}</code>
        </div>

        <div>
          <p>Event date</p>

          <strong>{event.eventDate}</strong>
        </div>

        <div>
          <p>Event type</p>

          <strong>{event.action.quadClass.label}</strong>
        </div>

        <div>
          <p>Goldstein scale</p>

          <strong>{event.action.goldsteinScale}</strong>
        </div>

        <div>
          <p>Source actor</p>

          <strong>{event.actors.source.name ?? 'Unknown'}</strong>
        </div>

        <div>
          <p>Target actor</p>

          <strong>{event.actors.target.name ?? 'Unknown'}</strong>
        </div>

        <div>
          <button
            onClick={() => {
              openEventModal(event.id);
            }}
            type="button"
          >
            Open preview
          </button>
        </div>
      </section>

      <section className="panel event-source">
        <p className="eyebrow">Source</p>

        <h2>Source article</h2>

        {event.sourceUrl !== null ? (
          <>
            <a href={event.sourceUrl} rel="noopener noreferrer" target="_blank">
              Open source article ↗
            </a>

            <p className="event-source-url">{event.sourceUrl}</p>
          </>
        ) : (
          <p>No source article URL is available for this event.</p>
        )}
      </section>

      <Link to="/dashboard">← Back to dashboard</Link>
    </section>
  );
}
