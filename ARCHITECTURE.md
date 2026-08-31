# Architecture

## Repository Structure

The application is implemented as an npm-workspaces monorepo.

- `apps/client`: React/Vite frontend
- `apps/server`: Express backend
- `packages/*`: reusable cross-application packages

## Runtime Boundaries

The React application executes in the browser.

The Express application executes in a trusted server environment.

Secrets must never be exposed through `VITE_*` environment variables.

## Backend Structure

The Express application instance is defined separately from the network
bootstrap process.

- `app.ts`: constructs the Express application
- `index.ts`: validates configuration and starts the HTTP listener

This separation enables future integration testing with Supertest without
starting a real network listener.

## Runtime Validation

TypeScript validates data at compile time but cannot guarantee the shape of
external runtime data.

Zod is therefore used at trust boundaries including:

- environment variables
- incoming API parameters
- GDELT responses
- frontend API responses

## Client State Strategy

Server-derived event data will not be stored directly in Zustand.

Zustand will be reserved for client-controlled state such as:

- active filters
- selected regions
- open/closed panels
- selected event
- modal state

Server data will be accessed through dedicated data-fetching hooks.

## Future Shared Schemas

A `packages/shared` workspace may contain API contracts and Zod schemas that
are safe to share between client and server.

## GDELT Ingestion

The backend consumes the GDELT 2.0 Event Database export stream.

The latest available export is discovered through GDELT's
`lastupdate.txt` manifest.

Ingestion flow:

1. Fetch the latest update manifest.
2. Locate the `.export.CSV.zip` Event archive.
3. Download and decompress the archive.
4. Parse the tab-delimited Event rows.
5. Normalize external GDELT fields into the application's internal
   `GdeltEvent` model.
6. Validate all normalized events using Zod.
7. Reject malformed records before they cross into the application.

The application intentionally does not expose raw GDELT records to
downstream components. It considers raw GDELT records as untrustworthy source, and filters them for data display.

The detailed guide through the gdelt-related files is as follows:
- [env.ts](apps/server/src/config/env.ts) now contains `GDELT_LASTUPDATE_URL`, URL from which the GDELT data is fetched.
- [gdelt-event.schema.ts](apps/server/src/schemas/) uses `z` from Zod to check if all the values follow their corresponding formats (e.g. latitude and longitude being `z.number().min(-90).max(90) and z.number().min(-180).max(180), respectively)
- In [src/services/gdelt](apps/server/src/services/gdelt), [gdelt-columns.ts](apps/server/src/services/gdelt/gdelt-columns.ts) defines an object representing semantic meanings of each numeric index. This helps contextualising the access of GDELT data using indices. [gdelt-parser.ts](apps/server/src/services/gdelt/gdelt-parser.ts) parses the given GDELT data into features such as `eventDate`, `addedAt`, `quadClass` and `goldsteinScale`. Finally, [gdelt-service.ts](apps/server/src/services/gdelt/gdelt-service.ts) fetches the latest updated text, extracts an URL for `.export.CSV.zip`, fetch the ZIP archive, unzip it into `int8` array and restore string from the array.

### Geographic Choice

`ActionGeo_*` is used as the primary map coordinate because it
represents the geographic location closest to the event action itself.

### Goldstein Scale

GoldsteinScale is retained under its original semantic name and is not
treated as a direct measure of incident severity. It describes the
theoretical impact of a CAMEO event type rather than the magnitude of a
specific real-world occurrence.