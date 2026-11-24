import { countExpiredEvents, deleteExpiredEvents } from '../repositories/retention.repository.js';

export interface RetentionSweepResult {
  enabled: boolean;
  retentionDays: number;
  expiredBefore: number;
  deleted: number;
  remaining: number;
}

export async function runRetentionSweep(
  retentionDays: number,
  enabled: boolean,
  timeBudgetMs?: number,
): Promise<RetentionSweepResult> {
  const expired = await countExpiredEvents(retentionDays);

  console.info('[retention]', expired, 'events older than', retentionDays, 'days');

  if (!enabled) {
    console.info('[retention] deletion disabled; dry run only');

    return { enabled, retentionDays, expiredBefore: expired, deleted: 0, remaining: expired };
  }

  const deadline = timeBudgetMs === undefined ? Number.POSITIVE_INFINITY : Date.now() + timeBudgetMs;

  const deleted = await deleteExpiredEvents(retentionDays, deadline);

  console.info('[retention] deleted', deleted, 'events');

  return {
    enabled,
    retentionDays,
    expiredBefore: expired,
    deleted,
    remaining: Math.max(0, expired - deleted),
  };
}
