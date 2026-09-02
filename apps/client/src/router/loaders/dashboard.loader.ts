import type { LoaderFunctionArgs } from 'react-router';

import { fetchEventPage } from '../../api/events.api';

export async function dashboardLoader({ request }: LoaderFunctionArgs) {
  const initialEvents = await fetchEventPage(
    {
      page: 1,
      limit: 10,
    },

    request.signal,
  );

  return {
    initialEvents,
  };
}

export type DashboardLoaderData = Awaited<ReturnType<typeof dashboardLoader>>;
