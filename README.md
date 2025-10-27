# Boat Factory Operations MVP

Next.js 14 operations platform supporting a high-mix, low-volume boat factory. The app coordinates what operators execute on the floor and how supervisors plan, release, and monitor work.

## Product Features

### Operator Console

- Real-time queue of READY and IN_PROGRESS work orders scoped to the operator's department, refreshed every five seconds.
- Search across work orders by number or hull ID and open any result directly from the queue.
- Guided action panel for the active stage with persisted station selection, quantity capture, and Start/Pause/Complete controls.
- Department picker for multi-skilled operators, backed by role-aware authentication and redirects.

### Supervisor Workspace

- Single workspace that merges planning and execution views with a table/Kanban toggle, live KPI cards, and department filtering for administrators.
- Detail drawer that surfaces the entire stage timeline, operator notes, file attachments, and version history in dedicated tabs.
- Integrated routing editor to enable/disable stages, reorder sequences, adjust standard times, and persist new routing versions for reuse.
- Work-order creation modal with model/trim selection, automatic SKU generation, and the ability to clone or reuse existing routings before release.
- Hold, unhold, and release actions with reason tracking to control production flow without leaving the workspace.

### Admin Panel

- Comprehensive workstation configuration management for departments, work centers, stations, users, and equipment.
- Full CRUD operations with role-based access control (ADMIN-only).
- Station management with member assignments, equipment tracking, and pay rate configuration.
- User management with automatic pay rate history tracking and shift scheduling support.
- Work order cost estimation based on routing stages and station labor rates.
- CSV export functionality for all entity types.
- Station metrics calculation with weighted average pay rates from historical work data.

### Platform Capabilities

- JWT-backed authentication with httpOnly cookies and role-based redirects between operator, supervisor, and admin experiences.
- Prisma/PostgreSQL data layer with audit history, notes, and attachments for end-to-end traceability.
- Department-aware stage gating so only the current enabled stage is actionable and recorded.
- Shared component library for stats, data grids, notes timelines, and file management to keep UI patterns consistent.

## Getting Started

Follow `docs/ONBOARDING.md` for environment prerequisites and secrets management, then:

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Generate the Prisma client**
   ```bash
   npm run prisma:generate
   ```
3. **Apply database migrations**
   ```bash
   npm run prisma:migrate -- --name init
   ```
4. **Seed the database with demo data**
   ```bash
   npm run seed
   ```
5. **Start the development server (defaults to port 5000)**
   ```bash
   npm run dev
   ```

## Testing

- Run the Vitest suite before opening a pull request:
  ```bash
  npm run test
  ```

## Reference Accounts

- **Admin**: admin@cri.local / password (or Admin123!)
- **Supervisor**: supervisor@cri.local / password (or Supervisor123!)
- **Operator**: operator@cri.local / password (or Operator123!)
- **Additional Operators**: joe.smith@cri.local, dave.jones@cri.local / password

## Documentation & Change Tracking

- Developer onboarding instructions live in `docs/ONBOARDING.md`.
- Admin panel implementation details in `docs/ADMIN_PANEL_IMPLEMENTATION.md`.
- Each agent must append their work to `docs/CHANGELOG.md` with a timestamp, summary, and reasoning.
- Track action items and technical debt in `docs/ActionItems.md`.
