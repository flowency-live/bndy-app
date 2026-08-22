import type { EditionId } from './types';

/**
 * Resolve the bndy edition from a hostname.
 *
 * Backwards compatibility is deliberate: any hostname we do not explicitly
 * recognise resolves to the existing live edition. This means local builds,
 * preview deployments and bndy.live keep current behaviour by default.
 */
export function resolveEdition(hostname?: string | null): EditionId {
  const host = (hostname ?? '').trim().toLowerCase().split(':')[0];

  if (host === 'brass.bndy.live' || host.endsWith('.brass.bndy.live')) {
    return 'brass';
  }

  return 'live';
}
