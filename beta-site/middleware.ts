import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_COOKIE_NAME = 'speakeasy_admin_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (except /admin API routes which check auth themselves)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);

    if (!sessionCookie?.value) {
      // Redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Validate session
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      const [timestampStr] = decoded.split(':');
      const timestamp = parseInt(timestampStr, 10);

      if (isNaN(timestamp) || Date.now() - timestamp > SESSION_DURATION) {
        // Session expired, redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete(ADMIN_COOKIE_NAME);
        return response;
      }
    } catch {
      // Invalid session, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
