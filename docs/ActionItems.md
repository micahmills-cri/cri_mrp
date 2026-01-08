# Action Items

This document tracks outstanding tasks, improvements, and technical debt for the Boat Factory Operations MVP. Items are organized by priority and include status tracking, ownership, and completion dates.

## How to Use This File

1. **Before starting work**: Review this file to understand current priorities and avoid duplicate work
2. **When planning features**: Check if related action items exist and incorporate them into your work
3. **During development**: Update item status as you progress (e.g., `[ ]` → `[WIP]` → `[x]`)
4. **After completing work**: Mark items as done, add completion date, and document in CHANGELOG.md
5. **When discovering new work**: Add items to the appropriate priority section with context
6. **MANDATORY for ALL agents**: When you discover ANY issue during work (testing, building, analyzing, implementing), you MUST add it to this file immediately with appropriate priority, context, estimated effort, agent role, and "Discovered: YYYY-MM-DD" tag. Failure to document discoveries means incomplete work.

**Status Indicators:**

- `[ ]` - Not started
- `[WIP]` - Work in progress (include agent role/name if applicable)
- `[x]` - Completed (include completion date)
- `[BLOCKED]` - Blocked (include blocker description)
- `[DEFERRED]` - Intentionally postponed (include reason)

---

## 🔴 High Priority (Do First)

### Code Quality & Tooling

- [ ] **Run Prettier to format codebase**
  - Run `npm run format` to format all 93 files with inconsistent formatting
  - Address CRLF line ending issues (Windows ␍ characters)
  - Standardize quotes (single vs double) and semicolons
  - Commit formatted files as single formatting pass
  - **Estimated effort**: 15 minutes (+ review time)
  - **Agent role**: QA & Release Gate
  - **Discovered**: 2025-01-16 during ESLint/Prettier setup

- [ ] **Fix exported function in supervisor page component**
  - File: `src/app/supervisor/page.tsx`
  - Issue: `buildKanbanColumns` function is exported but shouldn't be
  - Error: Next.js build fails with "Property 'buildKanbanColumns' is incompatible with index signature"
  - Fix: Either unexport the function or move it to a separate utility file
  - **Estimated effort**: 15 minutes
  - **Agent role**: UI/UX Implementer
  - **Discovered**: 2025-01-16 during build verification
  - **Blocks**: Production builds

- [ ] **Remove console.log statements from production code**
  - Create structured logging utility in `src/lib/logger.ts`
  - Replace console.log/warn/error across API routes, UI components, and server utilities (count needs refresh; exceeds prior "17 files" baseline)
  - Files affected: API routes, components, server utilities
  - **Estimated effort**: 2-3 hours
  - **Agent role**: QA & Release Gate
  - **Discovered**: 2025-01-16 - ESLint detects 17 console warnings

- [ ] **Set up pre-commit hooks**
  - Install `husky` and `lint-staged`
  - Configure to run ESLint and Prettier on staged files
  - Prevent commits with console.log statements
  - **Estimated effort**: 30 minutes
  - **Agent role**: QA & Release Gate

### Security

- [ ] **Create SECURITY.md**
  - Document vulnerability reporting process
  - List supported versions
  - Describe security measures (JWT, bcrypt, RBAC)
  - Include security contact email
  - **Estimated effort**: 30 minutes
  - **Agent role**: Security & Permissions

- [ ] **Implement rate limiting for auth endpoints**
  - Add Upstash Redis integration or use `@upstash/ratelimit`
  - Protect `/api/auth/login` (5 attempts per 15 minutes)
  - Protect file upload endpoints (20 requests per minute)
  - Add rate limit headers to responses
  - **Estimated effort**: 1-2 hours
  - **Agent role**: Security & Permissions

### CI/CD

- [ ] **Set up GitHub Actions CI pipeline**
  - Create `.github/workflows/ci.yml`
  - Run on push and pull requests
  - Steps: install → lint → format:check → test → build
  - Require Node 20+
  - Cache node_modules for faster runs
  - **Estimated effort**: 1 hour
  - **Agent role**: QA & Release Gate

- [ ] **Add PR status checks**
  - Require CI to pass before merge
  - Require at least 1 approval
  - Configure branch protection for main
  - **Estimated effort**: 15 minutes
  - **Agent role**: QA & Release Gate

### Testing

- [ ] **Expand API route test coverage**
  - Current: 3 routes tested (supervisor dashboard, product configurations, queues), 31 total routes
  - Target: All critical routes (auth, work-orders, queues)
  - Priority routes: `/api/auth/login`, `/api/work-orders/*`, `/api/queues/*`
  - **Estimated effort**: 4-6 hours
  - **Agent role**: QA & Release Gate

- [ ] **Set test coverage thresholds**
  - Update `vitest.config.mts` with coverage config
  - Set minimum 70% for lines, functions, branches, statements
  - Make coverage checks part of CI pipeline
  - **Estimated effort**: 30 minutes
  - **Agent role**: QA & Release Gate

---

## 🟡 Medium Priority (Do Soon)

### Admin Panel Enhancements

_(All medium priority admin panel UI tasks are complete - moved to Completed Items)_

### Bug Fixes

### Documentation

- [ ] **Add LICENSE file**
  - Package.json specifies "ISC" but file is missing
  - Add ISC license text to repo root
  - **Estimated effort**: 10 minutes
  - **Agent role**: Docs & Runbooks

- [ ] **Create CONTRIBUTING.md**
  - Development setup process
  - Branch naming conventions (feature/, fix/, docs/)
  - Commit message format
  - PR requirements (tests, changelog, agent role)
  - Reference AGENTS.md for role selection
  - **Estimated effort**: 1 hour
  - **Agent role**: Docs & Runbooks

- [ ] **Add PR and issue templates**
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/ISSUE_TEMPLATE/bug_report.md`
  - `.github/ISSUE_TEMPLATE/feature_request.md`
  - **Estimated effort**: 45 minutes
  - **Agent role**: Docs & Runbooks

### Developer Experience

- [ ] **Provide default env vars for local dev API flows**
  - Local QA attempts fail with 500 errors because `DATABASE_URL`, `JWT_SECRET`, and `STORAGE_BUCKET_ID` are undefined during `next dev`
  - Document setup or supply `.env.example` values that allow non-persistent QA
  - Consider adding mock/stub mode for modal verification without Postgres
  - **Estimated effort**: 45 minutes
  - **Agent role**: Docs & Runbooks
  - **Discovered**: 2025-10-23 while QAing supervisor modal defaults

### Error Handling & Observability

- [ ] **Centralize API error handling**
  - Create `src/lib/api-error.ts` with ApiError class
  - Implement consistent error codes across routes
  - Add error handler utility function
  - Update 10+ API routes to use centralized patterns
  - **Estimated effort**: 2-3 hours
  - **Agent role**: API & Contracts

- [ ] **Implement structured logging**
  - Add `pino` or `winston` dependency
  - Create `src/lib/logger.ts` with log levels
  - Configure log formatting for development vs production
  - Integrate with Sentry if available
  - **Estimated effort**: 2 hours
  - **Agent role**: API & Contracts

- [ ] **Add Sentry error monitoring** (Optional)
  - Configure `NEXT_PUBLIC_SENTRY_DSN` integration
  - Add error boundary components
  - Capture API errors and uncaught exceptions
  - Set up source maps for production debugging
  - **Estimated effort**: 1-2 hours
  - **Agent role**: API & Contracts

### Dependency Management

- [ ] **Set up Dependabot or Renovate**
  - Create `.github/dependabot.yml` for npm updates
  - Configure weekly update schedule
  - Limit to 5 open PRs at a time
  - Auto-merge patch updates after CI passes
  - **Estimated effort**: 30 minutes
  - **Agent role**: QA & Release Gate

- [ ] **Update TypeScript type definitions**
  - Run `npm update @types/*`
  - Update @types/node from 22.18.x to latest 22.x
  - Test that all types still compile correctly
  - **Estimated effort**: 30 minutes
  - **Agent role**: QA & Release Gate

- [ ] **Plan Next.js 14 → 15 migration** (Research)
  - Review Next.js 15 breaking changes
  - Test compatibility with current codebase
  - Document migration plan and risks
  - Consider waiting for 15.x LTS
  - **Estimated effort**: 2-3 hours (research only)
  - **Agent role**: Product Architect

### Testing Expansion

- [ ] **Add component unit tests**
  - Priority components: Button, Card, Input, Select
  - Test rendering, props, user interactions
  - Use React Testing Library patterns
  - Target: 80% coverage for `src/components/ui/`
  - **Estimated effort**: 3-4 hours
  - **Agent role**: QA & Release Gate

- [ ] **Add integration tests for work order lifecycle**
  - Test: Create → Release → Start → Complete → Close flow
  - Mock Prisma client for database interactions
  - Verify audit logs and version snapshots created
  - **Estimated effort**: 2-3 hours
  - **Agent role**: QA & Release Gate

---

## 🟢 Low Priority (Nice to Have)

### Admin Panel Optional Features

- [ ] **Implement Station Metrics Calculation System**
  - Calculate weighted average pay rates from WOStageLog data
  - Formula: `SUM(userRate * hoursWorked) / SUM(hoursWorked)` over last 30 days
  - Cache results in StationMetrics table
  - Add manual recalculation trigger UI
  - **Estimated effort**: 4-6 hours
  - **Agent role**: API & Contracts, UI/UX Implementer
  - **Note**: Infrastructure exists, needs calculation logic

- [ ] **Implement CSV Import System**
  - Parse CSV files for bulk operations
  - Validate data and preview changes before import
  - Bulk create/update with rollback on failure
  - Create import utilities for each entity type
  - **Estimated effort**: 8-12 hours
  - **Agent role**: API & Contracts
  - **Note**: Export already complete

- [ ] **Implement Shift Scheduling UI Component**
  - Visual schedule builder with day selector
  - Time range picker for start/end times
  - JSON storage format in User.shiftSchedule field
  - **Estimated effort**: 3-4 hours
  - **Agent role**: UI/UX Implementer
  - **Note**: Backend support already exists

### Testing & Quality

- [ ] **Add E2E tests with Playwright**
  - Install Playwright and configure
  - Critical flows: Login, operator queue, supervisor work order creation
  - Run E2E tests in CI (separate workflow)
  - **Estimated effort**: 4-6 hours
  - **Agent role**: QA & Release Gate

- [ ] **Add visual regression testing**
  - Use Playwright's screenshot comparison
  - Test key UI states (light/dark theme, different roles)
  - Store baseline screenshots in repo
  - **Estimated effort**: 2-3 hours
  - **Agent role**: UI/UX Implementer

### Code Quality

- [ ] **Add TypeScript strict null checks**
  - Already in strict mode, but audit for any `!` assertions
  - Replace with proper null/undefined handling
  - Add explicit return type annotations to API routes
  - **Estimated effort**: 2-3 hours
  - **Agent role**: QA & Release Gate

- [ ] **Implement API request validation middleware**
  - Create reusable Zod validation wrapper
  - Reduce boilerplate in route handlers
  - Standardize error responses for validation failures
  - **Estimated effort**: 2 hours
  - **Agent role**: API & Contracts

### Performance & Monitoring

- [ ] **Add performance monitoring**
  - Integrate with Sentry performance or Vercel Analytics
  - Track API endpoint response times
  - Monitor database query performance
  - Set up alerts for slow endpoints (>800ms)
  - **Estimated effort**: 2-3 hours
  - **Agent role**: API & Contracts

- [ ] **Optimize database queries**
  - Review Prisma queries for N+1 issues
  - Add `select` clauses to limit returned fields
  - Consider adding database query logging in development
  - **Estimated effort**: 3-4 hours
  - **Agent role**: DB Migration & Versioning

- [ ] **Add Redis caching layer** (Optional)
  - Cache department queues (5-second TTL)
  - Cache supervisor dashboard KPIs (10-second TTL)
  - Implement cache invalidation on work order updates
  - **Estimated effort**: 3-4 hours
  - **Agent role**: API & Contracts

### Documentation

- [ ] **Generate API documentation**
  - Use tool like Swagger/OpenAPI
  - Document all 31 API routes
  - Include request/response schemas (Zod → JSON Schema)
  - Host as `/api/docs` endpoint
  - **Estimated effort**: 4-5 hours
  - **Agent role**: Docs & Runbooks

- [ ] **Create architecture decision records (ADRs)**
  - Document key decisions: JWT auth, Prisma ORM, Next.js 14
  - Store in `docs/adr/` directory
  - Include context, decision, consequences
  - **Estimated effort**: 2-3 hours
  - **Agent role**: Product Architect

### Developer Experience

- [ ] **Add VS Code workspace settings**
  - Create `.vscode/settings.json` with recommended extensions
  - Configure auto-format on save
  - Set TypeScript SDK to workspace version
  - **Estimated effort**: 20 minutes
  - **Agent role**: Docs & Runbooks

- [ ] **Create Docker development environment**
  - Dockerfile for application
  - docker-compose.yml with PostgreSQL service
  - Document Docker setup in ONBOARDING.md
  - **Estimated effort**: 2-3 hours
  - **Agent role**: Docs & Runbooks

---

## 🔵 Backlog (Future Considerations)

- [ ] Consider monorepo structure if project grows (Turborepo/Nx)
- [ ] Add internationalization (i18n) support if needed
- [ ] Implement WebSocket for real-time updates (replace polling)
- [ ] Add mobile-responsive operator view improvements
- [ ] Create data export functionality (CSV, Excel)
- [ ] Add bulk operations for work orders
- [ ] Implement advanced search with filters
- [ ] Add user activity dashboard for supervisors
- [ ] Create onboarding tour for new users
- [ ] Add keyboard shortcuts for power users

---

## ✅ Completed Items

_(Items move here when marked complete with `[x]` status)_

### 2026-01-07

- [x] **Resolve npm "Unknown env config http-proxy" warning** (Agent: QA & Release Gate, Completed: 2026-01-07) - Replaced deprecated `npm_config_http_proxy` with `npm_config_proxy` in the environment configuration to remove npm warnings while preserving proxy routing.

### 2025-10-27

- [x] **Fix duplicate Card component border classes** (Agent: Codex - UI/UX Implementer, Completed: 2025-10-27) - Updated `src/components/ui/Card.tsx` to centralize variant styling so the elevated variant uses a distinct shadow, removing duplicate object keys flagged during builds.
- [x] **Departments CRUD UI Implementation** (Agent: UI/UX Implementer, Completed: 2025-10-27) - Verified complete implementation at src/app/admin/departments/page.tsx with DataTable, create/edit modals, dependency checks for deletion (users/work centers), CSV export integration, and form validation. Backend APIs already complete with full CRUD operations.

- [x] **Work Centers CRUD UI Implementation** (Agent: UI/UX Implementer, Completed: 2025-10-27) - Verified complete implementation at src/app/admin/work-centers/page.tsx with DataTable, create/edit modals showing department assignment, station counts display, soft delete support, and status badges (Active/Inactive). Backend APIs already complete with full CRUD operations.

- [x] **Admin Panel Infrastructure** (Agent: UI/UX Implementer, Completed: 2025-10-27) - Created admin layout with sidebar navigation, admin dashboard landing page, and "Admin Panel" button in supervisor dashboard. Protected routes via middleware. All pages use consistent UI patterns with DataTable and ConfirmDialog components.

- [x] **Stations CRUD Implementation** (Agent: UI/UX Implementer, API & Contracts, Completed: 2025-10-27) - Implemented full CRUD for stations with list view, detail page with tabs (Details, Members, Equipment), member assignment/unassignment, equipment assignment/unassignment, and soft delete support. Created 8+ API endpoints for stations management.

- [x] **Users CRUD Implementation** (Agent: UI/UX Implementer, API & Contracts, Completed: 2025-10-27) - Implemented full CRUD for users with list view, create/edit modals, automatic pay rate history tracking, self-deletion prevention, and password management. Created 4 API endpoints for user management.

- [x] **Equipment CRUD Implementation** (Agent: UI/UX Implementer, API & Contracts, Completed: 2025-10-27) - Implemented full CRUD for equipment with list view, create/edit modals, name uniqueness validation, and soft delete support. Created 4 API endpoints for equipment management.

- [x] **Departments & Work Centers CRUD APIs** (Agent: API & Contracts, Completed: 2025-10-27) - Implemented complete API layer for departments and work centers with full CRUD operations, validation, dependency checks, and CSV export. Created 12 API endpoints total.

- [x] **Admin Panel Database Schema** (Agent: DB Migration & Versioning, Completed: 2025-10-27) - Extended Prisma schema with 5 new models (StationMember, Equipment, StationEquipment, PayRateHistory, StationMetrics) and extended User and Station models with admin-related fields. Updated seed data with comprehensive test data.

- [x] **Work Order Cost Estimation API** (Agent: API & Contracts, Completed: 2025-10-27) - Implemented cost estimation API that calculates labor costs based on routing stages and station rates. Returns total hours, total cost, average rate, and per-stage breakdown.

- [x] **CSV Export System** (Agent: API & Contracts, Completed: 2025-10-27) - Implemented CSV export functionality for all admin entities (departments, work centers, stations, users, equipment). Created centralized CSV utility with proper escaping and download headers.

### 2025-10-27

- [x] **Fix Prisma enum imports in test files** (Agent: QA & Release Gate — gpt-5-codex, Completed: 2025-10-27) - Added Vitest setup mock for `@prisma/client` to ensure `Role`, `WOStatus`, and `WOPriority` enums are always defined in tests even when the Prisma client is unavailable.

### 2025-01-16

- [x] **Repository best practices analysis** (Agent: QA & Release Gate, Completed: 2025-01-16) - Completed comprehensive analysis of codebase identifying security, testing, and code quality improvements. Created this ActionItems tracking file and updated AGENTS.md workflow.
- [x] **Add ESLint configuration** (Agent: QA & Release Gate, Completed: 2025-01-16) - Installed eslint@8.57 and eslint-config-next. Created `.eslintrc.json` with Next.js defaults, Prettier integration, and no-console warning rule. Added `lint` and `lint:fix` scripts. ESLint now catches 17+ console.log warnings and formatting issues.
- [x] **Add Prettier configuration** (Agent: QA & Release Gate, Completed: 2025-01-16) - Installed prettier@3.6.2 with ESLint plugin. Created `.prettierrc` with project standards (no semicolons, single quotes, 2-space indent, trailing commas). Created `.prettierignore` for build outputs and migrations. Added `format` and `format:check` scripts. Prettier identifies 93 files needing formatting.
- [x] **JWT_SECRET validation** (Agent: Security & Permissions, Completed: 2025-01-16) - Confirmed already implemented in `src/lib/env.ts` using Zod schema validation with 32-character minimum. Validation happens at app startup and fails fast if not met. Test environments properly configured with valid secrets.

---

## Notes & Context

### Related Documents

- **AGENTS.md**: Agent role descriptions and workflow
- **CHANGELOG.md**: Record of all changes with timestamps
- **ONBOARDING.md**: Developer setup guide
- **docs/diagnosis.md**: Troubleshooting guide

### Conventions

- **High Priority**: Items affecting security, code quality, or blocking other work
- **Medium Priority**: Important improvements that enhance maintainability
- **Low Priority**: Nice-to-have features that add polish
- **Backlog**: Ideas for future consideration, not currently scheduled

### Agent Assignment

When picking up an action item, assign yourself by adding your role/name to the item:

```markdown
- [WIP] **Task name** (Agent: QA & Release Gate)
```

When completing an item:

```markdown
- [x] **Task name** (Agent: QA & Release Gate, Completed: 2025-01-16)
```

Then move the item to the "Completed Items" section and document in CHANGELOG.md.
