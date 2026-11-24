import { useCallback, useState } from 'react';

import { useNavigate } from 'react-router';

import { type MapBounds } from '../api/map.api';

import { GeopoliticalMap } from '../components/map/GeopoliticalMap';

import { useFilterStore } from '../stores/useFilterStore';

import { useUIStore } from '../stores/useUIStore';
import { usePalette, useThemeStore } from '../stores/useThemeStore';
import { useMapEventData } from '../hooks/useMapEventData';

export function HeatmapPage() {
  const navigate = useNavigate();

  const [bounds, setBounds] = useState<MapBounds | null>(null);

  const { points, loading, error, truncated } = useMapEventData(bounds);

  const activeRegion = useFilterStore((state) => state.activeRegion);

  const mapMode = useUIStore((state) => state.mapMode);

  const palette = usePalette();

  const theme = useThemeStore((state) => state.resolved);

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
          <p className="eyebrow">Geography</p>

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
        <span>{points.length.toLocaleString()} events in view</span>

        <span aria-hidden={!loading} className={loading ? undefined : 'is-invisible'}>
          Updating…
        </span>
      </div>

      <div className="map-shell">
        <GeopoliticalMap
          key={theme}
          mode={mapMode}
          palette={palette}
          onBoundsChange={handleBoundsChange}
          onEventSelect={handleEventSelect}
          points={points}
          region={activeRegion}
        />

        <div aria-live="polite" className="map-overlay-messages">
          {error !== null ? (
            <div className="map-overlay-message map-overlay-error" role="alert">
              {error}
            </div>
          ) : null}

          {truncated ? (
            <div className="map-overlay-message map-overlay-limit" role="status">
              Showing the first 5,000 events. Zoom in for a more precise result.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
