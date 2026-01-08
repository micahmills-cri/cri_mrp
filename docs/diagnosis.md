# Diagnostics & Incident Log

This consolidated reference captures both the postmortem notes for JWT-related failures and the broader release/feature summary that used to live in separate `Diagnosis.md` and `DIAGNOSIS.md` files.

## JWT User Field Errors – Multiple Endpoints

### Problem

Multiple endpoints fail with 500 Internal Server Error when trying to use `user.email` or inconsistent user ID fields. The system encounters Prisma validation errors like:

```
Argument `createdBy` is missing.
```

### Root Cause

The JWT payload returned by `getUserFromRequest()` only contains:

- `userId` (string) – ✅ Available
- `role` (string) – ✅ Available
- `departmentId` (string | null) – ✅ Available

The `email` field is **not included** in the JWT token. Several endpoints incorrectly try to access `user.email`, `user.id`, or use fallback logic like `user.email || user.userId`.

### Affected Endpoints and Fixes

#### 1. Work Order Creation

- **File**: `src/app/api/work-orders/route.ts`
- **Original issue**:
  ```ts
  createdBy: user.email // ❌ undefined
  ```
- **Fix**:
  ```ts
  createdBy: user.userId // ✅ Fixed
  ```

#### 2. Cancel Work Order

- **File**: `src/app/api/supervisor/cancel-wo/route.ts`
- **Original issues**:
  ```ts
  createdBy: user.email || user.userId // ❌
  actorId: user.userId || user.id // ❌
  ```
- **Fix**:
  ```ts
  createdBy: user.userId // ✅
  actorId: user.userId // ✅
  ```

#### 3. Uncancel Work Order

- **File**: `src/app/api/supervisor/uncancel-wo/route.ts`
- **Original issues**:
  ```ts
  createdBy: user.email || user.userId // ❌
  actorId: user.userId || user.id // ❌
  ```
- **Fix**:
  ```ts
  createdBy: user.userId // ✅
  actorId: user.userId // ✅
  ```

#### 4. File Attachments

- **File**: `src/app/api/work-orders/[id]/attachments/route.ts`
- **Original issue**:
  ```ts
  userId: user.id // ❌ undefined
  ```
- **Fix**:
  ```ts
  userId: user.userId // ✅ Fixed
  ```

### Testing

After applying the fixes:

- ✅ Work order creation succeeds
- ✅ Work order cancellation succeeds
- ✅ Work order uncancellation succeeds
- ✅ File attachment upload succeeds

All `createdBy` and `actorId` fields now correctly contain the user's ID (e.g., `cmfwr6s9e001kmv5660mr74fo`).

---

## Operations MVP Feature Snapshot

### Operator Console APIs (Working)

- **GET /api/work-orders/find** – Search work orders by WO number or Hull ID with department scoping
- **GET /api/queues/my-department** – Get department-scoped queue (READY and IN_PROGRESS only)
- **POST /api/work-orders/start** – Start work on a stage (uses `workOrderId`)
- **POST /api/work-orders/pause** – Pause work on a stage (uses `workOrderId`)
- **POST /api/work-orders/complete** – Complete a stage with quantities and notes (uses `workOrderId`)

Common enforcement:

- Department scoping (operators only see/act on their department's work)
- Stage gating (only current enabled stage is actionable)
- Status validation (can't act on HOLD work orders)

### Operator Console UI (Working)

- Interactive queue table showing READY and IN_PROGRESS work orders
- Search by WO number or Hull ID
- Action panel with Start/Pause/Complete buttons
- Station selection persisted in `localStorage`
- Good/Scrap quantity inputs with validation
- Optional notes on all actions
- Auto-refresh every 5 seconds
- Optimistic UI updates with success/error toasts

### Supervisor Planning APIs (Working)

- **POST /api/work-orders** – Create new work order (Supervisor/Admin only)
- **POST /api/routing-versions/clone** – Clone and edit routing versions with stage configuration
- **POST /api/work-orders/:id/release** – Release work order and freeze spec snapshot
- **GET /api/work-orders/:id** – Get detailed work order with stage timeline and notes

### Supervisor Control APIs (Working)

- **POST /api/work-orders/:id/hold** – Put work order on hold with required reason
- **POST /api/work-orders/:id/unhold** – Restore work order from hold to previous status
- All actions create `AuditLog` entries for traceability

### Supervisor Dashboard UI (Working)

- **Board Tab**:
  - Table/Kanban view toggle
  - Real-time KPIs (Released, In Progress, Completed Today, On Hold)
  - Department filter (Admin only can switch departments)
  - Hold/Unhold actions with reason capture
  - Detail drawer with full stage timeline
- **Plan Tab**:
  - Create work order modal with all required fields
  - Routing stage editor with enable/disable, reorder, and standard-time editing
  - Clone routing from templates
- Real-time updates via 10-second polling

### Work Order Notes System (Testing Phase)

- **Database schema**: `WorkOrderNote` table with `NoteScope` enum (`GENERAL`, `DEPARTMENT`); relations to `User`, `WorkOrder`, and `Department`
- **Endpoints**:
  - **GET /api/work-orders/[id]/notes** – Role-based filtering
  - **POST /api/work-orders/[id]/notes** – Create notes with scope validation
  - **PUT /api/notes/[id]** – Edit own notes with department validation
  - **DELETE /api/notes/[id]** – Role-based deletion permissions
- **Security**:
  - Operators/Supervisors see GENERAL + department notes
  - Admins see all notes
  - Department validation ensures work order ownership

### File Attachments System

- **Database schema**: `WorkOrderAttachment` table with file metadata and ACL policies
- **Storage**: Google Cloud Storage via Replit sidecar using `ObjectStorageService`
- **Endpoints**:
  - **POST /api/attachments/upload** – Presigned uploads
  - **GET /api/work-orders/[id]/attachments** – List attachments
  - **POST /api/work-orders/[id]/attachments** – Persist attachment metadata
  - **GET /api/attachments/[id]** – Download with access control
  - **DELETE /api/attachments/[id]** – Delete attachment records
- **Security**:
  - Department-based access
  - File-level ACLs for ownership and department rules
  - Private storage (not publicly accessible)

### Product Models & Trims System

- **Database schema**: `ProductModel` and `ProductTrim` tables linking models (LX24, LX26) and trims (LT, LE)
- **Endpoints**:
  - **GET /api/product-models** – Fetch all models with trims
  - **GET /api/product-models/[id]/trims** – Fetch trims for a model
  - **POST /api/sku/generate** – Generate SKUs in `YEAR-MODEL-TRIM` format

### API Testing Results

- Follows environment documented in project README; ensure migrations are applied and env vars populated before running integration suites.
