import { useEffect } from 'react';

import { useState } from 'react';

import { fetchMapEvents, type MapBounds } from '../api/map.api';

import type { MapEventPoint } from '../schemas/map-event.schema';

import { useFilterStore } from '../stores/useFilterStore';

interface MapEventDataState {
  points: MapEventPoint[];

  error: string | null;

  truncated: boolean;

  cacheHit: boolean;

  completedQueryKey: string | null;
}

export interface MapEventDataResult {
  points: MapEventPoint[];

  loading: boolean;

  error: string | null;

  truncated: boolean;

  cacheHit: boolean;
}

const initialState: MapEventDataState = {
  points: [],

  error: null,

  truncated: false,

  cacheHit: false,

  completedQueryKey: null,
};

export function useMapEventData(bounds: MapBounds | null): MapEventDataResult {
  const [state, setState] = useState<MapEventDataState>(initialState);

  const startDate = useFilterStore((store) => store.dateRange.startDate);

  const endDate = useFilterStore((store) => store.dateRange.endDate);

  const minGoldstein = useFilterStore((store) => store.conflictIntensity.minGoldstein);

  const maxGoldstein = useFilterStore((store) => store.conflictIntensity.maxGoldstein);

  const rootEventsOnly = useFilterStore((store) => store.rootEventsOnly);

  const queryKey =
    bounds === null
      ? null
      : JSON.stringify({
          ...bounds,

          startDate,

          endDate,

          minGoldstein,

          maxGoldstein,

          rootEventsOnly,
        });

  useEffect(() => {
    if (bounds === null || queryKey === null) {
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

        isRootEvent: rootEventsOnly ? true : undefined,

        limit: 5_000,
      },

      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          points: response.data,

          error: null,

          truncated: response.meta.truncated,

          cacheHit: response.cache.hit,

          completedQueryKey: queryKey,
        });
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        const message = caught instanceof Error ? caught.message : 'Unable to load map events.';

        setState((previous) => ({
          ...previous,

          error: message,

          completedQueryKey: queryKey,
        }));
      });

    return () => {
      controller.abort();
    };
  }, [bounds, queryKey, startDate, endDate, minGoldstein, maxGoldstein, rootEventsOnly]);

  const loading = queryKey !== null && state.completedQueryKey !== queryKey;

  const currentResult = queryKey === state.completedQueryKey;

  return {
    points: state.points,

    loading,

    error: currentResult ? state.error : null,

    truncated: currentResult ? state.truncated : false,

    cacheHit: currentResult ? state.cacheHit : false,
  };
}
