import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware - currently a no-op pass-through.
 *
 * Note: Domain-based redirects (live/gigs/gigmap -> map.bndy.co.uk) are not
 * implemented here because Amplify's ISR caching bypasses middleware for
 * cached pages. All four domains serve the same bndy-app content.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
