# Boat Factory Operations MVP

Next.js 14 Operations MVP for high-mix, low-volume boat factory.

## Features

- **Authentication**: Email/password login with JWT cookies
- **Operator Console**: Work order lookup, stage management (Start/Pause/Complete)
- **Supervisor Dashboard**: Department-scoped WIP tracking and metrics
- **Database**: PostgreSQL with Prisma ORM
- **Audit Logging**: Comprehensive change tracking

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