import type { CountryDossier, RadarCountry, RadarResponse, Story } from '../schemas/insights.schema';

import { rootLabel } from './cameo';
import { fromCameo, fromFips } from './countries';

export function windowLabel(hours: number): string {
  if (hours >= 23.5) return 'the last 24 hours';
  if (hours >= 1.5) return `the last ${String(Math.round(hours))} hours`;
  return 'the last hour';
}

export function baselineLabel(hours: number): string {
  if (hours >= 48) return `the previous ${String(Math.round(hours / 24))} days`;
  if (hours >= 1.5) return `the previous ${String(Math.round(hours))} hours`;
  return 'too little history for a baseline yet';
}

function multiple(country: RadarCountry): number | null {
  const expected = country.baseline.expectedConflictEvents;
  if (expected === null || expected < 1) return null;
  return country.recent.conflictEvents / expected;
}

function formatMultiple(value: number): string {
  return value >= 10 ? `${String(Math.round(value))}×` : `${value.toFixed(1)}×`;
}

export interface Insight {
  kind: 'escalating' | 'cooling' | 'story' | 'quiet';
  text: string;
  to?: string;
  href?: string;
}

export function briefingInsights(radar: RadarResponse['data'], stories: Story[]): Insight[] {
  const insights: Insight[] = [];
  const span = windowLabel(radar.window.recentHours);

  const hottest = radar.escalating[0];

  if (hottest !== undefined) {
    const info = fromFips(hottest.countryCode);
    const ratio = multiple(hottest);
    insights.push({
      kind: 'escalating',
      to: `/countries/${hottest.countryCode}`,
      text:
        ratio === null
          ? `${info.name} logged ${String(hottest.recent.conflictEvents)} conflict events in ${span}, far above its baseline.`
          : `Conflict reporting in ${info.name} is running at ${formatMultiple(ratio)} its usual level over ${span}.`,
    });
  }

  const calmest = radar.cooling[0];

  if (calmest !== undefined) {
    const info = fromFips(calmest.countryCode);
    const ratio = multiple(calmest);
    insights.push({
      kind: 'cooling',
      to: `/countries/${calmest.countryCode}`,
      text:
        ratio === null
          ? `${info.name} is quieter than usual.`
          : `${info.name} is cooling: conflict events are ${String(Math.round((1 - ratio) * 100))}% below its baseline.`,
    });
  }

  /* Prefer a story with a readable headline over a bare domain. */
  const top = stories.find((story) => story.headline !== story.domain) ?? stories[0];

  if (top !== undefined) {
    const info = fromFips(top.countryCode);
    insights.push({
      kind: 'story',
      href: top.url,
      text: `Most-covered story: “${top.headline}” (${info.name}) — ${top.mentions.toLocaleString()} mentions${top.outlets > 1 ? ` across ${String(top.outlets)} outlets` : ''}.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      kind: 'quiet',
      text: 'No country is moving outside its normal range right now.',
    });
  }

  return insights;
}

export function countrySummary(dossier: CountryDossier): string[] {
  const info = fromFips(dossier.countryCode);
  const lines: string[] = [];
  const radar = dossier.radar;
  const span = windowLabel(dossier.window.recentHours);

  if (radar !== null) {
    const ratio = multiple(radar);
    const share = radar.recent.conflictShare;

    if (radar.status === 'escalating' && ratio !== null) {
      lines.push(`Escalating: conflict events in ${span} are ${formatMultiple(ratio)} what ${info.name}'s baseline predicts.`);
    } else if (radar.status === 'cooling' && ratio !== null) {
      lines.push(`Cooling: conflict events in ${span} are ${String(Math.round((1 - ratio) * 100))}% below baseline.`);
    } else {
      lines.push(`Activity in ${span} is within ${info.name}'s normal range.`);
    }

    if (share !== null) {
      lines.push(`${String(Math.round(share * 100))}% of ${String(radar.recent.events)} recent events are conflictual${radar.baseline.conflictShare === null ? '' : ` (baseline ${String(Math.round(radar.baseline.conflictShare * 100))}%)`}.`);
    }
  }

  const topAction = dossier.actions[0];
  const totalActions = dossier.actions.reduce((sum, action) => sum + action.events, 0);

  if (topAction !== undefined && totalActions > 0) {
    lines.push(`Most common action: ${rootLabel(topAction.rootCode).toLowerCase()} (${String(Math.round((topAction.events / totalActions) * 100))}% of events).`);
  }

  const foreign = dossier.counterparts.find((counterpart) => {
    const actor = fromCameo(counterpart.code);
    return actor.fips !== null && actor.fips !== dossier.countryCode;
  });

  if (foreign !== undefined) {
    const actor = fromCameo(foreign.code);
    lines.push(`Leading foreign actor: ${actor.name}, in ${String(foreign.events)} events (${String(Math.round(foreign.conflictShare * 100))}% conflictual).`);
  }

  return lines;
}
