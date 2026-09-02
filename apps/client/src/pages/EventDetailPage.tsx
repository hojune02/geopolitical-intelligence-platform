import { Link, useLoaderData } from 'react-router';

import type { EventDetailLoaderData } from '../router/loaders/event-detail.loader';

import { useUIStore } from '../stores/useUIStore';

export function EventDetailPage() {
  const { eventId } = useLoaderData<EventDetailLoaderData>();

  const openEventModal = useUIStore((state) => state.openEventModal);

  return (
    <section>
      <p className="eyebrow">Event intelligence</p>

      <h1>Event {eventId}</h1>

      <section className="panel">
        <p>GDELT Event ID</p>

        <code>{eventId}</code>

        <div>
          <button
            onClick={() => {
              openEventModal(eventId);
            }}
            type="button"
          >
            Open preview
          </button>
        </div>
      </section>

      <Link to="/dashboard">← Back to dashboard</Link>
    </section>
  );
}
