# Boat Factory Operations MVP

## Overview

This is a Next.js 14 Operations MVP designed for a high-mix, low-volume boat factory. The system manages work orders through multiple manufacturing stages, providing role-based interfaces for operators, supervisors, and administrators. It features a complete manufacturing workflow with stage progression, work-in-progress tracking, comprehensive audit logging, file attachments, notes management, and advanced UI features for real-time collaboration. The admin panel provides comprehensive workstation configuration management. The project aims to provide a robust and scalable solution for managing boat manufacturing operations, from initial planning to final shipping, with a focus on efficiency, transparency, and real-time data access.

## User Preferences

- Preferred communication style: Simple, everyday language.
- Multi-agent collaboration: Codex, ClaudeCode, and Replit agents work together following `AGENTS.md` playbook.
- Documentation-first approach: All discoveries, changes, and decisions documented in ActionItems.md and CHANGELOG.md.

## Recent Changes

| Date | Summary |
|------|---------|
| 2026-01-13 | PLM Integration Project planning initiated with phased migration plan in `docs/PLMProject.md` |
| 2026-01-13 | API route test coverage expanded to 220 tests (47% coverage, up from 24 initial tests) |
| 2026-01-08 | Structured logging system implemented replacing 188 console statements across 62 files |
| 2026-01-08 | Operator queue table enhanced with sort/filter/search capabilities |
| 2026-01-08 | File upload capability added to operator attachments section |

## Project Architecture

### Frontend Architecture

- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS with shared theme tokens
- **State Management**: React hooks
- **Routing**: File-based routing with protected route middleware
- **Authentication Flow**: JWT-based authentication with HTTP-only cookies
- **UI/UX Decisions**: Standardized Heroicons, streamlined navigation, count badges for quick visibility, enhanced table views, responsive design.
- **Icons**: @heroicons/react/24/solid for consistent iconography

### Backend Architecture

- **API Layer**: Next.js API Routes for authentication and work order operations
- **Database ORM**: Prisma with PostgreSQL
- **Authentication**: JWT tokens stored in HTTP-only cookies with bcrypt password hashing
- **Authorization**: Role-based access control (RBAC) with ADMIN, SUPERVISOR, OPERATOR roles
- **Audit System**: Prisma middleware for comprehensive change tracking
- **Logging**: Structured logger in `src/lib/logger.ts` with configurable levels (DEBUG, INFO, WARN, ERROR, NONE)
- **Manufacturing Workflow**: Multi-stage routing system with version control, supporting an 11-department default routing.
- **Organizational Structure**: Department → WorkCenter → Station hierarchy.
- **Work Orders**: Complete lifecycle management from PLANNED to CLOSED status, including cost estimation based on routing stages and station rates.
- **Admin Panel**: Comprehensive admin panel for configuring workstation data with full CRUD operations, metrics calculation, and cost estimation. Includes management for departments, work centers, stations, users, and equipment.
- **Advanced Features**: Station metrics calculation (weighted average pay rate), work order cost estimation, CSV export system, pay rate history tracking, member/equipment assignment, soft delete pattern for data preservation.

### File Storage

- **Provider**: Replit Object Storage
- **Configuration**: Uses `STORAGE_BUCKET_ID` environment variable
- **Implementation**: `src/server/storage/objectStorage.ts`
- **Features**: Upload, download, list, search, and bulk operations with JWT-based access control

### Security Implementation

- **Authentication**: JWT with secure cookie storage
- **Route Protection**: Middleware-based route guarding
- **Role-Based Access**: Department-scoped data access for operators, role-based API access.
- **Password Security**: bcrypt hashing with salt rounds.

## Testing

- **Framework**: Vitest with jsdom environment
- **Test Location**: `src/**/__tests__/`
- **Current Coverage**: 220 tests across 20 test files
- **API Route Coverage**: 26 of 55 routes tested (47%)
- **Commands**: `npm run test` (run all), `npm run test:watch` (watch mode)

## External Dependencies

### Core Framework Dependencies

- **Next.js 14**: Full-stack React framework
- **React 18.3**: Frontend UI library
- **TypeScript 5.9**: Type safety

### Database and ORM

- **Prisma 6.16**: Type-safe ORM
- **PostgreSQL**: Primary database (Neon-backed on Replit)

### Authentication and Security

- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and verification
- **zod**: Runtime type validation for API inputs

### UI Components

- **@heroicons/react**: Icon library (24/solid variant)
- **clsx + tailwind-merge**: Conditional class utilities
- **date-fns**: Date manipulation and formatting

### Development Tools

- **tsx**: TypeScript execution for seed scripts
- **Prettier 3**: Code formatting
- **ESLint**: Linting with Next.js config

### Environment Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `STORAGE_BUCKET_ID` | Replit object storage bucket ID for file attachments |
| `NODE_ENV` | Environment detection (development/production) |

## Key Files & Directories

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router pages and API routes |
| `src/components/` | Shared React components |
| `src/lib/` | Utilities, auth helpers, logger |
| `src/server/` | Server-only code (Prisma, storage, business logic) |
| `prisma/schema.prisma` | Database schema |
| `src/db/seed.ts` | Database seeding script |
| `src/db/backup-data.ts` | Canonical reference data for seeds |
| `AGENTS.md` | Multi-agent collaboration playbook |
| `docs/ActionItems.md` | Task tracking and technical debt |
| `docs/CHANGELOG.md` | Change history with timestamps |
| `docs/PLMProject.md` | PLM integration planning |

## Development Workflow

1. Review `docs/ActionItems.md` before starting work
2. Follow patterns in `AGENTS.md` for code standards
3. Run `npm run test` before committing
4. Update `docs/ActionItems.md` with any discoveries
5. Add changelog entry to `docs/CHANGELOG.md`
6. Keep this file (`replit.md`) updated with architectural changes
