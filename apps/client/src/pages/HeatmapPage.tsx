import { useLoaderData } from 'react-router';

import type { HeatmapLoaderData } from '../router/loaders/heatmap.loader';

import { useUIStore } from '../stores/useUIStore';

export function HeatmapPage() {
  const { initialEvents } = useLoaderData<HeatmapLoaderData>();

  const geolocatedEvents = initialEvents.data.filter((event) => event.location !== null);

  const mapMode = useUIStore((state) => state.mapMode);

  const setMapMode = useUIStore((state) => state.setMapMode);

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Geographic intelligence</p>

          <h1>Event Heatmap</h1>
        </div>
      </header>

      <section className="panel">
        <h2>Map placeholder</h2>

        <p>Loaded {geolocatedEvents.length} geolocated events.</p>

        <p>React Leaflet / MapLibre integration arrives on Day 7.</p>
      </section>

      <div className="panel-tabs">
        <button
          aria-pressed={mapMode === 'markers'}
          onClick={() => {
            setMapMode('markers');
          }}
          type="button"
        >
          Markers
        </button>

        <button
          aria-pressed={mapMode === 'heatmap'}
          onClick={() => {
            setMapMode('heatmap');
          }}
          type="button"
        >
          Heatmap
        </button>
      </div>

      <p>
        Current map mode: <strong>{mapMode}</strong>
      </p>
    </section>
  );
}
