# Geopolitical Intelligence Platform

A web application for exploring geopolitical event data from GDELT. It ingests event exports into PostgreSQL, serves filtered event and analytics endpoints, and presents maps and trends in a React client.

The interesting part of this project is the boundary between a noisy external feed and an interactive product: records are parsed and validated before storage, imports are tracked by batch, and the client queries normalized data rather than downloading GDELT files directly.

## Repository map

| Area | Start here |
| --- | --- |
| Data ingestion and validation | [`apps/server/src/services/gdelt/`](apps/server/src/services/gdelt/), [`apps/server/src/schemas/gdelt-event.schema.ts`](apps/server/src/schemas/gdelt-event.schema.ts) |
| Persistence and queries | [`apps/server/sql/001_init.sql`](apps/server/sql/001_init.sql), [`apps/server/src/repositories/`](apps/server/src/repositories/) |
| HTTP API | [`apps/server/src/app.ts`](apps/server/src/app.ts), [`apps/server/src/routes/`](apps/server/src/routes/) |
| Client views | [`apps/client/src/pages/`](apps/client/src/pages/), [`apps/client/src/components/`](apps/client/src/components/) |
| Design decisions | [`ARCHITECTURE.md`](ARCHITECTURE.md) |

## Run and verify locally

The project is an npm workspaces monorepo. Install dependencies with `npm ci`, then use `npm run infra:up` for the development services and `npm run dev` for the client and server. Check the server and client environment schemas before starting; local configuration and database setup are required. Do not place server secrets in `VITE_*` variables.

Available checks are `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. These commands describe the repository's verification paths; they are not a claim that a fresh checkout has passed them.

## Scope and limits

GDELT records are reported events, not independently verified facts. The maps and charts support exploration, and their signals should be checked against source material before drawing conclusions. Data freshness depends on ingestion and upstream availability. See the architecture document for the batch, retention, cache, and validation design.
