import { Link } from 'react-router';

import { openCommandPalette } from '../lib/palette';

export function NotFoundPage() {
  return (
    <section className="error-page">
      <p className="eyebrow">404</p>

      <h1>Nothing hangs here</h1>

      <p>The page you asked for does not exist. Try the briefing, or search for a country.</p>

      <div className="error-actions">
        <Link to="/briefing">Today&apos;s briefing</Link>

        <button onClick={openCommandPalette} type="button">
          Search countries
        </button>
      </div>
    </section>
  );
}
