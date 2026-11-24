import { useEffect, useState } from 'react';

import { ApiError } from '../api/http';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  status: number | null;
  completedKey: string | null;
}

export interface AsyncResult<T> {
  data: T | null;
  error: string | null;
  /** HTTP status of a failed request, when there was one. */
  status: number | null;
  loading: boolean;
}

/*
 * Small fetch-on-key hook: aborts stale requests, keeps the previous
 * data on screen while a new key loads, and never stores server data
 * in Zustand (see ARCHITECTURE.md, client state strategy).
 */
export function useAsync<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    status: null,
    completedKey: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ data, error: null, status: null, completedKey: key });
        }
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState((previous) => ({
          ...previous,
          error: caught instanceof Error ? caught.message : 'Request failed',
          status: caught instanceof ApiError ? caught.status : null,
          completedKey: key,
        }));
      });

    return () => {
      controller.abort();
    };
    // `load` is recreated on every render; `key` captures its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    data: state.data,
    error: state.completedKey === key ? state.error : null,
    status: state.completedKey === key ? state.status : null,
    loading: state.completedKey !== key,
  };
}
