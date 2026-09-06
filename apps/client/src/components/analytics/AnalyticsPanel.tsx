import { useMemo, useState } from 'react';

import { useTrendData } from '../../hooks/useTrendData';

import type { TrendBucket } from '../../schemas/analytics.schema';

import { EventVolumeChart } from './EventVolumeChart';

import { ImpactTrendChart } from './ImpactTrendChart';

export function AnalyticsPanel() {
  const [bucket, setBucket] = useState<TrendBucket>('day');

  const { data, loading, error, cacheHit } = useTrendData(bucket);

  const totalEvents = useMemo(
    () =>
      data.reduce(
        (total, point) => total + point.eventCount,

        0,
      ),

    [data],
  );

  const conflictEvents = useMemo(
    () =>
      data.reduce(
        (total, point) => total + point.conflictEvents,

        0,
      ),

    [data],
  );

  const conflictShare = totalEvents === 0 ? 0 : (conflictEvents / totalEvents) * 100;

  return (
    <section>
      <div className="analytics-toolbar">
        <div>
          <p className="eyebrow">Time series</p>

          <h2>Event Analytics</h2>
        </div>

        <div className="bucket-controls">
          <button
            aria-pressed={bucket === 'day'}
            onClick={() => {
              setBucket('day');
            }}
            type="button"
          >
            Daily
          </button>

          <button
            aria-pressed={bucket === 'week'}
            onClick={() => {
              setBucket('week');
            }}
            type="button"
          >
            Weekly
          </button>
        </div>
      </div>

      <div className="analytics-status">
        {loading ? (
          <span>Loading analytics…</span>
        ) : (
          <span>Cache: {cacheHit ? 'hit' : 'miss'}</span>
        )}
      </div>

      {error !== null ? (
        <div className="analytics-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="analytics-summary">
        <article className="metric-card">
          <span>Total Events</span>

          <strong>{totalEvents}</strong>
        </article>

        <article className="metric-card">
          <span>Conflict Events</span>

          <strong>{conflictEvents}</strong>
        </article>

        <article className="metric-card">
          <span>Conflict Share</span>

          <strong>{conflictShare.toFixed(1)}%</strong>
        </article>
      </div>

      {data.length === 0 && !loading ? (
        <div className="panel">No analytics data matches the current date range.</div>
      ) : (
        <div className="analytics-grid">
          <EventVolumeChart data={data} />

          <ImpactTrendChart data={data} />
        </div>
      )}
    </section>
  );
}
