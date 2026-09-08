import { useEffect, useState } from 'react';

import { fetchEventPage } from '../api/events.api';

import type { Event } from '../schemas/event-api.schema';

import { useFilterStore } from '../stores/useFilterStore';

interface EventDataState {
  data: Event[];

  total: number;

  totalPages: number;

  cacheHit: boolean;

  error: string | null;

  completedQueryKey: string | null;
}

export interface EventDataResult {
  data: Event[];

  total: number;

  totalPages: number;

  loading: boolean;

  cacheHit: boolean;

  error: string | null;
}

const initialState: EventDataState = {
  data: [],

  total: 0,

  totalPages: 0,

  cacheHit: false,

  error: null,

  completedQueryKey: null,
};

export function useEventData(): EventDataResult {
  const [state, setState] = useState<EventDataState>(initialState);

  const startDate = useFilterStore((store) => store.dateRange.startDate);

  const endDate = useFilterStore((store) => store.dateRange.endDate);

  const minGoldstein = useFilterStore((store) => store.conflictIntensity.minGoldstein);

  const maxGoldstein = useFilterStore((store) => store.conflictIntensity.maxGoldstein);

  const rootEventsOnly = useFilterStore((store) => store.rootEventsOnly);

  const queryKey = JSON.stringify({
    page: 1,

    limit: 25,

    startDate,

    endDate,

    minGoldstein,

    maxGoldstein,

    rootEventsOnly,
  });

  useEffect(() => {
    const controller = new AbortController();

    void fetchEventPage(
      {
        page: 1,

        limit: 25,

        startDate: startDate ?? undefined,

        endDate: endDate ?? undefined,

        minGoldstein,

        maxGoldstein,

        isRootEvent: rootEventsOnly ? true : undefined,
      },

      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          data: response.data,

          total: response.meta.total,

          totalPages: response.meta.totalPages,

          cacheHit: response.cache.hit,

          error: null,

          completedQueryKey: queryKey,
        });
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        const message = caught instanceof Error ? caught.message : 'Unable to load events.';

        setState((previous) => ({
          ...previous,

          error: message,

          completedQueryKey: queryKey,
        }));
      });

    return () => {
      controller.abort();
    };
  }, [startDate, endDate, minGoldstein, maxGoldstein, rootEventsOnly, queryKey]);

  const loading = state.completedQueryKey !== queryKey;

  const currentResult = state.completedQueryKey === queryKey;

  return {
    data: state.data,

    total: state.total,

    totalPages: state.totalPages,

    loading,

    cacheHit: currentResult ? state.cacheHit : false,

    error: currentResult ? state.error : null,
  };
}
