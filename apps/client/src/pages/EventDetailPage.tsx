import { Link, useLoaderData } from 'react-router';

import { GoldsteinMeter } from '../components/insights/GoldsteinMeter';

import { actorName, describeTone, QUAD_LABELS, rootLabel, rootStance, rootVerb } from '../lib/cameo';
import { fromCameo, fromFips } from '../lib/countries';

import type { EventDetailLoaderData } from '../router/loaders/event-detail.loader';

export function EventDetailPage() {
  const { event } = useLoaderData<EventDetailLoaderData>();

  const place = fromFips(event.location?.countryCode);
  const source = fromCameo(event.actors.source.countryCode);
  const target = fromCameo(event.actors.target.countryCode);
  const stance = rootStance(event.action.rootCode);

  const sourceName = actorName(event.actors.source.name, 'An unidentified actor');
  const targetName = actorName(event.actors.target.name, 'an unidentified party');

  return (
    <section className="event-detail">
      <p className="eyebrow">Event intelligence · {event.eventDate}</p>

      <h1 className="event-sentence">
        {sourceName} <span className={`verb verb-${stance}`}>{rootVerb(event.action.rootCode)}</span>{' '}
        {targetName}
      </h1>

      <div className="event-detail-tags">
        <span className={`story-tag tag-${stance}`}>{rootLabel(event.action.rootCode)}</span>
        <span className="story-tag">{QUAD_LABELS[event.action.quadClass.label]}</span>
        {place.fips !== null ? (
          <Link className="story-country" to={`/countries/${place.fips}`}>
            {place.flag} {event.location?.name ?? place.name} · open dossier →
          </Link>
        ) : (
          <span>{event.location?.name ?? 'Location unknown'}</span>
        )}
      </div>

      <div className="kpi-grid">
        <div className="metric-card">
          <span>Goldstein impact</span>
          <GoldsteinMeter value={event.action.goldsteinScale} />
        </div>
        <div className="metric-card">
          <span>Media tone</span>
          <strong>{event.metrics.averageTone.toFixed(1)}</strong>
          <small>{describeTone(event.metrics.averageTone)}</small>
        </div>
        <div className="metric-card">
          <span>Coverage</span>
          <strong>{event.metrics.mentions.toLocaleString()}</strong>
          <small>
            mentions · {String(event.metrics.sources)} sources · {String(event.metrics.articles)} articles
          </small>
        </div>
      </div>

      <section className="panel">
        <p className="eyebrow">Actors</p>
        <div className="actor-pair">
          <div>
            <span className="actor-role">Source</span>
            <strong>{actorName(event.actors.source.name, 'Unknown')}</strong>
            <span>
              {source.flag} {source.code === '' ? 'No country' : source.name}
            </span>
          </div>
          <span aria-hidden="true" className={`actor-arrow verb-${stance}`}>
            →
          </span>
          <div>
            <span className="actor-role">Target</span>
            <strong>{actorName(event.actors.target.name, 'Unknown')}</strong>
            <span>
              {target.flag} {target.code === '' ? 'No country' : target.name}
            </span>
          </div>
        </div>
        <p className="legend-note">
          CAMEO code {event.action.code} · GDELT event {event.id}
          {event.isRootEvent ? ' · lead event of its article' : ''}
        </p>
      </section>

      <section className="panel event-source">
        <p className="eyebrow">Source</p>

        {event.sourceUrl !== null ? (
          <>
            <a className="story-headline" href={event.sourceUrl} rel="noopener noreferrer" target="_blank">
              Read the source article ↗
            </a>

            <p className="event-source-url">{event.sourceUrl}</p>
          </>
        ) : (
          <p>No source article URL is available for this event.</p>
        )}
      </section>

      <div className="event-detail-nav">
        <Link to="/briefing">← Briefing</Link>
        <Link to="/dashboard">Event explorer</Link>
      </div>
    </section>
  );
}
