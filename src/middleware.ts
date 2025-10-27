import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define which paths need authentication
export const config = {
  matcher: ["/operator/:path*", "/supervisor/:path*", "/admin/:path*", "/api/work-orders/:path*", "/api/supervisor/:path*", "/api/admin/:path*"],
};

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  
  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  
  // For now, just check if token exists
  // The actual JWT verification will happen in the API routes and pages
  // because jsonwebtoken doesn't work in Edge Runtime
  return NextResponse.next();
}