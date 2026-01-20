# Boat Factory MRP System - Final Specification
## UX-Focused Redesign from Scratch

**Version:** 2.0 FINAL
**Date:** 2026-01-15
**Purpose:** Define a streamlined, purpose-built system for boat production tracking
**Status:** Ready for Implementation

---

## Executive Summary

This specification defines a complete redesign of the boat factory MRP system, built from scratch with user experience at the core. The system supports three primary workflows:

1. **Intake:** Receive build sheets from external PLM/quoting tool (with manual fallback)
2. **Planning:** Supervisors review, modify, schedule, and release work orders
3. **Execution:** Operators track time and progress at their assigned stations

### Design Philosophy

- **Simplicity First:** Remove unnecessary complexity, focus on essential needs
- **Role-Specific UX:** Each role gets exactly what they need, nothing more
- **Complete Auditability:** 2+ year history of all work order changes
- **Bilingual Support:** English and Spanish for floor operators
- **Mobile-First for Operators:** Optimized for tablet use with large touch targets
- **Maintainable Architecture:** Clear code structure, < 300 LOC per component

---

## Core Requirements

### 1. Work Order Intake

**Source:** External PLM/model configuration/quoting tool
**Fallback:** Manual entry form for testing and when PLM is unavailable
**Initial State:** New orders arrive in "PENDING_REVIEW" queue

**Required Data:**
- Work Order Number (unique identifier for office)
- Hull ID (unique identifier for production floor)
- Product SKU: `model-trim-modelyear` (e.g., "LX24-SPORT-2026")
- Build Specification (JSON snapshot with model, trim, features)
- Customer Information (reference only, not editable in MRP)
- Planned dates (optional, can be set by supervisor)

**Important:** Hull ID and Work Order Number are co-equivalent identifiers. Office uses Work Order Number, floor uses Hull ID. A hull may be reassigned to a different work order if the original order is cancelled.

### 2. Supervisor Planning & Management

Supervisors have full visibility across all departments and work orders. They are Operations Supervisors responsible for the flow of the entire build, not department-specific managers.

**Capabilities:**
- **Review** all incoming orders in pending queue
- **Create/Modify Routes** - Can create new routes or modify existing ones for specific work orders
- **Add Notes** and attachments (drawings, specs, photos)
- **Schedule** planned start and finish dates
- **Set Priority** (LOW | NORMAL | HIGH | URGENT) to control queue ordering
- **Release** orders to production floor
- **Monitor** real-time progress across all departments
- **Hold/Resume** work orders with documented reasons (predefined list + details)
- **View History** of any work order with complete audit trail
- **Access All Views** - Can see operator views for all stations to help troubleshoot issues

### 3. Operator Execution

Operators work on tablets at their assigned station. They see only work assigned to their station but can operate at multiple stations if configured by admin.

**Capabilities:**
- **View Queue** - Available work (on/past start date) and Upcoming work (future start date)
  - Available work: Can start immediately
  - Upcoming work: Visible for planning, cannot start until planned date
  - Sorted FIFO by default, with priority and date visible on cards
- **View Build Sheet** - Product specs, notes, attachments, work instructions
- **Clock On/Off** - Start and pause work with time tracking
  - Cannot be clocked into multiple jobs simultaneously
  - Get error if trying to start while already clocked into another job
- **Track Multiple Workers** - Indicate when multiple operators work same step
- **Record Quantities** - Good/scrap tracking (only if enabled for department)
- **Add Notes** - Issues, observations, questions
- **Upload Photos** - Damage reports, progress photos
- **Complete Steps** - Mark work finished and advance to next step

**Time Tracking:**
- **PAUSE STEP** - Operators can pause work and resume later
- **TOTAL TIME** - How long the work order has been in this step
- **ACTIVE TIME** - How long it has been actively worked (excludes pauses)
- Multi-tasking: Can pause one job to start another, but not work both simultaneously

---

## User Roles & Permissions

### Admin
**Scope:** Complete system access, unscoped views

**Can:**
- **Configure Everything:** Departments, stations, routes, users, equipment (future)
- **View All Roles:** Can switch to any view (supervisor, operator) to troubleshoot
- **Access All Work Orders:** No department restrictions
- **Modify System Settings:** Hold reasons, department toggles, etc.

**Cannot:**
- Clock time to work orders (not a floor role)

### Supervisor
**Scope:** All work orders across all departments

**Can:**
- **Manage Work Flow:** Review, schedule, release, hold, resume all work orders
- **Create/Modify Routes:** Build new routes or clone and modify existing ones
- **Edit Work Orders:** Add notes, attachments, change routes, set priorities
- **Access Operator Views:** See any operator's view to help troubleshoot
- **View All Progress:** Real-time dashboard of all active work

**Cannot:**
- Modify system configuration (departments, stations, users)
- Clock time to work orders

### Operator
**Scope:** Station-specific, can access multiple stations if configured by admin

**Can:**
- **Execute Work:** Clock on/off, pause, complete steps
- **Record Data:** Quantities (if enabled), notes, photos
- **View Build Info:** Specifications, instructions, attachments for assigned work
- **Multi-station:** Work at any station admin has authorized

**Cannot:**
- See other operators' queues unless also assigned to that station
- Modify schedules, routes, or system configuration
- Access supervisor or admin features

---

## Data Model

### Configuration Tables (Admin-Managed)

**Departments**
```sql
- id                      UUID PRIMARY KEY
- name                    TEXT UNIQUE NOT NULL
- description             TEXT
- sort_order              INTEGER
- track_quantities        BOOLEAN DEFAULT FALSE  -- Toggle for good/scrap tracking
- is_active               BOOLEAN DEFAULT TRUE
- created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Stations**
```sql
- id                      UUID PRIMARY KEY
- code                    TEXT UNIQUE NOT NULL    -- e.g., "LAMI-01"
- name                    TEXT NOT NULL
- department_id           UUID FK -> Departments
- capacity                INTEGER DEFAULT 1
- hourly_rate             DECIMAL(10,2)           -- For future costing
- is_active               BOOLEAN DEFAULT TRUE
- created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Routes** (Production workflow templates)
```sql
- id                      UUID PRIMARY KEY
- name                    TEXT NOT NULL           -- e.g., "Standard 24ft"
- description             TEXT
- is_active               BOOLEAN DEFAULT TRUE
- version                 INTEGER NOT NULL        -- Immutable once used by WO
- created_by              UUID FK -> Users
- created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Route Steps**
```sql
- id                      UUID PRIMARY KEY
- route_id                UUID FK -> Routes
- sequence                INTEGER NOT NULL        -- Defines order
- station_id              UUID FK -> Stations
- step_name               TEXT NOT NULL           -- e.g., "Lamination"
- estimated_hours         DECIMAL(10,2)
- instructions            TEXT                    -- Markdown/text
- is_required             BOOLEAN DEFAULT TRUE    -- Can skip if false
- is_parallel             BOOLEAN DEFAULT FALSE   -- Can run parallel with other steps
- depends_on_step_ids     UUID[]                  -- Array of step IDs that must complete first
- worker_count_default    INTEGER DEFAULT 1       -- Default # of workers for this step
- created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Route Step Attachments** (Work instruction media)
```sql
- id                      UUID PRIMARY KEY
- route_step_id           UUID FK -> Route_Steps
- filename                TEXT NOT NULL
- file_path               TEXT NOT NULL           -- Storage key
- file_size               INTEGER                 -- Bytes
- mime_type               TEXT
- description             TEXT                    -- e.g., "Lamination technique video"
- uploaded_by             UUID FK -> Users
- uploaded_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Users**
```sql
- id                      UUID PRIMARY KEY
- email                   TEXT UNIQUE NOT NULL
- password_hash           TEXT NOT NULL
- first_name              TEXT NOT NULL
- last_name               TEXT NOT NULL
- role                    TEXT NOT NULL           -- 'ADMIN' | 'SUPERVISOR' | 'OPERATOR'
- department_id           UUID FK -> Departments  -- Nullable for admins
- authorized_station_ids  UUID[]                  -- Array of station IDs operator can access
- primary_station_id      UUID FK -> Stations     -- Operator's default station
- hourly_rate             DECIMAL(10,2)           -- For labor tracking
- preferred_language      TEXT DEFAULT 'en'       -- 'en' or 'es'
- is_active               BOOLEAN DEFAULT TRUE
- created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Hold Reasons** (Predefined list)
```sql
- id                      UUID PRIMARY KEY
- reason_code             TEXT UNIQUE NOT NULL    -- e.g., "MISSING_PARTS"
- display_text_en         TEXT NOT NULL
- display_text_es         TEXT NOT NULL
- sort_order              INTEGER
- is_active               BOOLEAN DEFAULT TRUE
- requires_details        BOOLEAN DEFAULT TRUE    -- Require free-text explanation
```

### Work Order Tables

**Work Orders**
```sql
- id                      UUID PRIMARY KEY
- order_number            TEXT UNIQUE NOT NULL    -- e.g., "WO-yy###" -> "WO-26123"
- hull_id                 TEXT UNIQUE NOT NULL    -- e.g., "HULL-24-789"
- product_sku             TEXT NOT NULL           -- model-trim-modelyear
- build_spec              JSONB NOT NULL          -- Immutable snapshot from PLM
- route_id                UUID FK -> Routes       -- Assigned route
- status                  TEXT NOT NULL           -- See status enum below
- priority                TEXT DEFAULT 'NORMAL'   -- 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
- planned_start_date      DATE
- planned_finish_date     DATE
- actual_start_date       TIMESTAMP WITH TIME ZONE
- actual_finish_date      TIMESTAMP WITH TIME ZONE
- current_step_id         UUID FK -> Work_Order_Steps
- customer_ref            TEXT                    -- Reference to customer/order in PLM
- created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- created_by              UUID FK -> Users
- updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Work Order Status Values:**
- `PENDING_REVIEW` - Awaiting supervisor review
- `RELEASED` - Released to floor, not yet started
- `IN_PROGRESS` - At least one step started
- `ON_HOLD` - Temporarily stopped with documented reason
- `COMPLETED` - All steps finished
- `CANCELLED` - Order cancelled

**Work Order Steps** (Actual execution tracking - copied from route at WO creation)
```sql
- id                      UUID PRIMARY KEY
- work_order_id           UUID FK -> Work_Orders
- route_step_id           UUID FK -> Route_Steps  -- Link to original route step
- station_id              UUID FK -> Stations
- sequence                INTEGER NOT NULL        -- Copied from route
- step_name               TEXT NOT NULL
- instructions            TEXT
- is_required             BOOLEAN NOT NULL
- is_parallel             BOOLEAN NOT NULL
- depends_on_step_ids     UUID[]
- estimated_hours         DECIMAL(10,2)
- status                  TEXT NOT NULL           -- 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
- started_at              TIMESTAMP WITH TIME ZONE
- completed_at            TIMESTAMP WITH TIME ZONE
- good_quantity           INTEGER                 -- Only tracked if department.track_quantities = true
- scrap_quantity          INTEGER                 -- Only tracked if department.track_quantities = true
- actual_hours            DECIMAL(10,2)           -- Calculated from time entries
- active_hours            DECIMAL(10,2)           -- Calculated excluding pauses
- worker_count            INTEGER DEFAULT 1       -- How many operators working this step
- created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Time Entries** (Clock-on/clock-off events)
```sql
- id                      UUID PRIMARY KEY
- work_order_step_id      UUID FK -> Work_Order_Steps
- user_id                 UUID FK -> Users
- started_at              TIMESTAMP WITH TIME ZONE NOT NULL
- ended_at                TIMESTAMP WITH TIME ZONE  -- Nullable if currently running
- is_paused               BOOLEAN DEFAULT FALSE    -- True if this is a pause (not work time)
- duration_hours          DECIMAL(10,2)            -- Calculated on end
- notes                   TEXT
- created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Work Order Notes**
```sql
- id                      UUID PRIMARY KEY
- work_order_id           UUID FK -> Work_Orders
- work_order_step_id      UUID FK -> Work_Order_Steps  -- Nullable, step-specific note
- user_id                 UUID FK -> Users
- note_text               TEXT NOT NULL
- note_type               TEXT DEFAULT 'GENERAL'   -- 'GENERAL' | 'ISSUE' | 'QUALITY' | 'SUPERVISOR'
- created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Work Order Attachments**
```sql
- id                      UUID PRIMARY KEY
- work_order_id           UUID FK -> Work_Orders
- work_order_step_id      UUID FK -> Work_Order_Steps  -- Nullable, step-specific attachment
- user_id                 UUID FK -> Users
- filename                TEXT NOT NULL
- file_path               TEXT NOT NULL            -- Storage key
- file_size               INTEGER                  -- Bytes
- mime_type               TEXT
- description             TEXT
- uploaded_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Work Order Change Log** (Complete audit trail)
```sql
- id                      UUID PRIMARY KEY
- work_order_id           UUID FK -> Work_Orders
- changed_by              UUID FK -> Users
- change_type             TEXT NOT NULL            -- See change types below
- field_name              TEXT                     -- Which field changed
- old_value               JSONB                    -- Before state
- new_value               JSONB                    -- After state
- change_reason           TEXT                     -- Required for holds/cancellations
- changed_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**Change Types:**
- `CREATED` - Work order created
- `STATUS_CHANGED` - Status transition
- `ROUTE_MODIFIED` - Route steps added/removed/reordered
- `ROUTE_ASSIGNED` - Initial or new route assigned
- `NOTE_ADDED` - Note added
- `ATTACHMENT_ADDED` - File uploaded
- `FIELD_UPDATED` - Generic field change
- `STEP_STARTED` - Work started at a step
- `STEP_PAUSED` - Work paused
- `STEP_RESUMED` - Work resumed after pause
- `STEP_COMPLETED` - Step finished
- `PRIORITY_CHANGED` - Priority updated
- `DATES_CHANGED` - Planned dates modified

**Messages** (Inter-department communication)
```sql
- id                      UUID PRIMARY KEY
- work_order_id           UUID FK -> Work_Orders
- from_user_id            UUID FK -> Users
- to_department_id        UUID FK -> Departments   -- Nullable, broadcast to all if null
- to_station_id           UUID FK -> Stations      -- Nullable, station-specific if set
- message_text            TEXT NOT NULL
- is_resolved             BOOLEAN DEFAULT FALSE
- resolved_by             UUID FK -> Users
- resolved_at             TIMESTAMP WITH TIME ZONE
- created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## User Interface Design

### General Principles

1. **Consistent Navigation:** Admin and Supervisor use sidebar navigation (not tabs)
2. **Mobile-First for Operators:** Large touch targets, high contrast, minimal scrolling
3. **Bilingual Support:** All operator-facing text in English and Spanish
4. **Real-Time Updates:** WebSocket connections for live data (not polling)
5. **Responsive Design:** Works on tablets (primary), desktop, and phones
6. **Timezone:** All times displayed in EST (Eastern Standard Time)

### Login & Authentication

**Layout:** Clean, centered login form

**Fields:**
- Email
- Password
- Language Selector (for operators): English | Español
- Remember Me (optional)

**Flow:**
1. User enters credentials
2. System validates and creates JWT session (httpOnly cookie)
3. Redirect based on role:
   - Admin → Admin Dashboard
   - Supervisor → Supervisor Workspace (Queue section)
   - Operator → Operator Console (My Queue)

### Admin Panel

**Layout:** Sidebar navigation with top header

**Header:**
- Logo (left)
- Current page title (center)
- User dropdown (right): Profile, Settings, Logout

**Sidebar Sections:**
1. **Dashboard** - System stats, recent activity
2. **Users** - List, create, edit, assign roles/stations
3. **Departments** - List, create, edit, configure quantity tracking
4. **Stations** - List, create, edit, assign to departments
5. **Routes** - List, create, edit steps and attachments
6. **Hold Reasons** - Manage predefined hold reason list
7. **Work Orders (All)** - Can access supervisor views
8. **Operator Views** - Dropdown to view any station's operator console

**Key Features:**
- **Inline Editing:** Click to edit where possible
- **Bulk Actions:** Select multiple items for batch operations
- **CSV Export:** All list views have export button
- **Search & Filter:** Every list has search bar and filters
- **Confirmation Dialogs:** For destructive actions (delete, deactivate)
- **Audit Access:** Can view change history for any entity

### Supervisor Workspace

**Layout:** Sidebar navigation (mirrors admin structure, limited sections)

**Header:**
- Logo (left)
- Current section title (center)
- Notifications icon (future)
- User dropdown (right): Profile, Logout

**Sidebar Sections:**
1. **Queue** - Pending review work orders (default view)
2. **Schedule** - Calendar/timeline view of planned work
3. **Active Work** - Real-time dashboard of in-progress orders
4. **History** - Completed and cancelled work orders
5. **Routes** - Can view, create, clone, edit routes
6. **Operator Views** - Dropdown to switch to any operator's console for troubleshooting

#### Section 1: Queue (Pending Review)

**View:** Table of work orders in `PENDING_REVIEW` status

**Columns:**
- Priority indicator (color badge)
- Order Number
- Hull ID
- Product SKU
- Customer Ref
- Received Date
- Actions: "Review" button

**Interactions:**
- Click "Review" → Opens Work Order Detail Modal
- Sort by any column
- Filter by priority, date range

#### Section 2: Schedule

**View:** Calendar or timeline (Gantt-style) with drag-and-drop

**Display Options:**
- Calendar view (monthly)
- Timeline view (weekly/daily)
- Filter by: Status, Priority, Department, Date Range
- Color-coded by status:
  - Blue: RELEASED
  - Yellow: IN_PROGRESS
  - Red: ON_HOLD
  - Green: COMPLETED

**Interactions:**
- Click work order card → Opens Work Order Detail Modal
- Drag to adjust planned start/finish dates
- Double-click to quick-edit dates
- Right-click for context menu (Hold, View Details, Add Note)

#### Section 3: Active Work

**View:** Real-time dashboard cards showing `IN_PROGRESS` work orders

**Card Display (per work order):**
- Order Number | Hull ID
- Product SKU
- Current station name
- Operator name(s) working on it
- Time elapsed (live timer)
- Progress: Step X of Y
- Quick actions: Hold, Add Note, View Details

**Refresh:** WebSocket auto-updates (no manual refresh needed)

#### Section 4: History

**View:** Searchable table of `COMPLETED` and `CANCELLED` work orders

**Columns:**
- Order Number
- Hull ID
- Product SKU
- Status (Completed/Cancelled)
- Completed Date
- Total Time (days from start to finish)
- Actions: "View" button

**Search:**
- By Order Number, Hull ID, Customer Ref
- By Date Range (completed between X and Y)
- By Product SKU

**Interactions:**
- Click "View" → Opens Work Order Detail Modal (read-only)
- Full audit trail available via "Change History" tab

#### Section 5: Routes

**View:** List of all routes (active and inactive)

**Columns:**
- Route Name
- Description
- Version
- # Steps
- Avg. Estimated Hours
- Status (Active/Inactive)
- Actions: Edit, Clone, View

**Create New Route:**
1. Click "Create Route" button
2. Enter name, description
3. Add steps:
   - Select station
   - Enter step name
   - Enter instructions (markdown editor)
   - Set estimated hours
   - Upload attachments (images, videos, PDFs)
   - Mark as required/optional
   - Mark as parallel or sequential
   - Select dependencies (which steps must complete first)
   - Set default worker count
4. Reorder steps with drag-and-drop
5. Save as new version

**Clone Existing Route:**
- Click "Clone" → Creates copy with new version number
- Modify as needed
- Save as new route

**Edit Route:**
- Only unpublished routes or create new version
- Changes to published routes create new version

### Work Order Detail Modal

**Layout:** Full-screen modal with header, tabbed content, footer

**Header:**
- Order Number | Hull ID (large, prominent)
- Status badge (color-coded)
- Priority badge
- Close button (X)

**Content Tabs:**
1. **Build Spec** - Product details from PLM
2. **Route & Steps** - Assigned route with progress
3. **Schedule** - Planned and actual dates
4. **Notes & Attachments** *(Collapsible, default: collapsed)*
5. **Change History** *(Collapsible, default: collapsed)*

**Tab 1: Build Spec**
- Product SKU: model-trim-modelyear
- Model details
- Trim level
- Features (from JSON, formatted for readability)
- Customer reference

**Tab 2: Route & Steps**

*If status is PENDING_REVIEW, ON_HOLD, or RELEASED (not started):*
- **Editable route assignment**
  - Dropdown to select different route OR
  - Button to "Modify Route" (clone and edit)
- **Step list** (can add/remove/reorder):
  - Sequence number
  - Station name
  - Step name
  - Estimated hours
  - Instructions (preview)
  - Attachments (view work instruction media)
  - Dependencies (shows which steps must complete first)
  - Parallel indicator (can run simultaneously with other steps)
- **Visual Flow Diagram** (optional, nice-to-have):
  - Shows critical path
  - Shows parallel steps
  - Shows dependencies

*If status is IN_PROGRESS, or COMPLETED:*
- **Read-only view** (to modify, must hold the work order first)
- Shows progress:
  - Completed steps (green checkmark)
  - Current step (yellow highlight)
  - Pending steps (gray)
- Click step to expand:
  - Who worked on it
  - Time entries (start/stop/pause times)
  - Active hours vs total hours
  - Good/scrap quantities (if tracked)
  - Notes from that step

**Tab 3: Schedule**
- Planned Start Date (editable if not started)
- Planned Finish Date (editable if not started)
- Actual Start Date (read-only, set when first step starts)
- Actual Finish Date (read-only, set when completed)
- Days In Progress (calculated)
- On-Time Status (green if on track, red if overdue)

**Tab 4: Notes & Attachments** *(Collapsible)* *(Include unread note count in tab header)*

*Notes Section:*
- List of all notes (newest first)
- Each note shows:
  - User name
  - Timestamp (EST)
  - Note type badge (General, Issue, Quality, Supervisor)
  - Note text
  - Associated step (if applicable)
- "Add Note" button → Opens note form:
  - Note type selector
  - Text area
  - Step selector (optional)
  - Submit button

*Attachments Section:*
- Grid of attachment thumbnails
- Each shows:
  - File name
  - File type icon
  - Uploaded by
  - Upload date
  - File size
- Click thumbnail → Preview (images inline, PDFs in viewer, download for others)
- "Upload" button → File picker
  - Select files
  - Add description
  - Associate with step (optional)
  - Upload

**Tab 5: Change History** *(Collapsible)*

- Timeline view (newest first)
- Each entry shows:
  - Timestamp (EST)
  - User name and role
  - Change type badge
  - Description of change
  - Expand to see before/after values (for field updates)
- Filter by:
  - Change type
  - User
  - Date range
- Export to CSV button

**Footer Actions:**

*If PENDING_REVIEW:*
- **Release to Production** (primary button) → Status: RELEASED, appears in operator queues
- **Cancel** → Status: CANCELLED, requires reason
- **Save Changes** (if route modified)

*If RELEASED or IN_PROGRESS:*
- **Hold** → Status: ON_HOLD, requires reason (predefined + details)
- **Add Note**
- **Upload Attachment**
- **Save Changes**

*If ON_HOLD:*
- **Resume** → Return to previous status (RELEASED or IN_PROGRESS)
  - If resuming IN_PROGRESS, supervisor selects which step to resume at
- **Cancel** → Status: CANCELLED, requires reason

*If COMPLETED or CANCELLED:*
- **View Only** (no action buttons)
- **Clone** (create similar work order)

### Operator Console

**Layout:** Simple, mobile-first, large touch targets

**Language:** Toggle between English and Español (persistent preference)

**Header:**
- Factory Logo
- Station Name (e.g., "Lamination - LAMI-01")
- Operator Name
- Language Toggle (EN | ES)
- Logout

#### View 1: My Queue

**Section A: Available Work** (at top, actionable)

- Cards displaying work orders where:
  - Step assigned to operator's current station
  - Status is RELEASED or IN_PROGRESS
  - Current step is this station
  - Planned start date is today or earlier
- Sorted FIFO by default

**Card Display:**
```
┌─────────────────────────────────────┐
│ [PRIORITY BADGE]           WO-26123 │
│ HULL-24-789                         │
│ LX24-SPORT-2026                     │
│ Started: Jan 12 | Due: Jan 20       │
│                                     │
│         [START WORK Button]         │
└─────────────────────────────────────┘
```

**Section B: Upcoming Work** (below, read-only)

- Cards displaying work orders where:
  - Planned start date is in the future
- Greyed out, cannot start
- Shows planned start date prominently

**Card Display:**
```
┌─────────────────────────────────────┐
│ [PRIORITY BADGE]           WO-26125 │
│ HULL-24-791                         │
│ LX24-SPORT-2026                     │
│ Planned Start: Jan 18               │
│                                     │
│    [ UPCOMING - Cannot Start ]      │
└─────────────────────────────────────┘
```

**Interactions:**
- Tap "Start Work" → Opens Active Work view
- Swipe left/right to see full queue
- Pull down to refresh (WebSocket keeps live)

#### View 2: Active Work (Detail)

**Triggered by:** Tapping "Start Work" from queue

**Layout:** Full-screen, focused on ONE work order

**Top Section:** (Always visible)
- Back arrow (return to queue)
- Order Number | Hull ID
- Product SKU
- Step Name (e.g., "Lamination")
- Progress indicator: "Step 3 of 12"

**Middle Section:** (Scrollable)

*Build Information:*
- Build specifications (formatted)
- Product features
- Customer notes (if any)

*Work Instructions:*
- Step-specific instructions (markdown formatted)
- Attachments (images, videos, PDFs)
  - Inline preview for images
  - Tap to expand
  - Video links open in viewer

*Notes from Previous Steps:*
- Read-only notes from earlier stations
- Flagged issues (if any)

**Bottom Section:** (Fixed, always visible)

*Time Tracking Panel:*

**If NOT clocked in:**
```
┌─────────────────────────────────────┐
│  Worker Count: [- 1 +]              │
│                                     │
│     ██████ CLOCK ON ██████          │
└─────────────────────────────────────┘
```

**If clocked in:**
```
┌─────────────────────────────────────┐
│  Active Time: 01:23:45              │
│  Total Time:  02:15:30              │
│                                     │
│  [PAUSE]  [COMPLETE STEP]           │
└─────────────────────────────────────┘
```

**If paused:**
```
┌─────────────────────────────────────┐
│  Active Time: 01:23:45              │
│  Total Time:  02:45:30  [PAUSED]    │
│                                     │
│     ██████ RESUME ██████            │
└─────────────────────────────────────┘
```

*If department tracks quantities:* (only show if department.track_quantities = true)
```
┌─────────────────────────────────────┐
│  Good Quantity: [____] (optional)   │
│  Scrap Quantity: [____] (optional)  │
└─────────────────────────────────────┘
```

*Quick Actions:*
- "Add Note" button (opens text area with submit)
- "Upload Photo" button (opens camera or file picker)

**Interactions:**

1. **Clock On:**
   - Tap worker count +/- to indicate # of people (default: 1)
   - Tap "CLOCK ON"
   - System checks if already clocked into another job
     - If yes: Show error "You are already clocked into WO-2026-122. Please clock off before starting new work."
     - If no: Create time entry, change step status to IN_PROGRESS
   - Timer starts counting

2. **Pause:**
   - Tap "PAUSE"
   - Current time entry ends (is_paused = false)
   - New time entry created (is_paused = true)
   - Timer continues for Total Time, pauses for Active Time

3. **Resume:**
   - Tap "RESUME"
   - Pause entry ends
   - New work time entry starts
   - Active Time timer resumes

4. **Complete Step:**
   - Tap "COMPLETE STEP"
   - If quantities tracked: Prompt to enter good/scrap (optional, can skip)
   - Confirmation: "Mark this step complete?"
   - On confirm:
     - Current time entry ends
     - Step status → COMPLETED
     - Work order advances to next step
     - Log change
     - Return to queue view

5. **Add Note:**
   - Tap "Add Note"
   - Modal appears:
     - Text area (large, easy to type)
     - Note type: General | Issue | Quality
     - Submit button
   - On submit: Note saved, modal closes

6. **Upload Photo:**
   - Tap "Upload Photo"
   - Camera/gallery opens
   - Select photo(s)
   - Add description (optional)
   - Upload
   - Shows in attachments list

#### View 3: History

**Purpose:** Quick reference to recently completed work

**Display:** Simple list (not cards)
- Last 10 completed work orders by this operator
- Shows:
  - Order Number | Hull ID
  - Step name
  - Completed date/time
  - Active hours worked

**Interactions:**
- Tap to see read-only detail
- "View More" to see full history

---

## Key Workflows

### Workflow 1: PLM Integration - Automatic Intake

**Trigger:** External PLM/quoting tool sends build sheet

**API Endpoint:** `POST /api/v1/intake/work-orders`

**Request Headers:**
```
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Request Payload:**
```json
{
  "orderNumber": "WO-26123",
  "hullId": "HULL-24-789",
  "productSku": "LX24-SPORT-2026",
  "buildSpec": {
    "model": "LX24",
    "trim": "Sport",
    "modelYear": 2026,
    "features": [
      "Premium Audio Package",
      "Extended Swim Platform",
      "LED Navigation Lights"
    ]
  },
  "customerRef": "ORDER-45678",
  "plannedStartDate": "2026-01-20",
  "plannedFinishDate": "2026-02-15",
  "notes": "Customer requests expedited delivery"
}
```

**Process:**
1. API validates payload (Zod schema)
2. Check for duplicate order_number or hull_id
3. Lookup default route based on productSku pattern (admin-configured)
4. Create work order in PENDING_REVIEW status
5. Copy route steps to work_order_steps (denormalized)
6. Log creation in change_log
7. Broadcast via WebSocket to supervisor clients
8. Return success response

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "orderNumber": "WO-26123",
    "hullId": "HULL-24-789",
    "status": "PENDING_REVIEW"
  },
  "message": "Work order created successfully"
}
```

**Response (Error - Duplicate):**
```json
{
  "success": false,
  "error": "Work order with hull ID HULL-24-789 already exists",
  "code": "DUPLICATE_HULL_ID",
  "details": {
    "existingOrderNumber": "WO-26100"
  }
}
```

### Workflow 2: Manual Intake (Fallback)

**When:** PLM integration unavailable or for testing

**Access:** Supervisor workspace → Queue section → "Manual Entry" button

**Form:**
- Order Number (auto-generated "WO-yy###")
- Hull ID (required, unique)
- Product SKU (generated by build spec)
- Build Spec (form fields)
  - model
  - trim
  - year
  - features
     - engine
     - colors (all gets added into features same as in json package)
      - hull 1
      - hull 2 (if applicable)
      - cushion
      - powdercoat (if applicable)
    - additional features (optional one at a time with "+ add feature" button to create new lines)
- Customer Ref (optional)
- Planned Start Date (optional)
- Planned Finish Date (optional)
- Initial Notes (optional)

**Process:**
1. Supervisor fills form
2. System validates data (same as API)
3. Create work order in PENDING_REVIEW
4. Assign default route (or prompt to select)
5. Log creation
6. Redirect to work order detail modal for review

### Workflow 3: Supervisor Reviews & Releases Order

**Starting Point:** Supervisor workspace → Queue section

**Steps:**
1. Supervisor sees work order in Pending Review table
2. Click "Review" → Work Order Detail Modal opens
3. Review Build Spec tab:
   - Verify product details
   - Check customer notes
4. Review Route & Steps tab:
   - Assigned route is appropriate? (if not, select different route)
   - Need to modify route for this specific order?
     - Click "Modify Route"
     - System clones route, allows edits
     - Add/remove steps
     - Reorder with drag-and-drop
     - Adjust estimated hours
     - Set dependencies (critical path, parallel steps)
     - Save modified route
5. Set Schedule tab:
   - Enter planned start date
   - Enter planned finish date
6. Add Notes & Attachments:
   - Upload custom graphics file
   - Add note: "Customer wants custom pinstripe pattern - see attachment"
7. Set Priority (if needed): HIGH
8. Click "Release to Production"
9. Confirmation dialog: "Release WO-26001 to production floor?"
10. On confirm:
    - Status: PENDING_REVIEW → RELEASED
    - Change logged: STATUS_CHANGED, ROUTE_ASSIGNED, DATES_CHANGED, NOTE_ADDED, etc.
    - Work order appears in operator queues (for first step's station)
    - If planned start date is future: Shows in "Upcoming" section
    - If planned start date is today or past: Shows in "Available" section
11. Modal closes, supervisor returns to queue

### Workflow 4: Operator Executes Work

**Starting Point:** Operator Console → My Queue

**Scenario:** Operator arrives at Lamination station (LAMI-01) on Monday morning

**Steps:**

1. **Login:**
   - Operator opens app on tablet
   - Enters email and password
   - Selects language: Español
   - System redirects to Operator Console
   - Header shows: "Laminación - LAMI-01"

2. **View Queue:**
   - Available Work section shows 3 work orders (FIFO):
     - WO-26120 (PRIORITY: NORMAL)
     - WO-26118 (PRIORITY: HIGH) ← should work this first
     - WO-26119 (PRIORITY: NORMAL)
   - Upcoming Work section shows 2 work orders (start date: tomorrow)

3. **Select Work:**
   - Operator taps "Iniciar Trabajo" (Start Work) on WO-26118
   - Active Work view opens

4. **Review Instructions:**
   - Reads step name: "Laminación del Casco"
   - Scrolls through build spec
   - Views work instructions (in Spanish)
   - Taps attached image showing lamination technique
   - Sees note from supervisor: "Atención: cliente quiere patrón personalizado"

5. **Start Work:**
   - Worker count already set to 1 (default)
   - Two operators will work together, so taps "+" to set count to 2
   - Taps large "INICIAR RELOJ" (CLOCK ON) button
   - System creates time entry: started_at = NOW (EST)
   - Step status: PENDING → IN_PROGRESS
   - Timer starts: Active Time: 00:00:01, Total Time: 00:00:01
   - Change logged: STEP_STARTED

6. **Perform Work:**
   - Operator and helper perform lamination
   - Active Time: 01:45:32, Total Time: 01:45:32

7. **Lunch Break (Pause):**
   - Operator taps "PAUSAR" (PAUSE) button
   - Current time entry ends (duration: 1.76 hours, is_paused = false)
   - New time entry starts (is_paused = true)
   - Active Time: 01:45:32 (frozen)
   - Total Time: 01:45:33, 01:45:34, ... (continues counting)
   - Change logged: STEP_PAUSED

8. **Return from Lunch:**
   - 30 minutes later, operator taps "REANUDAR" (RESUME)
   - Pause entry ends (duration: 0.5 hours)
   - New work time entry starts
   - Active Time: 01:45:33, 01:45:34, ... (resumes)
   - Total Time: 02:15:35 (includes pause)
   - Change logged: STEP_RESUMED

9. **Finish Work:**
   - Additional 30 minutes of work
   - Active Time: 02:15:32
   - Total Time: 02:45:32
   - Operator taps "COMPLETAR PASO" (COMPLETE STEP)

10. **Complete Step:**
    - Department does NOT track quantities (track_quantities = false)
    - Confirmation dialog: "¿Marcar este paso como completado?"
    - Operator taps "Sí"
    - System:
      - Ends current time entry
      - Calculates: actual_hours = 2.76, active_hours = 2.26
      - Step status: IN_PROGRESS → COMPLETED
      - Work order advances to next step (Hull Rigging at RIG-01)
      - Change logged: STEP_COMPLETED with user, times, worker_count
    - Operator returned to My Queue view

11. **Next Station Sees Work:**
    - Operator at RIG-01 station refreshes (or WebSocket updates)
    - WO-26118 now appears in their Available Work queue
    - Previous operator's queue no longer shows this work order

### Workflow 5: Operator Multi-Tasking (Pause & Switch)

**Scenario:** Operator needs to wait for materials, starts another job

**Steps:**

1. Operator is clocked into WO-26125 (Active Time: 00:45:00)
2. Realizes epoxy needs to cure for 2 hours before next step
3. Taps "PAUSAR"
4. Returns to My Queue
5. Selects different work order: WO-26127
6. Taps "Iniciar Trabajo"
7. Attempts to clock on
8. System allows "multi-task" ONLY if other job is paused, but recommends completing paused job first to avoid confusion

### Workflow 6: Supervisor Holds Work Order

**Scenario:** Quality issue discovered, work order must stop

**Steps:**

1. Supervisor in Active Work section sees WO-26130 in progress
2. Receives call: "Problem with hull alignment on 130"
3. Clicks work order card → Work Order Detail Modal opens
4. Clicks "Hold" button in footer
5. Hold dialog appears:
   - **Reason:** Dropdown with predefined list (in English for supervisor)
     - Missing Parts
     - Quality Issue ← selects this
     - Customer Change Request
     - Equipment Failure
     - Material Shortage
     - Other
   - **Details:** Text area (required)
     - Types: "Hull alignment issue at station RIG-01, needs engineering review"
6. Clicks "Confirm Hold"
7. System processes:
   - Status: IN_PROGRESS → ON_HOLD
   - If operator clocked in: Auto clock-off (time entry ends)
   - Work order removed from all operator queues
   - Change logged: STATUS_CHANGED with reason
8. Modal remains open (can add more notes/attachments)
9. Supervisor adds note: "Engineering team contacted, expect resolution by tomorrow"
10. Closes modal

**Later: Resume Work**

1. Engineering fixes issue
2. Supervisor opens WO-26130 from Active Work (still shows held orders)
3. Clicks "Resume" button
4. Resume dialog appears:
   - "Resume work at which step?"
   - Dropdown shows all pending/in-progress steps
   - Current selection: "Hull Rigging" (where it was held)
   - Can select earlier step if rework needed
5. Selects "Hull Rigging"
6. Clicks "Confirm Resume"
7. System processes:
   - Status: ON_HOLD → IN_PROGRESS
   - Work order returns to operator queue at selected step
   - Change logged: STATUS_CHANGED with resume step
8. Operator sees work order reappear in their queue
9. Any repeated steps continue total time and active time counts, they do not overwrite. 

### Workflow 7: View Historical Work Order (2+ Years Later)

**Scenario:** Customer claims boat had defect from factory, need to investigate build history

**Starting Point:** Supervisor or Admin → History section

**Steps:**

1. Enter Hull ID in search: "HULL-22-456"
2. Search returns work order: WO-24789 (completed 2.5 years ago)
3. Click "View" → Work Order Detail Modal (read-only)
4. Review Build Spec tab: LX22-LT-2024, customer ref, features
5. Review Route & Steps tab:
   - Shows all 15 steps completed
   - Click "Lamination" step to expand:
     - Operator: John Doe
     - Date: 2024-03-15
     - Active Time: 3.2 hours
     - Total Time: 4.1 hours (had pauses)
     - Good Qty: N/A (not tracked)
   - Click "Hull Rigging" step:
     - Operator: Jane Smith
     - Date: 2024-03-16
     - Active Time: 2.8 hours
     - Note: "Minor alignment issue, corrected"
6. Open Notes & Attachments tab (expand from collapsed):
   - See 12 notes total
   - Filter by note type: "Quality"
   - Find note from Final Inspection (2024-03-28): "All systems pass, ready for delivery"
   - View 8 attachments (progress photos from various steps)
7. Open Change History tab (expand from collapsed):
   - Full timeline from creation to completion:
     ```
     2024-03-01 10:15 AM - CREATED by system (PLM integration)
     2024-03-01 11:30 AM - ROUTE_ASSIGNED: Standard 22ft Route (v3)
     2024-03-01 11:35 AM - STATUS_CHANGED: PENDING_REVIEW → RELEASED by Supervisor Mike
     2024-03-15 07:00 AM - STEP_STARTED: Lamination by John Doe
     2024-03-15 12:30 PM - STEP_PAUSED: Lamination by John Doe
     2024-03-15 01:00 PM - STEP_RESUMED: Lamination by John Doe
     2024-03-15 03:15 PM - STEP_COMPLETED: Lamination by John Doe (3.2 active hrs)
     2024-03-16 07:30 AM - STEP_STARTED: Hull Rigging by Jane Smith
     ... (continues through all 15 steps)
     2024-03-28 04:45 PM - STEP_COMPLETED: Final Inspection by Tom Brown
     2024-03-28 04:50 PM - STATUS_CHANGED: IN_PROGRESS → COMPLETED
     ```
8. Expand entry: "STEP_COMPLETED: Hull Rigging"
   - Shows:
     - User: Jane Smith (OPERATOR, Rigging Department)
     - Timestamp: 2024-03-16 10:15:23 EST
     - Duration: 2.8 hours (active), 3.1 hours (total)
     - Worker Count: 1
     - Note: "Minor alignment issue, corrected"
9. Download all attachments as ZIP for customer service team
10. Export change history as PDF for legal team
11. Conclusion: No evidence of manufacturing defect, all QC passed

---

## Technical Architecture

### Technology Stack

**Framework & Runtime:**
- Next.js 15 (App Router) with React 19
- Node.js 20+ (full runtime, not edge)
- TypeScript 5.0+ (strict mode enabled)

**Database & ORM:**
- PostgreSQL 16
- Prisma 5.x ORM

**Frontend:**
- React 19 with React Server Components
- Tailwind CSS 3.4 for styling
- Shadcn UI components (accessible, customizable)
- Framer Motion for animations (sparingly)

**Real-Time:**
- Socket.io for WebSocket connections
- Server: Socket.io server integrated with Next.js
- Client: Socket.io client in React components

**Authentication:**
- JWT (jsonwebtoken library)
- httpOnly cookies for token storage
- bcrypt for password hashing (12 rounds)

**File Storage:**
- S3-compatible object storage (AWS S3, Replit, MinIO, etc.)
- Presigned URLs for secure direct uploads
- Image optimization with Next.js Image component

**Validation & Types:**
- Zod for runtime validation
- Prisma-generated types for database
- Strict TypeScript (no `any` types)

**Testing:**
- Vitest for unit and integration tests
- Playwright for E2E tests
- Testing Library for React components

**Internationalization:**
- next-intl for bilingual support (English/Spanish)
- Separate translation files per role

**Logging & Monitoring:**
- Winston for structured logging
- JSON log format
- Log levels: DEBUG, INFO, WARN, ERROR
- Request ID tracking

**Code Quality:**
- ESLint with strict rules
- Prettier for formatting
- Husky for pre-commit hooks
- Lint-staged for staged files only

### Architecture Principles

1. **Server Components First:** Use React Server Components for data fetching, Client Components only when needed for interactivity
2. **API Routes:** RESTful JSON APIs in `/app/api/v1/` directory
3. **Middleware:** Role-based authorization on all protected routes
4. **Transactions:** Use Prisma transactions for multi-table operations
5. **Immutable Audit Logs:** Never delete or update change log records
6. **Soft Deletes:** Use `is_active` flags instead of hard deletes
7. **Component Composition:** Max 300 LOC per component, extract early
8. **Single Responsibility:** One API route = one action
9. **Type Safety:** No `any`, define interfaces for all props/data
10. **Error Boundaries:** Catch and handle errors gracefully

### Database Design Principles

1. **Normalization:** Configuration tables (departments, stations, routes) are normalized
2. **Denormalization:** Work orders snapshot route data at creation (copy route steps)
3. **Separate Time Tracking:** Time entries in own table, not embedded in steps
4. **JSONB for Flexibility:** Change log uses JSONB for old_value/new_value
5. **Strategic Indexing:**
   - Primary keys: UUID (not serial)
   - Indexed: order_number, hull_id, status, created_at, user_id, work_order_id
   - Composite indexes on common query patterns
6. **Foreign Keys:** Use ON DELETE CASCADE where appropriate (e.g., route_steps → routes)
7. **Constraints:** Unique constraints on business keys (order_number, hull_id, station code)
8. **Timezone:** Store all timestamps as `TIMESTAMP WITH TIME ZONE`, display in EST

### API Design Standards

**Base URL:** `/api/v1/`

**Authentication:**
- All routes except `/api/v1/auth/*` require JWT
- JWT passed via httpOnly cookie
- Middleware extracts user from JWT and adds to request context

**Endpoints:**

**Auth:**
```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
POST   /api/v1/auth/refresh
```

**Work Orders:**
```
GET    /api/v1/work-orders           (list, with filters)
POST   /api/v1/work-orders           (supervisor creates manually)
GET    /api/v1/work-orders/[id]      (detail)
PATCH  /api/v1/work-orders/[id]      (update fields)
POST   /api/v1/work-orders/[id]/release
POST   /api/v1/work-orders/[id]/hold
POST   /api/v1/work-orders/[id]/resume
POST   /api/v1/work-orders/[id]/cancel

GET    /api/v1/work-orders/[id]/notes
POST   /api/v1/work-orders/[id]/notes

GET    /api/v1/work-orders/[id]/attachments
POST   /api/v1/work-orders/[id]/attachments (multipart upload)
DELETE /api/v1/work-orders/[id]/attachments/[attachmentId]

GET    /api/v1/work-orders/[id]/changelog
GET    /api/v1/work-orders/[id]/steps
```

**Work Order Steps:**
```
POST   /api/v1/work-orders/[id]/steps/[stepId]/start (clock on)
POST   /api/v1/work-orders/[id]/steps/[stepId]/pause
POST   /api/v1/work-orders/[id]/steps/[stepId]/resume
POST   /api/v1/work-orders/[id]/steps/[stepId]/complete (clock off)
PATCH  /api/v1/work-orders/[id]/steps/[stepId] (update quantities, notes)
```

**Operator:**
```
GET    /api/v1/operator/queue        (my station's available work)
GET    /api/v1/operator/upcoming     (my station's future work)
GET    /api/v1/operator/active       (my currently clocked-in work)
GET    /api/v1/operator/history      (my completed work)
```

**Supervisor:**
```
GET    /api/v1/supervisor/queue      (pending review)
GET    /api/v1/supervisor/dashboard  (stats, active work)
GET    /api/v1/supervisor/schedule   (calendar data)
POST   /api/v1/supervisor/work-orders/[id]/modify-route
```

**Admin - Departments:**
```
GET    /api/v1/admin/departments
POST   /api/v1/admin/departments
GET    /api/v1/admin/departments/[id]
PATCH  /api/v1/admin/departments/[id]
DELETE /api/v1/admin/departments/[id]
```

**Admin - Stations:**
```
GET    /api/v1/admin/stations
POST   /api/v1/admin/stations
GET    /api/v1/admin/stations/[id]
PATCH  /api/v1/admin/stations/[id]
DELETE /api/v1/admin/stations/[id]
```

**Admin - Routes:**
```
GET    /api/v1/admin/routes
POST   /api/v1/admin/routes
GET    /api/v1/admin/routes/[id]
PATCH  /api/v1/admin/routes/[id]
DELETE /api/v1/admin/routes/[id]
POST   /api/v1/admin/routes/[id]/clone

GET    /api/v1/admin/routes/[id]/steps
POST   /api/v1/admin/routes/[id]/steps
PATCH  /api/v1/admin/routes/[id]/steps/[stepId]
DELETE /api/v1/admin/routes/[id]/steps/[stepId]

POST   /api/v1/admin/routes/[id]/steps/[stepId]/attachments
DELETE /api/v1/admin/routes/[id]/steps/[stepId]/attachments/[attachmentId]
```

**Admin - Users:**
```
GET    /api/v1/admin/users
POST   /api/v1/admin/users
GET    /api/v1/admin/users/[id]
PATCH  /api/v1/admin/users/[id]
DELETE /api/v1/admin/users/[id]
```

**Admin - Hold Reasons:**
```
GET    /api/v1/admin/hold-reasons
POST   /api/v1/admin/hold-reasons
PATCH  /api/v1/admin/hold-reasons/[id]
DELETE /api/v1/admin/hold-reasons/[id]
```

**Intake (PLM Integration):**
```
POST   /api/v1/intake/work-orders    (external PLM system calls this)
```

**Response Format (Success):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Response Format (Error):**
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

**Error Codes:**
- `UNAUTHORIZED` - Not logged in
- `FORBIDDEN` - Logged in but insufficient permissions
- `NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Input validation failed
- `DUPLICATE_RESOURCE` - Unique constraint violation
- `CONFLICT` - Business logic conflict (e.g., already clocked in)
- `INTERNAL_ERROR` - Server error

### Security Considerations

1. **Passwords:**
   - bcrypt hashing with 12 rounds
   - Password requirements: min 8 chars, 1 uppercase, 1 number
   - Rate limiting on login endpoint (5 attempts per 15 minutes)

2. **JWT:**
   - Secret: 32+ character random string in .env
   - Expiration: 8 hours (work shift)
   - Refresh token: 7 days
   - httpOnly cookie prevents XSS

3. **API Security:**
   - CORS: Configured for production domain only
   - CSRF protection on state-changing requests
   - Input validation: Zod schemas on all inputs
   - SQL injection: Prevented by Prisma parameterized queries
   - Rate limiting: 100 requests per minute per IP

4. **File Uploads:**
   - Mime type validation (images: jpg/png, docs: pdf/txt)
   - File size limits: 10MB per file
   - Virus scanning (future enhancement)
   - Presigned URLs for direct S3 upload (avoid server load)

5. **Audit Logging:**
   - All mutations logged with user ID
   - IP address logged for logins
   - Change log is append-only (no deletes)

6. **Role Enforcement:**
   - Every API route checks user.role
   - Middleware helper functions: `requireAdmin()`, `requireSupervisor()`, `requireAuth()`
   - Database-level: No foreign keys allow unauthorized access

7. **Environment Variables:**
   - Never commit .env to git
   - Use .env.example as template
   - Production secrets stored in secure vault

### Real-Time Architecture (WebSockets)

**Why WebSockets Instead of Polling:**
- More efficient (no repeated HTTP overhead)
- True real-time updates (no 5-second delay)
- Scalable to 15-20 concurrent users easily
- Better UX (instant feedback)

**Implementation:**

**Server Side (`/lib/socket/server.ts`):**
```typescript
import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import type { NextApiResponse } from 'next'

export function initSocketServer(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      credentials: true
    }
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Authenticate socket connection
    const token = socket.handshake.auth.token
    const user = verifyJWT(token)

    if (!user) {
      socket.disconnect()
      return
    }

    // Join role-specific rooms
    socket.join(`role:${user.role}`)
    if (user.role === 'OPERATOR') {
      socket.join(`station:${user.primaryStationId}`)
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}

// Emit events from API routes
export function emitWorkOrderUpdate(workOrderId: string, data: any) {
  const io = getSocketServer()
  io.to('role:SUPERVISOR').emit('work-order:updated', { workOrderId, data })
}

export function emitQueueUpdate(stationId: string) {
  const io = getSocketServer()
  io.to(`station:${stationId}`).emit('queue:updated')
}
```

**Client Side (`/hooks/useSocket.ts`):**
```typescript
import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const token = getJWTToken() // from cookie
    const socketInstance = io(process.env.NEXT_PUBLIC_APP_URL, {
      auth: { token }
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  return socket
}

// Usage in components
export function useWorkOrderUpdates(workOrderId: string, onUpdate: Function) {
  const socket = useSocket()

  useEffect(() => {
    if (!socket) return

    socket.on('work-order:updated', (data) => {
      if (data.workOrderId === workOrderId) {
        onUpdate(data.data)
      }
    })

    return () => {
      socket.off('work-order:updated')
    }
  }, [socket, workOrderId, onUpdate])
}
```

**Events:**
- `work-order:created` - New WO added (to supervisors)
- `work-order:updated` - WO field changed (to supervisors)
- `work-order:status-changed` - Status transition (to all relevant users)
- `queue:updated` - Queue changed for a station (to operators at that station)
- `step:started` - Operator clocked on (to supervisors)
- `step:completed` - Step finished (to supervisors, next station operator)

### Performance Targets

- **Login:** < 500ms
- **Operator Queue Load:** < 800ms
- **Supervisor Dashboard:** < 1.5s
- **Work Order Detail:** < 1s
- **File Upload:** < 3s for 5MB file
- **Search:** < 1s for 10,000+ work orders
- **WebSocket Latency:** < 100ms

**Optimization Strategies:**
1. **Database:**
   - Index all foreign keys
   - Composite indexes on (work_order_id, status), (station_id, status), etc.
   - Partial indexes on active work orders only
   - EXPLAIN ANALYZE on slow queries

2. **Caching:**
   - Configuration data (departments, stations, routes) cached in Redis (5 min TTL)
   - User session data cached
   - Static assets via CDN

3. **Pagination:**
   - Default: 20 items per page
   - Cursor-based pagination for large datasets
   - Virtual scrolling for operator queue (if > 50 items)

4. **Code Splitting:**
   - Route-based code splitting (Next.js automatic)
   - Dynamic imports for large components (e.g., PDF viewer)

5. **Image Optimization:**
   - Next.js Image component (auto WebP conversion)
   - Lazy loading images below fold
   - Thumbnail generation for attachments

6. **Database Connection Pooling:**
   - Prisma connection pool: max 10 connections
   - Connection timeout: 5 seconds

---

## Testing Strategy

### Unit Tests (Target: 80% coverage)

**What to Test:**
- All API route handlers
- Authorization middleware
- Data validation (Zod schemas)
- Business logic functions (time calculations, status transitions)
- Utility functions

**Tools:** Vitest

**Example:**
```typescript
// __tests__/api/work-orders/release.test.ts
describe('POST /api/v1/work-orders/[id]/release', () => {
  it('releases work order and changes status to RELEASED', async () => {
    const workOrder = await createMockWorkOrder({ status: 'PENDING_REVIEW' })
    const supervisor = await createMockUser({ role: 'SUPERVISOR' })

    const response = await apiRequest(
      `/api/v1/work-orders/${workOrder.id}/release`,
      { method: 'POST', user: supervisor }
    )

    expect(response.success).toBe(true)
    expect(response.data.status).toBe('RELEASED')

    // Verify change log entry
    const changeLogs = await prisma.changeLog.findMany({ where: { workOrderId: workOrder.id } })
    expect(changeLogs).toContainEqual(expect.objectContaining({
      changeType: 'STATUS_CHANGED',
      oldValue: { status: 'PENDING_REVIEW' },
      newValue: { status: 'RELEASED' }
    }))
  })

  it('returns 403 if user is not supervisor', async () => {
    const workOrder = await createMockWorkOrder()
    const operator = await createMockUser({ role: 'OPERATOR' })

    const response = await apiRequest(
      `/api/v1/work-orders/${workOrder.id}/release`,
      { method: 'POST', user: operator }
    )

    expect(response.success).toBe(false)
    expect(response.code).toBe('FORBIDDEN')
  })
})
```

### Integration Tests

**What to Test:**
- Full workflows: Create WO → Release → Start → Complete
- Multi-step operations (e.g., modify route, add notes, upload attachment)
- Hold/Resume flows
- Time tracking with pause/resume
- Database transactions (rollback on error)

**Tools:** Vitest with test database

**Example:**
```typescript
// __tests__/workflows/operator-complete-work.test.ts
describe('Operator completes work step', () => {
  it('tracks time correctly with pause and resume', async () => {
    const operator = await createOperator()
    const workOrder = await createReleasedWorkOrder()
    const step = workOrder.steps[0]

    // Start work
    await POST(`/api/v1/work-orders/${workOrder.id}/steps/${step.id}/start`, { operator })

    // Wait 1 hour (mock time)
    await advanceTime(60 * 60 * 1000)

    // Pause
    await POST(`/api/v1/work-orders/${workOrder.id}/steps/${step.id}/pause`, { operator })

    // Wait 30 minutes (pause time)
    await advanceTime(30 * 60 * 1000)

    // Resume
    await POST(`/api/v1/work-orders/${workOrder.id}/steps/${step.id}/resume`, { operator })

    // Wait 30 minutes
    await advanceTime(30 * 60 * 1000)

    // Complete
    await POST(`/api/v1/work-orders/${workOrder.id}/steps/${step.id}/complete`, { operator })

    // Verify times
    const updatedStep = await prisma.workOrderStep.findUnique({ where: { id: step.id } })
    expect(updatedStep.activeHours).toBeCloseTo(1.5, 1) // 1 hr + 0.5 hr
    expect(updatedStep.actualHours).toBeCloseTo(2.0, 1) // includes 0.5 hr pause
  })
})
```

### End-to-End Tests (Playwright)

**What to Test (Critical Paths):**
1. **Login Flow:** Operator logs in, sees correct dashboard
2. **Work Order Creation:** Supervisor creates manual work order
3. **Release to Production:** Supervisor reviews and releases WO
4. **Operator Starts Work:** Operator clocks on, sees timer
5. **Operator Pauses Work:** Operator pauses, active time stops
6. **Operator Completes Work:** Operator finishes, advances to next step
7. **Hold/Resume:** Supervisor holds WO, operator no longer sees it, supervisor resumes
8. **Attachment Upload:** Operator uploads photo
9. **Note Adding:** Operator adds note
10. **Historical Search:** Supervisor searches for old work order by hull ID

**Tools:** Playwright

**Example:**
```typescript
// e2e/operator-workflow.spec.ts
test('Operator can start, pause, and complete work', async ({ page }) => {
  // Login as operator
  await page.goto('/login')
  await page.fill('input[name="email"]', 'operator@example.com')
  await page.fill('input[name="password"]', 'password')
  await page.click('button[type="submit"]')

  // Should see operator queue
  await expect(page.locator('text=My Queue')).toBeVisible()

  // Click start work on first WO
  await page.click('button:has-text("Start Work"):first')

  // Should see active work view
  await expect(page.locator('text=CLOCK ON')).toBeVisible()

  // Clock on
  await page.click('button:has-text("CLOCK ON")')

  // Should see timer running
  await expect(page.locator('text=Active Time:')).toBeVisible()
  await expect(page.locator('text=00:00:')).toBeVisible()

  // Pause
  await page.click('button:has-text("PAUSE")')
  await expect(page.locator('text=PAUSED')).toBeVisible()

  // Resume
  await page.click('button:has-text("RESUME")')
  await expect(page.locator('text=PAUSED')).not.toBeVisible()

  // Complete
  await page.click('button:has-text("COMPLETE STEP")')
  await page.click('button:has-text("Confirm")')

  // Should return to queue
  await expect(page.locator('text=My Queue')).toBeVisible()
})
```

### Load Testing (Future)

**Scenarios:**
- 15-20 concurrent operators using system
- 5 supervisors monitoring dashboard simultaneously
- 500 work orders in database
- WebSocket connection stability

**Tools:** k6 or Artillery

---

## Deployment & Operations

### Environments

1. **Local Development:** `npm run dev` on localhost:3000
2. **Staging:** Mirrors production, for testing before release
3. **Production:** Live system for factory use

### Environment Variables

**Required:**
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/db_name

# Auth
JWT_SECRET=<32+ character random string>
JWT_EXPIRATION=8h
REFRESH_TOKEN_EXPIRATION=7d

# File Storage (S3-compatible)
STORAGE_URL=https://s3.amazonaws.com
STORAGE_BUCKET=boat-mrp-files
STORAGE_ACCESS_KEY=<access key>
STORAGE_SECRET_KEY=<secret key>
STORAGE_REGION=us-east-1

# App
NEXT_PUBLIC_APP_URL=https://mrp.yourcompany.com
NODE_ENV=production
LOG_LEVEL=INFO

# Timezone
TZ=America/New_York
```

### Logging

**Format:** JSON structured logs

**Fields:**
- `timestamp` (ISO 8601 in EST)
- `level` (DEBUG, INFO, WARN, ERROR)
- `message` (human-readable)
- `requestId` (UUID for tracing)
- `userId` (if authenticated)
- `context` (additional data)

**Example:**
```json
{
  "timestamp": "2026-01-15T14:23:45-05:00",
  "level": "INFO",
  "message": "Work order released to production",
  "requestId": "req-abc-123",
  "userId": "user-uuid-456",
  "context": {
    "workOrderId": "wo-uuid-789",
    "orderNumber": "WO-26123",
    "status": "RELEASED"
  }
}
```

**Log Levels:**
- **DEBUG:** Detailed info for troubleshooting (dev only)
- **INFO:** Normal operations (WO created, step completed, etc.)
- **WARN:** Unexpected but handled (missing optional field, slow query)
- **ERROR:** Errors requiring attention (API failure, database error)

### Monitoring

**Health Check:** `GET /api/health`
```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T14:23:45-05:00",
  "database": "connected",
  "storage": "accessible",
  "uptime": 86400
}
```

**Metrics to Track:**
- Request count (per endpoint)
- Response time (p50, p95, p99)
- Error rate (5xx responses)
- Active WebSocket connections
- Database query time
- Disk space usage

**Alerts:**
- Database connection failure
- API error rate > 5%
- Response time p95 > 3s
- Disk space < 10% free
- No WebSocket connections (indicates server issue)

### Backup Strategy

**Database:**
- Automated daily backups at 2 AM EST
- Retention: 30 days
- Test restore monthly
- Backup location: Separate storage from primary database

**Files (S3):**
- Object versioning enabled
- Replication to secondary bucket (cross-region)
- Lifecycle policy: Archive to Glacier after 2 years

**Recovery Targets:**
- **RTO (Recovery Time Objective):** < 1 day
- **RPO (Recovery Point Objective):** < 24 hours

**Disaster Recovery Plan:**
1. Restore database from most recent backup
2. Verify data integrity
3. Restore file storage (S3 replication handles this automatically)
4. Restart application servers
5. Verify health checks pass
6. Notify users when system is back online

---

## Data Export (Integration with Other Systems)

### Labor Data Export (for BOM Management Tool)

**Purpose:** Send labor hours per step to external costing tool

**Format:** JSON via REST API or CSV export

**Endpoint:** `GET /api/v1/export/labor-data`

**Query Parameters:**
- `workOrderId` (optional, specific WO)
- `hullId` (optional, specific hull)
- `dateFrom` (optional, start date)
- `dateTo` (optional, end date)
- `format` (json or csv)

**Response (JSON):**
```json
{
  "success": true,
  "data": [
    {
      "workOrderNumber": "WO-26123",
      "hullId": "HULL-24-789",
      "productSku": "LX24-LT-2026",
      "steps": [
        {
          "stepName": "Lamination",
          "stationCode": "LAMI-01",
          "departmentName": "Hull Construction",
          "estimatedHours": 4.0,
          "actualHours": 4.2,
          "activeHours": 3.5,
          "laborCost": 105.00,
          "workerCount": 2,
          "startedAt": "2026-01-15T07:00:00-05:00",
          "completedAt": "2026-01-15T11:12:00-05:00"
        },
        {
          "stepName": "Hull Rigging",
          "stationCode": "RIG-01",
          "departmentName": "Rigging",
          "estimatedHours": 3.0,
          "actualHours": 2.8,
          "activeHours": 2.8,
          "laborCost": 84.00,
          "workerCount": 1,
          "startedAt": "2026-01-16T08:00:00-05:00",
          "completedAt": "2026-01-16T10:48:00-05:00"
        }
      ],
      "totalEstimatedHours": 7.0,
      "totalActualHours": 7.0,
      "totalActiveHours": 6.3,
      "totalLaborCost": 189.00
    }
  ]
}
```

### Work Order Status Export (for CRM Tool)

**Purpose:** Send WO status updates to customer relationship management system

**Format:** Webhook (push) or REST API (pull)

**Push (Webhook):**
- Configure webhook URL in admin settings
- On status change, POST to webhook:

```json
{
  "event": "work-order.status-changed",
  "timestamp": "2026-01-15T14:23:45-05:00",
  "data": {
    "workOrderNumber": "WO-26-123",
    "hullId": "HULL-24-789",
    "customerRef": "ORDER-45678",
    "status": "IN_PROGRESS",
    "currentStep": "Hull Rigging",
    "progress": {
      "completedSteps": 3,
      "totalSteps": 12,
      "percentComplete": 25
    },
    "plannedFinishDate": "2026-02-15",
    "estimatedCompletionDate": "2026-02-14"
  }
}
```

**Pull (REST API):**
- Endpoint: `GET /api/v1/export/work-order-status`
- Query: `customerRef` or `workOrderNumber`
- Returns current status and progress

---

## Future Enhancements (Post-MVP)

Listed in priority order based on user needs:

1. **Real-Time Notifications** - In-app, email, or SMS alerts for supervisors (holds, completions, issues)
2. **Reporting Dashboard** - Charts and KPIs (on-time completion, labor vs estimate, bottlenecks)
3. **Advanced Scheduling** - Gantt chart with capacity planning, drag-and-drop optimization
4. **Scrap Tracking Actions** - Trigger reorder or quality alerts based on scrap rates
5. **Barcode/QR Code Scanning** - Quick lookup of work orders by scanning hull tag
6. **Equipment Tracking** - Full CRUD for tools/machines, maintenance scheduling
7. **Quality Management** - Defect tracking, rework loops, QC checklists
8. **Inventory Integration** - Track parts consumption per step, trigger reorders (will need to communicat with MRPeasy API to accomplish)
9. **Mobile App** - Native iOS/Android apps for operators (better than web on tablets)
10. **Offline Mode** - Operators can clock on/off without internet, sync later
11. **Predictive Analytics** - ML model to predict completion dates based on historical data
12. **Video Work Instructions** - Embedded video player with timestamped steps
13. **Voice Input** - Operators add notes via voice-to-text (hands-free)
14. **Automated Backups to External Storage** - Daily automated sync to customer's own backup location

---

## Lessons Learned from Previous Implementation

### What Worked Well ✅

1. **Three-tier role model** (Admin/Supervisor/Operator) - Keep this structure
2. **Complete audit trail** - Change log with before/after snapshots is essential
3. **JWT authentication** - Simple, secure, stateless - continue using
4. **Prisma ORM** - Good developer experience, type safety - keep
5. **File attachment system** - Critical for operators and supervisors
6. **Versioned routing** - Routes should be immutable once in use
7. **Structured logging** - JSON logs better than console.log
8. **Test coverage** - 220 tests was a good foundation, aim for 80%+

### What Was Overly Complex ❌

1. **Supervisor page (3,490 LOC)** - Too large, unmaintainable
   - **Solution:** Break into < 300 LOC components from day one

2. **Product configuration hierarchy** - 5-level deep structure unnecessary in MRP
   - **Solution:** MRP only needs SKU + JSON snapshot, leave complex config to PLM tool

3. **Routing editor in supervisor UI** - Complex inline editing
   - **Solution:** Admins AND supervisors can create/modify routes, but with clear UI for dependencies and parallel steps

4. **Polling every 5 seconds** - Inefficient, not scalable
   - **Solution:** Use WebSockets from start for true real-time updates

5. **Metrics calculation** - Weighted averages, complex costing in MRP
   - **Solution:** Track raw time data, defer complex analytics to reporting phase

6. **Work instruction versions** - Separate versioning unnecessary
   - **Solution:** Simple instructions field, changes logged in work order history

7. **Equipment tracking** - Full CRUD system built before needed
   - **Solution:** Defer to post-MVP, focus on core workflows first

8. **PLANNED state** - Extra status added complexity
   - **Solution:** Use PENDING_REVIEW → RELEASED, handle "upcoming" via planned_start_date

9. **Work Center abstraction** - Extra layer between departments and stations
   - **Solution:** Direct Department → Station relationship

10. **Multiple state management patterns** - Inconsistent approaches
    - **Solution:** Define pattern upfront (React Context for global, useState for local)

### Technical Debt Avoided

1. **TypeScript strict mode from day one** - No `any` types allowed
2. **Tests written with features** - Not after, achieve 80% coverage
3. **E2E tests for critical paths** - At least 10 workflows covered
4. **Pre-commit hooks** - Husky + ESLint + Prettier automated
5. **Component size limit** - Max 300 LOC enforced via linting
6. **API versioning** - Start with `/api/v1/` for future compatibility
7. **Performance benchmarks** - Establish baseline early, track over time

---

## Implementation Phases

### Phase 1: Foundation & Setup (Week 1-2)

**Goals:** Development environment, database, authentication

**Tasks:**
- Initialize Next.js 15 project with TypeScript
- Set up Prisma with PostgreSQL
- Create database schema (all tables)
- Run initial migration
- Implement authentication (login, logout, JWT, middleware)
- Set up file storage (S3 integration)
- Configure ESLint, Prettier, Husky
- Create seed script for test data
- Set up test framework (Vitest, Playwright)
- Implement role-based middleware
- Build basic layout components (header, sidebar, footer)
- **Create project workflow documentation:**
  - `ChangeLog.md` - Track all changes chronologically with agent roles and timestamps
  - `ActionItems.md` - Manage tasks with priorities, status tracking, and agent assignments
  - `Agents.md` - Define agent roles, responsibilities, and workflow protocols

**Deliverables:**
- Working login/logout
- Role-based routing (admin, supervisor, operator redirects)
- Database fully migrated
- Test data seeded
- Project workflow documentation in place

### Phase 2: Admin Panel (Week 3-4)

**Goals:** Configuration management for admins

**Tasks:**
- Build admin dashboard (stats, recent activity)
- Departments CRUD (with quantity tracking toggle)
- Stations CRUD (assign to departments)
- Routes CRUD (create, clone, edit)
  - Route steps (add, edit, delete, reorder)
  - Step dependencies and parallel flags
  - Route step attachments upload
- Users CRUD (assign roles, departments, stations)
- Hold Reasons CRUD
- Implement search and filters for all lists
- CSV export functionality
- Build reusable form components
- Unit tests for all API routes
- E2E tests for admin workflows

**Deliverables:**
- Fully functional admin panel
- Admins can configure entire system
- All configuration APIs tested

### Phase 3: Supervisor Workspace (Week 5-6)

**Goals:** Work order management for supervisors

**Tasks:**
- Build supervisor sidebar navigation
- Queue section (pending review)
  - Table view with filters
  - Work Order Detail Modal
    - Build Spec tab
    - Route & Steps tab (editable)
    - Schedule tab
    - Notes & Attachments tabs (collapsible)
    - Change History tab (collapsible)
  - Release work order functionality
- Schedule section (calendar/timeline view)
  - Drag-and-drop date adjustment
  - Click to open detail modal
- Active Work section (real-time dashboard)
- History section (completed/cancelled WOs)
- Hold/Resume functionality with reasons
- Manual work order creation form
- Route modification (clone and edit)
- Notes and attachments upload
- WebSocket integration for real-time updates
- Unit and integration tests
- E2E tests for supervisor workflows

**Deliverables:**
- Supervisor can manage all work orders
- Real-time updates working
- Hold/resume flow tested

### Phase 4: Operator Console (Week 7-8)

**Goals:** Operator interface for floor work

**Tasks:**
- Build operator console (mobile-first)
- My Queue view (available + upcoming)
- Active Work view (detail)
  - Build info display
  - Work instructions with attachments
  - Time tracking (clock on/off/pause/resume)
  - Worker count selector
  - Quantity inputs (conditional)
  - Note and photo upload
  - Complete step button
- History view (completed work)
- Bilingual support (English/Spanish)
  - Translation files (en.json, es.json)
  - Language selector
  - Persistent preference
- Error handling for multi-tasking prevention
- WebSocket integration for queue updates
- Large touch targets, high contrast
- Unit and integration tests
- E2E tests for operator workflows

**Deliverables:**
- Operator can execute work from tablet
- Time tracking accurate (with pause)
- Bilingual UI working
- Cannot clock into multiple jobs

### Phase 5: PLM Integration & Change Log (Week 9)

**Goals:** External integration and audit trail

**Tasks:**
- Build intake API endpoint (`POST /api/v1/intake/work-orders`)
  - Validation
  - Default route assignment
  - Error handling
- Implement change log recording for all mutations
  - Work order creation
  - Status changes
  - Route modifications
  - Step start/pause/resume/complete
  - Notes and attachments added
  - Field updates
- Change History tab (formatted timeline view)
- Expand functionality for before/after values
- Export change log as PDF/CSV
- API key authentication for PLM system
- Documentation for PLM integration
- Unit tests for intake API
- Integration tests for change logging

**Deliverables:**
- PLM can send work orders via API
- Complete audit trail for all changes
- Change history viewable by supervisors/admins

### Phase 6: Testing & Polish (Week 10)

**Goals:** Quality assurance and UX refinement

**Tasks:**
- Comprehensive E2E test suite (10+ critical paths)
- Load testing (15-20 concurrent users)
- WebSocket stability testing
- Security audit (OWASP top 10 check)
- Performance optimization
  - Database query optimization
  - Identify and fix slow queries
  - Caching strategy implementation
- UI/UX refinements
  - Accessibility audit (WCAG 2.1 AA)
  - Mobile responsiveness testing
  - Error message improvements
  - Loading states and skeletons
- Bug fixes from testing
- Documentation
  - User guides (admin, supervisor, operator)
  - API documentation (Swagger/OpenAPI)
  - Deployment guide

**Deliverables:**
- 80%+ test coverage
- All critical paths E2E tested
- Performance targets met
- User documentation complete

### Phase 7: Deployment & Training (Week 11)

**Goals:** Production deployment and user onboarding

**Tasks:**
- Set up production environment (hosting, database, storage)
- Configure production environment variables
- Set up monitoring and alerting
- Deploy application to production
- Create admin account
- Seed production with initial configuration (departments, stations, basic routes)
- User training sessions:
  - Admin training (system configuration)
  - Supervisor training (work order management)
  - Operator training (floor execution)
- Create training videos (screen recordings)
- Go-live support (on-site or remote)
- Monitor for issues in first week
- Gather user feedback

**Deliverables:**
- Production system live
- Users trained
- Support plan in place

### Phase 8: Stabilization & Data Export (Week 12)

**Goals:** Post-launch support and external integrations

**Tasks:**
- Bug fixes from initial usage
- UX improvements based on feedback
- Build labor data export API (for BOM tool)
- Build work order status export API/webhook (for CRM)
- Test integrations with external systems
- Performance tuning based on real usage
- Documentation updates
- Plan for Phase 2 features

**Deliverables:**
- Stable production system
- Data exports working
- Feedback incorporated
- Roadmap for future enhancements

---

## Success Metrics

How we'll measure if the redesign is successful:

### Quantitative Metrics

1. **User Adoption**
   - 90%+ of operators using system daily within 2 weeks
   - < 5 support tickets per week after training period

2. **Performance**
   - All pages meet performance targets (see Technical Architecture)
   - Zero unplanned downtime after month 1

3. **Data Quality**
   - 100% of work orders have complete audit trail
   - < 1% data entry errors

4. **Efficiency**
   - Average time for operator to clock on: < 30 seconds
   - Average time for supervisor to release WO: < 3 minutes

### Qualitative Metrics

1. **User Satisfaction**
   - Operators: "Easy to use on tablet"
   - Supervisors: "Can see everything I need in one place"
   - Admins: "Configuration is straightforward"

2. **Maintainability**
   - New developers can understand codebase in < 1 week
   - Bug fixes take < 1 day on average
   - New features can be added without breaking existing functionality

3. **Auditability**
   - Can answer "what happened to this boat?" in < 2 minutes
   - Change history is clear and complete

---

## Project Workflow Documentation

To ensure smooth development and maintain clear accountability throughout the implementation, create and maintain three core workflow documentation files. These files should be created in Phase 1 and updated continuously throughout the project lifecycle.

### ChangeLog.md

**Purpose:** Record every significant change chronologically with the newest entry at the top. This provides a complete audit trail of all development work.

**Location:** `docs/ChangeLog.md`

**Format:**

```markdown
# Agent Change Log

> Record every pull request chronologically with the newest entry at the top. Use UTC timestamps in ISO 8601 format.

## YYYY-MM-DDTHH:MM:SSZ - Agent: [Agent Role/Name]

- **Summary:** Brief description of what was accomplished
- **Reasoning:** Why this work was necessary
- **Changes Made:**
  - Bullet list of specific changes
  - Include file paths when relevant
  - Group by category (Features, Fixes, Tests, Documentation)
- **Validation:** What tests/checks were run (e.g., "npm test - all 220 tests passing")
- **Files Modified:**
  - List of files changed
  - Use relative paths from project root
- **Branch:** Git branch name
- **Hats:** Agent roles worn (for solo agents handling multiple roles)
```

**Example Entry:**

```markdown
## 2026-01-20T15:30:00Z - Agent: UI/UX Implementer - Claude Sonnet 4.5

- **Summary:** Implemented operator console with mobile-first design and bilingual support (English/Spanish)
- **Reasoning:** Operators needed tablet-optimized interface to execute work orders efficiently on the factory floor. Spanish language support critical for 60% of operator workforce.
- **Changes Made:**
  - Created operator queue view with available/upcoming work sections
  - Implemented active work view with time tracking (clock on/off/pause/resume)
  - Added bilingual translation files (en.json, es.json) using next-intl
  - Built large touch targets and high-contrast UI for tablet use
  - Implemented worker count selector and quantity tracking (conditional)
  - Added photo upload and note-taking functionality
- **Validation:**
  - npm test - all 85 tests passing
  - Manual testing on iPad (portrait/landscape)
  - Spanish translation review with native speaker
- **Files Modified:**
  - New files: `src/app/operator/page.tsx`, `src/app/operator/active-work.tsx`, `src/locales/en.json`, `src/locales/es.json`
  - Updated: `src/app/api/work-orders/[id]/steps/[stepId]/start/route.ts`
  - Tests: `src/app/operator/__tests__/queue.test.tsx`
- **Branch:** `claude/operator-console-implementation-Xk9pL`
- **Hats:** ui-ux, api-contract, qa-gate
```

**Maintenance:**
- Add entry AFTER completing and testing work, BEFORE creating PR
- Always use UTC timestamps in ISO 8601 format
- Be specific about validation performed
- Include branch name for traceability
- Keep entries concise but comprehensive

---

### ActionItems.md

**Purpose:** Track all outstanding tasks, bugs, improvements, and technical debt. Serves as the single source of truth for what needs to be done.

**Location:** `docs/ActionItems.md`

**Structure:**

```markdown
# Action Items

## How to Use This File

1. **Before starting work**: Review to understand priorities and avoid duplicate work
2. **When planning features**: Check if related items exist
3. **During development**: Update status as you progress ([ ] → [WIP] → [x])
4. **After completing work**: Mark done, add completion date, document in CHANGELOG.md
5. **When discovering new work**: Add items with appropriate priority and context
6. **MANDATORY for ALL agents**: Document ANY issues discovered during work (testing, building, analyzing)

**Status Indicators:**
- `[ ]` - Not started
- `[WIP]` - Work in progress (include agent role if applicable)
- `[x]` - Completed (include completion date)
- `[BLOCKED]` - Blocked (include blocker description)
- `[DEFERRED]` - Intentionally postponed (include reason)

---

## 🔴 High Priority (Do First)

### [Category Name]

- [ ] **Task Title**
  - Description of what needs to be done
  - Technical details or context
  - **Estimated effort**: X hours/days
  - **Agent role**: [Primary agent role]
  - **Discovered**: YYYY-MM-DD (if applicable)
  - **Blocks**: [What this blocks, if critical]

---

## 🟡 Medium Priority (Do Soon)

[Same format as High Priority]

---

## 🟢 Low Priority (Nice to Have)

[Same format as High Priority]

---

## 🔵 Backlog (Future Considerations)

- [ ] Brief description without full details
- [ ] Another backlog item

---

## ✅ Completed Items

_(Items move here when marked complete)_

### YYYY-MM-DD

- [x] **Task Title** (Agent: Role Name, Completed: YYYY-MM-DD)
  - Brief description of what was completed
  - Include key results or metrics
  - **Discovered**: YYYY-MM-DD (if applicable)
```

**Priority Guidelines:**

- **🔴 High Priority**: Security issues, blocking bugs, critical features, code quality issues affecting development
- **🟡 Medium Priority**: Important improvements, non-blocking bugs, maintainability enhancements
- **🟢 Low Priority**: Nice-to-have features, minor optimizations, polish items
- **🔵 Backlog**: Ideas for future consideration, not currently scheduled

**Example Entries:**

```markdown
## 🔴 High Priority (Do First)

### Security

- [ ] **Implement rate limiting for auth endpoints**
  - Add rate limiting to `/api/v1/auth/login` (5 attempts per 15 minutes)
  - Protect file upload endpoints (20 requests per minute)
  - Use Upstash Redis integration or `@upstash/ratelimit`
  - Add rate limit headers to responses
  - **Estimated effort**: 1-2 hours
  - **Agent role**: Security & Permissions

### Testing

- [WIP] **Expand API route test coverage** (Agent: QA & Release Gate - Claude Sonnet 4.5)
  - Current: 26 routes tested (47% coverage)
  - Total routes: 55 API routes
  - All tests passing: 220 total tests
  - **Phase 1 Complete**: ✅ All 4 critical routes tested
  - **Phase 2 In Progress**: Work order state transitions
  - **Agent role**: QA & Release Gate
  - **Discovered**: 2026-01-16

## ✅ Completed Items

### 2026-01-20

- [x] **Implement operator console with bilingual support** (Agent: UI/UX Implementer, Completed: 2026-01-20)
  - Created operator queue and active work views
  - Added English/Spanish translations
  - Implemented time tracking with pause/resume
  - Mobile-first design with large touch targets
  - All operator workflow tests passing
```

**Maintenance:**
- Update status in real-time as work progresses
- Mark items complete IMMEDIATELY after finishing
- Move completed items to "Completed Items" section with date
- Add new discoveries AS SOON AS FOUND with proper context
- Review weekly to reprioritize and remove stale items

**CRITICAL**: All agents MUST document discovered issues immediately:
- Test failures (unit, integration, E2E)
- Build errors or warnings
- Security vulnerabilities
- Performance bottlenecks
- Bugs in existing code
- Technical debt
- Missing documentation
- Configuration issues

---

### Agents.md

**Purpose:** Define agent roles, responsibilities, and development workflow. Serves as the rulebook for how the team operates.

**Location:** `AGENTS.md` (project root)

**Structure:**

```markdown
# Agent Playbook

## Executive Summary — Follow These First

1. **Check action items first.** Review `docs/ActionItems.md` before starting work
2. **Respect the architecture.** [List key architectural decisions]
3. **Preserve domain invariants.** [List critical business rules]
4. **Keep data deterministic.** [Explain data management approach]
5. **Validate and test.** [Testing requirements]
6. **Document the change.** [Documentation requirements]
7. **Document ALL discoveries.** [Discovery documentation requirements]

## Purpose & Context

Brief description of the project, domain, and key systems.

## Stack & Runtime Guardrails

- Framework and version
- Key dependencies
- Port numbers and environment
- Mandatory conventions (path aliases, imports, etc.)
- Code organization rules

## Domain Rules & Invariants

List all critical business rules that must never be violated:
- Work order state transitions
- Data integrity requirements
- Audit logging requirements
- Security rules

## Data Management Workflow

Step-by-step process for database changes:
1. Update schema
2. Create migration
3. Update seed data
4. Sync backup data
5. Test migration up/down

## Testing Expectations

- Minimum test coverage requirements
- Types of tests required (unit, integration, E2E)
- When to add tests
- Test documentation requirements
- **Document test failures**: All failures must be added to ActionItems.md

## Documentation & Change Management

- When to update each documentation file
- How to structure changelog entries
- When to create ADRs (Architecture Decision Records)
- **CRITICAL**: Document ALL discoveries in ActionItems.md

## Operational Protocol

- Task specification template
- Handoff procedures
- Solo agent guidelines

## Role Playbook & Ownership Labels

Define each agent role with:

1. **[Role Name]** (`label-tag`)
   - **Responsibilities**: What this agent owns
   - **Outputs**: What artifacts they produce
   - **Done criteria**: How to know work is complete
   - **Discovery requirements**: What issues they should watch for

[Repeat for each role]
```

**Example Agent Roles for Boat Factory MRP:**

```markdown
## Role Playbook & Ownership Labels

**IMPORTANT**: ALL agents, regardless of role, MUST document discovered issues in ActionItems.md.

1. **Product Architect** (`product-architect`)
   - **Responsibilities**: Domain modeling, architectural decisions, technical strategy
   - **Outputs**: Architecture Decision Records (ADRs), technical specifications, data models
   - **Done criteria**: ADR merged, schema approved, no architectural blockers
   - **Discoveries**: Document architectural inconsistencies, scalability concerns, design flaws

2. **DB Migration & Versioning** (`db-migration`)
   - **Responsibilities**: Database schema evolution, migrations, data integrity
   - **Outputs**: Prisma schema updates, migration files, seed scripts
   - **Done criteria**: Migrations succeed up/down, seed data aligned, rollback tested
   - **Discoveries**: Document schema conflicts, migration failures, data integrity issues

3. **API & Contracts** (`api-contract`)
   - **Responsibilities**: REST API endpoints, request/response contracts, validation
   - **Outputs**: API route handlers, Zod schemas, API documentation
   - **Done criteria**: Contract tests pass, Zod validation complete, error handling consistent
   - **Discoveries**: Document API inconsistencies, validation gaps, security issues

4. **UI/UX Implementer** (`ui-ux`)
   - **Responsibilities**: User interface implementation, component development, accessibility
   - **Outputs**: React components, page layouts, styling, responsive design
   - **Done criteria**: UI matches design spec, accessibility standards met, responsive on target devices
   - **Discoveries**: Document UX issues, accessibility violations, rendering bugs

5. **QA & Release Gate** (`qa-gate`)
   - **Responsibilities**: Test coverage, code quality, release readiness
   - **Outputs**: Test suites (unit, integration, E2E), test reports, quality metrics
   - **Done criteria**: Test coverage meets threshold, all tests pass, no critical bugs
   - **Discoveries**: Document test failures, coverage gaps, quality issues, build problems

6. **Security & Permissions** (`security`)
   - **Responsibilities**: Authentication, authorization, security hardening
   - **Outputs**: Auth middleware, RBAC implementation, security documentation
   - **Done criteria**: Security audit complete, no vulnerabilities, RBAC enforced
   - **Discoveries**: Document security vulnerabilities, auth issues, permission gaps

7. **Docs & Runbooks** (`docs`)
   - **Responsibilities**: Documentation, onboarding guides, troubleshooting
   - **Outputs**: README updates, ONBOARDING.md, API docs, runbooks
   - **Done criteria**: Documentation complete, setup tested by new user, examples work
   - **Discoveries**: Document documentation gaps, outdated guides, setup issues
```

**Maintenance:**
- Update when roles change or new roles are added
- Keep architectural decisions current
- Review quarterly to ensure guidelines remain relevant
- Add new domain rules as they're discovered

---

### Workflow Integration

**Daily Development Cycle:**

1. **Morning**: Check `docs/ActionItems.md` for priorities and updates
2. **Start Work**:
   - Claim item by marking `[WIP]` with your agent role
   - Create feature branch following naming convention
3. **During Work**:
   - Update ActionItems.md status as you progress
   - **Document ANY issues discovered** (bugs, test failures, warnings)
   - Write tests as you implement features
4. **Complete Work**:
   - Run full test suite (`npm test`)
   - Update ActionItems.md: mark `[x]` with completion date
   - Move completed item to "Completed Items" section
   - Add entry to `docs/ChangeLog.md` with full details
   - Create PR with reference to completed ActionItems
5. **PR Review**: Reference both ActionItems and ChangeLog in PR description

**Discovery Protocol (CRITICAL):**

When you discover ANY issue during work:
1. **Stop** and document it immediately
2. **Add to ActionItems.md** with:
   - Clear description
   - Reproduction steps (if applicable)
   - Priority level (🔴/🟡/🟢)
   - Estimated effort
   - Agent role best suited to fix it
   - Discovery date
3. **Continue** with your current work
4. **Include** discovered items in your ChangeLog entry

**Example Discovery:**

```markdown
## During Implementation

While implementing the operator console, discovered 3 issues:

1. **API Rate Limiting Missing** → Added to ActionItems.md (🔴 High Priority)
   - Auth endpoints have no rate limiting
   - Security vulnerability allowing brute force
   - Added to Security section

2. **Test Coverage Gap** → Added to ActionItems.md (🟡 Medium Priority)
   - No E2E tests for operator time tracking
   - Added to Testing section

3. **Performance Issue** → Added to ActionItems.md (🟡 Medium Priority)
   - Operator queue loads slowly with >50 work orders
   - Needs pagination or virtual scrolling
   - Added to Performance section
```

---

### Templates

#### New ChangeLog Entry Template

```markdown
## YYYY-MM-DDTHH:MM:SSZ - Agent: [Role] - [Name]

- **Summary:** [One sentence description]
- **Reasoning:** [Why was this work necessary?]
- **Changes Made:**
  - [Specific change 1]
  - [Specific change 2]
  - [Specific change 3]
- **Validation:** [What tests/checks were run?]
- **Files Modified:**
  - [File path 1]
  - [File path 2]
- **Branch:** `[branch-name]`
- **Hats:** [Roles worn if solo agent]
```

#### New ActionItem Template

```markdown
- [ ] **[Task Title]**
  - [Description of what needs to be done]
  - [Technical context or requirements]
  - **Estimated effort**: [X hours/days]
  - **Agent role**: [Primary agent role]
  - **Discovered**: YYYY-MM-DD (if applicable)
  - **Blocks**: [What this blocks, if critical]
```

---

## Conclusion

This specification defines a streamlined, user-focused MRP system built from scratch with lessons learned from the previous implementation. Key improvements:

- **Simplified architecture:** Removed unnecessary abstractions and complexity
- **UX-first design:** Each role gets exactly what they need
- **Real-time updates:** WebSockets instead of polling
- **Maintainable code:** Component size limits, strict typing, comprehensive tests
- **Complete audit trail:** Every change logged with before/after snapshots
- **Bilingual support:** English and Spanish for floor operators
- **Flexible routing:** Supports dependencies, parallel steps, and easy modification
- **Mobile-optimized:** Tablet-first design for operators
- **Integration-ready:** APIs for PLM intake and data export

By focusing on the three core workflows (intake, planning, execution) and avoiding over-engineering, this redesign will deliver a robust, scalable system that serves the factory's needs for years to come.

**Ready for implementation.**

---

**Prepared by:** Claude Code
**Reviewed by:** Factory Stakeholders
**Approved by:** Micah Mills
**Implementation Start Date:** 01/20/2026
