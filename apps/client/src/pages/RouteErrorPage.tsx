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

  return (
    <section className="error-page">
      <p className="eyebrow">Something went wrong</p>

      <h1>Unable to load this view</h1>

      <p>{message}</p>

      <div className="error-actions">
        <button
          onClick={() => {
            window.location.reload();
          }}
          type="button"
        >
          Retry
        </button>

        <Link to="/dashboard">Dashboard</Link>
      </div>
    </section>
  );
}
