import type { LoaderFunctionArgs } from 'react-router';

import { fetchEventById } from '../../api/events.api';

export async function eventDetailLoader({ params, request }: LoaderFunctionArgs) {
  const eventId = params.eventId;

  if (eventId === undefined || eventId.length === 0) {
    throw new Error('Invalid GDELT event ID.');
  }

  const response = await fetchEventById(eventId, request.signal);

  return {
    event: response.data,
  };
}

export type EventDetailLoaderData = Awaited<ReturnType<typeof eventDetailLoader>>;
