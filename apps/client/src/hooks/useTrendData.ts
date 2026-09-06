import { useEffect, useState } from 'react';

import { fetchTrends } from '../api/analytics.api';

import type { TrendBucket, TrendPoint } from '../schemas/analytics.schema';

import { useFilterStore } from '../stores/useFilterStore';

interface TrendDataState {
  data: TrendPoint[];

  error: string | null;

  cacheHit: boolean;

  completedQueryKey: string | null;
}

export interface TrendDataResult {
  data: TrendPoint[];

  loading: boolean;

  error: string | null;

  cacheHit: boolean;
}

const initialState: TrendDataState = {
  data: [],

  error: null,

  cacheHit: false,

  completedQueryKey: null,
};

export function useTrendData(bucket: TrendBucket): TrendDataResult {
  const [state, setState] = useState<TrendDataState>(initialState);

  const startDate = useFilterStore((store) => store.dateRange.startDate);

  const endDate = useFilterStore((store) => store.dateRange.endDate);

  const queryKey = JSON.stringify({
    bucket,
    startDate,
    endDate,
  });

  useEffect(() => {
    const controller = new AbortController();

    void fetchTrends(
      {
        bucket,

        startDate: startDate ?? undefined,

        endDate: endDate ?? undefined,
      },

      controller.signal,
    )
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          data: response.data,

          error: null,

          cacheHit: response.cache.hit,

          completedQueryKey: queryKey,
        });
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        const message = caught instanceof Error ? caught.message : 'Unable to load analytics data.';

        setState((previous) => ({
          ...previous,

          error: message,

          completedQueryKey: queryKey,
        }));
      });

    return () => {
      controller.abort();
    };
  }, [bucket, startDate, endDate, queryKey]);

  const loading = state.completedQueryKey !== queryKey;

  const currentResult = state.completedQueryKey === queryKey;

  return {
    data: state.data,

    loading,

    error: currentResult ? state.error : null,

    cacheHit: currentResult ? state.cacheHit : false,
  };
}
