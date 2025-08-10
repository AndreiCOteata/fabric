
# Fabric Matrix Test

## A tiny monorepo with:
- omdb-backend-api - calls OMDb and normalizes results
- backend-api - caches to DB, dedupes posters/movies, exposes fetch endpoints
- frontend-app - simple UI (3 buttons + results)

## Prerequisites

```bash
brew install nvm pnpm
nvm install --lts
```

Verify:
```bash
node -v
pnpm -v
```

If you're using nvm, run ```nvm use``` in each terminal

## Install dependencies (workspace root)
```bash
pnpm install
```
This installs everything for all packages/apps

## Environment variables

### apps/omdb-backend-api:
```bash
cp apps/omdb-backend-api/.env.example apps/omdb-backend-api/.env
```
.env.example:
```env
PORT=4001
OMDB_API_KEY=your_api_key_here
```

### apps/backend-api
```bash
cp apps/backend-api/.env.example apps/backend-api/.env
```
.env.example:
```env
DATABASE_URL="file:./prisma/dev.db"
PORT=4000
OMDB_BACKEND_URL=http://localhost:4001
REFRESH_TIME_MS=3600000
```
*REFRESH_TIME_MS* controls when backend-api will re-fetch from omdb-backend (1h by default).

## Database (Prisma + SQLite)
```bash
cd apps/backend-api
pnpm prisma generate
pnpm prisma migrate dev --name init
```
This creates/updates dev.db and generates Prisma Client.
```angular2html
To reset during dev:
rm apps/backend-api/prisma/dev.db && pnpm --filter backend-api prisma migrate dev --name init
```

## Run the apps

Use three terminals:

### 1. OMDB backend

```bash
cd apps/omdb-backend-api
pnpm dev
```
### 2. Backend-api

```bash
cd apps/backend-api
pnpm dev
```

### 3. Frontend

```bash
cd apps/frontend-app
pnpm dev
```
## Testing

### Backend (both services)

Run per app:

```bash
pnpm --filter omdb-backend-api test
pnpm --filter backend-api test
```

- Tests use Vitest + Supertest
- External HTTP (fetch) is mocked with vi.spyOn(global, 'fetch')
- Backend-api tests also use in-memory fakes for the DB port and import-log port

### Frontend unit/integration

```bash
pnpm --filter frontend-app test
```
```bash
pnpm --filter frontend-app test:watch
```
- Uses Vitest + Reach Testing Library
- MSW (Mock Service Worker) moks */api/fetch/* so no servers are required
- Test env is jsdom

Front-of-house test file examples live in apps/frontend-app/src/*.test.tsx.

## Architecture snapshot
- @acme/lib-contracts: shared Zod schemas/types for API contracts
- @acme/lib-db: DB port (interfaces), used by backend-api
- apps/omdb-backend-api: fetches from OMDb, normalizes to contracts
- apps/backend-api: fetches/saves/dedupes/refreshes; returns contracts to UI
- apps/frontend-app: minimal UI with 3 buttons → /api/fetch/* → cards
