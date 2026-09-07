import { countExpiredEvents, deleteExpiredEvents } from '../repositories/retention.repository.js';

export async function runRetentionSweep(retentionDays: number, enabled: boolean): Promise<void> {
  const expired = await countExpiredEvents(retentionDays);

  console.info('[retention]', expired, 'events older than', retentionDays, 'days');

  if (!enabled) {
    console.info('[retention] deletion disabled; dry run only');

    return;
  }

  const deleted = await deleteExpiredEvents(retentionDays);

  console.info('[retention] deleted', deleted, 'events');
}
