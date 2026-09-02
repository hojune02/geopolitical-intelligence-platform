import type { LoaderFunctionArgs } from 'react-router';

import { fetchEventPage } from '../../api/events.api';

export async function heatmapLoader({ request }: LoaderFunctionArgs) {
  const initialEvents = await fetchEventPage(
    {
      page: 1,
      limit: 100,
    },

    request.signal,
  );

  return {
    initialEvents,
  };
}

export type HeatmapLoaderData = Awaited<ReturnType<typeof heatmapLoader>>;
