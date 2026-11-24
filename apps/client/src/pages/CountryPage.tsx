import { useState } from 'react';

import { Link, useParams } from 'react-router';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { fetchCountryDossier } from '../api/insights.api';

import { GoldsteinMeter } from '../components/insights/GoldsteinMeter';
import { StoryList } from '../components/insights/StoryList';

import { useAsync } from '../hooks/useAsync';

import { describeTone, rootLabel, rootStance } from '../lib/cameo';
import { fromCameo, fromFips } from '../lib/countries';
import { countrySummary } from '../lib/narrative';

import { useWatchlistStore } from '../stores/useWatchlistStore';
import { usePalette } from '../stores/useThemeStore';

const STATUS_LABEL = {
  escalating: 'Escalating',
  cooling: 'Cooling',
  steady: 'Normal range',
  new: 'Newly active',
} as const;

function percent(value: number | null): string {
  return value === null ? '—' : `${String(Math.round(value * 100))}%`;
}

export function CountryPage() {
  const params = useParams();
  const code = (params.countryCode ?? '').toUpperCase();
  const info = fromFips(code);
  const palette = usePalette();

  const dossier = useAsync(`country:${code}`, (signal) =>
    fetchCountryDossier(code, signal).then((response) => response.data),
  );

  const pinned = useWatchlistStore((state) => state.codes.includes(code));
  const toggle = useWatchlistStore((state) => state.toggle);
  const [copied, setCopied] = useState(false);

  const data = dossier.data !== null && dossier.data.countryCode === code ? dossier.data : null;
  const radar = data?.radar ?? null;

  const share = () => {
    void navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 1800);
      })
      .catch(() => undefined);
  };

  const maxAction = Math.max(1, ...(data?.actions.map((action) => action.events) ?? [1]));

  return (
    <section className="country-page">
      <header className="page-header country-header">
        <div>
          <p className="eyebrow">Country dossier · {code}</p>
          <h1>
            <span aria-hidden="true" className="country-flag">
              {info.flag}
            </span>{' '}
            {info.name}
          </h1>
          {radar !== null ? (
            <span className={`status-badge status-${radar.status}`}>{STATUS_LABEL[radar.status]}</span>
          ) : null}
        </div>

        <div className="country-actions">
          <button aria-pressed={pinned} onClick={() => { toggle(code); }} type="button">
            {pinned ? '★ Watching' : '☆ Watch'}
          </button>
          <button onClick={share} type="button">
            {copied ? 'Link copied' : 'Share'}
          </button>
        </div>
      </header>

      {dossier.status === 404 ? (
        <section className="panel">
          <p>No events have been reported for {info.name} in the last 14 days.</p>
          <Link to="/briefing">← Back to the briefing</Link>
        </section>
      ) : null}

      {dossier.error !== null && dossier.status !== 404 ? (
        <p className="panel" role="alert">
          This dossier is unavailable right now ({dossier.error}).
        </p>
      ) : null}

      {dossier.loading && data === null ? (
        <div aria-busy="true" className="panel skeleton">
          Compiling the dossier…
        </div>
      ) : null}

      {data !== null ? (
        <>
          <section className="panel summary-panel">
            <p className="eyebrow">Situation summary</p>
            <ul className="summary-list">
              {countrySummary(data).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          {radar !== null ? (
            <div className="kpi-grid">
              <div className="metric-card">
                <span>Recent events</span>
                <strong>{radar.recent.events.toLocaleString()}</strong>
                <small>{radar.recent.mentions.toLocaleString()} media mentions</small>
              </div>
              <div className="metric-card">
                <span>Conflict share</span>
                <strong>{percent(radar.recent.conflictShare)}</strong>
                <small>baseline {percent(radar.baseline.conflictShare)}</small>
              </div>
              <div className="metric-card">
                <span>Conflict vs. expected</span>
                <strong>
                  {String(radar.recent.conflictEvents)}
                  <em> / {radar.baseline.expectedConflictEvents === null ? '—' : radar.baseline.expectedConflictEvents.toFixed(0)}</em>
                </strong>
                <small>{radar.conflictZ === null ? 'building baseline' : `${radar.conflictZ > 0 ? '+' : ''}${radar.conflictZ.toFixed(1)}σ`}</small>
              </div>
              <div className="metric-card">
                <span>Average Goldstein</span>
                <GoldsteinMeter value={radar.recent.averageGoldstein ?? 0} />
              </div>
              <div className="metric-card">
                <span>Media tone</span>
                <strong>{radar.recent.averageTone === null ? '—' : radar.recent.averageTone.toFixed(1)}</strong>
                <small>{radar.recent.averageTone === null ? '' : describeTone(radar.recent.averageTone)}</small>
              </div>
            </div>
          ) : null}

          <section className="chart-card">
            <div className="chart-header">
              <div>
                <p className="eyebrow">14-day timeline</p>
                <h3>Cooperation vs. conflict</h3>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={data.daily} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke={palette.grid} vertical={false} />
                  <XAxis axisLine={{ stroke: palette.axis }} tickLine={false} dataKey="day" minTickGap={16} tickFormatter={(day: string) => day.slice(5)} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={44} />
                  <Tooltip cursor={{ fill: palette.grid }} />
                  <Legend />
                  <Bar dataKey="verbalCooperation" fill={palette.cooperationSoft} name="Verbal cooperation" stackId="q" />
                  <Bar dataKey="materialCooperation" fill={palette.cooperation} name="Material cooperation" stackId="q" />
                  <Bar dataKey="verbalConflict" fill={palette.tension} name="Verbal conflict" stackId="q" />
                  <Bar dataKey="materialConflict" fill={palette.violence} name="Material conflict" stackId="q" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="dossier-grid">
            <section className="panel">
              <p className="eyebrow">What is happening</p>
              <h2>Actions</h2>
              <ul className="bar-list">
                {data.actions.slice(0, 10).map((action) => (
                  <li key={action.rootCode}>
                    <span className="bar-label">{rootLabel(action.rootCode)}</span>
                    <span className="bar-track">
                      <span
                        className={`bar-fill fill-${rootStance(action.rootCode)}`}
                        style={{ width: `${((action.events / maxAction) * 100).toFixed(1)}%` }}
                      />
                    </span>
                    <span className="bar-value">{action.events.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel">
              <p className="eyebrow">Who is involved</p>
              <h2>Counterparts</h2>
              <ul className="counterpart-list">
                {data.counterparts.map((counterpart) => {
                  const actor = fromCameo(counterpart.code);
                  const body = (
                    <>
                      <span aria-hidden="true">{actor.flag}</span>
                      <span className="counterpart-name">{actor.name}</span>
                      <span className="counterpart-split" title={`${String(Math.round(counterpart.conflictShare * 100))}% conflictual`}>
                        <span className="split-conflict" style={{ width: `${(counterpart.conflictShare * 100).toFixed(0)}%` }} />
                      </span>
                      <span className="bar-value">{counterpart.events.toLocaleString()}</span>
                    </>
                  );
                  return (
                    <li key={counterpart.code}>
                      {actor.fips !== null && actor.fips !== code ? (
                        <Link className="counterpart-row" to={`/countries/${actor.fips}`}>{body}</Link>
                      ) : (
                        <span className="counterpart-row">{body}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="legend-note">Bar = share of conflictual events</p>
            </section>

            <section className="panel">
              <p className="eyebrow">Named actors</p>
              <h2>Key players</h2>
              <ul className="actor-list">
                {data.actors.map((actor) => (
                  <li key={actor.name}>
                    <span>{actor.name}</span>
                    <GoldsteinMeter compact value={actor.averageGoldstein} />
                    <span className="bar-value">{actor.events.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Last 72 hours</p>
                <h2>Top stories in {info.name}</h2>
              </div>
            </div>
            {data.stories.length === 0 ? <p>No stories in the last 72 hours.</p> : <StoryList showCountry={false} stories={data.stories} />}
          </section>
        </>
      ) : null}
    </section>
  );
}
