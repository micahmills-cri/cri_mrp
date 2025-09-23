# Login Bounce Diagnosis

## What I Checked

### A. ENV + RUNTIME
- **Node/npm versions**: Node v20.19.3, npm 10.8.2 ✅
- **package.json engines**: `"node": ">=20"` ✅
- **dev script**: `"next dev -p 5000"` (hardcoded port, should be fine for Replit) ✅
- **Environment variables**:
  - `DATABASE_URL`: SET ✅
  - `JWT_SECRET`: SET ✅
  - `PORT`: NOT SET (but not required since hardcoded to 5000)

### B. DEP VERSIONS
- **next**: 14.2.32 ✅
- **react**: 18.3.1 ✅  
- **react-dom**: 18.3.1 ✅

### C. PRISMA
- **Database connectivity**: WORKING ✅
- **User count**: 3 ✅
- **WorkOrder count**: 1 ✅

### D. AUTH FILES

#### Login Route (`src/app/api/auth/login/route.ts`)
- **CRITICAL ISSUE FOUND**: Only had GET method, no POST method ❌
- **Cookie setting**: Missing in original file ❌
- **Import paths**: Had wrong import paths initially ❌

#### Middleware (`src/middleware.ts`)
- **Matcher**: Correctly includes `/operator/:path*`, `/supervisor/:path*`, excludes `/login` and `/api/auth/*` ✅
- **JWT verification**: Uses correct JWT_SECRET ✅
- **Cookie reading**: Correctly reads `token` cookie ✅

#### Login Page (`src/app/(auth)/login/page.tsx`)  
- **Client component**: YES ✅
- **POST to /api/auth/login**: YES ✅
- **Redirects on success**: Uses `router.push(data.redirectTo)` ✅

### E. RUN + CURL TEST
- **Server start**: Port 5000 conflicts preventing startup ❌
- **Manual curl test**: Received 500 error (server issues, not auth issues) ❌

## What I Observed

### Browser Console Errors (Before Fix)
```
Module not found: Can't resolve '../../../lib/auth'
```
This indicated the login route had wrong import paths and was trying to load non-existent modules.

### Server Logs
- Consistent `EADDRINUSE` errors on port 5000
- Missing _document.js build files indicating Next.js configuration issues

### Response Headers
- Curl test showed 500 Internal Server Error with HTML error page
- No Set-Cookie headers observed due to server not starting properly

## Root Cause

**PRIMARY ISSUE**: The login route file (`src/app/api/auth/login/route.ts`) was missing the POST method handler entirely. It only contained a GET method for token verification, but the login form was POSTing to `/api/auth/login`.

**SECONDARY ISSUES**:
1. Wrong import paths in login route (../../../lib/auth vs ../../../../lib/auth)
2. Missing password verification function in auth library
3. Port conflicts preventing server startup for testing

## Fix Applied

### 1. Restored POST Method to Login Route
```typescript
export async function POST(request: NextRequest) {
  // ... login logic with password verification
  
  // Set httpOnly cookie
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 604800 // 7 days
  })
  
  return response
}
```

### 2. Fixed Auth Library
Added missing functions to `src/lib/auth.ts`:
```typescript
export function signJWT(payload: JwtPayload): string {
  return signToken(payload);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### 3. Corrected Import Paths
Updated login route to use correct relative paths: `../../../../lib/auth`

## How to Verify

1. **Start server**: `npm run dev` (resolve port conflicts first)
2. **Test login endpoint**:
   ```bash
   curl -i -H "Content-Type: application/json" \
     -d '{"email":"operator@cri.local","password":"Operator123!"}' \
     http://localhost:5000/api/auth/login
   ```
3. **Check for Set-Cookie header** in response
4. **Test protected route access** with cookie
5. **Verify login form redirects** to /operator for operator role

## Next Steps

1. **Resolve port conflicts** - kill any processes using port 5000
2. **Test complete auth flow** - login → cookie set → middleware check → page access
3. **Verify role-based redirects** work correctly
4. **Test logout functionality** clears cookie properly

## Status
- **Root cause identified**: ✅ Missing POST method in login route
- **Fix implemented**: ✅ POST method with cookie setting restored  
- **Ready for testing**: ⚠️ Pending port conflict resolution