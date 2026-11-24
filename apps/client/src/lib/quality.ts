import type { Event } from '../schemas/event-api.schema';

import { fromCameo, fromFips } from './countries';

/*
 * GDELT events are coded by software from news text. These checks spot
 * the common ways that coding goes wrong, so the UI can say so instead
 * of presenting a doubtful record as fact. The listing-page rule mirrors
 * gip_is_listing_url() in apps/server/sql/002_listing_source.sql, which
 * keeps such events out of the briefing, stories and dossiers.
 */

const MARKERS =
  'tag|tags|author|authors|category|categories|topic|topics|people|contributors|about|about-us|contact|contact-us|faq|search|offices|terms|terms-service|terms-of-service|privacy|privacy-policy|editorial-standards|artist|discountcodes';

const MARKER_PATH = new RegExp(`(^|/)(${MARKERS})(/[^/0-9]+)?$`);

export function isListingUrl(rawUrl: string | null): boolean {
  if (rawUrl === null) {
    return false;
  }

  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  const path = url.pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
  const query = url.search.replace(/^\?/, '').toLowerCase();

  return (
    (path === '' && !/(^|&)(p|id|articleid|article_id|news_id|story|storyid|post)=/.test(query)) ||
    MARKER_PATH.test(path) ||
    /(^|&)(before|offset|page|updated-max|max-results)=/.test(query) ||
    (query === '' && /^[a-z]+(\/[a-z]+)?$/.test(path) && /[a-z]{3,}s$/.test(path))
  );
}

export interface QualityNote {
  kind: 'source' | 'location' | 'coverage';
  title: string;
  detail: string;
}

export function eventQualityNotes(event: Event): QualityNote[] {
  const notes: QualityNote[] = [];

  if (isListingUrl(event.sourceUrl)) {
    notes.push({
      kind: 'source',
      title: 'The source is not a news article',
      detail:
        'GDELT read this event from a listing, tag or section page rather than an article, so the actors and action are probably a misreading of names on the page. It is left out of the briefing, stories and country dossiers.',
    });
  }

  const place = fromFips(event.location?.countryCode);
  const source = fromCameo(event.actors.source.countryCode);
  const target = fromCameo(event.actors.target.countryCode);

  const actorFips = [source.fips, target.fips].filter((code): code is string => code !== null);

  if (place.fips !== null && actorFips.length === 2 && !actorFips.includes(place.fips)) {
    notes.push({
      kind: 'location',
      title: `Neither actor is from ${place.name}`,
      detail: `GDELT placed this event in ${event.location?.name ?? place.name} because the place appears in the article text, while the actors are from ${source.name} and ${target.name}. The location may be incidental rather than where anything happened.`,
    });
  }

  if (event.metrics.sources <= 1 && event.metrics.mentions <= 5) {
    notes.push({
      kind: 'coverage',
      title: 'Single, lightly covered source',
      detail: `Only one outlet reported this (${String(event.metrics.mentions)} mentions). Treat it as unconfirmed.`,
    });
  }

  return notes;
}
