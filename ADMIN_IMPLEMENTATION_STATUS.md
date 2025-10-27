# Admin Workstation Configuration Feature - Implementation Status

## Overview
This document tracks the implementation progress of the admin panel feature for configuring workstation data (stations, users, equipment, pay rates, etc.).

---

## ✅ Completed Tasks

### 1. Database Schema Updates
- **File**: [prisma/schema.prisma](prisma/schema.prisma)
- **Changes**:
  - Extended `User` model with `hourlyRate` (Decimal) and `shiftSchedule` (Json) fields
  - Extended `Station` model with: `description`, `defaultPayRate`, `capacity`, `targetCycleTimeSeconds`
  - Created `StationMember` junction table for user-station assignments
  - Created `Equipment` model for equipment tracking
  - Created `StationEquipment` many-to-many table
  - Created `PayRateHistory` table for tracking pay rate changes
  - Created `StationMetrics` table for caching weighted average rates (updated monthly)
- **Status**: ✅ Schema complete, ready for migration

### 2. Seed Data Updates
- **Files**:
  - [src/db/backup-data.ts](src/db/backup-data.ts)
  - [src/db/seed.ts](src/db/seed.ts)
- **Changes**:
  - Added `hourlyRate` and `shiftSchedule` to existing users
  - Added 2 new operator users (Joe Smith, Dave Jones)
  - Updated all stations with new fields (description, defaultPayRate, capacity, targetCycleTimeSeconds)
  - Added 6 equipment items
  - Added 6 station-equipment assignments
  - Added 5 station-member assignments
  - Added 5 pay rate history records
  - Updated seed script to populate all new tables
- **Status**: ✅ Complete

### 3. Admin Panel Infrastructure
- **Files**:
  - [src/app/admin/layout.tsx](src/app/admin/layout.tsx) - Admin layout with sidebar navigation
  - [src/app/admin/page.tsx](src/app/admin/page.tsx) - Admin dashboard landing page
  - [src/middleware.ts](src/middleware.ts) - Updated to protect `/admin/*` routes
  - [src/app/supervisor/page.tsx](src/app/supervisor/page.tsx) - Added "Admin Panel" button for ADMIN role
- **Features**:
  - Sidebar navigation with links to: Departments, Work Centers, Stations, Users, Equipment
  - Link back to Supervisor Dashboard
  - Role-based access control (ADMIN only)
  - Logout functionality
- **Status**: ✅ Complete

### 4. Shared Admin UI Components
- **Files**:
  - [src/components/admin/DataTable.tsx](src/components/admin/DataTable.tsx) - Reusable data table with actions
  - [src/components/admin/ConfirmDialog.tsx](src/components/admin/ConfirmDialog.tsx) - Confirmation modal
- **Features**:
  - DataTable supports: Edit, Delete, Create, Import, Export actions
  - ConfirmDialog supports danger/warning/info variants
- **Status**: ✅ Complete

---

## 🚧 Remaining Tasks

### 5. Database Migration
- **Action Required**: Run `npx prisma migrate dev --name add_admin_workstation_features`
- **Blocker**: Needs `DATABASE_URL` environment variable configured
- **Status**: ⏳ Pending

### 6. Stations CRUD (Priority 1)
- **Pages to Create**:
  - `src/app/admin/stations/page.tsx` - List all stations with DataTable
  - `src/app/admin/stations/[id]/page.tsx` - Station detail page with tabs:
    - Details (name, code, description, work center, pay rate, capacity, cycle time)
    - Members (assign/unassign users, view individual pay rates)
    - Equipment (assign/unassign equipment)
    - Metrics (weighted average rate, total hours, labor cost)
- **APIs to Create**:
  - `src/app/api/admin/stations/route.ts` - GET (list), POST (create)
  - `src/app/api/admin/stations/[id]/route.ts` - GET (detail), PATCH (update), DELETE (soft delete)
  - `src/app/api/admin/stations/[id]/members/route.ts` - GET, POST, DELETE station members
  - `src/app/api/admin/stations/[id]/equipment/route.ts` - GET, POST, DELETE station equipment
  - `src/app/api/admin/stations/[id]/metrics/route.ts` - GET station metrics
- **Status**: ❌ Not started

### 7. Users CRUD (Priority 2)
- **Pages to Create**:
  - `src/app/admin/users/page.tsx` - List all users
  - User create/edit modal (email, role, department, hourly rate, shift schedule)
- **APIs to Create**:
  - `src/app/api/admin/users/route.ts` - GET, POST
  - `src/app/api/admin/users/[id]/route.ts` - GET, PATCH, DELETE
  - `src/app/api/admin/users/[id]/pay-rate/route.ts` - PATCH (with history tracking)
- **Status**: ❌ Not started

### 8. Equipment CRUD (Priority 3)
- **Pages to Create**:
  - `src/app/admin/equipment/page.tsx` - List all equipment
  - Equipment create/edit modal (name, description)
- **APIs to Create**:
  - `src/app/api/admin/equipment/route.ts` - GET, POST
  - `src/app/api/admin/equipment/[id]/route.ts` - GET, PATCH, DELETE
- **Status**: ❌ Not started

### 9. Departments CRUD (Priority 4)
- **Pages to Create**:
  - `src/app/admin/departments/page.tsx` - List all departments
  - Department create/edit modal (name)
- **APIs to Create**:
  - `src/app/api/admin/departments/route.ts` - GET, POST
  - `src/app/api/admin/departments/[id]/route.ts` - GET, PATCH, DELETE
- **Status**: ❌ Not started

### 10. Work Centers CRUD (Priority 5)
- **Pages to Create**:
  - `src/app/admin/work-centers/page.tsx` - List all work centers
  - Work center create/edit modal (name, department)
- **APIs to Create**:
  - `src/app/api/admin/work-centers/route.ts` - GET, POST
  - `src/app/api/admin/work-centers/[id]/route.ts` - GET, PATCH, DELETE
- **Status**: ❌ Not started

### 11. Pay Rate History System
- **Features**:
  - Automatic history creation when user hourly rate changes
  - Display pay rate history on user detail page
  - Track who made the change and why (reason field)
- **APIs to Create**:
  - `src/app/api/admin/users/[id]/pay-rate-history/route.ts` - GET pay rate history
- **Status**: ❌ Not started

### 12. Station Metrics Calculation
- **Features**:
  - Calculate weighted average pay rate based on last 30 days of WOStageLog data
  - Formula: `SUM(userRate * hoursWorked) / SUM(hoursWorked)`
  - Cache results in StationMetrics table
  - Manual recalculation trigger
  - Automatic monthly update (cron job or manual)
- **Utilities to Create**:
  - `src/lib/metrics/calculateStationMetrics.ts` - Core calculation logic
  - `src/app/api/admin/stations/[id]/recalculate-metrics/route.ts` - Manual trigger
- **Status**: ❌ Not started

### 13. Work Order Cost Estimation API
- **Features**:
  - Estimate labor cost for work orders using:
    - Station weighted average rates (or defaultPayRate if no members)
    - Standard stage time from routing
  - Formula: `SUM(stationRate * standardHours)` for all stages
- **APIs to Create**:
  - `src/app/api/work-orders/[id]/cost-estimate/route.ts` - GET cost estimate
- **Status**: ❌ Not started

### 14. CSV Import/Export System
- **Features**:
  - Export: Generate CSV files for each entity type
  - Import: Parse CSV, validate, preview changes, bulk create/update
  - Error handling with detailed validation messages
  - Rollback on failure
- **Utilities to Create**:
  - `src/lib/csv/exportDepartments.ts`
  - `src/lib/csv/exportWorkCenters.ts`
  - `src/lib/csv/exportStations.ts`
  - `src/lib/csv/exportUsers.ts`
  - `src/lib/csv/exportEquipment.ts`
  - `src/lib/csv/exportStationMembers.ts`
  - Corresponding import utilities for each
- **APIs to Create**:
  - `src/app/api/admin/departments/export/route.ts` - GET CSV
  - `src/app/api/admin/departments/import/route.ts` - POST CSV
  - (Repeat for each entity type)
- **Status**: ❌ Not started

### 15. Shift Scheduling UI
- **Features**:
  - Visual schedule builder for user shifts
  - Store as JSON in User.shiftSchedule field
  - Format: `{ "days": ["Monday", ...], "startTime": "08:00", "endTime": "17:00" }`
- **Components to Create**:
  - `src/components/admin/ShiftScheduler.tsx` - Visual shift editor
- **Status**: ❌ Not started

### 16. Testing
- **API Tests**:
  - Test all CRUD operations
  - Test authorization (ADMIN only)
  - Test validation (Zod schemas)
  - Test soft deletes
  - Test pay rate history tracking
  - Test metrics calculation
- **Integration Tests**:
  - Test CSV import/export
  - Test station member assignments
  - Test equipment assignments
- **Status**: ❌ Not started

---

## Implementation Notes

### Database Design Decisions
1. **Soft Deletes**: All entities use `isActive` flag instead of hard deletes
2. **Pay Rates**: Per-user (User.hourlyRate), rolls up to station weighted average
3. **Station Assignments**: Many-to-many (StationMember table), all equal (no primary station)
4. **Metrics Caching**: StationMetrics updated monthly, calculated from last 30 days of work
5. **Pay Rate History**: Audit log pattern with oldRate, newRate, changedBy, reason

### Authorization Pattern
- All `/admin/*` routes protected by middleware (checks for token)
- All admin API routes check `user.role === 'ADMIN'` via `getUserFromRequest()`
- Admins can access supervisor dashboard via "Supervisor Dashboard" link in admin panel

### UI Patterns
- DataTable component for all list views
- Modals/drawers for create/edit forms
- ConfirmDialog for delete confirmations
- Tabs for entity detail pages (e.g., station details, members, equipment, metrics)

### Migration Command
```bash
npx prisma migrate dev --name add_admin_workstation_features
npx prisma generate
npm run seed
```

---

## Next Steps

1. **Immediate**: Run database migration once DATABASE_URL is configured
2. **High Priority**: Implement Stations CRUD (most complex, core feature)
3. **Medium Priority**: Implement Users, Equipment CRUD
4. **Lower Priority**: Implement Departments, Work Centers CRUD (simpler)
5. **Advanced Features**: Pay rate history, metrics calculation, CSV import/export
6. **Final**: Testing and documentation

---

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx ✅
│   │   ├── page.tsx ✅
│   │   ├── departments/
│   │   │   ├── page.tsx ❌
│   │   ├── work-centers/
│   │   │   ├── page.tsx ❌
│   │   ├── stations/
│   │   │   ├── page.tsx ❌
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx ❌
│   │   ├── users/
│   │   │   ├── page.tsx ❌
│   │   ├── equipment/
│   │   │   ├── page.tsx ❌
│   ├── api/
│   │   ├── admin/
│   │   │   ├── departments/ ❌
│   │   │   ├── work-centers/ ❌
│   │   │   ├── stations/ ❌
│   │   │   ├── users/ ❌
│   │   │   ├── equipment/ ❌
├── components/
│   ├── admin/
│   │   ├── DataTable.tsx ✅
│   │   ├── ConfirmDialog.tsx ✅
│   │   ├── ShiftScheduler.tsx ❌
├── lib/
│   ├── csv/ ❌
│   ├── metrics/ ❌
├── db/
│   ├── backup-data.ts ✅
│   ├── seed.ts ✅
├── prisma/
│   ├── schema.prisma ✅
```

---

## Estimated Remaining Work

- **Stations CRUD**: ~8-10 hours
- **Users CRUD**: ~4-6 hours
- **Equipment CRUD**: ~2-3 hours
- **Departments CRUD**: ~2 hours
- **Work Centers CRUD**: ~2-3 hours
- **Pay Rate History**: ~2 hours
- **Station Metrics**: ~4 hours
- **CSV Import/Export**: ~6-8 hours
- **Shift Scheduling UI**: ~3-4 hours
- **Testing**: ~6-8 hours

**Total**: ~40-50 hours of development work remaining
