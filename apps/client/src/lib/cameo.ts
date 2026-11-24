/*
 * CAMEO root event codes (the first two digits of an EventCode), in
 * plain English. Codes 01–05 are verbal cooperation, 06–08 material
 * cooperation, 09–14 verbal conflict, 15–20 material conflict.
 */
const ROOT_LABELS: Record<string, { label: string; verb: string }> = {
  '01': { label: 'Public statement', verb: 'made a statement about' },
  '02': { label: 'Appeal', verb: 'appealed to' },
  '03': { label: 'Intent to cooperate', verb: 'signalled cooperation with' },
  '04': { label: 'Consultation', verb: 'consulted with' },
  '05': { label: 'Diplomatic cooperation', verb: 'cooperated diplomatically with' },
  '06': { label: 'Material cooperation', verb: 'cooperated materially with' },
  '07': { label: 'Aid', verb: 'provided aid to' },
  '08': { label: 'Concession', verb: 'yielded to' },
  '09': { label: 'Investigation', verb: 'investigated' },
  '10': { label: 'Demand', verb: 'made demands of' },
  '11': { label: 'Disapproval', verb: 'criticised' },
  '12': { label: 'Rejection', verb: 'rejected' },
  '13': { label: 'Threat', verb: 'threatened' },
  '14': { label: 'Protest', verb: 'protested against' },
  '15': { label: 'Military posturing', verb: 'mobilised against' },
  '16': { label: 'Reduced relations', verb: 'cut ties with' },
  '17': { label: 'Coercion', verb: 'coerced' },
  '18': { label: 'Assault', verb: 'assaulted' },
  '19': { label: 'Armed fighting', verb: 'fought' },
  '20': { label: 'Mass violence', verb: 'used mass violence against' },
};

export function rootLabel(rootCode: string | null | undefined): string {
  return ROOT_LABELS[rootCode ?? '']?.label ?? `Action ${rootCode ?? '?'}`;
}

export function rootVerb(rootCode: string | null | undefined): string {
  return ROOT_LABELS[rootCode ?? '']?.verb ?? 'interacted with';
}

export type Stance = 'cooperation' | 'conflict' | 'violence';

export function rootStance(rootCode: string | null | undefined): Stance {
  const code = Number(rootCode);

  if (code >= 18) {
    return 'violence';
  }

  return code >= 9 ? 'conflict' : 'cooperation';
}

export const QUAD_LABELS = {
  verbal_cooperation: 'Verbal cooperation',
  material_cooperation: 'Material cooperation',
  verbal_conflict: 'Verbal conflict',
  material_conflict: 'Material conflict',
} as const;

/** Colour for a Goldstein score: red (−10, destabilising) to green (+10). */
export function goldsteinColor(score: number): string {
  if (score <= -5) return 'var(--danger)';
  if (score < 0) return 'var(--amber)';
  if (score < 3) return 'var(--cyan)';
  return 'var(--signal)';
}

export function describeGoldstein(score: number): string {
  if (score <= -7) return 'Severely destabilising';
  if (score <= -3) return 'Destabilising';
  if (score < 0) return 'Mildly tense';
  if (score < 3) return 'Neutral to mildly cooperative';
  if (score < 7) return 'Cooperative';
  return 'Strongly cooperative';
}

export function describeTone(tone: number): string {
  if (tone <= -5) return 'Very negative coverage';
  if (tone <= -2) return 'Negative coverage';
  if (tone < 2) return 'Neutral coverage';
  if (tone < 5) return 'Positive coverage';
  return 'Very positive coverage';
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));

  if (minutes < 60) return `${String(minutes)}m ago`;

  const hours = Math.round(minutes / 60);

  if (hours < 48) return `${String(hours)}h ago`;

  return `${String(Math.round(hours / 24))}d ago`;
}
