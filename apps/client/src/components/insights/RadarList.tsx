import { Link } from 'react-router';

import { fromFips } from '../../lib/countries';

import type { RadarCountry } from '../../schemas/insights.schema';

import { Sparkline } from './Sparkline';

interface RadarListProps {
  title: string;
  eyebrow: string;
  tone: 'escalating' | 'cooling' | 'coverage';
  countries: RadarCountry[];
  emptyText: string;
}

function formatShift(country: RadarCountry): string {
  const expected = country.baseline.expectedConflictEvents;

  if (expected === null || expected < 0.5) {
    return `${String(country.recent.conflictEvents)} conflict events`;
  }

  const ratio = country.recent.conflictEvents / expected;

  if (ratio >= 1) {
    return `${ratio >= 10 ? Math.round(ratio).toString() : ratio.toFixed(1)}× usual conflict`;
  }

  return `${Math.round((1 - ratio) * 100).toString()}% below usual`;
}

export function RadarList({ title, eyebrow, tone, countries, emptyText }: RadarListProps) {
  return (
    <section className={`panel radar-panel radar-${tone}`}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>

      {countries.length === 0 ? <p className="radar-empty">{emptyText}</p> : null}

      <ol className="radar-list">
        {countries.map((country, index) => {
          const info = fromFips(country.countryCode);

          return (
            <li key={country.countryCode}>
              <Link className="radar-row" to={`/countries/${country.countryCode}`}>
                <span className="radar-rank">{String(index + 1).padStart(2, '0')}</span>

                <span aria-hidden="true" className="radar-flag">
                  {info.flag}
                </span>

                <span className="radar-name">
                  <strong>{info.name}</strong>
                  <small>
                    {tone === 'coverage'
                      ? `${country.recent.mentions.toLocaleString()} mentions · ${String(country.recent.events)} events`
                      : formatShift(country)}
                  </small>
                </span>

                <Sparkline
                  label={`${info.name} conflict activity over the window`}
                  points={country.spark ?? []}
                />

                {country.conflictZ !== null ? (
                  <span
                    className={`radar-score ${country.conflictZ >= 0 ? 'up' : 'down'}`}
                    title="Conflict z-score versus this country's own baseline"
                  >
                    {country.conflictZ >= 0 ? '▲' : '▼'} {Math.abs(country.conflictZ).toFixed(1)}σ
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
