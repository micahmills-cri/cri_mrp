# Boat Factory Operations – Newcomer Guide

## Product snapshot
- This project is a Next.js 14 operations MVP built for a high-mix, low-volume boat factory with dedicated operator and supervisor experiences plus shared core systems such as authentication, stage gating, audit logging, and a PostgreSQL database managed through Prisma.【F:README.md†L1-L34】
- Quick-start instructions cover installing dependencies, running Prisma migrations, seeding the database, and launching the development server. Use the provided demo credentials for fast login while you explore the UI flows.【F:README.md†L35-L112】

## Repository layout
- The project uses the App Router. `src/app/layout.tsx` wires global styles and wraps every page, while `src/app/page.tsx` immediately redirects anonymous visitors to the login screen.【F:src/app/layout.tsx†L1-L23】【F:src/app/page.tsx†L1-L23】
- Primary surfaces live under `src/app`: `/login` for authentication, `/operator` for the shop-floor console, and `/supervisor` for planning and oversight workflows. Each page is a client component that orchestrates data fetching and mutations through the API routes.【F:src/app/login/page.tsx†L1-L118】【F:src/app/operator/page.tsx†L1-L118】【F:src/app/supervisor/page.tsx†L1-L200】
- API endpoints are colocated in `src/app/api`. For example, `/api/auth/login` issues JWT cookies after verifying credentials, while `/api/queues/my-department` builds the operator work queue by filtering Prisma data for the active department.【F:src/app/api/auth/login/route.ts†L1-L78】【F:src/app/api/queues/my-department/route.ts†L1-L126】
- Shared logic and helpers live in `src/lib` for client-safe utilities and `src/server` for server-only facades. Highlights include JWT helpers, role-based access control, Prisma client bootstrapping, pagination utilities, and file-storage helpers that wrap Google Cloud Storage through a Replit sidecar.【F:src/lib/auth.ts†L1-L43】【F:src/lib/rbac.ts†L1-L26】【F:src/server/db/client.ts†L1-L14】【F:src/server/storage/objectStorage.ts†L1-L200】【F:src/server/storage/objectAcl.ts†L1-L162】
- Database schema, migrations, and seeding scripts are under `prisma/` and `src/db/`. The Prisma schema models departments, users, routing plans, work orders, audit notes, attachments, and product configurations, while `src/db/seed.ts` restores backup data and provisions demo models and trims.【F:prisma/schema.prisma†L1-L247】【F:src/db/seed.ts†L1-L200】 Server-only data access and facades now live under `src/server/`, keeping Prisma and storage helpers out of client bundles.【F:src/server/db/client.ts†L1-L14】【F:src/server/storage/objectStorage.ts†L1-L200】

## Runtime architecture
- Authentication relies on HTTP-only JWT cookies. `src/middleware.ts` guards protected routes, `src/lib/auth.ts` signs and verifies tokens, and API routes derive the current user from request cookies. Role helpers in `src/lib/rbac.ts` drive operator vs. supervisor access paths.【F:src/middleware.ts†L1-L18】【F:src/lib/auth.ts†L1-L35】【F:src/lib/rbac.ts†L1-L26】
- Data access flows through Prisma’s client singleton and uses schema relationships to hydrate nested work-order state (for example, queue endpoints join routing stages, departments, stations, and the latest stage log).【F:src/server/db/client.ts†L1-L14】【F:src/app/api/queues/my-department/route.ts†L21-L121】
- File uploads leverage a storage service wrapper that signs upload URLs, normalizes stored paths, and enforces ACL policies via metadata, providing the backbone for the supervisor file manager UI.【F:src/server/storage/objectStorage.ts†L13-L177】【F:src/server/storage/objectAcl.ts†L1-L162】

## Development workflow
- **Action Items Tracking**: Before starting work, check `docs/ActionItems.md` for prioritized tasks, current work in progress, and technical debt. Update item statuses as you work (`[ ]` → `[WIP]` → `[x]`). **CRITICAL**: You MUST add ALL discovered issues (test failures, build errors, bugs, warnings, technical debt) to ActionItems.md immediately when found—this is non-negotiable and required for work to be considered complete. This helps coordinate work across agents and prevent duplicate efforts.【F:docs/ActionItems.md†L1-L50】
- Package scripts cover dev server boot, production builds, Vitest suites, Prisma generation/migrations, and database seeding, which should be run in that order the first time you set up the repo.【F:package.json†L6-L16】
- Environment variables are validated on startup: ensure `DATABASE_URL`, a 32-character `JWT_SECRET`, and `STORAGE_BUCKET_ID` are present before running the app.【F:src/lib/env.ts†L1-L14】
- Tests currently focus on unit coverage for auth and RBAC helpers. Expand these suites (e.g., API contract tests) as you stabilize key flows.【F:src/lib/__tests__/auth.test.ts†L1-L56】【F:src/lib/rbac.ts†L1-L26】

## Admin Panel Setup

The admin panel provides comprehensive workstation configuration management for administrators. For detailed documentation, see [docs/ADMIN_PANEL_IMPLEMENTATION.md](./ADMIN_PANEL_IMPLEMENTATION.md).

### Initial Setup

1. **Apply the admin panel database migration:**
   ```bash
   npx prisma migrate dev --name add_admin_workstation_features
   npx prisma generate
   ```

2. **Seed the database with admin panel data:**
   ```bash
   npm run seed
   ```
   This creates the necessary stations, users, equipment, and relationships.

3. **Access the admin panel:**
   - Login as admin: `admin@cri.local` / `password`
   - Click the "Admin Panel" button in the supervisor dashboard header
   - Use sidebar navigation to access: Departments, Work Centers, Stations, Users, Equipment

### Admin Panel Features

- **Departments & Work Centers**: Organizational hierarchy management (APIs complete, UI optional)
- **Stations**: Full CRUD with member/equipment assignments, pay rates, capacity, and cycle times
- **Users**: User management with roles, departments, pay rates, and automatic pay rate history tracking
- **Equipment**: Equipment catalog with station assignments
- **Advanced Features**:
  - Work order cost estimation based on routing and labor rates
  - CSV export for all entity types
  - Station metrics calculation (infrastructure in place)
  - Soft delete pattern for data preservation

### Common Admin Workflows

**Configure a Station:**
1. Admin Panel > Stations > Click edit on a station
2. Details tab: Set pay rate, capacity, cycle time
3. Members tab: Assign operators to the station
4. Equipment tab: Assign equipment

**Add a New User:**
1. Admin Panel > Users > Click "Create"
2. Enter email, password, role, department, hourly rate
3. User can now be assigned to stations

**Update Pay Rate:**
1. Admin Panel > Users > Click edit on a user
2. Change hourly rate (automatically creates history entry)
3. Pay rate history is viewable for auditing

For complete API reference, technical details, and troubleshooting, see [docs/ADMIN_PANEL_IMPLEMENTATION.md](./ADMIN_PANEL_IMPLEMENTATION.md).

## What to learn next
1. **Walk through the UI flows** – Start at `/login`, then follow the operator queue polling logic and supervisor planning tools to see how front-end state ties to API responses.【F:src/app/login/page.tsx†L14-L118】【F:src/app/operator/page.tsx†L59-L118】【F:src/app/supervisor/page.tsx†L145-L200】
2. **Trace API ↔ database interactions** – Use the Prisma schema alongside representative routes like `/api/queues/my-department` and supervisor endpoints to understand how domain relationships materialize at runtime.【F:prisma/schema.prisma†L10-L226】【F:src/app/api/queues/my-department/route.ts†L21-L121】
3. **Review seeding and migrations** – `src/db/seed.ts` is a living catalog of sample data. Pair it with migration history to learn how departments, work centers, and routing versions evolve.【F:src/db/seed.ts†L7-L195】
4. **Harden authentication & authorization** – Audit middleware, token handling, and RBAC helpers to ensure role checks match your production rules, and consider extending tests beyond the existing unit coverage.【F:src/middleware.ts†L1-L18】【F:src/lib/auth.ts†L1-L43】【F:src/lib/__tests__/auth.test.ts†L1-L56】
5. **Explore file and note workflows** – Supervisors can manage notes, attachments, and version history. Study the object storage utilities and related components to extend collaboration features.【F:src/components/FileManager.tsx†L1-L200】【F:src/server/storage/objectStorage.ts†L13-L198】【F:src/server/storage/objectAcl.ts†L1-L162】

Welcome aboard—use this guide as a map, then dive into the code paths aligned with the workflow you’re enhancing.

## Cheat sheet

| Area | Where to look | Notes |
| --- | --- | --- |
| **App entry & layout** | `src/app/layout.tsx`, `src/app/page.tsx` | App Router root; handles global providers and anonymous redirect.【F:src/app/layout.tsx†L1-L23】【F:src/app/page.tsx†L1-L23】 |
| **Authentication flow** | `src/app/login/page.tsx`, `src/app/api/auth/login/route.ts`, `src/middleware.ts`, `src/lib/auth.ts` | Client form posts to API route; middleware protects routes using JWT helpers.【F:src/app/login/page.tsx†L1-L118】【F:src/app/api/auth/login/route.ts†L1-L78】【F:src/middleware.ts†L1-L18】【F:src/lib/auth.ts†L1-L35】 |
| **Operator console** | `src/app/operator/page.tsx`, `src/app/api/queues/my-department/route.ts` | Operator UI polls queue API and renders staged work orders in a single page component.【F:src/app/operator/page.tsx†L1-L118】【F:src/app/api/queues/my-department/route.ts†L21-L121】 |
| **Supervisor tools** | `src/app/supervisor/page.tsx`, `src/components/FileManager.tsx`, `src/app/api/supervisor/dashboard/route.ts` | Planning dashboard combines WIP overview, file manager, and supporting endpoints.【F:src/app/supervisor/page.tsx†L1-L200】【F:src/components/FileManager.tsx†L1-L200】【F:src/app/api/supervisor/dashboard/route.ts†L1-L96】 |
| **Shared libraries** | `src/lib/*.ts` (auth, rbac, utils), `src/server/*` (db, storage) | Split client-safe utilities from server-only facades such as Prisma and object storage helpers.【F:src/lib/auth.ts†L1-L43】【F:src/lib/rbac.ts†L1-L26】【F:src/server/db/client.ts†L1-L14】【F:src/server/storage/objectStorage.ts†L1-L200】【F:src/lib/pagination.ts†L1-L120】 |
| **Database schema & seed** | `prisma/schema.prisma`, `src/db/seed.ts`, `prisma/migrations/` | Domain model and demo data loader; inspect migrations for history.【F:prisma/schema.prisma†L1-L247】【F:src/db/seed.ts†L1-L200】【F:prisma/migrations/20250923161204_init/migration.sql†L1-L200】 |
| **Environment config** | `.env.example`, `src/lib/env.ts`, `next.config.js` | Required variables and runtime configuration defaults.【F:.env.example†L1-L12】【F:src/lib/env.ts†L1-L14】【F:next.config.js†L1-L25】 |
| **Scripts & tooling** | `package.json` scripts, `prisma/` CLI, `vitest.config.ts` | Use npm scripts for dev, build, tests; Vitest for unit suites.【F:package.json†L6-L16】【F:vitest.config.ts†L1-L37】 |
| **Styling** | `tailwind.config.js`, `src/app/globals.css`, component-level modules | Tailwind utility-first styling plus global CSS reset.【F:tailwind.config.js†L1-L28】【F:src/app/globals.css†L1-L200】 |
| **Testing** | `src/lib/__tests__/*.test.ts`, `src/app/api/__tests__/*.test.ts`, `vitest.setup.ts` | Unit coverage for helpers plus contract tests for API routes; configure global mocks here.【F:src/lib/__tests__/auth.test.ts†L1-L56】【F:src/lib/__tests__/rbac.test.ts†L1-L48】【F:src/app/api/__tests__/queues.my-department.test.ts†L1-L120】【F:vitest.setup.ts†L1-L34】 |
| **Action Items** | `docs/ActionItems.md` | Prioritized task list with status tracking; check before starting work and update as you progress.【F:docs/ActionItems.md†L1-L500】 |

## Repository structure recommendations

- **Diagnostics single source** – Troubleshooting notes and release timelines are consolidated in `docs/diagnosis.md` to avoid case-sensitive duplication in the repo root.【F:docs/diagnosis.md†L1-L200】
- **Server module boundary** – Prisma client and storage facades now live under `src/server/`, and API routes import them via `@/server/*` aliases to keep server-only dependencies isolated.【F:src/server/db/client.ts†L1-L14】【F:src/server/storage/objectStorage.ts†L1-L200】【F:src/app/api/work-orders/route.ts†L1-L38】
- **API contract tests** – A new `src/app/api/__tests__/` directory houses Vitest suites that exercise route handlers alongside their implementation files for faster feedback.【F:src/app/api/__tests__/queues.my-department.test.ts†L1-L120】
