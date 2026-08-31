import { fetchLatestGdeltEvents } from '../services/gdelt/gdelt-service.js';

async function main(): Promise<void> {
  const result = await fetchLatestGdeltEvents();

  const withLocation = result.events.filter((event) => event.location !== null).length;

  const conflictEvents = result.events.filter(
    (event) => event.action.quadClass.code === 3 || event.action.quadClass.code === 4,
  ).length;

  const rootEvents = result.events.filter((event) => event.isRootEvent).length;

  console.log(
    JSON.stringify(
      {
        exportUrl: result.exportUrl,

        totalRows: result.totalRows,
        acceptedRows: result.events.length,
        rejectedRows: result.rejectedRows,

        statistics: {
          withLocation,
          withoutLocation: result.events.length - withLocation,

          conflictEvents,
          cooperationEvents: result.events.length - conflictEvents,

          rootEvents,
        },

        sample: result.events.slice(0, 3),
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown GDELT ingestion error');
  }

  process.exitCode = 1;
}
