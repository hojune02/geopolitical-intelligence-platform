import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { z } from 'zod';

const routeErrorDataSchema = z.object({
  message: z.string(),
});
function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    const routeErrorData: unknown = error.data;

    if (typeof routeErrorData === 'string') {
      return routeErrorData;
    }

    const parsed = routeErrorDataSchema.safeParse(routeErrorData);

    if (parsed.success) {
      return parsed.data.message;
    }

    return error.statusText || 'The route could not be loaded.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}
export function RouteErrorPage() {
  const error = useRouteError();

  const message = getErrorMessage(error);

  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <section className="error-page">
      <p className="eyebrow">{notFound ? 'Not found' : 'Something went wrong'}</p>

      <h1>{notFound ? 'This record has moved on' : 'Unable to load this view'}</h1>

      <p>{message}</p>

      <div className="error-actions">
        {notFound ? null : (
          <button
            onClick={() => {
              window.location.reload();
            }}
            type="button"
          >
            Retry
          </button>
        )}

        <Link to="/briefing">Today&apos;s briefing</Link>

        <Link to="/dashboard">Event explorer</Link>
      </div>
    </section>
  );
}
