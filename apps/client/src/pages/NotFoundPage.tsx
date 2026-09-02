import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="error-page">
      <p className="eyebrow">404</p>

      <h1>Intelligence route not found</h1>

      <p>The requested page does not exist.</p>

      <Link to="/dashboard">Return to dashboard</Link>
    </section>
  );
}
