# Boat Factory MRP System - Redesign Specification (DRAFT)
## Starting from Scratch with UX at the Core

**Version:** 1.0 DRAFT
**Date:** 2026-01-15
**Purpose:** Define a streamlined, purpose-built system for boat production tracking

---

## Executive Summary

This specification outlines a complete redesign of the boat factory MRP system, focusing on three core workflows:

1. **Intake:** Receive build sheets from external quoting tool
2. **Planning:** Supervisors review, modify, schedule work orders
3. **Execution:** Operators track time and progress at their stations

The redesign prioritizes:
- **Simplicity:** Remove unnecessary complexity, focus on core needs
- **User Experience:** Each role gets exactly what they need, nothing more
- **Auditability:** Complete 2+ year history of all work order changes
- **Maintainability:** Clear architecture, easy to understand and modify

---

## Core Requirements

### 1. Work Order Intake
- **Source:** External model configuration/quoting tool (future PLM integration)
- **Initial State:** New orders arrive in "Pending Review" queue
- **Data Required:**
  - Order number
  - Hull ID
  - Product SKU (model + trim + options) [USER NOTE]:"Needs to be model+trim+modelyear. We track models by the model year. Save the options for the build specifcation"
  - Quantity
  - Customer information (reference only)
  - Build specification (JSON snapshot)

### 2. Supervisor Planning & Management
Supervisors must be able to:
- **Review** incoming orders in a queue
- **Add notes** and attachments (drawings, specs, photos)
- **Assign or modify** the production route
- **Schedule** planned start/finish dates
- **Release** to production floor
- **Monitor** progress on a dashboard
- **Hold/Resume** work orders with documented reasons
- **View history** of all changes to any work order

### 3. Operator Execution
Operators at each station must be able to:
- **See their queue:** Only work assigned to their station/department
- **View build sheet:** Product specs, notes, attachments for current order
- **Clock on/off:** Start and complete tasks for their station
- **Record quantities:** Good parts and scrap [USER NOTE]:"Not every department would need this. Make it a toggle at the department table for Admins to turn on and off for each department, with the standard being off."
- **Add notes:** Issues, observations, questions
- **Upload photos:** Damage reports, progress photos, etc.

---

## User Roles & Permissions

### Admin
- **Full access** to all configurations [USER NOTE]:"They need to be able to see all views (Supervisor and Operator) unscoped. For example if an operator is having an issue, the Admin should be able to go to their task and view it as they do and make changes to help get them unstuck"
- **Manage:** Departments, stations, routes, users, equipment
- **View:** All work orders, all departments
- **Cannot:** Clock time to work orders (not a floor role)

### Supervisor
- **Department-scoped:** Only sees their department's work (unless admin flag set) [USER NOTE]:"No they need to be able to see AAAAALLL department work. These are not department managers but Operations Supervisors responsible for the flow of the whole build."
- **Manage:** Work order scheduling, routing, holds, releases
- **Edit:** Notes, attachments, work routes
- **View:** All stages of work orders in their scope [USER NOTE]:"Again, their scope is all work orders."
- **Cannot:** Modify system configuration (departments, stations, etc.)

### Operator
- **Station-scoped:** Only sees work queued for their current station
- **Execute:** Start/stop work, record quantities
- **View:** Build sheet, notes, attachments for current work order
- **Add:** Notes and attachments
- **Cannot:** Modify schedules, routes, or see other departments

---

## Data Model (Simplified)

### Configuration Tables (Admin-managed)

**Departments**
```
- id
- name (unique)
- description
- sort_order
```

**Stations**
```
- id
- code (unique, e.g., "LAMI-01")
- name
- department_id (FK)
- capacity (integer)
- hourly_rate (decimal, for costing)
- is_active (boolean)
```

**Routes** (Production workflow templates)
```
- id
- name (e.g., "Standard 24ft", "Express Build")
- description
- is_active (boolean)
- version (integer, immutable once released)
```

**Route Steps** [USER NOTE]:"Need to be able to add attachments to steps. Some work instructions would benefit from having an image attached or video linked for a visual."
```
- id
- route_id (FK)
- sequence (integer, defines order)
- station_id (FK)
- step_name (e.g., "Lamination", "Hull Rigging")
- estimated_hours (decimal)
- instructions (markdown/text)
- is_required (boolean, can skip if false)
```

**Users**
```
- id
- email (unique)
- password_hash
- role (ADMIN | SUPERVISOR | OPERATOR)
- department_id (FK, nullable for admins)
- primary_station_id (FK, nullable, operator's default station)
- hourly_rate (decimal, for labor tracking)
- is_active (boolean)
```

### Work Order Tables

**Work Orders**
```
- id
- order_number (unique, e.g., "WO-2024-0001")
- hull_id (unique identifier for the boat)
- product_sku (model-trim-options) [USER NOTE]:"Again this should be model-trim-modelyear instead."
- build_spec (JSONB, immutable snapshot from quoting tool)
- route_id (FK, assigned route)
- quantity (integer, typically 1 for boats) [USER NOTE]:"Remove. Each boat needs its own WO. If someone orders 3 boats then we will have 3 separat work orders in the queue."
- status (PENDING_REVIEW | RELEASED | IN_PROGRESS | ON_HOLD | COMPLETED | CANCELLED)
- priority (LOW | NORMAL | HIGH | URGENT)
- planned_start_date (date)
- planned_finish_date (date)
- actual_start_date (timestamp, when first started)
- actual_finish_date (timestamp, when completed)
- current_step_id (FK to route_steps, tracks progress)
- created_at (timestamp) [USER NOTE]:"Make sure all time stamps are done in EST. We are in the eastern side of the state of Georgia."
- created_by (FK to users)
- updated_at (timestamp)
```

**Work Order Steps** (Actual execution tracking)
```
- id
- work_order_id (FK)
- route_step_id (FK, which step in the route)
- station_id (FK, where work was done)
- sequence (integer, copied from route at WO creation)
- status (PENDING | IN_PROGRESS | COMPLETED | SKIPPED)
- started_at (timestamp)
- completed_at (timestamp)
- good_quantity (integer)
- scrap_quantity (integer)
- actual_hours (decimal, calculated from time entries)
```

**Time Entries** (Clock-on/clock-off events)
```
- id
- work_order_step_id (FK)
- user_id (FK, who did the work)
- started_at (timestamp)
- ended_at (timestamp, nullable if still clocked on)
- duration_hours (decimal, calculated)
- notes (text, optional)
```

**Work Order Notes**
```
- id
- work_order_id (FK)
- user_id (FK, who created the note)
- note_text (text)
- is_supervisor_note (boolean, for filtering)
- created_at (timestamp)
```

**Work Order Attachments**
```
- id
- work_order_id (FK)
- user_id (FK, who uploaded)
- filename (text)
- file_path (text, storage key)
- file_size (integer, bytes)
- mime_type (text)
- uploaded_at (timestamp)
```

**Work Order Change Log** (Audit trail)
```
- id
- work_order_id (FK)
- changed_by (FK to users)
- change_type (CREATED | STATUS_CHANGED | ROUTE_MODIFIED | NOTE_ADDED | ATTACHMENT_ADDED | FIELD_UPDATED)
- field_name (text, nullable, which field changed)
- old_value (JSONB, nullable)
- new_value (JSONB, nullable)
- change_reason (text, nullable, for holds/cancellations)
- changed_at (timestamp)
```

**Messages** (Optional: Inter-department communication)
```
- id
- work_order_id (FK)
- from_user_id (FK)
- to_department_id (FK, nullable, broadcast if null)
- message_text (text)
- is_resolved (boolean)
- created_at (timestamp)
```

### Supporting Tables

**Equipment** (Optional: Track tools/machines) [USER NOTE]:"Remove. Not needed at this stage."
```
- id
- name
- station_id (FK)
- serial_number
- is_available (boolean)
```

---

## User Interface Design

### Login & Navigation
- Single login page
- Role-based redirect after authentication
- Simple top nav: Logo | Role-specific menu | User dropdown (logout)
- No complex navigation trees

### Admin Panel
**Layout:** Sidebar navigation with sections
- Dashboard (system stats)
- Departments (list, create, edit)
- Stations (list, create, edit, assign users)
- Routes (list, create, edit steps)
- Users (list, create, edit, assign roles/departments)
- Equipment (optional)

**Key Principles:**
- Standard CRUD operations
- Clear success/error messages
- Confirmation dialogs for destructive actions
- Inline editing where possible
- CSV export on all list views

### Supervisor Workspace
**Layout:** Single page application with tabs [USER NOTE]:"I'd prefer the Admin Panel and the Supervisor workspace both utilize sidebar navigation with sections rather than tabs for a clean and consistent UI/UX experience between the two roles since Admins will be able to see all the sections Supervisors see, but supervisors wont be able to see all an admin sees."

**Tab 1: Queue (Default View)**
- Table of work orders in "Pending Review" status
- Columns: Order #, Hull ID, SKU, Priority, Received Date
- Actions: Review (opens detail modal)

**Tab 2: Schedule** [USER NOTE]:"They need to also have an option to bring up the WO detail modal when clicking an icon on the calendar or timeline item"
- Calendar or timeline view
- Drag-and-drop to adjust planned dates
- Filter by: Status, Priority, Date range
- Color-coded by status

**Tab 3: Active Work** 
- Real-time dashboard of IN_PROGRESS work orders
- Shows current station, operator, time elapsed
- Quick actions: Hold, Add Note, View Details

**Tab 4: History**
- Completed/Cancelled work orders
- Advanced search/filter
- Full audit trail access

**Work Order Detail Modal:** [USER NOTE]:"Notes & Attachments, and Change History need to be collapsible with a default to collapsed.
- Header: Order #, Hull ID, Status, Priority
- Section 1: Build Spec (product details)
- Section 2: Route (editable before release)
  - Add/remove steps
  - Reorder steps
  - Edit time estimates
- Section 3: Schedule (planned dates)
- Section 4: Notes & Attachments
- Section 5: Change History
- Footer Actions: Release to Production, Hold, Cancel, Save Changes

### Operator Console
**Layout:** Simple, focused, mobile-friendly

**View 1: My Queue**
- Cards (not table) showing work orders
- Only shows work for operator's current station
- Each card shows:
  - Order #, Hull ID
  - Product info (model/trim)
  - Priority indicator
  - Action button: "Start Work"

**View 2: Active Work (Detail)**
- Full-screen focus on ONE work order
- Top: Order #, Hull ID, Product
- Middle: Build instructions, notes, attachments
- Bottom: Time tracking
  - Big "Clock On" button (or "Clock Off" if already started)
  - Good/Scrap quantity inputs [USER NOTE]:"Again, this should be turned off by default by in the admin configuration. Only departments that have this checked on by the admin should see this, and an answer should not be enforced if it is not enabled."
  - "Complete Step" button
- Sidebar: Quick add note, upload photo

**View 3: History**
- Simple list of completed work from today/this week
- For reference only

**Key Principles:**
- Large touch targets (for gloved hands, tablets)
- High contrast, readable fonts
- Minimal scrolling
- Clear call-to-action buttons
- Auto-save where possible

---

## Key Workflows

### Workflow 1: New Order Intake (Future PLM Integration)
1. External quoting tool sends build sheet via API
2. System creates work order in PENDING_REVIEW status
3. Assigns default route based on product SKU
4. Logs creation in change log
5. Appears in supervisor's Queue tab

**API Endpoint:** `POST /api/intake/work-orders`
**Payload:**
```json
{
  "orderNumber": "WO-2026-0123",
  "hullId": "HULL-24-789",
  "productSku": "LX24-SPORT-PKG3", [USER NOTE]:"A better example would be LX24-SPORT-2026"
  "buildSpec": {
    "model": "LX24",
    "trim": "Sport",
    "options": { ... } [USERNOTE]:"The nomenclature will likely come as feautures not options"
  },
  "quantity": 1,
  "customerRef": "ORDER-12345" 
}
```

### Workflow 2: Supervisor Reviews & Releases Order
1. Supervisor opens work order from Queue tab
2. Reviews build spec, customer requirements
3. Adds notes (e.g., "Customer wants custom graphics")
4. Uploads attachments (e.g., graphics file)
5. Modifies route if needed (add/remove/reorder steps) [USER NOTE]:"Some steps are done in parallel. Others are not dependant or have no dependants, just need to be completed at some point before release. Make sure the UI/UX is easy to configure the flow (including independent steps outside critical path)."
6. Sets planned start/finish dates
7. Clicks "Release to Production"
8. Status changes: PENDING_REVIEW → RELEASED
9. Work order appears in operator queues (for first station) [USER NOTE]:"Only shows as Upcoming or Planned for the Operator. They can review it, but not begin work till the planned start date."
10. Change logged with supervisor ID and timestamp

### Workflow 3: Operator Executes Work
1. Operator logs in, sees their queue [USER NOTE]:"With Avalable WOs at the top and Planned/Upcoming WOs displayed as well jsut without the option to action on them. All should be sorted by first come first serve, but priority flags clearly visible."
2. Selects work order, clicks "Start Work"
3. System creates time entry with started_at timestamp
4. Operator performs work (lamination, rigging, etc.)
5. Operator records good/scrap quantities [USER NOTE]:"If applicable. See prior notes."
6. Operator adds notes if needed (e.g., "Minor gelcoat repair needed")
7. Operator clicks "Complete Step" [USER NOTE]:"Needs a PAUSE STEP option. Show a record of the amount of time paused. Sometimes people don't finish a job before they go home and they complete it the next day. We don't want this to skew labor records for costing. It would be nice to see TOTAL TIME and ACTIVE TIME to differentiate between how long something was in a stage and how long it was actively being worked for."
8. System prompts: "Clock Off?"
9. Operator confirms, time entry closed with ended_at
10. Work order step marked COMPLETED
11. System automatically advances work order to next step
12. Next station's operators see the work order in their queue
13. Change log records: step completion, operator, time spent

### Workflow 4: Supervisor Holds Work Order
1. Supervisor sees issue (missing parts, quality problem)
2. Opens work order, clicks "Hold"
3. System prompts for reason: "Missing engine components"
4. Status changes: IN_PROGRESS → ON_HOLD
5. Work order removed from all operator queues
6. Change log records: hold, reason, supervisor ID
7. Later: Supervisor clicks "Resume"
8. Status changes: ON_HOLD → IN_PROGRESS (or RELEASED if not started)
9. Work order returns to appropriate queue
10. Change log records: resume, supervisor ID

### Workflow 5: View Historical Work Order (2+ Years Later)
1. Admin/Supervisor uses History tab
2. Searches by hull ID or order number
3. Opens work order detail
4. Views Change History tab
5. Sees complete timeline:
   - Created by X on DATE
   - Route modified by Y on DATE (shows before/after)
   - Released by Z on DATE
   - Started at Station A by Operator 1 on DATE at TIME
   - Note added: "Issue with alignment"
   - Attachment added: photo123.jpg
   - Completed at Station A on DATE at TIME (3.5 hours)
   - Started at Station B by Operator 2 on DATE at TIME
   - Held by Supervisor on DATE, reason: "Missing parts"
   - Resumed by Supervisor on DATE
   - ... (continues through all steps)
   - Completed on DATE
6. Can expand each change to see full details (old/new values)
7. Can download all attachments from that period

---

## Technical Architecture

### Technology Stack (Simplified)
- **Framework:** Next.js 14 (App Router) with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Frontend:** React with Tailwind CSS
- **Authentication:** JWT with httpOnly cookies
- **File Storage:** S3-compatible object storage (Replit, AWS, etc.)
- **API:** RESTful JSON APIs
- **Testing:** Vitest for unit/integration tests

### Architecture Principles
1. **Server-side rendering** for initial page loads (SEO, performance)
2. **API routes** in Next.js (colocated with frontend)
3. **Role-based middleware** for all protected routes
4. **Zod schemas** for request validation
5. **Prisma transactions** for multi-table updates
6. **Immutable logs** - never delete/update audit records
7. **Soft deletes** for user-facing records (is_active flags)

### Database Design Principles
1. **Normalized structure** for configuration (departments, stations, routes)
2. **Denormalized snapshots** for work orders (copy route at creation)
3. **Separate time entries** from work order steps (for detailed tracking)
4. **Change log uses JSONB** for flexible before/after storage
5. **Indexed columns:** order_number, hull_id, status, created_at, work_order_id
6. **Foreign keys with CASCADE** where appropriate (cleanup)

### API Design Standards
**Endpoints:**
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/work-orders (list, with filters)
POST   /api/work-orders (supervisor creates)
GET    /api/work-orders/[id] (detail)
PATCH  /api/work-orders/[id] (update)
POST   /api/work-orders/[id]/release
POST   /api/work-orders/[id]/hold
POST   /api/work-orders/[id]/resume
POST   /api/work-orders/[id]/cancel

GET    /api/work-orders/[id]/notes
POST   /api/work-orders/[id]/notes

GET    /api/work-orders/[id]/attachments
POST   /api/work-orders/[id]/attachments (upload)

GET    /api/work-orders/[id]/changelog

POST   /api/work-orders/[id]/steps/[stepId]/start (clock on)
POST   /api/work-orders/[id]/steps/[stepId]/complete (clock off)

GET    /api/operator/queue (my station's work)

GET    /api/supervisor/queue (pending review)
GET    /api/supervisor/dashboard (stats)

GET    /api/admin/departments
POST   /api/admin/departments
PATCH  /api/admin/departments/[id]
DELETE /api/admin/departments/[id]

(Similar CRUD for stations, routes, users, equipment)
```

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Format:**
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Security Considerations
1. **Passwords:** bcrypt hashing (12+ rounds)
2. **JWT Secret:** 32+ character random string, stored in .env
3. **httpOnly cookies:** Prevent XSS attacks
4. **CORS:** Configured for trusted domains only
5. **Rate limiting:** On login endpoint (prevent brute force)
6. **Input validation:** Zod schemas on all inputs
7. **SQL injection:** Prevented by Prisma (parameterized queries)
8. **File uploads:** Validate mime types, size limits
9. **Audit logging:** All mutations logged with user ID
10. **Role checks:** Every API route validates user role

---

## Migration Strategy (If Needed) [USER NOTE]:"Not needed. We will start froms cratch."

If migrating from current system:
1. **Export existing data** to CSV/JSON
2. **Map old schema to new schema**
3. **Write migration scripts** (Prisma + custom)
4. **Import work order history** (preserve audit trail)
5. **Test with subset** of data first
6. **Parallel run** (optional, if time permits)
7. **Cutover** during planned downtime

**Key Data Mappings:**
- Current WorkOrder → New Work Orders
- Current WOStageLog → New Time Entries + Change Log
- Current RoutingVersion/RoutingStage → New Routes/Route Steps
- Current Department → New Departments
- Current Station → New Stations
- Current User → New Users

---

## Performance Targets

- **Login:** < 500ms
- **Operator Queue Load:** < 1s
- **Supervisor Dashboard:** < 2s
- **Work Order Detail:** < 1s
- **File Upload:** < 5s for 10MB file
- **Search:** < 1s for 10,000+ work orders

**Optimization Strategies:**
- Database indexing on common queries
- Pagination for large result sets
- Caching for configuration data (departments, stations, routes)
- CDN for static assets
- Lazy loading for large attachments
- Debounced search inputs

---

## Testing Strategy

### Unit Tests
- All API route handlers
- Authorization middleware
- Data validation (Zod schemas)
- Date/time calculations
- Cost calculations

### Integration Tests
- Full workflow: Create → Release → Execute → Complete
- Hold/Resume workflows
- Multi-step routes
- File upload/download
- Change log accuracy

### End-to-End Tests (Optional but Recommended)
- Operator logs in → sees queue → starts work → completes
- Supervisor reviews → modifies route → releases
- Admin creates station → assigns users → operator can clock on

### Load Tests (Future)
- 50 concurrent operators
- 100 concurrent supervisor dashboard views
- 1000+ work orders in database

**Target Coverage:** 80%+ code coverage

---

## Deployment & Operations

### Environments
1. **Local Development:** Developers run on localhost
2. **Staging:** Mirrors production, for testing
3. **Production:** Live system

### Environment Variables
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
STORAGE_URL=...
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
NODE_ENV=production|development
LOG_LEVEL=INFO|DEBUG|ERROR
```

### Logging
- **Structured logs:** JSON format
- **Levels:** DEBUG, INFO, WARN, ERROR
- **Includes:** Timestamp, user ID, request ID, context
- **Shipped to:** Log aggregation service (optional)

### Monitoring
- **Health check endpoint:** `/api/health`
- **Metrics:** Request count, latency, error rate
- **Alerts:** Database down, API errors > threshold, disk space low

### Backup Strategy
- **Database:** Daily automated backups, retained 30 days
- **Files:** Replicated to secondary storage
- **Recovery Time Objective (RTO):** < 4 hours
- **Recovery Point Objective (RPO):** < 24 hours

---

## Future Enhancements (Not in MVP)

1. **Real-time Updates:** WebSockets instead of polling
2. **Mobile App:** Native iOS/Android apps for operators
3. **Barcode Scanning:** QR codes on work orders, parts
4. **Reporting Dashboard:** Charts, KPIs, trends
5. **PLM Integration:** Real-time sync with quoting tool
6. **Email Notifications:** Hold alerts, completion notices
7. **Advanced Scheduling:** Gantt charts, capacity planning
8. **Multi-facility:** Support multiple factory locations
9. **Quality Management:** Defect tracking, rework loops
10. **Inventory Integration:** Parts consumption tracking

---

## Lessons Learned from Current Implementation

### What Worked Well
1. ✅ **Clear role-based access control** - The three-tier system (Admin/Supervisor/Operator) is the right model
2. ✅ **Audit trail architecture** - Logging all changes with before/after snapshots is essential and should be kept
3. ✅ **JWT authentication** - Simple, secure, stateless
4. ✅ **Prisma ORM** - Good developer experience, type safety
5. ✅ **Department scoping** - Prevents cross-contamination between departments
6. ✅ **File attachment system** - Operators need to upload photos, specs, etc.
7. ✅ **Notes with scope** - General vs Department notes is useful
8. ✅ **Versioned routing** - Routes should be immutable once released
9. ✅ **Test coverage** - Having 220 tests is a good start, should continue
10. ✅ **Structured logging** - Better than console.log, keep this pattern

### What Was Overly Complex
1. ❌ **Supervisor page (3,490 LOC)** - Monolithic component, too many responsibilities
   - **Lesson:** Break into smaller components from day one
   - **Action:** Supervisor workspace should be 5-7 separate components

2. ❌ **Product configuration hierarchy** - 5 levels deep (Model → Trim → Section → Component → Option)
   - **Lesson:** This is for the QUOTING tool, not the MRP system
   - **Action:** MRP only needs the final SKU and a JSON snapshot, not the full config system

3. ❌ **Routing editor in supervisor UI** - Complex inline editing of stages [USER NOTE]:"See my user note from ealier concerning this. Admins and Supervisors need to be able to create/copy/modify these."
   - **Lesson:** Route creation should be admin function, supervisors should only SELECT routes
   - **Action:** Admins create routes, supervisors pick from dropdown (with option to clone)

4. ❌ **Multiple state management approaches** - Mix of useState, useCallback, etc.
   - **Lesson:** Consistent patterns reduce cognitive load
   - **Action:** Define state management pattern upfront (Context? Zustand? Keep it simple)

5. ❌ **Polling every 5 seconds** - Chatty, not scalable [USER NOTE]:"Why not start with web sockets if that's where we will end up?"
   - **Lesson:** Polling is OK for MVP, but plan for WebSockets
   - **Action:** Start with polling, add "Refresh" button, migrate to WebSockets later

6. ❌ **Metrics calculation** - Weighted averages, station pay rates, labor costs
   - **Lesson:** This is reporting/analytics, not core MRP functionality
   - **Action:** Defer to Phase 2, focus on time tracking first (can calculate later)

7. ❌ **Work instruction versions** - Separate versioning for instructions per stage [USER NOTE]:"As long as the path is logged in the work order history I'm ok with this. I'd like at least some backing up eventually in case they all get deleted or currupted, but no need to see who changed what when."
   - **Lesson:** Over-engineered for current needs
   - **Action:** Simple markdown instructions field on route steps, no versioning unless needed

8. ❌ **Equipment tracking** - Separate tables for equipment, station-equipment relationships
   - **Lesson:** Nice-to-have, not essential
   - **Action:** Defer to Phase 2, or make it optional text field on stations

9. ❌ **Dual-mode work orders** - PLANNED vs RELEASED vs IN_PROGRESS
   - **Lesson:** PLANNED state adds complexity
   - **Action:** Two states are enough: PENDING_REVIEW → RELEASED (then IN_PROGRESS/ON_HOLD/COMPLETED)

10. ❌ **Work center abstraction** - Departments → Work Centers → Stations
   - **Lesson:** Extra layer that doesn't add value for this use case
   - **Action:** Departments → Stations (direct relationship)

### Technical Debt Lessons
1. ❌ **Type safety gaps** - Many `any` types in components
   - **Lesson:** TypeScript strict mode should be enforced from day one
   - **Action:** No `any` types, define interfaces for all props/state

2. ❌ **Test coverage gaps** - Only 47% of API routes tested
   - **Lesson:** Tests should be written WITH the feature, not after
   - **Action:** TDD or at minimum, test before PR merge

3. ❌ **No E2E tests** - Multi-step workflows not verified
   - **Lesson:** Unit tests alone miss integration issues
   - **Action:** At least 10 critical path E2E tests (Playwright?)

4. ❌ **Performance not measured** - Targets defined but not benchmarked
   - **Lesson:** Can't optimize what you don't measure
   - **Action:** Add simple timing logs, establish baseline early

5. ❌ **No pre-commit hooks** - Linting/formatting not automated
   - **Lesson:** Manual code review catches style issues (wasted time)
   - **Action:** Husky + ESLint + Prettier on day one

### Architecture Lessons
1. ❌ **Monolithic pages** - Operator and Supervisor pages too large
   - **Lesson:** React component composition is the solution
   - **Action:** Max 200 LOC per component, extract liberally

2. ❌ **API routes mixed concerns** - Some routes do too much
   - **Lesson:** Single Responsibility Principle applies to API routes too
   - **Action:** One API route = one action (start work, complete work, add note, etc.)

3. ❌ **Change log separate from versions** - Two overlapping audit systems
   - **Lesson:** Choose one: Either snapshot versions OR change log, not both
   - **Action:** Use change log for all audit (simpler query, more granular)

4. ❌ **No API versioning** - Routes are `/api/work-orders`, not `/api/v1/work-orders`
   - **Lesson:** Breaking changes in future will be painful
   - **Action:** Version APIs from start (`/api/v1/...`)

5. ❌ **Seeded data decay** - Demo data gets stale
   - **Lesson:** Seed scripts should be idempotent and updateable
   - **Action:** Seed script that can run multiple times without breaking

---

## Questions for Final Spec Sheet

### Core Functionality Questions

1. **Work Order Quantity:**
   - Current system allows qty > 1, but boats are custom (qty should always be 1?)
   - **Question:** Can a single work order ever have qty > 1, or is it always 1 boat = 1 work order? [USER NOTE]:"Always 1 boat = 1 workorder."

2. **Multi-department Operators:**
   - Current system has department picker for operators who work in multiple departments
   - **Question:** How common is this? Should we support it in MVP, or can operators be assigned to one department with admin reassigning if needed? [USER NOTE]:"Actual operators should only see the department they are assigned. That feature with the dropdown was just so we could easily switch between departments to test the UI/UX. Only the admin and supervisors should be able to switch departments in the operator view."

3. **Station Assignment:**
   - Current system tracks which users are assigned to which stations
   - **Question:** Do operators work at ONE station all day, or move between stations frequently? (Affects UI design) [USER NOTE]:"It is uncommon for them to switch between workstations in a day, but the admin should be able to flag every workstation a user can operate. Most will only ever work one station."

4. **Route Modification After Release:**
   - Current system allows supervisors to enable/disable stages mid-production
   - **Question:** Is this common? Or should route modifications require "holding" the work order first? [USER NOTE]:"Should require a hold to keep further work from happening until the change is made. At that point, Supervisor should have to pick which stage to resume work at."

5. **Scrap Tracking:**
   - Current system tracks scrap qty per step
   - **Question:** What happens with scrap data? Is it just for reporting, or does it trigger any actions (reorder parts, quality alerts, etc.)? [USER NOTE]:"Currently nothing. Will not really be implemented in the MVP. We can save for a later phase once we get on our feet."

6. **Priority System:**
   - Current system has LOW/NORMAL/HIGH/CRITICAL priorities
   - **Question:** Who sets priority? Does it affect queue ordering? Does it have any other effects (alerts, SLA tracking)? [USER NOTE]:"Supervisor does. Not quoting. This won't come in the payload from the Quoter. There may be a note in the payload that indicates some importance via a text field, but ultimately the supervisor decides the production priority."

7. **Completion Criteria:**
   - Current system auto-advances to next step when current step is completed
   - **Question:** What if multiple operators work on the same step (e.g., two riggers)? How does completion work? [USER NOTE]:"Good question. Each station will only have one tablet, so if multiple people are working the same job we need to be able to flag that 2 people are working that task. Maybe when the operator hits start they have to enter the number of workers starting that step, with it defaulted to 1 but that default can be change in the route step configuration? We want to avoid having to use multiple devices or multiple people signing in to complete one task."

8. **Hold Reasons:**
   - Current system requires a reason when holding a work order
   - **Question:** Should there be a predefined list of hold reasons (Missing Parts, Quality Issue, Customer Change, etc.) or free text? [USER NOTE]:"Predefined list that defaults to Other. You have to select from the predefined list AND add details in a separate free text field."

### User Experience Questions

9. **Operator Queue Sorting:** 
   - **Question:** How should operator queues be sorted by default? Priority? Planned start date? FIFO? [USER NOTE]:"First in, first out. They can select any that are available to them (at their stage and on/past start date), but the default display order is FIFO. They need to see on the card priorities and date info though."

10. **Supervisor Notifications:**
    - **Question:** Should supervisors get alerts when work orders are held, completed, or have issues? Email? In-app? SMS? [USER NOTE]:"Not at this stage. Add this to the list of future improvements."

11. **Time Tracking Granularity:**
    - Current system has separate clock-on/clock-off events
    - **Question:** Do operators work on one order at a time, or can they pause one and start another (multi-tasking)? [USER NOTE]:"They can pause one and start another but can't be actively working both at the same time. If they try to start one while the clock is running already on another, they need to get an error message that explains what work order they are currently clocked into."

12. **Mobile vs Desktop:**
    - **Question:** What devices do operators use on the floor? Tablets? Phones? Desktop PCs? (Affects responsive design priorities) [USER NOTE]:"Tablets."

13. **Attachment Preview:**
    - Current system shows inline previews for images
    - **Question:** Are most attachments photos, or also PDFs, CAD files, etc.? (Affects viewer requirements) [USER NOTE]:"most will be photos, pdfs, text files, or video links (not actual videos)"

14. **Search Capabilities:**
    - **Question:** What do users search for most often? Order number? Hull ID? Customer name? Date range? (Affects search UI design) [USER NOTE]:"Hull ID and Work Order number are co-equivalent. Office uses Work Order, floor uses Hull ID. The reason is the hull may be used on a different work order if the original work order gets scrapped for some reason like a cancelation of an order. We don't throw out the hull, we just refit it for a different options loadout."

### Integration Questions

15. **PLM/Quoting Tool API:**
    - **Question:** What format does the external tool send data in? REST API? JSON file drop? CSV import? Real-time or batch? [USER NOTE]:"Not sure yet. Its in progress. Hopefully JSON payload via API. Thats what I'm pushing the developer for."

16. **PLM Error Handling:**
    - **Question:** If PLM integration fails, should MRP have a manual entry form as fallback? Or is PLM mandatory? [USER NOTE]:"Yes. This will be useful for testing too while we wait on the PLM/Quoting tool to be stood up."

17. **ERP Integration (Future):**
    - **Question:** Will MRP need to send data TO other systems (ERP, accounting, inventory)? If so, what data and when? [USER NOTE]:"Part data lies in MRPeasy. We are developing a BOM management tool that will consume part data from MRPeasy and labor data from this MRP tool to estimate costing per stage. We will need to be able to send out labor data for how long the boat was worked on at each stage. We will also need to be able to communicate out work order status and details for the CRM tool."

### Reporting & Analytics Questions

18. **Standard Reports:**
    - **Question:** What are the top 3-5 reports users need? (Work order status, labor hours by station, completion rate, etc.?) [USER NOTE]:"We can start with these and define more after MVP."

19. **Historical Data Access:**
    - Current system has version history and change logs
    - **Question:** How often do users need to look back at historical data? Weekly? Monthly? Only for issues? [USER NOTE]:"Mostly only for issues."

20. **Performance Metrics:**
    - **Question:** What KPIs matter most? On-time completion? Labor hours vs estimate? Scrap rate? First-pass quality? [USER NOTE]:"On time completion, # Released this week, # Completed this Week, # In Progress, Labor Hourse Vs Estimate, # Past planned completion date."

### Technical Questions

21. **Concurrent Users:**
    - **Question:** How many operators will use the system simultaneously? 10? 50? 100? (Affects scaling decisions) [USER NOTE]:"15-20"

22. **Database Size:**
    - **Question:** How many work orders per year? 100? 1,000? 10,000? How long to retain data? (Affects archival strategy) [USER NOTE]:"500"

23. **Backup & Disaster Recovery:**
    - **Question:** What's acceptable downtime if system fails? 1 hour? 4 hours? 1 day? (Affects backup frequency, infrastructure) [USER NOTE]:"1 day"

24. **Single Sign-On (SSO):**
    - **Question:** Does the factory use Active Directory, LDAP, or other SSO? Or is standalone auth OK? [USER NOTE]:"stand alone auth"

25. **Localization:**
    - **Question:** Is the factory US-only, or multi-country? Need multiple languages? (Affects i18n decisions) [USER NOTE]:"US only but we have a fair number of spanish speaking operators."

---

## Appendix: Comparison to Current System

| Feature | Current System | Proposed Redesign | Rationale |
|---------|---------------|-------------------|-----------|
| **Product Configuration** | Full 5-level hierarchy in MRP | JSON snapshot only | MRP doesn't need to manage configuration, just consume it |
| **Work Centers** | Department → Work Center → Station | Department → Station | Removes unnecessary abstraction |
| **Routing Editor** | Supervisor can edit inline | Admin creates, Supervisor selects | Separation of concerns |
| **Work Order States** | 7 states (PLANNED, RELEASED, etc.) | 6 states (removed PLANNED) | Simpler state machine |
| **Metrics Calculation** | Real-time weighted averages | Deferred to reporting phase | Focus on core MRP, not analytics |
| **Equipment Tracking** | Full CRUD system | Optional, deferred | Nice-to-have, not essential |
| **Work Instructions** | Versioned per stage | Simple markdown on route step | YAGNI - version if needed later |
| **Supervisor UI** | 3,490 LOC monolith | 5-7 components (< 300 LOC each) | Maintainability |
| **Operator UI** | 1,127 LOC | 3-4 components (< 250 LOC each) | Maintainability |
| **Time Tracking** | Events logged in WOStageLog | Separate TimeEntry table | Clearer data model |
| **Audit Trail** | AuditLog + WorkOrderVersion | Single ChangeLog table | Simpler queries, less duplication |
| **API Design** | 55+ endpoints | ~40 endpoints (estimated) | Consolidate where possible |
| **Authentication** | JWT (edge runtime issue) | JWT (full Node runtime) | Fix middleware compatibility |
| **File Storage** | Replit Object Storage | S3-compatible (generic) | Vendor-neutral |
| **Real-time Updates** | 5-second polling | Polling (MVP) → WebSockets (Phase 2) | Pragmatic approach |
| **Test Coverage** | 47% API routes | Target 80%+ | Quality focus |
| **Component Size** | Max 3,490 LOC | Max 300 LOC | Enforced limit |

---

## Implementation Phases (High-Level)

### Phase 1: Foundation (Weeks 1-2)
- Database schema design
- Authentication system
- Basic admin panel (users, departments, stations)
- API scaffolding

### Phase 2: Core MRP (Weeks 3-4)
- Work order CRUD
- Route management
- Operator console (basic)
- Supervisor workspace (basic)

### Phase 3: Time Tracking (Weeks 5-6)
- Clock on/off functionality
- Time entry tracking
- Good/scrap quantity recording
- Work order progression

### Phase 4: Notes & Attachments (Week 7)
- Notes system
- File upload/download
- Attachment viewer
- Notes timeline

### Phase 5: Audit & History (Week 8)
- Change log implementation
- Historical data views
- Search & filter improvements

### Phase 6: Polish & Testing (Weeks 9-10)
- End-to-end tests
- Performance optimization
- UI/UX refinements
- Documentation

### Phase 7: PLM Integration (Weeks 11-12)
- API endpoint for intake
- Error handling & validation
- Testing with sample data
- Fallback mechanisms

---

**END OF DRAFT SPECIFICATION**

---

## Next Steps

1. **Review this draft** with stakeholders (factory manager, supervisors, operators)
2. **Answer the 25 questions** above
3. **Prioritize features** (must-have vs nice-to-have)
4. **Create final spec** incorporating feedback
5. **Estimate effort** more precisely
6. **Begin Phase 1** implementation

**Prepared by:** Claude (AI Assistant)
**Review Status:** DRAFT - Awaiting Feedback
**Target Audience:** Development team, factory management, system stakeholders