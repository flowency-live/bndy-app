import type { EditionConfig, EditionId } from './types';

export const LIVE_EDITION: EditionConfig = {
  id: 'live',
  hostname: 'bndy.live',
  labels: {
    artist: 'Artist',
    artists: 'Artists',
    gig: 'Gig',
    gigs: 'Gigs',
    festival: 'Festival',
    festivals: 'Festivals',
  },
  features: {
    openMic: true,
    festivals: true,
    productions: false,
    bandDiscovery: false,
    venueDirectory: true,
  },
};

export const BRASS_EDITION: EditionConfig = {
  id: 'brass',
  hostname: 'brass.bndy.live',
  labels: {
    artist: 'Band',
    artists: 'Bands',
    gig: 'Concert',
    gigs: 'Concerts',
    festival: 'Festival',
    festivals: 'Festivals',
  },
  features: {
    openMic: false,
    festivals: true,
    productions: true,
    bandDiscovery: true,
    venueDirectory: false,
  },
};

export const EDITIONS: Record<EditionId, EditionConfig> = {
  live: LIVE_EDITION,
  brass: BRASS_EDITION,
};

export function getEditionConfig(id: EditionId): EditionConfig {
  return EDITIONS[id];
}
