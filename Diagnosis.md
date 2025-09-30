# Work Order Creation Error - Missing createdBy Field

## Problem
When attempting to create a work order, the system returns a 500 Internal Server Error with the following Prisma validation error:

```
Argument `createdBy` is missing.
```

## Root Cause
In `src/app/api/work-orders/route.ts` (line 139), the code attempts to create a WorkOrderVersion record with:

```typescript
await prisma.workOrderVersion.create({
  data: {
    workOrderId: workOrder.id,
    versionNumber: 1,
    snapshotData: initialSnapshot,
    reason: 'Initial creation',
    createdBy: user.email  // ❌ PROBLEM: user.email is undefined
  }
})
```

However, the JWT payload returned by `getUserFromRequest()` only contains:
- `userId` (string)
- `role` (string)
- `departmentId` (string | null)

The `email` field is **not included in the JWT token**, resulting in `user.email` being `undefined`.

## Database Schema Requirement
The `WorkOrderVersion` model requires a non-null `createdBy` field:

```prisma
model WorkOrderVersion {
  id             String    @id @default(cuid())
  workOrderId    String
  versionNumber  Int
  snapshotData   Json
  reason         String
  createdBy      String    // Required field
  createdAt      DateTime  @default(now())
  workOrder      WorkOrder @relation(fields: [workOrderId], references: [id])
}
```

## Solution
Change line 139 in `src/app/api/work-orders/route.ts` from:

```typescript
createdBy: user.email  // ❌ Wrong - email not in JWT
```

to:

```typescript
createdBy: user.userId  // ✅ Correct - userId is in JWT
```

This matches the same pattern used successfully in other parts of the codebase (e.g., file attachment creation).

## Files to Modify
- `src/app/api/work-orders/route.ts` - Line 139

## Testing
After applying the fix, work order creation should succeed and the `createdBy` field will contain the user's ID (e.g., `cmfwr6s9e001kmv5660mr74fo`) instead of attempting to use the undefined email.
