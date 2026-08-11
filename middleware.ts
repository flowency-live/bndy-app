import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Redirect alternate domains to the canonical map.bndy.co.uk domain.
 * Hosts live.bndy.co.uk, gigs.bndy.co.uk, and gigmap.bndy.co.uk all
 * redirect to map.bndy.co.uk with a 301 permanent redirect.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Canonical domain - no redirect needed
  if (host === 'map.bndy.co.uk' || host.includes('localhost') || host.includes('amplifyapp.com')) {
    return NextResponse.next();
  }

  // Redirect alternate domains to canonical
  if (
    host === 'live.bndy.co.uk' ||
    host === 'gigs.bndy.co.uk' ||
    host === 'gigmap.bndy.co.uk'
  ) {
    const url = request.nextUrl.clone();
    url.host = 'map.bndy.co.uk';
    url.port = '';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all paths except static files and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
