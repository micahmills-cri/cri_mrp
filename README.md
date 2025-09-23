# Boat Factory Operations MVP

Next.js 14 Operations MVP for high-mix, low-volume boat factory.

## Features

### Operator Console (Interactive)
- **Work Order Queue**: Real-time view of READY and IN_PROGRESS work orders
- **Search**: Find work orders by WO number or Hull ID
- **Stage Actions**: Start, Pause, and Complete operations with quantity tracking
- **Station Selection**: Persisted station assignment
- **Department Scoped**: Operators only see/act on their department's work
- **Auto-refresh**: Queue updates every 5 seconds

### Supervisor Dashboard (Interactive)
- **Board Tab**: 
  - Table/Kanban view toggle for work orders
  - Real-time KPIs (Released, In Progress, Completed, On Hold)
  - Hold/Unhold work orders with reason tracking
  - Detail drawer with full stage timeline
- **Plan Tab**:
  - Create new work orders with routing configuration
  - Clone and edit routing versions
  - Enable/disable stages, reorder, adjust standard times
  - Release work orders to production
- **Department Filter**: Admins can view all departments

### Core Systems
- **Authentication**: JWT httpOnly cookies with role-based redirects
- **Stage Gating**: Only current enabled stage is actionable
- **Audit Logging**: Complete traceability of all actions
- **Database**: PostgreSQL with Prisma ORM
- **Department Scoping**: All operations filtered by user's department

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

3. **Run database migration**:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Seed the database**:
   ```bash
   npm run seed
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## Test Accounts

- **Admin**: admin@cri.local / Admin123!
- **Supervisor**: supervisor@cri.local / Supervisor123!
- **Operator**: operator@cri.local / Operator123!

## Architecture

- **Frontend**: Next.js 14 App Router with TypeScript
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma
- **Authentication**: JWT with httpOnly cookies
- **Authorization**: Role-based access control (RBAC)

## Database Schema

- **Users**: Admin, Supervisor, Operator roles
- **Departments**: One per manufacturing stage
- **Work Centers & Stations**: Manufacturing resources
- **Routing Versions**: Product routing definitions
- **Work Orders**: Production orders with stage tracking
- **Audit Logs**: Complete change history

## Usage Notes

### For Operators
1. Login with your operator credentials
2. Your department's work queue loads automatically
3. Search for specific work orders using WO number or Hull ID
4. Click "Open" on any queue item or search result to view the action panel
5. Select your station (persisted between sessions)
6. Enter quantities and optional notes
7. Use Start/Pause/Complete buttons to manage work progress
8. Queue refreshes automatically every 5 seconds

### For Supervisors
1. Login with supervisor credentials
2. **Board Tab** - Monitor work in progress:
   - Toggle between Table and Kanban views
   - Put work orders on hold (with reason) or release from hold
   - Click "Open" to see detailed stage timeline and notes
3. **Plan Tab** - Create and manage work orders:
   - Click "Create Work Order" to define new production
   - Configure routing by enabling/disabling stages
   - Reorder stages and adjust standard times
   - Release planned work orders to start production

### For Administrators
- All supervisor features plus:
- Department filter to view/manage all departments
- Access to all work orders across the factory