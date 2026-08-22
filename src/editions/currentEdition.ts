import { getEditionConfig } from './registry';
import type { EditionConfig, EditionId } from './types';

/**
 * Deployment-level edition selection.
 *
 * IMPORTANT: the absence of NEXT_PUBLIC_BNDY_EDITION is deliberately `live`,
 * so the existing bndy.live Amplify deployment remains behaviourally unchanged.
 * A brass deployment sets NEXT_PUBLIC_BNDY_EDITION=brass.
 */
export function currentEditionId(): EditionId {
  return process.env.NEXT_PUBLIC_BNDY_EDITION === 'brass' ? 'brass' : 'live';
}

export function currentEdition(): EditionConfig {
  return getEditionConfig(currentEditionId());
}
