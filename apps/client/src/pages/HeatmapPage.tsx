import { useCallback, useState } from 'react';

import { useNavigate } from 'react-router';

import { type MapBounds } from '../api/map.api';

import { GeopoliticalMap } from '../components/map/GeopoliticalMap';

import { useFilterStore } from '../stores/useFilterStore';

import { useUIStore } from '../stores/useUIStore';
import { useMapEventData } from '../hooks/useMapEventData';

export function HeatmapPage() {
  const navigate = useNavigate();

  const [bounds, setBounds] = useState<MapBounds | null>(null);

  const { points, loading, error, truncated, cacheHit } = useMapEventData(bounds);

  const activeRegion = useFilterStore((state) => state.activeRegion);

  const mapMode = useUIStore((state) => state.mapMode);

  const setMapMode = useUIStore((state) => state.setMapMode);

  const handleBoundsChange = useCallback((nextBounds: MapBounds) => {
    setBounds(nextBounds);
  }, []);

  const handleEventSelect = useCallback(
    (eventId: string) => {
      void navigate(`/events/${eventId}`);
    },
    [navigate],
  );

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="eyebrow">Geographic intelligence</p>

          <h1>Global Event Map</h1>
        </div>

        <div className="map-mode-controls">
          <button
            aria-pressed={mapMode === 'markers'}
            onClick={() => {
              setMapMode('markers');
            }}
            type="button"
          >
            Clusters
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
      </header>

      <div className="map-status">
        <span>Events: {points.length}</span>

        <span>Cache: {cacheHit ? 'hit' : 'miss'}</span>

        {loading ? <span>Updating…</span> : null}
      </div>

      {error !== null ? <div role="alert">{error}</div> : null}

      {truncated ? (
        <div role="status">Showing the first 5,000 events. Zoom in for a more precise result.</div>
      ) : null}

      <div className="map-shell">
        <GeopoliticalMap
          mode={mapMode}
          onBoundsChange={handleBoundsChange}
          onEventSelect={handleEventSelect}
          points={points}
          region={activeRegion}
        />
      </div>
    </section>
  );
}
