# Boat Factory Operations MVP

## Overview

This is a Next.js 14 Operations MVP designed for a high-mix, low-volume boat factory. The system manages work orders through multiple manufacturing stages, providing role-based interfaces for operators and supervisors. It features a complete manufacturing workflow with stage progression, work-in-progress tracking, comprehensive audit logging, file attachments, notes management, and advanced UI features for real-time collaboration. The project aims to provide a robust and scalable solution for managing boat manufacturing operations, from initial planning to final shipping, with a focus on efficiency, transparency, and real-time data access.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS with shared theme tokens
- **State Management**: React hooks
- **Routing**: File-based routing with protected route middleware
- **Authentication Flow**: JWT-based authentication with HTTP-only cookies
- **UI/UX Decisions**: Standardized Heroicons, streamlined navigation, count badges for quick visibility, enhanced table views, responsive design.

### Backend Architecture
- **API Layer**: Next.js API Routes for authentication and work order operations
- **Database ORM**: Prisma with PostgreSQL
- **Authentication**: JWT tokens stored in HTTP-only cookies with bcrypt password hashing
- **Authorization**: Role-based access control (RBAC) with ADMIN, SUPERVISOR, OPERATOR roles
- **Audit System**: Prisma middleware for comprehensive change tracking
- **Manufacturing Workflow**: Multi-stage routing system with version control, supporting an 11-department default routing.
- **Organizational Structure**: Department → WorkCenter → Station hierarchy.
- **Work Orders**: Complete lifecycle management from PLANNED to CLOSED status, including cost estimation based on routing stages and station rates.
- **Admin Panel**: Comprehensive admin panel for configuring workstation data with full CRUD operations, metrics calculation, and cost estimation. Includes management for departments, work centers, stations, users, and equipment.
- **Advanced Features**: Station metrics calculation (weighted average pay rate), work order cost estimation, CSV export system, pay rate history tracking, member/equipment assignment, soft delete pattern for data preservation.

### Security Implementation
- **Authentication**: JWT with secure cookie storage
- **Route Protection**: Middleware-based route guarding
- **Role-Based Access**: Department-scoped data access for operators, role-based API access.
- **Password Security**: bcrypt hashing with salt rounds.

## External Dependencies

### Core Framework Dependencies
- **Next.js 14**: Full-stack React framework
- **React 18.3**: Frontend UI library
- **TypeScript 5.9**: Type safety

### Database and ORM
- **Prisma 6.16**: Type-safe ORM
- **PostgreSQL**: Primary database

### Authentication and Security
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and verification
- **zod**: Runtime type validation for API inputs

### Utilities
- **date-fns**: Date manipulation and formatting
- **tsx**: TypeScript execution for seed scripts
- **@heroicons/react/24/solid**: Standardized UI icons.

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **JWT_SECRET**: Secret key for JWT signing
- **STORAGE_BUCKET_ID**: Replit object storage bucket ID for file attachments
- **NODE_ENV**: Environment detection