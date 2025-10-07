# Boat Factory Operations – Newcomer Guide

## Product snapshot
- This project is a Next.js 14 operations MVP built for a high-mix, low-volume boat factory with dedicated operator and supervisor experiences plus shared core systems such as authentication, stage gating, audit logging, and a PostgreSQL database managed through Prisma.【F:README.md†L1-L34】
- Quick-start instructions cover installing dependencies, running Prisma migrations, seeding the database, and launching the development server. Use the provided demo credentials for fast login while you explore the UI flows.【F:README.md†L35-L112】

## Repository layout
- The project uses the App Router. `src/app/layout.tsx` wires global styles and wraps every page, while `src/app/page.tsx` immediately redirects anonymous visitors to the login screen.【F:src/app/layout.tsx†L1-L23】【F:src/app/page.tsx†L1-L23】
- Primary surfaces live under `src/app`: `/login` for authentication, `/operator` for the shop-floor console, and `/supervisor` for planning and oversight workflows. Each page is a client component that orchestrates data fetching and mutations through the API routes.【F:src/app/login/page.tsx†L1-L118】【F:src/app/operator/page.tsx†L1-L118】【F:src/app/supervisor/page.tsx†L1-L200】
- API endpoints are colocated in `src/app/api`. For example, `/api/auth/login` issues JWT cookies after verifying credentials, while `/api/queues/my-department` builds the operator work queue by filtering Prisma data for the active department.【F:src/app/api/auth/login/route.ts†L1-L78】【F:src/app/api/queues/my-department/route.ts†L1-L126】
- Shared logic and helpers live in `src/lib`. Highlights include JWT helpers, role-based access control, Prisma client bootstrapping, pagination utilities, and file-storage helpers that wrap Google Cloud Storage through a Replit sidecar.【F:src/lib/auth.ts†L1-L43】【F:src/lib/rbac.ts†L1-L26】【F:src/lib/db.ts†L1-L13】【F:src/lib/objectStorage.ts†L1-L198】【F:src/lib/objectAcl.ts†L1-L162】
- Database schema, migrations, and seeding scripts are under `prisma/` and `src/db/`. The Prisma schema models departments, users, routing plans, work orders, audit notes, attachments, and product configurations, while `src/db/seed.ts` restores backup data and provisions demo models and trims.【F:prisma/schema.prisma†L1-L247】【F:src/db/seed.ts†L1-L200】

## Runtime architecture
- Authentication relies on HTTP-only JWT cookies. `src/middleware.ts` guards protected routes, `src/lib/auth.ts` signs and verifies tokens, and API routes derive the current user from request cookies. Role helpers in `src/lib/rbac.ts` drive operator vs. supervisor access paths.【F:src/middleware.ts†L1-L18】【F:src/lib/auth.ts†L1-L35】【F:src/lib/rbac.ts†L1-L26】
- Data access flows through Prisma’s client singleton and uses schema relationships to hydrate nested work-order state (for example, queue endpoints join routing stages, departments, stations, and the latest stage log).【F:src/lib/db.ts†L1-L13】【F:src/app/api/queues/my-department/route.ts†L21-L121】
- File uploads leverage a storage service wrapper that signs upload URLs, normalizes stored paths, and enforces ACL policies via metadata, providing the backbone for the supervisor file manager UI.【F:src/lib/objectStorage.ts†L13-L177】【F:src/lib/objectAcl.ts†L1-L162】

## Development workflow
- Package scripts cover dev server boot, production builds, Vitest suites, Prisma generation/migrations, and database seeding, which should be run in that order the first time you set up the repo.【F:package.json†L6-L16】
- Environment variables are validated on startup: ensure `DATABASE_URL`, a 32-character `JWT_SECRET`, and `STORAGE_BUCKET_ID` are present before running the app.【F:src/lib/env.ts†L1-L14】
- Tests currently focus on unit coverage for auth and RBAC helpers. Expand these suites (e.g., API contract tests) as you stabilize key flows.【F:src/lib/__tests__/auth.test.ts†L1-L56】【F:src/lib/rbac.ts†L1-L26】

## What to learn next
1. **Walk through the UI flows** – Start at `/login`, then follow the operator queue polling logic and supervisor planning tools to see how front-end state ties to API responses.【F:src/app/login/page.tsx†L14-L118】【F:src/app/operator/page.tsx†L59-L118】【F:src/app/supervisor/page.tsx†L145-L200】
2. **Trace API ↔ database interactions** – Use the Prisma schema alongside representative routes like `/api/queues/my-department` and supervisor endpoints to understand how domain relationships materialize at runtime.【F:prisma/schema.prisma†L10-L226】【F:src/app/api/queues/my-department/route.ts†L21-L121】
3. **Review seeding and migrations** – `src/db/seed.ts` is a living catalog of sample data. Pair it with migration history to learn how departments, work centers, and routing versions evolve.【F:src/db/seed.ts†L7-L195】
4. **Harden authentication & authorization** – Audit middleware, token handling, and RBAC helpers to ensure role checks match your production rules, and consider extending tests beyond the existing unit coverage.【F:src/middleware.ts†L1-L18】【F:src/lib/auth.ts†L1-L43】【F:src/lib/__tests__/auth.test.ts†L1-L56】
5. **Explore file and note workflows** – Supervisors can manage notes, attachments, and version history. Study the object storage utilities and related components to extend collaboration features.【F:src/components/FileManager.tsx†L1-L200】【F:src/lib/objectStorage.ts†L13-L198】【F:src/lib/objectAcl.ts†L1-L162】

Welcome aboard—use this guide as a map, then dive into the code paths aligned with the workflow you’re enhancing.
