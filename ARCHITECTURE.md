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