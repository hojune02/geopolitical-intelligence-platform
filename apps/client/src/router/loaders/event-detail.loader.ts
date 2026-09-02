import { data, type LoaderFunctionArgs } from 'react-router';

export function eventDetailLoader({ params }: LoaderFunctionArgs) {
  const eventId = params.eventId;

  if (eventId === undefined || !/^\d+$/.test(eventId)) {
    throw data(
      {
        message: 'Invalid GDELT event ID.',
      },
      {
        status: 400,
      },
    );
  }

  return {
    eventId,
  };
}

export type EventDetailLoaderData = ReturnType<typeof eventDetailLoader>;
