// Gig wizard domain helpers — spec: Projects/bndy/GIG-WIZARD-SPEC.md
import type { Artist } from "@/domain/types";
import type { RepeatPattern } from "@/domain/recurrence";

/** Canonical genre enum — MUST mirror bndy-serverless-api/artists-lambda/lib/genres.js
 *  (free-text genres are rejected server-side with 400 INVALID_GENRES). */
export const GENRES = [
  "Rock", "Rock n Roll", "Grunge", "Metal", "Punk", "Hardcore", "Alternative", "New Wave",
  "Pop", "Indie", "Britpop", "Mod",
  "Blues", "R&B", "Country", "Americana",
  "Folk", "Irish", "Soul", "Funk", "Motown", "Disco",
  "Electronic", "Dance",
  "Jazz", "Classical", "Reggae", "Ska", "Latin",
  "50s", "60s", "70s", "80s", "90s", "00s",
  "Other",
] as const;

/** Act type options — MUST mirror the godmode edit screen (multi-select, all that apply).
 *  NEVER silently defaulted (runbook §0.18/§2A.2: blank beats wrong). */
export const ACT_TYPES: { label: string; value: string }[] = [
  { label: "Originals", value: "originals" },
  { label: "Covers", value: "covers" },
  { label: "Tribute act", value: "tribute" },
  { label: "Acoustic", value: "acoustic" },
];

/** Artist type options, mirroring the godmode edit screen's enum. Optional in the wizard. */
export const ARTIST_TYPES = ["Band", "Solo Act", "Duo", "Trio", "Group", "DJ", "Collective"] as const;

/** The 13 canonical bndy regions (runbook §1A.1) for acts based across a wide area.
 *  A town is always preferred; regions are for genuinely regional/national acts. */
export const REGIONS = [
  "North East", "North West", "Yorkshire and the Humber",
  "East Midlands", "West Midlands", "East of England",
  "London", "South East", "South West",
  "Wales", "Scotland", "Northern Ireland", "England",
] as const;

/** Mirror of the backend normaliseKey: lowercase, &↔and, strip leading article,
 *  strip trailing act qualifier, strip all non-alphanumerics. */
export function normKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/^(the|a)\s+/, "")
    .replace(/\s+(band|duo|trio|music)$/, "")
    .replace(/[^a-z0-9]/g, "");
}

export interface RankedArtist { artist: Artist; score: number; dist?: number }

/** Optional proximity context: when the venue is already chosen, same-named artists
 *  nearest the venue rank first (the "three Not Guiltys, Switfys is in Stoke" case).
 *  `distById` = artistId → miles from venue to the artist's NEAREST gig (their footprint;
 *  artists carry no coordinates of their own). Built ONCE per venue by the caller,
 *  O(1) lookups here: no per-keystroke geometry. */
export interface RankContext { venueCity?: string; distById?: Map<string, number> }

/** Client-side fuzzy rank over the cached artists list. The Ant Hill Mob defence:
 *  callers must always render candidate LOCATION alongside the name. */
export function rankArtists(query: string, artists: Artist[], limit = 8, ctx?: RankContext): RankedArtist[] {
  const q = normKey(query);
  if (q.length < 2) return [];
  const venueCityKey = ctx?.venueCity ? normKey(ctx.venueCity) : null;
  const out: RankedArtist[] = [];
  for (const artist of artists) {
    const k = normKey(artist.name);
    let score = 0;
    if (k === q) score = 100;
    else if (k.startsWith(q)) score = 90;
    else if (q.startsWith(k) && k.length >= 4) score = 85; // containment both ways
    else if (k.includes(q)) score = 75;
    else {
      const raw = artist.name.toLowerCase();
      if (raw.includes(query.trim().toLowerCase())) score = 60;
    }
    if (score > 0) {
      const dist = ctx?.distById?.get(artist.id);
      if (venueCityKey && artist.location && normKey(artist.location).includes(venueCityKey)) score += 12;
      else if (dist !== undefined) score += dist < 30 ? 8 : dist < 60 ? 4 : 0;
      out.push({ artist, score, dist });
    }
  }
  return out
    .sort((a, b) => b.score - a.score || (a.dist ?? Infinity) - (b.dist ?? Infinity) || a.artist.name.localeCompare(b.artist.name))
    .slice(0, limit);
}

/** Runbook §5.6 smart default start times: Fri/Sat 21:00 · Sun 19:00 · weekdays 20:00. */
export function defaultStartTime(dateISO: string): string {
  const dow = new Date(`${dateISO}T12:00:00Z`).getUTCDay();
  if (dow === 5 || dow === 6) return "21:00";
  if (dow === 0) return "19:00";
  return "20:00";
}

export function inferTitle(artistName?: string, venueName?: string, isOpenMic?: boolean): string {
  if (isOpenMic) return venueName ? `Open Mic @ ${venueName}` : "Open Mic";
  if (artistName && venueName) return `${artistName} @ ${venueName}`;
  return "";
}

/** Wizard draft — persisted to sessionStorage so refresh never loses work. */
export interface NewArtistDraft {
  name: string;
  location: string;
  facebookUrl?: string;
  genres: string[];
  actType?: string[];
  artistType?: string;
  /** user explicitly confirmed "mine is a different act" after seeing candidates */
  confirmNew?: boolean;
}
/** Open mic repeat rule (item 13): expanded client-side via domain/recurrence. */
export interface RepeatRule {
  pattern: RepeatPattern;
  until: string;
}
export interface Draft {
  venueId?: string;
  venueName?: string;
  venueCity?: string;
  artistId?: string;
  artistName?: string;
  newArtist?: NewArtistDraft;
  /** open mic night — artist optional (the host), repeats allowed */
  isOpenMic?: boolean;
  repeat?: RepeatRule;
  date?: string;
  startTime?: string;
  endTime?: string;
  ticketed: boolean;
  ticketUrl?: string;
  ticketInfo?: string;
  info?: string;
  posterUrl?: string;
  title?: string;
  titleTouched: boolean;
}
export const EMPTY_DRAFT: Draft = { ticketed: false, titleTouched: false };

const KEY = "bndy-gig-wizard";
/** Drafts older than this are discarded on load: resume should survive a refresh,
 *  not resurrect a half-finished gig from days ago. */
const DRAFT_TTL_MS = 6 * 60 * 60 * 1000;

export function loadDraft(): Draft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Draft & { savedAt?: number };
    if (parsed.savedAt && Date.now() - parsed.savedAt > DRAFT_TTL_MS) return EMPTY_DRAFT;
    delete parsed.savedAt;
    return { ...EMPTY_DRAFT, ...parsed };
  } catch {
    return EMPTY_DRAFT;
  }
}
export function saveDraft(d: Draft): void {
  try { sessionStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() })); } catch { /* private mode */ }
}
export function clearDraft(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
}
