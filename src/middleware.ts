import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/register',
]

// Static assets and internal routes that should be excluded
const excludedRoutes = [
  '/_next',
  '/favicon.ico',
  '/logo.png',
  '/api/auth/me',
  '/api/auth/logout',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for excluded routes
  if (excludedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Skip middleware for public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    // If user is already logged in and tries to access login page, redirect to home
    if (pathname === '/login') {
      const token = request.cookies.get('auth_token')?.value
      if (token) {
        const session = verifyToken(token)
        if (session) {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
    }
    return NextResponse.next()
  }

  // Skip for static files
  if (pathname.includes('.') && !pathname.endsWith('/')) {
    return NextResponse.next()
  }

  // Check authentication for all other routes
  const token = request.cookies.get('auth_token')?.value

  if (!token) {
    // Redirect to login page if not authenticated
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const session = verifyToken(token)
  if (!session) {
    // Token is invalid, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    // Clear invalid cookie
    response.cookies.delete('auth_token')
    return response
  }

  // User is authenticated, allow request
  // Add user info to headers for downstream use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', session.userId)
  requestHeaders.set('x-user-email', session.email)
  requestHeaders.set('x-user-role', session.role)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
