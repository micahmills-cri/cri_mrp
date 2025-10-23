# Boat Factory Operations MVP

## Overview

This is a Next.js 14 Operations MVP designed for a high-mix, low-volume boat factory. The system manages work orders through multiple manufacturing stages, providing role-based interfaces for operators and supervisors. It features a complete manufacturing workflow with stage progression, work-in-progress tracking, comprehensive audit logging, file attachments, notes management, and advanced UI features for real-time collaboration.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates - All Four Phases Completed

### Comprehensive JWT Payload Bug Fix (October 23, 2025)
- **Root Cause**: Systematic bug across multiple API endpoints using `user.id` instead of `user.userId` from JWT payload
- **Files Fixed** (8 instances across 5 files):
  - `src/app/api/work-orders/[id]/route.ts` - Work order update audit logs (line 430)
  - `src/app/api/work-orders/[id]/versions/route.ts` - Version creation audit logs (line 135)
  - `src/app/api/work-orders/[id]/restore/route.ts` - Restore operation audit logs (line 96)
  - `src/app/api/attachments/[id]/route.ts` - File access permissions (line 70) and deletion permissions (line 162)
  - `src/app/api/notes/[id]/route.ts` - Note edit permissions (line 69), delete permissions (lines 171, 185)
- **JWT Structure**: The JWT payload created at login uses `userId`, `role`, and `departmentId` - NOT `id`
- **Error Symptoms**: "Internal server error" when editing work orders, potential permission bypasses for file/note operations
- **Database Impact**: Foreign key constraint violations on audit log creation, incorrect permission checks
- **Testing Recommended**: Verify work order edits, file downloads/deletes, and note edits/deletes all work correctly

### File Icon Standardization (October 16, 2025)
- **Heroicons Integration**: Replaced all emoji file type icons in FileListDisplay component with standard Heroicons for consistency
- **Icon Mapping**: Complete file type icon system using @heroicons/react/24/solid:
  - Images: PhotoIcon
  - Videos: VideoCameraIcon
  - Audio: MusicalNoteIcon
  - PDFs: DocumentTextIcon
  - Spreadsheets: TableCellsIcon (Excel/CSV files)
  - Presentations: PresentationChartBarIcon
  - Archives: ArchiveBoxIcon (ZIP/RAR files)
  - Documents: DocumentIcon (Word/generic files)
  - Text files: DocumentTextIcon
- **UI Consistency**: All file icons now match the standardized Heroicons design system used throughout the application
- **Accessibility**: Improved accessibility with semantic icon components instead of emoji characters

### Product Trim Data Restoration (October 7, 2025)
- **Root Cause Fixed**: Product trim data was being lost during reseeds because `backup-data.ts` had an empty `productTrims: []` array
- **Trim Levels Added**: Added 7 realistic trim configurations to `backup-data.ts`:
  - **LX24**: Base, Sport, Luxury (3 trims)
  - **LX26**: Base, Sport, Luxury, Premium (4 trims)
- **Database Reseeded**: Successfully populated database with all trim data, enabling work order creation
- **Prevention Strategy**: All seed data is now stored in `backup-data.ts` - the seed script deletes and repopulates from this file, so any reference data must be included in the backup file to persist across reseeds
- **Important Note**: When adding new models/trims via the UI in the future, they must be manually added to `backup-data.ts` to survive database reseeds

### Latest UI Simplification (September 30, 2025) - Plan Tab Removal
- **Plan Tab Removed**: Eliminated redundant Plan tab from Supervisor Dashboard - all planning functionality now accessible via "Create Work Order" buttons in Board and Table views
- **Simplified Navigation**: Streamlined dashboard with single Board view containing both Kanban and Table modes, reducing cognitive load
- **Preserved Functionality**: PLANNED work orders remain fully accessible in Board view columns and can be edited via detail drawer - no data access lost
- **State Cleanup**: Simplified activeTab state from 'board' | 'plan' to just 'board', removing unnecessary conditional rendering
- **UI Consistency**: Both Board (Kanban) and Table views now feature matching header layouts with "Create Work Order" buttons

### File Upload Authentication Issue Fix (September 30, 2025)
- **JWT Payload Fix**: Fixed critical file upload bug where `user.id` was undefined - changed to `user.userId` to match JWT token structure
- **Upload Flow Verified**: Complete end-to-end testing confirms file uploads now work correctly (upload URL → storage → database record creation)
- **Simplified ACL Handling**: Removed complex ACL metadata system that was causing upload failures, using streamlined path normalization instead
- **Object Storage Configuration**: Fixed file upload functionality by migrating from hardcoded bucket ID to environment variable (STORAGE_BUCKET_ID)
- **Build Error Resolution**: Resolved Next.js build error with @google-cloud/storage by adding proper webpack externals configuration

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

### Phase 4 Comprehensive Routing Configuration System (Completed)
- **Database Integration**: Real work centers loaded from database via /api/work-centers endpoint replacing mock data
- **Routing Dropdown System**: Complete dropdown with three options: Default Routing, Create New Routing, and saved routing versions
- **11-Department Default Routing**: Full manufacturing workflow covering Kitting → Lamination → Hull Rigging → Deck Rigging → Capping → Engine Hang → Final Rigging → Water Test → QA → Cleaning → Shipping
- **Version Control**: Save New Routing functionality with proper versioning system for routing configurations
- **Work Order Integration**: Fixed Create Work Order button validation and enabled proper routing-based work order creation
- **Critical Bug Fixes**: Resolved JSON.parse crash when users enter free-form text in features field
- **Validation System**: Added comprehensive validation ensuring all 11 departments have active work centers before creating default routing

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
- **STORAGE_BUCKET_ID**: Replit object storage bucket ID for file attachments
- **NODE_ENV**: Environment detection for production optimizations

The system runs on Node.js 20+ and uses port 5000 for development. Database migrations and seeding are handled through Prisma CLI commands.