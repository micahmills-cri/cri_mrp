# Boat Factory Operations MVP

## Overview

This is a Next.js 14 Operations MVP designed for a high-mix, low-volume boat factory. The system manages work orders through multiple manufacturing stages, providing role-based interfaces for operators and supervisors. It features a complete manufacturing workflow with stage progression, work-in-progress tracking, comprehensive audit logging, file attachments, notes management, and advanced UI features for real-time collaboration.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates - All Three Phases Completed

### Phase 1 Foundation Components (Completed)
- **NotesTimeline**: Complete notes management system with timeline visualization, department scoping, and edit/delete capabilities
- **FileUpload**: Drag-and-drop file upload system with progress tracking and type validation  
- **ModelTrimSelector**: Model/Trim dropdown selection with automatic SKU generation in YEAR-MODEL-TRIM format
- **API Integration**: All components fully integrated with backend APIs for notes, files, and product models

### Phase 2 Advanced Features (Completed)
- **Real-time Updates**: Auto-refresh functionality for notes timeline with 10-second polling interval
- **FileListDisplay**: Comprehensive file list component with search, filter, and bulk operations
- **FileManager**: Integrated file management component combining upload and display capabilities
- **Enhanced Filtering**: Search functionality for notes with department scope filtering  
- **Bulk Operations**: Select all, bulk delete, and file type filtering for attachments
- **Supervisor Dashboard**: Enhanced tabbed interface integrating all new components seamlessly

### Phase 3 UI/UX Dashboard Enhancements (Completed)
- **Count Badges**: Work order cards now display attachment count badges (📎 3) and notes count badges (💬 5) for instant visibility
- **Enhanced Table View**: Added dedicated Files and Notes columns with styled count badges to table view for better data visibility
- **Improved Product Display**: Replaced raw productSku with readable model-trim format (e.g., "LX24-Base") across both Kanban and table views
- **API Count Integration**: Backend API enhanced with Prisma _count functionality using efficient LEFT JOIN aggregations for real-time count data
- **Performance Optimized**: Count queries optimized using Prisma's built-in aggregation system with proper SQL generation

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: CSS with utility classes and custom CSS modules
- **State Management**: React hooks (useState, useEffect) for client-side state
- **Routing**: File-based routing with protected route middleware
- **Authentication Flow**: JWT-based authentication with HTTP-only cookies

### Backend Architecture
- **API Layer**: Next.js API Routes handling authentication and work order operations
- **Database ORM**: Prisma with PostgreSQL for type-safe database operations
- **Authentication**: JWT tokens stored in HTTP-only cookies with bcrypt password hashing
- **Authorization**: Role-based access control (RBAC) with three roles: ADMIN, SUPERVISOR, OPERATOR
- **Audit System**: Prisma middleware for comprehensive change tracking across critical models

### Data Model Design
- **Manufacturing Workflow**: Multi-stage routing system with version control
- **Work Orders**: Complete lifecycle management from PLANNED to CLOSED status
- **Organizational Structure**: Department → WorkCenter → Station hierarchy
- **Stage Progression**: Sequential processing with current stage tracking
- **Event Logging**: Detailed work order event history (START, PAUSE, COMPLETE)

### Security Implementation
- **Authentication**: JWT with secure cookie storage
- **Route Protection**: Middleware-based route guarding
- **Role-Based Access**: Department-scoped data access for operators
- **Password Security**: bcrypt hashing with salt rounds

## External Dependencies

### Core Framework Dependencies
- **Next.js 14**: Full-stack React framework with App Router
- **React 19**: Frontend UI library with latest features
- **TypeScript 5.9**: Type safety and development experience

### Database and ORM
- **Prisma 6.16**: Type-safe ORM with migration system
- **PostgreSQL**: Primary database (configured via DATABASE_URL)

### Authentication and Security
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and verification
- **zod**: Runtime type validation for API inputs

### Utilities
- **date-fns**: Date manipulation and formatting
- **tsx**: TypeScript execution for seed scripts

### Development Tools
- **TypeScript types**: @types packages for Node.js, React, bcryptjs, and jsonwebtoken

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **JWT_SECRET**: Secret key for JWT signing (defaults to 'your-secret-key')
- **NODE_ENV**: Environment detection for production optimizations

The system runs on Node.js 20+ and uses port 5000 for development. Database migrations and seeding are handled through Prisma CLI commands.