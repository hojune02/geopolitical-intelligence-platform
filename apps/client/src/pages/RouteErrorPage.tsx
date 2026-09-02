import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (typeof error.data === 'string') {
      return error.data;
    }

    if (typeof error.data === 'object' && error.data !== null && 'message' in error.data) {
      const message = error.data.message;

      if (typeof message === 'string') {
        return message;
      }
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
