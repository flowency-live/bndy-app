// bndy domain model — pure types, ubiquitous language matching the backend.
// No React, no fetch here.

import type { EditionId } from '../editions/types';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface EditionScoped {
  /** Omitted on legacy records; omission always means the existing live edition. */
  publicationScopes?: EditionId[];
}

/** Resolved ticketing info from backend (server-side resolution). */
export interface ResolvedTicketing {
  isTicketed: boolean;
  source: 'event' | 'venue' | 'none';
  price?: string;
  ticketUrl?: string;
  ticketInformation?: string;
}

export type FestivalBilling = 'headline' | 'special_guest' | 'support' | 'general' | 'opener';

export interface FestivalStage {
  id: string;
  name: string;
}

export interface FestivalLineupSlot {
  id: string;
  displayName: string;
  artistId?: string;
  artistName?: string;
  eventId?: string;
  day?: string;
  stageId?: string;
  billing?: FestivalBilling;
  billingOrder?: number;
  resolved?: boolean;
}

/** Lightweight festival data used by discovery/list/calendar surfaces. */
export interface FestivalSummary extends EditionScoped {
  id: string;
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  location?: string;
  venueIds: string[];
  posterImageUrl?: string;
  heroImageUrl?: string;
  actCount?: number;
  gigCount?: number;
  venueCount?: number;
  price?: string;
  ticketed?: boolean;
}

/** A festival / short grassroots music programme grouping ordinary gigs. */
export interface Festival extends FestivalSummary {
  description?: string;
  primaryVenueId?: string;
  stages: FestivalStage[];
  lineup: FestivalLineupSlot[];
  ticketUrl?: string;
  lineupUrl?: string;
  websiteUrl?: string;
  socialMediaUrls?: string[];
  theme?: unknown;
}

/** A live music event at a venue. Brass presents this same canonical object as a Concert. */
export interface Gig extends EditionScoped {
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
  /** Optional parent programme. The gig remains the atomic event object. */
  festivalId?: string;
  festivalName?: string;
  /** Client-side convenience resolved from the public festival list/detail. */
  festivalSlug?: string;
  stageId?: string;
  billing?: FestivalBilling;
  billingOrder?: number;
  /** Feature 12 — the bill, in display order. `artistId` is always artistIds[0].
   *  Absent on a single-act gig and on every gig created before feature 12. */
  artistIds?: string[];
  /** Names parallel to `artistIds`. The backend denormalises these. */
  artistNames?: string[];
  /** Which acts are BILLED as headline. Every other act on the bill is support.
   *  Absent means [artistId] — so a legacy gig reads as one headline act. */
  headlineArtistIds?: string[];
  /** Optional first-class branded production, e.g. a live-cinema or themed programme. */
  productionId?: string;
  productionName?: string;
  /** Optional engagement-specific conductor; does not imply permanent band MD. */
  conductorName?: string;
}

export type PerformerKind =
  | 'band'
  | 'brass_band'
  | 'solo'
  | 'duo'
  | 'trio'
  | 'group'
  | 'dj'
  | 'collective';

export type PerformerNameType =
  | 'current_official'
  | 'former_official'
  | 'common'
  | 'sponsored'
  | 'alternate';

export interface PerformerName {
  name: string;
  nameType: PerformerNameType;
  validFrom?: string;
  validTo?: string;
  sourceUrl?: string;
  confidence?: number;
}

export interface BrassBandProfile {
  organisationType: 'brass_band';
  town?: string;
  county?: string;
  country?: string;
  officialWebsiteUrl?: string;
  sourceRefs?: string[];
}

/** A performing identity. Existing records may omit performerKind and edition fields. */
export interface Artist extends EditionScoped {
  id: string;
  name: string;
  genres?: string[];
  artistType?: string;
  /** Additive domain discriminator. Existing artists remain valid without it. */
  performerKind?: PerformerKind;
  /** Historical, sponsored and common names for canonical identity resolution. */
  names?: PerformerName[];
  domainProfiles?: {
    brass?: BrassBandProfile;
  };
  /** Originals / covers / tribute. Acoustic is deliberately NOT an act type. */
  actType?: string[];
  /** Performance capability: this artist can perform acoustically. */
  acoustic?: boolean;
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

export type ProductionKind =
  | 'standard_concert'
  | 'themed_concert'
  | 'live_cinema'
  | 'collaboration'
  | 'other';

/** A separately branded performance proposition belonging to a performer. */
export interface Production extends EditionScoped {
  id: string;
  performerId: string;
  name: string;
  slug: string;
  productionKind?: ProductionKind;
  description?: string;
  imageUrl?: string | null;
  websiteUrl?: string;
  status?: 'active' | 'inactive';
}

/** An artist's available date for booking. */
export interface AvailabilityDate {
  id: string;
  artistId: string;
  date: string; // YYYY-MM-DD
  type: 'available' | 'free_weekend';
  notes?: string;
}

export type VenueKind =
  | 'pub'
  | 'club'
  | 'music_venue'
  | 'band_club'
  | 'town_hall'
  | 'concert_hall'
  | 'theatre'
  | 'arena'
  | 'church'
  | 'community_hall'
  | 'outdoor'
  | 'other';

/** A place that hosts gigs. */
export interface Venue extends EditionScoped {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postcode?: string;
  location: LatLng;
  website?: string;
  profileImageUrl?: string | null;
  socials?: SocialLink[];
  /** Optional; legacy venues retain their existing live behaviour when omitted. */
  venueKind?: VenueKind;
  /** Explicit graph-expansion permission. New brass venues default to []. */
  discoveryScopes?: EditionId[];
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
