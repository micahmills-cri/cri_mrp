import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from './lib/auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }
  
  // Protect private routes
  if (pathname.startsWith('/operator') || pathname.startsWith('/supervisor')) {
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/operator/:path*', '/supervisor/:path*', '/api/((?!auth).)*']
}