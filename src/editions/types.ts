export type EditionId = 'live' | 'brass';

export interface EditionLabels {
  artist: string;
  artists: string;
  gig: string;
  gigs: string;
  festival: string;
  festivals: string;
}

export interface EditionFeatures {
  openMic: boolean;
  festivals: boolean;
  productions: boolean;
  bandDiscovery: boolean;
  venueDirectory: boolean;
}

export interface EditionConfig {
  id: EditionId;
  hostname: string;
  labels: EditionLabels;
  features: EditionFeatures;
}
