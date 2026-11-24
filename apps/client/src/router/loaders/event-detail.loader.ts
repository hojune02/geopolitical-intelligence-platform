import { data, type LoaderFunctionArgs } from 'react-router';

import { fetchEventById } from '../../api/events.api';

export async function eventDetailLoader({ params, request }: LoaderFunctionArgs) {
  const eventId = params.eventId;

  if (eventId === undefined || !/^\d+$/.test(eventId)) {
    throw data({ message: 'That is not a valid GDELT event ID.' }, { status: 404 });
  }

  try {
    const response = await fetchEventById(eventId, request.signal);

    return {
      event: response.data,
    };
  } catch (caught: unknown) {
    /*
     * Events are kept for 14 days, so links shared earlier go stale.
     * Say so instead of showing a raw API failure.
     */
    if (caught instanceof Error && 'status' in caught && caught.status === 404) {
      throw data(
        { message: 'This event is no longer stored. GIP keeps the last 14 days of GDELT events.' },
        { status: 404 },
      );
    }

    throw caught;
  }
}

export type EventDetailLoaderData = Awaited<ReturnType<typeof eventDetailLoader>>;
