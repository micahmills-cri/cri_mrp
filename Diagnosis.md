# JWT User Field Errors - Multiple Endpoints

## Problem
Multiple endpoints fail with 500 Internal Server Error when trying to use `user.email` or inconsistent user ID fields. The system encounters Prisma validation errors like:

```
Argument `createdBy` is missing.
```

## Root Cause
The JWT payload returned by `getUserFromRequest()` only contains:
- `userId` (string) - ✅ Available
- `role` (string) - ✅ Available  
- `departmentId` (string | null) - ✅ Available

The `email` field is **NOT included in the JWT token**. Several endpoints incorrectly try to access `user.email`, `user.id`, or use fallback logic like `user.email || user.userId`.

## Affected Endpoints and Fixes

### 1. Work Order Creation
**File**: `src/app/api/work-orders/route.ts`  
**Line**: 139 (originally)

**Problem**:
```typescript
createdBy: user.email  // ❌ undefined
```

**Solution**:
```typescript
createdBy: user.userId  // ✅ Fixed
```

### 2. Cancel Work Order
**File**: `src/app/api/supervisor/cancel-wo/route.ts`  
**Lines**: 98, 113 (originally)

**Problems**:
```typescript
createdBy: user.email || user.userId  // ❌ Line 98
actorId: user.userId || user.id       // ❌ Line 113 (inconsistent)
```

**Solutions**:
```typescript
createdBy: user.userId  // ✅ Fixed
actorId: user.userId    // ✅ Fixed
```

### 3. Uncancel Work Order
**File**: `src/app/api/supervisor/uncancel-wo/route.ts`  
**Lines**: 92, 107 (originally)

**Problems**:
```typescript
createdBy: user.email || user.userId  // ❌ Line 92
actorId: user.userId || user.id       // ❌ Line 107 (inconsistent)
```

**Solutions**:
```typescript
createdBy: user.userId  // ✅ Fixed
actorId: user.userId    // ✅ Fixed
```

### 4. File Attachments (Previously Fixed)
**File**: `src/app/api/work-orders/[id]/attachments/route.ts`  
**Line**: 174 (originally)

**Problem**:
```typescript
userId: user.id  // ❌ undefined
```

**Solution**:
```typescript
userId: user.userId  // ✅ Fixed
```

## Testing
After applying all fixes:
- ✅ Work order creation succeeds
- ✅ Work order cancellation succeeds
- ✅ Work order uncancellation succeeds
- ✅ File attachment upload succeeds

All `createdBy` and `actorId` fields now correctly contain the user's ID (e.g., `cmfwr6s9e001kmv5660mr74fo`).
