import { useState } from 'react';

import { Link } from 'react-router';

import { fetchRadar, fetchStories } from '../api/insights.api';

import { RadarList } from '../components/insights/RadarList';
import { StoryList } from '../components/insights/StoryList';

import { useAsync } from '../hooks/useAsync';

import { timeAgo } from '../lib/cameo';
import { fromFips } from '../lib/countries';
import { baselineLabel, briefingInsights, windowLabel } from '../lib/narrative';
import { openCommandPalette } from '../lib/palette';

import { useWatchlistStore } from '../stores/useWatchlistStore';

const STORY_WINDOWS = [6, 24, 72] as const;

export function BriefingPage() {
  const [storyHours, setStoryHours] = useState<(typeof STORY_WINDOWS)[number]>(24);

  const radar = useAsync('radar', (signal) => fetchRadar(signal).then((response) => response.data));

  const stories = useAsync(`stories:${String(storyHours)}`, (signal) =>
    fetchStories({ hours: storyHours, limit: 12 }, signal).then((response) => response.data),
  );

  const watchlist = useWatchlistStore((state) => state.codes);

  const radarData = radar.data;

  const insights = radarData === null ? [] : briefingInsights(radarData, stories.data ?? []);

  const watched =
    radarData === null
      ? []
      : watchlist
          .map((code) => radarData.countries.find((country) => country.countryCode === code))
          .filter((country) => country !== undefined);

  return (
    <section className="briefing">
      <header className="page-header briefing-header">
        <div>
          <p className="eyebrow">Global briefing</p>
          <h1>What changed in the world</h1>
          {radarData !== null ? (
            <p className="briefing-window">
              Comparing {windowLabel(radarData.window.recentHours)} with{' '}
              {baselineLabel(radarData.window.baselineHours)}
              {radarData.window.end !== null ? ` · data through ${timeAgo(radarData.window.end)}` : ''}
            </p>
          ) : null}
        </div>

        <div className="briefing-stats">
          <div className="stat">
            <span>Recent events</span>
            <strong>{radarData === null ? '—' : radarData.totals.recentEvents.toLocaleString()}</strong>
          </div>
          <div className="stat">
            <span>Countries</span>
            <strong>{radarData === null ? '—' : String(radarData.totals.countries)}</strong>
          </div>
          <button className="palette-trigger" onClick={openCommandPalette} type="button">
            Find a country <kbd>⌘K</kbd>
          </button>
        </div>
      </header>

      {radar.error !== null ? (
        <p className="panel" role="alert">
          The briefing is unavailable right now ({radar.error}). Try again shortly.
        </p>
      ) : null}

      {radar.loading && radarData === null ? <div className="panel skeleton" aria-busy="true">Scanning every country for unusual activity…</div> : null}

      {insights.length > 0 ? (
        <section aria-label="Key insights" className="insight-strip">
          {insights.map((insight) => (
            <div className={`insight insight-${insight.kind}`} key={insight.text}>
              {insight.to !== undefined ? (
                <Link to={insight.to}>{insight.text}</Link>
              ) : insight.href !== undefined ? (
                <a href={insight.href} rel="noopener noreferrer" target="_blank">
                  {insight.text}
                </a>
              ) : (
                <span>{insight.text}</span>
              )}
            </div>
          ))}
        </section>
      ) : null}

      {watched.length > 0 ? (
        <section className="panel watchlist-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Your watchlist</p>
              <h2>Pinned countries</h2>
            </div>
          </div>
          <div className="watchlist-grid">
            {watched.map((country) => {
              const info = fromFips(country.countryCode);
              return (
                <Link className={`watch-card status-${country.status}`} key={country.countryCode} to={`/countries/${country.countryCode}`}>
                  <span className="watch-flag">{info.flag}</span>
                  <strong>{info.name}</strong>
                  <span>{country.status === 'steady' ? 'Normal range' : country.status}</span>
                  <small>
                    {String(country.recent.conflictEvents)} conflict / {String(country.recent.events)} events
                  </small>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {radarData !== null ? (
        <div className="radar-grid">
          <RadarList
            countries={radarData.escalating}
            emptyText="No country is significantly above its conflict baseline."
            eyebrow="Escalation radar"
            title="Heating up"
            tone="escalating"
          />
          <RadarList
            countries={radarData.cooling}
            emptyText="No country is significantly below its baseline."
            eyebrow="De-escalation"
            title="Cooling down"
            tone="cooling"
          />
          <RadarList
            countries={radarData.mostCovered}
            emptyText="No coverage yet."
            eyebrow="Media attention"
            title="Most covered"
            tone="coverage"
          />
        </div>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Top stories</p>
            <h2>What the world is reporting</h2>
          </div>
          <div className="panel-tabs" role="group" aria-label="Story window">
            {STORY_WINDOWS.map((hours) => (
              <button
                aria-pressed={storyHours === hours}
                key={hours}
                onClick={() => {
                  setStoryHours(hours);
                }}
                type="button"
              >
                {hours}h
              </button>
            ))}
          </div>
        </div>

        {stories.error !== null ? <p role="alert">Stories are unavailable ({stories.error}).</p> : null}
        {stories.loading && stories.data === null ? <p>Ranking stories…</p> : null}
        {stories.data !== null ? <StoryList stories={stories.data} /> : null}
      </section>

      <p className="method-note">
        How the radar works: each country&apos;s conflict events (CAMEO verbal and material conflict) in the
        recent window are compared with what its share of baseline coverage predicts, scaled to today&apos;s
        global news volume. Scores are Poisson z-scores (σ); ≥2σ with at least 8 events counts as
        escalating. GDELT records reported events, not verified facts.
      </p>
    </section>
  );
}
