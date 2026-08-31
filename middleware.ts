import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware - currently a no-op pass-through.
 *
 * bndy.live is the canonical domain for this app. Legacy domains
 * (live.bndy.co.uk, map.bndy.co.uk, gigmap.bndy.co.uk, gigs.bndy.co.uk)
 * are retired and redirect at DNS/Amplify level.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
