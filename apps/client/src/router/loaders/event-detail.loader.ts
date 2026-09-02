import { type LoaderFunctionArgs } from 'react-router';
export function eventDetailLoader({ params }: LoaderFunctionArgs) {
  const eventId = params.eventId;

  if (eventId === undefined || !/^\d+$/.test(eventId)) {
    throw new Error('Invalid GDELT event ID.');
  }

  return {
    eventId,
  };
}

export type EventDetailLoaderData = ReturnType<typeof eventDetailLoader>;
