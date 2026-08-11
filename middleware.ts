import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Redirect alternate domains to the canonical map.bndy.co.uk domain.
 * Hosts live.bndy.co.uk, gigs.bndy.co.uk, and gigmap.bndy.co.uk all
 * redirect to map.bndy.co.uk with a 301 permanent redirect.
 */
export function middleware(request: NextRequest) {
  // Check multiple possible host headers
  const forwardedHost = request.headers.get('x-forwarded-host') || '';
  const hostHeader = request.headers.get('host') || '';
  const urlHost = request.nextUrl.hostname;

  // Use the most reliable source - URL hostname from the request
  const host = forwardedHost || urlHost || hostHeader;

  // Debug: Add header to see what host is detected (remove after testing)
  const response = NextResponse.next();
  response.headers.set('x-debug-host', host);
  response.headers.set('x-debug-fwd', forwardedHost);
  response.headers.set('x-debug-hdr', hostHeader);
  response.headers.set('x-debug-url', urlHost);

  // Canonical domain - no redirect needed
  if (
    host === 'map.bndy.co.uk' ||
    host.includes('localhost') ||
    host.includes('amplifyapp.com') ||
    host.includes('cloudfront.net')
  ) {
    return response;
  }

  // Redirect alternate domains to canonical
  if (
    host === 'live.bndy.co.uk' ||
    host === 'gigs.bndy.co.uk' ||
    host === 'gigmap.bndy.co.uk'
  ) {
    const pathname = request.nextUrl.pathname;
    const search = request.nextUrl.search;
    const redirectUrl = `https://map.bndy.co.uk${pathname}${search}`;
    return NextResponse.redirect(redirectUrl, 301);
  }

  return response;
}

export const config = {
  // Run on all paths except static files and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
