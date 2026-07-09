// bndy domain model — pure types, ubiquitous language matching the backend.
// No React, no fetch here.

export interface LatLng {
  lat: number;
  lng: number;
}

/** A live music event at a venue. */
export interface Gig {
  id: string;
  title: string;
  artistId?: string;
  artistName?: string;
  venueId: string;
  venueName: string;
  venueCity?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string;
  location: LatLng;
  ticketed: boolean;
  ticketUrl?: string;
  isOpenMic?: boolean;
}

/** A performing act. An artist plays many gigs; act qualifiers live on the gig title. */
export interface Artist {
  id: string;
  name: string;
  genres?: string[];
  artistType?: string;
  actType?: string[];
  location?: string;
  profileImageUrl?: string | null;
  bio?: string;
  socials?: SocialLink[];
}

/** A place that hosts gigs. */
export interface Venue {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postcode?: string;
  location: LatLng;
  website?: string;
  profileImageUrl?: string | null;
  socials?: SocialLink[];
  /** derived: has at least one upcoming gig */
  hasUpcoming?: boolean;
}

export type SocialPlatform = "facebook" | "instagram" | "website" | "spotify" | "youtube" | "x" | "other";
export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}
