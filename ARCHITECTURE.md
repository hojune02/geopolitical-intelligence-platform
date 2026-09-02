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

## Persistence and Caching Architecture

### PostgreSQL as the Source of Truth

PostgreSQL is the application's durable source of truth for normalized GDELT events.

Raw GDELT Event exports are never queried directly by client requests. Instead, the ingestion pipeline periodically discovers the latest GDELT export, validates and normalizes its records, and persists the resulting domain objects into PostgreSQL.

The data flow is:

```text
GDELT
  ↓
latest export discovery
  ↓
ZIP download
  ↓
TSV parsing
  ↓
normalization
  ↓
Zod validation
  ↓
PostgreSQL
```

This design decouples upstream ingestion from downstream application traffic. A spike in client requests therefore does not produce a corresponding spike in requests to GDELT.

If GDELT becomes temporarily unavailable, previously ingested events remain queryable from PostgreSQL.

### Database Schema

Normalized events are persisted in the `gdelt_events` table.

`GlobalEventID` is stored as a text primary key rather than a numeric value because it is an identifier rather than a quantity and does not require arithmetic operations.

CAMEO event codes are also stored as text because leading zeroes are semantically significant.

The schema stores:

- event and ingestion timestamps
- Actor1 and Actor2 metadata
- CAMEO event, base, and root codes
- QuadClass
- Goldstein scale
- root-event status
- mention, source, and article counts
- average tone
- action geolocation
- source URL

Database-level constraints provide an additional defensive layer for values such as:

- QuadClass: `1–4`
- Goldstein scale: `-10–10`
- latitude: `-90–90`
- longitude: `-180–180`
- non-negative count metrics

Indexes are defined on fields commonly used for filtering and sorting, including event date, ingestion timestamp, QuadClass, Goldstein scale, location country code, and coordinates.

### Ingestion Batch Tracking

The `ingestion_batches` table records which GDELT exports have already been processed.

Each batch records:

- export URL
- ingestion status
- total parsed rows
- accepted rows
- rejected rows
- number of persisted events
- ingestion timestamp

The export URL acts as the batch identifier.

Before downloading an Event export, the ingestion service checks whether that export has already been successfully processed. Repeated ingestion attempts therefore do not unnecessarily download or process the same GDELT batch.

Event persistence uses PostgreSQL upserts based on `GlobalEventID`, allowing existing events to be safely updated without creating duplicate records.

### Transaction Boundaries

Each ingestion batch is persisted inside a PostgreSQL transaction.

The ingestion flow is:

```text
BEGIN
  ↓
claim ingestion batch
  ↓
upsert validated events
  ↓
mark batch completed
  ↓
COMMIT
```

If persistence fails before completion:

```text
ROLLBACK
```

This prevents a batch from being recorded as successfully ingested when only part of its event data was persisted.

All dynamic SQL values are passed through parameterized queries rather than string interpolation.

---

## Redis Caching

Redis is used as a performance optimization and is never treated as authoritative storage.

The system follows a cache-aside strategy:

```text
API request
    ↓
check Redis
    │
    ├── HIT
    │     ↓
    │  return cached response
    │
    └── MISS
          ↓
      PostgreSQL
          ↓
      serialize result
          ↓
      store in Redis with TTL
          ↓
      return response
```

Cached API results use a bounded time-to-live so stale responses eventually disappear automatically.

If Redis is unavailable, the API falls back to PostgreSQL rather than failing the request.

Therefore:

```text
Redis unavailable
→ degraded performance
→ correct application behavior

PostgreSQL unavailable
→ canonical data unavailable
→ API cannot operate normally
```

This distinction is intentional.

### Manifest Caching

The latest GDELT Event export URL discovered from `lastupdate.txt` is cached briefly in Redis.

This avoids repeatedly querying the GDELT manifest during closely spaced ingestion attempts.

### Cache Invalidation

Cached API responses include a logical event-cache version in their keys.

Conceptually:

```text
api:events:v1:<query-hash>
api:trends:v1:<query-hash>
```

After a new GDELT batch is successfully persisted, the application increments the event-cache version.

Subsequent requests therefore use:

```text
api:events:v2:<query-hash>
```

instead of the previous generation.

Old cache entries are not synchronously deleted; they become unreachable and expire naturally according to their TTL.

This avoids expensive wildcard cache invalidation while ensuring newly ingested events are reflected in future API responses.

---

## REST API Architecture

The backend exposes versioned REST endpoints under:

```text
/api/v1
```

The primary endpoints are:

```text
GET /api/v1/events
GET /api/v1/analytics/trends
```

The API is database-backed. Client requests never directly trigger GDELT ingestion or contact the upstream GDELT service.

The request architecture is:

```text
HTTP request
    ↓
Express route
    ↓
Zod validation
    ↓
service layer
    ↓
Redis cache
    ↓
repository layer
    ↓
PostgreSQL
```

Each layer has a distinct responsibility.

### Route Layer

Routes define the HTTP interface and translate validated application results into HTTP responses.

Routes do not contain SQL or database implementation details.

### Validation Layer

All query parameters are treated as untrusted input and validated with Zod before entering application services.

Supported event filters include:

- page
- page size
- start date
- end date
- geographic country code
- actor
- QuadClass
- minimum Goldstein score
- maximum Goldstein score
- root-event status
- north/south/east/west geographic bounds

Validation also checks relationships between fields.

Examples include:

```text
startDate <= endDate

minGoldstein <= maxGoldstein

south <= north
```

Geographic bounding-box parameters must be supplied as a complete set.

### Pagination

`GET /api/v1/events` implements server-side pagination.

Responses contain:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "totalPages": 0
  }
}
```

The API enforces a maximum page size to prevent individual requests from unintentionally retrieving excessively large datasets.

Pagination and filtering occur inside PostgreSQL rather than after data has been transferred to the application process.

### Geographic Queries

The event endpoint supports bounding-box queries using:

```text
north
south
east
west
```

This capability is intended for the interactive map layer.

Instead of downloading all stored events and filtering them in the browser, future map interactions will query only events within the currently visible geographic region.

International Date Line crossings are handled separately from normal longitude ranges.

### Analytics Endpoint

`GET /api/v1/analytics/trends` performs server-side aggregation of stored GDELT events.

Supported time buckets currently include:

```text
day
week
```

Trend responses contain metrics such as:

- total event count
- conflict-event count
- average Goldstein scale
- average tone

Aggregation remains on the backend so the browser does not need to download large raw datasets merely to calculate chart values.

---

## Repository Layer

Database access is isolated inside repository modules.

Repositories are responsible for:

- constructing parameterized SQL
- applying filters
- pagination
- aggregation
- mapping database rows back into application domain objects

Database row representations are normalized before crossing back into the application layer.

For example:

```text
PostgreSQL DATE
    ↓
repository mapping
    ↓
YYYY-MM-DD string
```

and:

```text
PostgreSQL TIMESTAMPTZ
    ↓
repository mapping
    ↓
ISO-8601 timestamp
```

The normalized objects are validated again using the application's Zod schemas before being returned to higher layers.

This prevents PostgreSQL driver-specific representations from leaking into API contracts.

---

## Centralized Error Handling

The Express application uses centralized error middleware.

Expected application errors are represented by typed `AppError` subclasses containing:

- HTTP status code
- application error code
- user-facing message
- optional structured details

For example, an invalid query returns a structured response such as:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request parameters",
    "details": []
  }
}
```

Unexpected exceptions are logged server-side and converted into a generic HTTP 500 response so implementation details are not exposed to clients.

Unknown routes are handled by a dedicated 404 middleware rather than Express's default HTML response.

The middleware ordering is:

```text
CORS
  ↓
JSON parsing
  ↓
API routes
  ↓
404 handler
  ↓
central error handler
```

---

## Reliability Decisions

The backend intentionally distinguishes required infrastructure from optional infrastructure.

PostgreSQL is required during server startup because it contains the canonical application dataset.

Redis is optional during request processing because it only provides caching.

GDELT availability is not required to serve normal API traffic because ingestion and querying are decoupled.

The resulting dependency behavior is:

```text
GDELT unavailable
→ ingestion temporarily stops
→ existing API data remains available

Redis unavailable
→ cache misses
→ PostgreSQL serves requests directly

PostgreSQL unavailable
→ canonical event data unavailable
→ API startup fails
```

This separation prevents failures in optional or upstream systems from unnecessarily taking down the entire application.

## Client Routing

The client uses React Router Data Mode with a browser router.

Route hierarchy:

- `/`
  - redirects to `/dashboard`
- `/dashboard`
  - dashboard overview
- `/dashboard/heatmap`
  - geographic visualization
- `/events/:eventId`
  - event detail
- unmatched paths
  - custom 404 page

The root `AppLayout` owns application-wide navigation.

`DashboardLayout` is nested inside the application layout and owns
dashboard-specific UI such as the filter panel.

Route loaders are used for route-level data dependencies. Loader
responses are validated against client-side Zod schemas before entering
the React component tree.

Route error boundaries prevent failed loaders or unexpected rendering
errors from producing blank application screens.

## Client State Management

Zustand is reserved for client-owned state.

### useFilterStore

Stores:

- active geographic region
- date range
- Goldstein range
- root-event filtering

### useUIStore

Stores:

- navigation visibility
- filter-panel visibility
- active dashboard panel
- map visualization mode
- global modal state

Server-derived GDELT events are intentionally not stored in Zustand.

The frontend distinguishes:

Client state:

- controlled directly by the user
- stored in Zustand

Server state:

- controlled by the backend
- loaded through route loaders or dedicated data hooks
- validated with Zod
