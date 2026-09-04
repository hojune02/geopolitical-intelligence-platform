import { useCallback, useEffect, useState } from 'react';

import { useNavigate } from 'react-router';

import { fetchMapEvents, type MapBounds } from '../api/map.api';

import { GeopoliticalMap } from '../components/map/GeopoliticalMap';

import type { MapEventPoint } from '../schemas/map-event.schema';

import { useFilterStore } from '../stores/useFilterStore';

import { useUIStore } from '../stores/useUIStore';

export function HeatmapPage() {
  const navigate = useNavigate();

  const [points, setPoints] = useState<MapEventPoint[]>([]);

  const [bounds, setBounds] = useState<MapBounds | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [truncated, setTruncated] = useState(false);

  const [cacheHit, setCacheHit] = useState(false);

  const activeRegion = useFilterStore((state) => state.activeRegion);

  const startDate = useFilterStore((state) => state.dateRange.startDate);

  const endDate = useFilterStore((state) => state.dateRange.endDate);

  const minGoldstein = useFilterStore((state) => state.conflictIntensity.minGoldstein);

  const maxGoldstein = useFilterStore((state) => state.conflictIntensity.maxGoldstein);

  const rootEventsOnly = useFilterStore((state) => state.rootEventsOnly);

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

  useEffect(() => {
    if (bounds === null) {
      return;
    }

    const controller = new AbortController();

    void fetchMapEvents(
      {
        ...bounds,

        startDate: startDate ?? undefined,

        endDate: endDate ?? undefined,

        minGoldstein,

        maxGoldstein,

        isRootEvent: rootEventsOnly,

        limit: 5_000,
      },

      controller.signal,
    )
      .then((response) => {
        setPoints(response.data);

        setTruncated(response.meta.truncated);

        setCacheHit(response.cache.hit);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (caught instanceof Error) {
          setError(caught.message);

          return;
        }

        setError('Unable to load map events.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [bounds, startDate, endDate, minGoldstein, maxGoldstein, rootEventsOnly]);

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
