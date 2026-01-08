# Agent Playbook

## Executive Summary — Follow These First

1. **Check action items first.** Review `docs/ActionItems.md` before starting work to understand priorities, avoid duplicate efforts, and claim items you're working on. Update pertinent items and statuses as you progress.
2. **Respect the architecture.** This is a Next.js 14 App Router app on Node 20+/TypeScript 5.9 with Prisma 6.16 + Postgres. Keep server-only code under `src/server/**`, rely on the `@/` alias, and never create ad-hoc Prisma clients.
3. **Preserve domain invariants.** Work Orders move sequentially from `PLANNED` → … → `CLOSED`, `CANCELLED` remains available, and every mutation must write both a `WorkOrderVersion` snapshot and an `AuditLog` entry.
4. **Keep data deterministic.** Treat `backup-data.ts` as the source of truth: reseeding wipes runtime additions. Align `prisma/schema.prisma`, migrations, `src/db/seed.ts`, and `backup-data.ts` before shipping.
5. **Validate and test.** Use `zod` for all API payloads and run `npm run test` (Vitest) before requesting review. Add contract/unit/E2E coverage when you touch corresponding layers.
6. **Document the change.** Update `docs/ONBOARDING.md` if flows/setup shift, update pertinent items and statuses in `docs/ActionItems.md`, and append a UTC entry to `docs/CHANGELOG.md` with agent, timestamp, summary, and reasoning.
7. **Document ALL discoveries.** When you discover bugs, test failures, build errors, security issues, technical debt, or improvement opportunities during ANY work—testing, building, analyzing, or implementing—you MUST immediately add them to `docs/ActionItems.md` with priority, context, and "Discovered: YYYY-MM-DD" tag. This is non-negotiable.

## Purpose & Context

One file that tells agents (and humans) how this MVP works, who owns what, how handoffs occur, and what “done” means—aligned to this repo.

- **Domain:** High-mix/low-volume boat factory operations managing the full Work Order (WO) lifecycle with routing versioning.
- **Roles:** `ADMIN`, `SUPERVISOR`, and `OPERATOR` with RBAC enforced across UI and API layers.
- **Key systems:** Notes timeline, file management, model/trim selector, routing (default/new/saved versions), and audit trails.
- **Default routing path:** `Kitting → Lamination → Hull Rigging → Deck Rigging → Capping → Engine Hang → Final Rigging → Water Test → QA → Cleaning → Shipping`.
- **Seeds & persistence:** `backup-data.ts` is the canonical dataset. Reseeds delete runtime records; keep long-lived fixtures mirrored there.

## Stack & Runtime Guardrails

- Next.js 14 App Router, TypeScript 5.9, Node.js 20+, default port `5000`.
- Prisma 6.16 with Postgres; middleware logs audit metadata.
- Vitest with test files under `src/**/__tests__/`.
- Path alias `@/` is mandatory for `src/` imports.
- Server-only code resides in `src/server/**` (Prisma, storage, business logic). Never import it into client components.
- API handlers live in `src/app/api/**/route.ts` and must return `NextResponse.json({ ok, data?, error? })`.
- Auth: JWT stored in HTTP-only cookies, hashed credentials with `bcryptjs`, RBAC enforced in middleware/handlers.
- Environment keys belong in `src/lib/env.ts` and `.env.example`. Current required keys: `DATABASE_URL`, `JWT_SECRET`, `STORAGE_BUCKET_ID`, `NODE_ENV`.
- Formatting: run Prettier 3 (`npx prettier@3 --write <files>`) on touched files.

## Domain Rules & Invariants

- **Work Orders:**
  - Status pipeline includes `PLANNED` through closure plus `CANCELLED`.
  - Stage progression is sequential; operators only see work scoped to their department.
  - Each mutation writes a `WorkOrderVersion` (with `id`, `workOrderId`, `versionNumber`, `snapshotData` JSON, `createdBy`, `createdAt`, `reason`) and an `AuditLog` entry. Include `schema_hash` and `versionNumber` in the snapshot payloads.
- **Routing:**
  - Default routing must reference all 11 departments above.
  - Saved versions support create/read/update/delete with consistent naming and retrieval semantics.
  - Creating a WO blocks until routing validates that every department has an active work center.
- **Notes & Timeline:**
  - Use a single `Note` model with `(entity_type, entity_id, author_role)`.
  - Timeline views combine notes, status changes, and file events ordered chronologically with department scoping.
- **Files & Storage:**
  - Use the configured `STORAGE_BUCKET_ID`; avoid hardcoded IDs or ad-hoc ACLs.
  - JWT payload uses `user.userId` (not `user.id`). Ensure uploads → storage → DB records stay consistent. Bulk operations must honor permissions.
- **Real-time & Performance:**
  - Poll endpoints roughly every 10 seconds; keep them idempotent and cache-friendly.
  - Dashboard initial load target < 1.5s on seeded data; WO detail APIs < 800ms. Prefer Prisma `_count`/aggregations and avoid N+1 queries.
- **Security:**
  - Never log secrets. JWT stays cookie-only. Enforce RBAC and department scoping in every handler. Only Supervisors can edit routing while a WO is `PLANNED`. All denied writes should produce audit attempts.

## Data Management Workflow

1. Update `prisma/schema.prisma` first, then run `npm run prisma:migrate` followed by `npm run prisma:generate`.
2. Sync fixtures in `src/db/seed.ts` and persist reference data in `backup-data.ts`.
3. Use `npm run seed:dry` to preview and `npm run seed` to apply deterministic seeds.
4. Include model/trim coverage (e.g., LX24 Base/Sport/Luxury; LX26 Base/Sport/Luxury/Premium) and sample WOs across statuses.

## Testing Expectations

- **Baseline:** `npm run test` must pass before submission.
- **Contract tests:** Add/update Vitest contract suites for any touched API route.
- **Unit tests:** Cover validators, snapshot writers, routing logic, etc.
- **E2E (when present):** Exercise happy paths for supervisor routing flows, operator dashboards, file management, and cancellation handling.
- **Performance checks:** Spot-check that critical endpoints remain within the performance targets above.
- **Document test failures:** If tests fail during your work, you MUST add each failure as a separate action item in `docs/ActionItems.md` with root cause analysis, affected files, and reproduction steps. Mark test failures as High Priority if they block development.

## Documentation & Change Management

- **Action Items Workflow:**
  - **Before starting**: Consult `docs/ActionItems.md` to check for related tasks, understand priorities, and avoid duplicate efforts.
  - **During work**: Update item status to `[WIP]` with your agent role.
  - **Upon completion**: Mark as `[x]` with completion date and move to "Completed Items" section.
  - **CRITICAL - Document discoveries**: You MUST add ALL discovered issues to ActionItems.md immediately when found, including:
    - Test failures (unit, integration, E2E)
    - Build errors or warnings
    - Linting/formatting issues
    - Security vulnerabilities
    - Performance bottlenecks
    - Bugs in existing code
    - Technical debt
    - Missing documentation
    - Configuration issues
    - Dependency problems
  - Each discovered item MUST include: description, priority (🔴/🟡/🟢), estimated effort, agent role, and "Discovered: YYYY-MM-DD" tag.
  - If you complete work without adding discovered issues to ActionItems.md, the work is INCOMPLETE.
- Update `docs/ONBOARDING.md` whenever setup steps, env variables, or major flows change.
- Maintain `docs/CHANGELOG.md` with newest entry first, including agent name, ISO 8601 UTC timestamp, summary, and reasoning per PR.
- Keep ADRs under `docs/adr/` current; add new ones when architecture decisions shift.

## Operational Protocol

- **Task Spec Template**
  ```yaml
  task: "Routing defaults & validation"
  owner: "Routing & Work Centers"
  context:
    related_issues: [#123]
    risk: "Medium — block create WO until valid routing"
  acceptance_criteria:
    - Default 11-dept routing applies when selected
    - Create New Routing saves version; appears in Saved list
    - Validation blocks create until all 11 depts have active work centers
  test_plan:
    contract:
      - "POST /api/work-orders validates routing"
      - "GET /api/work-centers returns active entries"
    unit:
      - "routing validator"
      - "version save"
    e2e:
      - "create WO with default routing succeeds"
      - "invalid routing blocked with clear error"
  rollback:
    - "revert migration N; keep backup of backup-data.ts snapshot"
  artifacts:
    - "schema diff"
    - "screenshots/gifs of flows"
  ```
- **Solo agents:** If you are the only agent on a task, you may assume multiple roles below. Explicitly note which hats you wore in the changelog entry.
- **Handoffs:** When passing work, summarize progress, outstanding risks, and relevant test results. Reference the task spec in your PR description.

## Role Playbook & Ownership Labels

For multi-agent efforts, align work with the primary owner. Solo agents should still follow the expectations for each area they touch.

**IMPORTANT**: ALL agents, regardless of role, MUST document discovered issues in ActionItems.md. When you find bugs, failures, warnings, or technical debt in your domain, add them immediately with priority, context, and discovery date.

1. **Product Architect** (`domain`)
   - Owns domain model, invariants, ADRs. Outputs include ADRs in `docs/adr/`, schema diffs, migration plans. Done when ADR merged and migrations unblock others.
2. **DB Migration & Versioning** (`schema-change`)
   - Maintains schema evolution, WO snapshots, audit integrity. Ensures `priority` enum (`LOW`, `NORMAL`, `HIGH`, `CRITICAL`) and `WOStatus` includes `CANCELLED`. Verifies `WorkOrderVersion` hooks for create/update/status. Done when migrations succeed up/down, seeds align, and rollback instructions exist.
3. **API & Contracts** (`api-contract`)
   - Builds typed, zod-validated handlers with stable response contracts. Done when contract tests cover all changed routes.
4. **UI/UX Implementer** (`role-ui`)
   - Delivers role dashboards and detail flows without raw JSON forms. Supervisor must create WOs, pick routing (Default/New/Saved), save milestones, and use unified timeline. Operator dashboard handles queues, START/PAUSE/COMPLETE, notes, attachments with department scope. Board (Kanban) and Table share headers; Create Work Order buttons visible. Done when UX checklist and E2E happy paths (if available) pass.
5. **Notes & Timeline Unifier** (`notes-timeline`)
   - Maintains single notes system + cross-entity timeline; removes legacy paths; migrates data safely. Done when history preserved and old tables removed.
6. **Routing & Work Centers** (`routing`)
   - Ensures default routing, saved versions, validation. Done when WO creation blocks invalid routing and version CRUD validated.
7. **Files & Storage** (`files`)
   - Handles upload/list/search/bulk flows with stable ACLs. Confirms JWT user id usage and end-to-end storage integrity. Done when bulk ops tested.
8. **Data Fixtures & Seeding** (`seed`)
   - Produces deterministic dev/E2E data aligned with `backup-data.ts`. Done when environment bootstraps from zero via one command.
9. **QA & Release Gate** (`qa-gate`)
   - Enforces Definition of Done: `tsc` clean, Prettier applied, tests green, migrations up/down, perf sanity, E2E (if configured).
   - **MUST document in ActionItems.md**: All test failures, build errors, linting issues, formatting problems, type errors, or quality issues discovered during validation. Each issue must include priority, reproduction steps, and discovery date.
10. **Security & Permissions** (`security`)
    - Oversees JWT/cookie, RBAC, department scoping. Ensures only Supervisors edit routing while WO is `PLANNED`, operators restricted appropriately, every write audited, and denial cases tested.
11. **Docs & Runbooks** (`docs`)
    - Keeps documentation in sync: `AGENTS.md`, `API_CONTRACT.md`, `MIGRATIONS.md`, `docs/ONBOARDING.md`, `docs/CHANGELOG.md`, `docs/ActionItems.md`. Maintains ActionItems.md by updating statuses, moving completed items to the "Completed Items" section, and adding new items discovered during work. Done when docs updated alongside code.

## PR Checklist

- ☐ Prettier 3 run on touched files.
- ☐ `npm run prisma:migrate` (if schema changed) and `npm run prisma:generate` succeed.
- ☐ Seeds updated (`src/db/seed.ts`) and `backup-data.ts` adjusted if reference data changed.
- ☐ Contract/unit/E2E tests updated or added for affected areas.
- ☐ Docs refreshed (including ONBOARDING/CHANGELOG/ActionItems) and changelog entry added with UTC timestamp.
- ☐ ActionItems.md updated:
  - Completed items moved to "Completed Items" section
  - **ALL discovered issues added (test failures, build errors, bugs, warnings, technical debt)**
  - Statuses updated for in-progress items
  - Each new item includes priority, estimated effort, agent role, and discovery date
  - If ZERO issues were discovered, explicitly note "No issues discovered during this work" in PR description
- ☐ Performance/accessibility baselines still met; call out deviations in the PR.

## Core Flows to Validate Before Shipping

- Supervisor creates `PLANNED` WO → selects Default/New/Saved routing → saves version → releases.
- Operator dashboard: pick `READY` WO → `START`/`PAUSE`/`COMPLETE` → add note and file (department scoped).
- Board (Kanban) and Table views share headers; `Create Work Order` button accessible.
- Timeline displays unified notes/status/file events with counts.
- Cancelling a WO records snapshot + audit and surfaces correctly in UI filters.
- Full reseed from zero: models/trims and WOs reappear; no data silently lost.
- File management: upload → list/search → bulk delete using `user.userId`.

## Ready-Made Prompts (Repo-Aware)

- “Fix routing validation end-to-end” — Add `zod` schemas for routing payloads, enforce 11 departments with active work centers in `POST /api/work-orders`, surface actionable UI errors, and cover with contract/unit/UI tests.
- “Unify notes & timeline” — Migrate to single `Note` model, build timeline union (notes/status/files), remove legacy paths, and test contract/unit/UI flows.
- “Snapshot writer & audit” — Ensure snapshots on WO create/update/status change include `schema_hash` and `versionNumber`. Cover with unit + contract tests.

## Definition of Done

- Code, migrations, and seeds merged without regressions.
- API contracts verified with Vitest suites and remain backwards compatible.
- Seeds and `backup-data.ts` updated to reflect new truths.
- All discovered issues, bugs, test failures, and technical debt documented in ActionItems.md.
- Documentation updated (`AGENTS.md`, onboarding, ADRs, changelog, etc.).
- Changelog entry appended with reasoning and timestamp.
