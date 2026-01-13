# Agent Change Log

> Record every pull request chronologically with the newest entry at the top. Use UTC timestamps in ISO 8601 format.

## 2026-01-13T14:54:10Z - Agent: Docs & Runbooks - Codex

- **Summary:** Added a first-draft PLM integration plan and checklist, plus a high-priority ActionItems entry linking to the plan for future execution and review.
- **Reasoning:** The project needs a documented migration path to shift product data ownership to the PLM partner while preserving MRP functionality and audit/versioning requirements.
- **Changes Made:**
  - Created `docs/PLMProject.md` with phased plan, checklist, risks, and collaboration notes for ClaudeCode review.
  - Added a high-priority ActionItems entry pointing to the PLM integration plan.
- **Validation:** Not run (documentation-only change).
- **Files Modified:**
  - `docs/PLMProject.md`
  - `docs/ActionItems.md`
  - `docs/CHANGELOG.md`
- **Branch:** TBD
- **Hats:** docs

## 2026-01-13T14:33:54Z - Agent: QA & Release Gate - Claude Sonnet 4.5

- **Summary:** Phase 3: API route test expansion. Added comprehensive test coverage for 6 additional routes: work order pause/release, GET routes for list/detail, and auth logout/me endpoints. Increased total tests from 141 to 220 (+56% increase), now covering 26 of 55 routes (47% coverage).
- **Reasoning:** Continuing systematic API route test expansion per ActionItems.md Phase 3 plan. These routes represent critical state transitions (pause, release), data retrieval (list, detail), and authentication flows (logout, me) that are essential for application stability. Testing these routes ensures proper RBAC enforcement, department scoping, pagination, and authentication security.
- **Changes Made:**
  - **Test Files Created** (6 new files):
    - `src/app/api/__tests__/work-orders.pause.test.ts` - 17 tests for POST /api/work-orders/pause
    - `src/app/api/__tests__/work-orders.release.test.ts` - 15 tests for POST /api/work-orders/[id]/release
    - `src/app/api/__tests__/work-orders.list.test.ts` - 11 tests for GET /api/work-orders
    - `src/app/api/__tests__/work-orders.detail.test.ts` - 15 tests for GET /api/work-orders/[id]
    - `src/app/api/__tests__/auth.logout.test.ts` - 8 tests for POST /api/auth/logout
    - `src/app/api/__tests__/auth.me.test.ts` - 13 tests for GET /api/auth/me
  - **Test Setup Enhancement:** Added `RoutingVersionStatus` enum to `vitest.setup.ts` fallbackEnums to support release route tests
  - **Coverage Details:**
    - Pause route: Tests PAUSE event logging without status change, department scoping, HOLD checks, station validation, optional notes
    - Release route: Tests RBAC (SUPERVISOR/ADMIN only), PLANNED→RELEASED transition, date validation past/future, version snapshots, routing version status updates, transaction handling
    - List route: Tests pagination with cursor support, default/custom limits, hasMore indicator, ordering by createdAt desc, includes (routing version, counts), all roles
    - Detail route: Tests department scoping (operators restricted, supervisors/admin unrestricted), current stage info, enabled stages list, nested includes, stage timeline
    - Logout route: Tests cookie clearing with maxAge=0, httpOnly/secure/sameSite flags, idempotent behavior, works without auth
    - Me route: Tests token verification, returns user info (userId/role/departmentId), all roles, error handling for missing/invalid/expired tokens, security (no sensitive info in errors)
  - **Documentation:** Updated `docs/ActionItems.md` with Phase 3 completion status showing 26 routes tested (47% coverage), 220 tests passing
- **Validation:** `npm test` - all 220 tests passing across 20 test files (up from 141 tests in 14 files)
- **Files Modified:**
  - New test files: 6 files in `src/app/api/__tests__/`
  - Test setup: `vitest.setup.ts`
  - Documentation: `docs/ActionItems.md`, `docs/CHANGELOG.md`
- **Branch:** `claude/api-route-tests-eUqoF`
- **Hats:** qa-gate, docs

## 2026-01-08T16:35:00Z - Agent: QA & Release Gate - Claude Sonnet 4.5

- **Summary:** Phase 1: Critical fixes and code quality improvements. Fixed failing supervisor dashboard test, formatted entire codebase with Prettier (127 files), and implemented structured logging system replacing 188 console statements across 62 production files.
- **Reasoning:** Three critical code quality issues were blocking production readiness: (1) Failing test indicated a production bug in supervisor dashboard API, (2) 93 files had inconsistent formatting causing merge conflicts and readability issues, (3) 188 console.log statements in production code created security risks and prevented proper log management. Addressing these issues improves code stability, maintainability, and production readiness.
- **Changes Made:**
  - **Test Fix:** Added missing `routingVersionFindManyMock` to supervisor dashboard test suite. Root cause was line 331 in dashboard route calling `prisma.routingVersion.findMany()` without corresponding mock. Test now passes with 200 status.
  - **Code Formatting:** Ran `npm run format` across entire codebase. Fixed CRLF line endings, standardized quotes (single), added consistent semicolons, and normalized indentation. Result: 127 files formatted.
  - **Structured Logging:** Created `src/lib/logger.ts` with log levels (DEBUG, INFO, WARN, ERROR, NONE), environment-based configuration, timestamps, and structured context support. Replaced all console statements in 49 API routes and 13 component/page/lib/server files. Preserved console output in `src/db/seed.ts` (script requires output). Created helper script `scripts/replace-console-logs.ts` for future migrations.
  - **Documentation:** Updated `docs/ActionItems.md` moving three completed items to "Completed Items" section with detailed completion notes including root cause analysis, fix descriptions, and results.
- **Validation:** `npm test` (all 24 tests passing), `npm run lint` (no new errors, only pre-existing React Hook warnings), `npm run format` (all files clean)
- **Files Modified:**
  - Tests: `src/app/api/__tests__/supervisor.dashboard.test.ts`
  - New files: `src/lib/logger.ts`, `scripts/replace-console-logs.ts`
  - API routes (49 files): All routes in `src/app/api/**/*.ts` updated with logger imports and console replacements
  - Components/Pages (13 files): `src/components/NotesTimeline.tsx`, `src/components/FileUpload.tsx`, `src/app/operator/page.tsx`, `src/app/admin/**/*.tsx`, `src/app/supervisor/page.tsx`, `src/lib/metrics/calculateStationMetrics.ts`, `src/server/storage/objectStorage.ts`
  - Formatting: 127 files across entire codebase
  - Documentation: `docs/ActionItems.md`, `docs/CHANGELOG.md`
- **Branch:** `claude/repo-investigation-DGnEI`
- **Commits:** 3 commits (f72b4da, feac688, 2a80d30)
- **Hats:** qa-gate, docs

## 2026-01-08T15:11:13Z - Agent: Codex (docs)

- **Summary:** Added the missing ISC LICENSE file and marked the ActionItems task complete.
- **Reasoning:** Align repository contents with the package.json license declaration and close the outstanding documentation task.
- **Validation:** Not run (documentation-only update).
- **Files Modified:** `LICENSE`, `docs/ActionItems.md`, `docs/CHANGELOG.md`

## 2026-01-08T14:15:00Z - Agent: Claude (role-ui, qa-gate, docs)

- **Summary:** Added sort/filter/search capabilities to operator Work Orders in Queue table, removed Progress column, added file upload capability to attachments, and investigated npm http-proxy warning marking it as DEFERRED in ActionItems.
- **Reasoning:** Operators needed the same filtering/sorting functionality available in supervisor dashboard to efficiently find work orders in their queue. File upload enables operators to attach documents directly from the action panel. The http-proxy warning was traced to Replit platform infrastructure and cannot be resolved from project side.
- **Changes Made:**
  - Added client-side filtering (status, priority, text search) and sorting to operator queue table
  - Made all queue table column headers clickable for sorting with visual indicators
  - Added filter bar with search input, status/priority dropdowns, and clear filters button
  - Removed Progress column from queue table for cleaner interface
  - Added file upload button and handler to FileListDisplay component
  - Updated ActionItems.md to mark npm http-proxy warning as DEFERRED with root cause analysis
  - Added context to completed 2026-01-07 fix noting recurrence due to infrastructure updates
- **Validation:** Server workflow running, no build errors
- **Files Modified:** `src/app/operator/page.tsx`, `src/components/FileListDisplay.tsx`, `docs/ActionItems.md`

## 2026-01-08T14:39:03Z - Agent: Codex (role-ui, qa-gate, docs)

- **Summary:** Moved the supervisor Kanban column builder into a shared utility module to avoid invalid named exports in the App Router page component, updated the Kanban unit test imports, and logged the recurring npm `http-proxy` warning in ActionItems.
- **Reasoning:** App Router pages should not expose arbitrary named exports; relocating the helper keeps the build stable while preserving test coverage, and the npm warning needs follow-up tracking.
- **Validation:** `npm run test` (fails: supervisor dashboard contract test expects 200 but receives 500; see ActionItems).
- **Files Modified:** `src/app/supervisor/page.tsx`, `src/app/supervisor/kanban-utils.ts`, `src/app/supervisor/__tests__/kanban-columns.test.ts`, `docs/ActionItems.md`, `docs/CHANGELOG.md`

## 2026-01-08T14:32:41Z - Agent: Codex (qa-gate, docs)

- **Summary:** Elevated the supervisor build-blocker ActionItem to high priority, updated the logging cleanup scope to reflect broader console usage, and refreshed the API test coverage baseline.
- **Reasoning:** Keep ActionItems aligned with current code realities and highlight build-blocking work.
- **Validation:** Not run (documentation-only update).
- **Files Modified:** `docs/ActionItems.md`, `docs/CHANGELOG.md`

## 2026-01-07T19:31:04Z - Agent: Codex (qa-gate, docs)

- **Summary:** Removed the deprecated npm `http-proxy` environment config, replacing it with `npm_config_proxy`, and marked the warning resolution complete in ActionItems.
- **Reasoning:** npm 11 warns on `http-proxy` env config; switching to supported `proxy` preserves proxy routing without warnings.
- **Validation:** `npm config list`
- **Files Modified:** `docs/ActionItems.md`, `docs/CHANGELOG.md`

## 2026-01-07T19:15:59Z - Agent: Codex (role-ui, api-contract, docs)

- **Summary:** Documented today's Replit changes: added server-backed filtering/sorting/search for supervisor dashboard work orders, introduced filter controls and sortable columns in the supervisor table, added a Release action for planned work orders, refreshed global scrollbar styling with horizontal table overflow, and corrected work order version snapshot display plus audit log payload fields for version creation.
- **Reasoning:** Ensure documentation reflects the latest supervisor workflow improvements, UI affordances, and audit/version metadata alignment delivered in the Replit checkpoints.
- **Validation:** Not run (documentation-only update).
- **Files Modified:** `docs/CHANGELOG.md`

## 2026-01-07T17:18:34Z - Agent: Codex (api-contract, qa-gate, docs)

- **Summary:** Updated the work order PATCH audit log writes to use schema-aligned fields and capture update details in the `after` payload. Logged the npm `http-proxy` config warning in ActionItems for follow-up.
- **Reasoning:** Audit logs must align with the `AuditLog` model fields to keep API handlers consistent and avoid schema drift.
- **Validation:** Not run (not requested).
- **Files Modified:** `src/app/api/work-orders/[id]/route.ts`, `docs/ActionItems.md`, `docs/CHANGELOG.md`

## 2025-10-27T20:30:26Z - Agent: Codex (role-ui, qa-gate, docs)

- **Summary:** Removed the duplicate class key warning in `src/components/ui/Card.tsx` by centralizing variant styling and giving the elevated card a distinct shadow while preserving interactive/disabled behavior. Updated ActionItems.md to mark the bug fix complete and recorded this changelog entry.
- **Reasoning:** Vite surfaced a warning because both the default and elevated variants used identical keys in the conditional `clsx` map. Introducing an explicit variant lookup keeps the component maintainable and prevents future build noise.
- **Validation:** `npm run test`
- **Files Modified:** `src/components/ui/Card.tsx`, `docs/ActionItems.md`, `docs/CHANGELOG.md`

## 2025-10-31T15:15:00Z — Agent: gpt-5-codex

- **Summary:** Added product-configuration API endpoints with RBAC, Prisma-backed helpers, and contract tests to validate success and failure paths.
- **Reasoning:** Supervisors and admins need a secure way to review and manage model configuration data without bypassing server validation rules.
- **Changes Made:**
  - Introduced `src/server/product-config/productConfigurations.ts` with zod-validated list and upsert helpers for sections, components, options, and dependencies.
  - Added REST handlers under `src/app/api/product-configurations/**` enforcing role checks and structured JSON responses for listing and mutating configuration records.
  - Wrote Vitest contract tests covering successful requests and validation errors for listing and mutation endpoints.
- **Hats:** api-contract, security, qa-gate.

## 2025-10-30T12:30:00Z — Agent: gpt-5-codex

- **Summary:** Extended the Prisma schema with a product configuration hierarchy, restored LX26/LX24/LX22/LX21 configuration data into the backup set, and exported strongly typed helpers for server-side configuration queries.
- **Reasoning:** Work order planning depends on deterministic product configuration data; modeling sections, components, options, and dependencies ensures reseeds faithfully recreate manufacturing defaults.
- **Changes Made:**
  - Added ProductConfigurationSection/Component/Option/Dependency models and dependency enum tied to ProductModel and ProductTrim entities.
  - Seeded LX-series configuration sections, components, options, and dependency links via `backup-data.ts` and `seed.ts` for deterministic reseeds.
  - Introduced server typings for configuration payloads to keep API layers aligned with the expanded schema.
- **Hats:** domain, schema-change, seed, docs.

## 2025-10-27T21:00:00Z — Agent: QA & Release Gate

- **Summary:** Verified complete implementation of Departments and Work Centers CRUD UI pages. Both pages were already fully implemented at src/app/admin/departments/page.tsx and src/app/admin/work-centers/page.tsx with DataTable integration, create/edit modals, delete confirmation dialogs, CSV export support, and proper form validation. Updated ActionItems.md to move both tasks from Medium Priority to Completed Items section.
- **Reasoning:** The ActionItems.md listed these as pending UI implementations, but investigation revealed both pages already exist with complete functionality including backend API integration, soft delete patterns, dependency checking, and consistent UI patterns matching the established admin panel design. No code changes were needed - only documentation updates to reflect actual implementation status.
- **Findings:**
  - Departments page (286 lines): Full CRUD, displays user/work center counts, dependency checks before deletion, CSV export
  - Work Centers page (364 lines): Full CRUD, department selection, station/routing counts, soft delete with status badges
  - Both pages accessible via admin layout navigation at lines 78-79
  - Backend APIs already complete with validation and error handling
- **Files Modified:** docs/ActionItems.md (moved items to Completed), docs/CHANGELOG.md (this entry)
- **Hats:** qa-gate, docs.

## 2025-10-27T20:00:00Z — Agent: Docs & Runbooks

- **Summary:** Consolidated three implementation markdown files (ADMIN_IMPLEMENTATION_STATUS.md, FINAL_IMPLEMENTATION_SUMMARY.md, IMPLEMENTATION_COMPLETE.md) into a single comprehensive document at docs/ADMIN_PANEL_IMPLEMENTATION.md. Updated all related documentation (README.md, ActionItems.md, CHANGELOG.md, ONBOARDING.md, replit.md) to reflect admin panel implementation status and provide consistent references across the documentation suite.
- **Reasoning:** Three overlapping implementation files created confusion about the current state of the admin panel feature. Consolidating into a single source of truth with 10 major sections (Executive Summary, Feature Status, API Reference, Database Schema, Implementation Guide, Technical Details, UI/UX, Testing, File Structure, Troubleshooting) provides clear documentation for developers. Updated README.md to include admin panel in product features. Added remaining admin tasks and completed items to ActionItems.md. Added comprehensive admin panel changelog entries. Updated ONBOARDING.md with admin setup instructions. Updated replit.md with admin panel access information.
- **Changes Made:** (1) Created docs/ADMIN_PANEL_IMPLEMENTATION.md consolidating all three files, (2) Updated README.md Product Features and Reference Accounts sections, (3) Updated ActionItems.md with 3 medium priority and 3 low priority admin tasks plus 8 completed items, (4) Added this changelog entry documenting admin panel work, (5) Updated ONBOARDING.md with admin panel setup section, (6) Updated replit.md with admin panel reference.
- **Files Modified:** docs/ADMIN_PANEL_IMPLEMENTATION.md (new), README.md, docs/ActionItems.md, docs/CHANGELOG.md, docs/ONBOARDING.md, replit.md
- **Hats:** docs.

## 2025-10-27T19:00:00Z — Agent: Multiple (Consolidated Entry)

- **Summary:** Implemented comprehensive admin panel for workstation configuration management. Created full CRUD operations for departments, work centers, stations, users, and equipment. Implemented advanced features including pay rate history tracking, station metrics calculation infrastructure, work order cost estimation, and CSV export system. Extended database schema with 5 new models and updated seed data.
- **Reasoning:** Factory operations require centralized management of workstation configuration data including organizational hierarchy (departments, work centers, stations), personnel (users with pay rates and shift schedules), equipment assignments, and cost tracking. Admin panel provides ADMIN-only interface for managing this data with full audit trails and data integrity patterns (soft deletes, pay rate history, dependency checks).
- **Implementation Summary:**
  - Database: 5 new models (StationMember, Equipment, StationEquipment, PayRateHistory, StationMetrics), extended User and Station models
  - UI: Admin layout, 5 entity management pages with DataTable and ConfirmDialog components
  - APIs: 45+ endpoints covering full CRUD for all entities plus member/equipment management and metrics
  - Advanced Features: Automatic pay rate history, weighted average metrics calculation, work order cost estimation, CSV export
  - Security: RBAC with ADMIN-only access, soft deletes, self-deletion prevention, dependency checks
- **Files Created:** 65+ files including admin pages, API routes, shared components, utilities, and updated schema/seed files
- **Hats:** domain, schema-change, api-contract, role-ui, files, seed, security, docs.

## 2025-10-27T17:34:30Z — Agent: QA & Release Gate

- **Summary:** Added a Vitest setup mock for `@prisma/client` that preserves the real module when generated and provides enum fallbacks for `Role`, `WOStatus`, and `WOPriority` so unit tests always receive defined constants.
- **Reasoning:** Several suites import Prisma enums directly, and prior runs failed whenever the generated client was missing; stabilizing the enums in setup keeps tests deterministic across fresh installs.
- **Hats:** qa-gate.

## 2025-10-23T17:15:00Z — Agent: Docs & Runbooks

- **Summary:** Documented the supervisor planned-window helper and development login shortcuts in `replit.md`, corrected stack references to Tailwind + React 18, and logged the helper in the changelog.
- **Reasoning:** Keep contributor documentation aligned with the Oct 16 and Oct 23 feature work so onboarding developers understand current defaults and tooling expectations.
- **Hats:** docs.

## 2025-10-16T15:49:00Z — Agent: Docs & Runbooks

- **Summary:** Strengthened agent workflow to MANDATE documenting all discovered issues in ActionItems.md. Updated AGENTS.md Executive Summary (#7 requirement), Documentation & Change Management (CRITICAL section), Testing Expectations, PR Checklist, Definition of Done, and all agent role descriptions. Updated ActionItems.md "How to Use" section and ONBOARDING.md development workflow with non-negotiable discovery documentation requirement.
- **Reasoning:** Previous language was permissive ("as you discover") not imperative ("MUST add"). Agents were not consistently documenting discovered issues (test failures, build errors, bugs, warnings) in ActionItems.md, leading to lost technical debt tracking. This change makes discovery documentation mandatory across all roles and embedded in every critical workflow checkpoint (Executive Summary, PR Checklist, Definition of Done). Language is now imperative ("MUST", "CRITICAL", "non-negotiable") to eliminate ambiguity.
- **Changes Made**: (1) Added #7 to Executive Summary: "Document ALL discoveries", (2) Expanded Documentation & Change Management with 10-item discovery checklist, (3) Added test failure documentation to Testing Expectations, (4) Made PR Checklist explicit with discovery requirements, (5) Added discovery requirement to Definition of Done, (6) Added universal discovery clause to all 10 agent roles, (7) Added mandatory step #6 to ActionItems.md, (8) Emphasized requirement in ONBOARDING.md.
- **Hats:** docs, qa-gate.

## 2025-10-16T15:30:00Z — Agent: QA & Release Gate

- **Summary:** Configured ESLint (v8.57) and Prettier (v3.6.2) for consistent code quality and formatting. Created `.eslintrc.json` with Next.js defaults, no-console warnings, and Prettier integration. Created `.prettierrc` with project standards (no semicolons, single quotes, 2-space indent, trailing commas) and `.prettierignore` for build outputs. Added `lint`, `lint:fix`, `format`, and `format:check` scripts to package.json. Updated `docs/ActionItems.md` to mark ESLint and Prettier items complete and documented 6 newly discovered issues.
- **Reasoning:** Enforce consistent code style across the codebase (currently 93 files need formatting), catch potential issues early (17+ console.log warnings detected), and establish foundation for pre-commit hooks. ESLint v8 chosen for compatibility with Next.js 14 config system. Prettier config matches majority of existing code conventions.
- **Issues Discovered:** (1) 93 files need formatting with CRLF line ending issues, (2) 17 console.log warnings across codebase, (3) 4 test files failing due to Prisma enum import issues, (4) `buildKanbanColumns` export in supervisor page blocking builds, (5) Duplicate Card component border classes causing Vite warnings. All issues added to ActionItems.md for tracking.
- **Hats:** qa-gate.

## 2025-01-16T19:30:00Z — Agent: Docs & Runbooks

- **Summary:** Created `docs/ActionItems.md` to track prioritized technical debt and improvement tasks. Updated `AGENTS.md` to require checking action items before starting work and updating statuses during development. Added ActionItems reference to `docs/ONBOARDING.md` development workflow section.
- **Reasoning:** Provide a centralized, prioritized task list based on best practices analysis to coordinate work across agents, prevent duplicate efforts, and ensure important improvements don't get lost. Establishes clear workflow for claiming, tracking, and completing action items.
- **Hats:** docs, qa-gate.

## 2025-10-16T13:55:39Z — Agent: gpt-5-codex

- **Summary:** Hid the manual credential form in development, added quick-launch demo account buttons that share the login fetch helper, and kept the production form unchanged for manual sign-in flows.
- **Reasoning:** Streamline local testing by allowing one-click role switching without disrupting the production login behavior or its error handling.
- **Hats:** role-ui, qa-gate.

## 2025-10-15T16:14:46Z — Agent: gpt-5-codex

- **Summary:** Added an explicit edit workflow for supervisor planning details, including an unlock button and cancel/save controls that preserve the existing read-only view. Enabled editing across active statuses and updated the API to validate changes, record version snapshots, and allow supervisors to adjust planning dates without future-date restrictions.
- **Reasoning:** Supervisors need to adjust planning data on in-flight work orders while maintaining the audit trail and snapshot history so downstream teams see accurate priorities and schedule expectations.
- **Hats:** role-ui, api-contract, docs.

## 2025-10-15T15:40:02Z — Agent: gpt-5-codex

- **Summary:** Refined the supervisor Kanban into an accessible horizontal gallery with snap scrolling, stable gutters, and responsive column sizing while anchoring the theme toggle to the safe-area inset on touch devices.
- **Reasoning:** Ensure supervisors can browse every lane on mobile and desktop without layout overflow and keep the dark mode control unobtrusive yet reachable across devices with dynamic safe-area spacing.
- **Hats:** role-ui, qa-gate, docs.

## 2025-10-10T12:00:00Z — Agent: gpt-5-codex

- **Summary:** Enriched the supervisor dashboard API with workstation metadata, reworked the Kanban board to build dynamic work-center lanes with fallbacks, and added contract/unit tests covering the new dashboard payload and kanban grouping.
- **Reasoning:** Provide supervisors with workstation-aware visibility so the board layout matches active centers while ensuring future regressions are caught automatically.
- **Hats:** api-contract, role-ui, qa-gate.

## 2025-10-09T14:22:24Z — Agent: gpt-5-codex

- **Summary:** Rebuilt the operator console UI to consume theme-aware tokens, shared form primitives, and semantic status badges so every panel, table, and action control honors dark mode. Refreshed the product model/trim selector to lean on the shared Select/Input components, ensuring supervisor planning forms inherit the same adaptive styling.
- **Reasoning:** Replace the ad hoc inline styles that hardcoded light-theme colors so operators and supervisors get consistent, accessible experiences across light and dark themes while centralizing future styling updates.
- **Hats:** role-ui, docs, qa-gate.

## 2025-10-08T19:45:00Z — Agent: gpt-5-codex

- **Summary:** Applied theme-aware palettes to shared UI primitives, refreshed supervisor dashboard styling to respect CSS vari
  able tokens, and centralized status/priority color maps for dark-mode parity.
- **Reasoning:** Eliminate the lingering light-theme assumptions so supervisors see accessible contrast in both light and dark
  modes while keeping future component work anchored to shared tokens.

## 2025-10-08T17:30:00Z — Agent: gpt-5-codex

- **Summary:** Introduced a global theme provider and floating toggle to support persistent light/dark modes and refreshed shared styles to respect theme-aware tokens across forms, tables, and layout chrome.
- **Reasoning:** Ensure operators and supervisors can switch to a low-light friendly palette without losing readability while keeping shared UI primitives consistent.
- **Hats:** role-ui, qa-gate.

## 2025-10-08T16:05:00Z — Agent: gpt-5-codex

- **Summary:** Replaced the lightweight guidance with a comprehensive `AGENTS.md` playbook that adds an executive summary, role protocols, and reinforced domain/operational guardrails.
- **Reasoning:** Give future agents a scannable yet thorough reference so they can uphold the product invariants, testing discipline, and documentation habits without guesswork.

## 2025-10-08T15:18:59Z — Agent: gpt-5-codex

- **Summary:** Refreshed the project README to document the combined supervisor workspace, current operator capabilities, and up-to-date setup/testing guidance.
- **Reasoning:** Align the public-facing documentation with the latest product experience and developer workflow.

## 2025-10-08T14:20:00Z — Agent: gpt-5-codex

- **Summary:** Added the root `AGENTS.md` to codify coding standards, testing requirements, and documentation expectations. Established the shared change log process.
- **Reasoning:** Provide future agents with clear guardrails and traceability for their work.
