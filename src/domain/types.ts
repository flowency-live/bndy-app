// bndy domain model — pure types, ubiquitous language matching the backend.
// No React, no fetch here.

export interface LatLng {
  lat: number;
  lng: number;
}

/** Resolved ticketing info from backend (server-side resolution). */
export interface ResolvedTicketing {
  isTicketed: boolean;
  source: 'event' | 'venue' | 'none';
  price?: string;
  ticketUrl?: string;
  ticketInformation?: string;
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
  /** @deprecated Use ticketing.isTicketed instead */
  ticketed: boolean;
  /** @deprecated Use ticketing.ticketUrl instead */
  ticketUrl?: string;
  /** Resolved ticketing from backend (includes venue inheritance) */
  ticketing?: ResolvedTicketing;
  isOpenMic?: boolean;
  /** Feature 7: cancelled gigs stay visible as a ghosted row with a stamp. */
  cancelled?: boolean;
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
  publishAvailability?: boolean;
  availabilityMode?: 'selected_dates_only' | 'free_weekends';
  contactMethod?: 'phone' | 'whatsapp';
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
}

/** An artist's available date for booking. */
export interface AvailabilityDate {
  id: string;
  artistId: string;
  date: string; // YYYY-MM-DD
  type: 'available' | 'free_weekend';
  notes?: string;
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
  /** venue-level ticketing: true if most gigs require tickets */
  standardTicketed?: boolean;
  /** venue's standard ticket page URL */
  standardTicketUrl?: string;
  /** venue's standard ticket info text */
  standardTicketInformation?: string;
}

export type SocialPlatform = "facebook" | "instagram" | "website" | "spotify" | "youtube" | "x" | "other";
export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}
