import { Link } from 'react-router';

import { actorName, rootLabel, rootStance, timeAgo } from '../../lib/cameo';
import { fromFips } from '../../lib/countries';

import type { Story } from '../../schemas/insights.schema';

import { CountryMark } from '../ui/CountryMark';
import { Icon } from '../ui/Icon';

import { GoldsteinMeter } from './GoldsteinMeter';

interface StoryListProps {
  stories: Story[];
  showCountry?: boolean;
}

function headlineFor(story: Story): string {
  if (story.headline !== story.domain) {
    return story.headline;
  }

  /* No readable slug: describe the story from its actors and place. */
  const actors = story.actors.length > 0 ? [...new Set(story.actors.map((actor) => actorName(actor)))].join(' & ') : 'Report';

  return `${actors}: ${rootLabel(story.rootCode).toLowerCase()}${story.place === null ? '' : ` in ${story.place.split(',')[0] ?? story.place}`}`;
}

export function StoryList({ stories, showCountry = true }: StoryListProps) {
  return (
    <ol className="story-list">
      {stories.map((story, index) => {
        const country = fromFips(story.countryCode);
        const stance = rootStance(story.rootCode);

        return (
          <li className={`story-card stance-${stance}`} key={story.url}>
            <span className="story-rank">{String(index + 1).padStart(2, '0')}</span>

            <div className="story-body">
              <a className="story-headline" href={story.url} rel="noopener noreferrer" target="_blank">
                {headlineFor(story)}
                <Icon className="headline-icon" name="arrow-up-right" />
              </a>

              <div className="story-meta">
                {showCountry && story.countryCode !== null ? (
                  <Link className="story-country" to={`/countries/${story.countryCode}`}>
                    <CountryMark country={country} /> {country.name}
                  </Link>
                ) : null}

                <span className={`story-tag tag-${stance}`}>{rootLabel(story.rootCode)}</span>

                <span>{story.domain}</span>

                {story.outlets > 1 ? <span>+{String(story.outlets - 1)} outlets</span> : null}

                <span>{story.mentions.toLocaleString()} mentions</span>

                <span>{timeAgo(story.lastSeen)}</span>
              </div>
            </div>

            <div className="story-side">
              <GoldsteinMeter compact value={story.averageGoldstein} />
              <Link className="story-event-link" to={`/events/${story.eventId}`}>
                Event <Icon name="arrow-right" />
              </Link>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
