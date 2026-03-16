# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Wouter + React Query
- **Maps**: Leaflet + react-leaflet + OpenStreetMap
- **Charts**: Recharts (radar charts, elevation profiles)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── route-planner/      # RunRoute - Smart Running Route Planner (React + Vite)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Application: RunRoute - Smart Running Route Planner

A web application that generates personalized running routes based on training goals and environmental conditions.

### Features
- **Route Generation** — Select training goal (mountain hiking, heat tolerance, recovery, speed, endurance, general), distance, time of day, and start location on interactive map
- **Smart Scoring** — Routes scored across 6 dimensions: terrain match, safety, environmental fit, training effectiveness, shade, traffic
- **Interactive Map** — Leaflet/OpenStreetMap with colored route polylines and waypoint markers
- **Score Visualization** — Radar charts for route score breakdown, elevation profile charts
- **User Profile** — Personalization settings for heat tolerance, elevation tolerance, athlete alias
- **Run History** — Log completed runs with perceived effort, track lifetime stats
- **Weather Integration** — Weather summary with recommendations for running conditions

### API Endpoints
- `POST /api/routes/generate` — Generate 3 optimized routes based on parameters
- `GET /api/routes/:routeId` — Get cached route details
- `GET /api/routes/scoring-factors` — Get scoring weights for each training goal
- `GET /api/profiles` — Get user profile
- `PUT /api/profiles` — Update user preferences
- `GET /api/runs` — List past runs
- `POST /api/runs` — Log a completed run

### Database Tables
- `profiles` — User preferences (heat/elevation tolerance, preferred goals, surfaces, stats)
- `runs` — Run history (distance, duration, effort, elevation, temperature)

### Route Generation Engine
Located in `artifacts/api-server/src/routes/route-engine.ts`. Uses:
- Graph-based waypoint generation with distance-aware loop creation
- Goal-specific elevation profiles (steep for mountain hiking, flat for speed/recovery)
- Training goal weight system for multi-factor scoring
- Environmental condition awareness (temperature, time of day, shade)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Route Engine: `src/routes/route-engine.ts` — graph-based route generation with scoring
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `artifacts/route-planner` (`@workspace/route-planner`)

React + Vite frontend for the running route planner.

- Pages: Dashboard, GenerateRoute, RouteDetail, RunHistory, Profile
- Components: Layout (sidebar nav), MapComponent (Leaflet), ScoreRadar (Recharts), ElevationProfile (Recharts)
- Uses `@workspace/api-client-react` for API hooks

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/schema/profiles.ts` — User profile table
- `src/schema/runs.ts` — Run history table

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec. Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`.
