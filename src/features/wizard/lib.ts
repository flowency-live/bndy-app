// Gig wizard domain helpers — spec: Projects/bndy/GIG-WIZARD-SPEC.md
import type { Artist } from "@/domain/types";
import type { RepeatPattern } from "@/domain/recurrence";
import { billTitle } from "@/domain/lineup";
import { FALLBACK_ARTIST_TAXONOMY } from "@/lib/artistTaxonomyCore";

/**
 * Compatibility exports for wizard code still being moved to useArtistTaxonomy().
 * There is no independently-maintained list here: these all derive from the
 * app's runtime-taxonomy resilience snapshot.
 */
export const GENRES = FALLBACK_ARTIST_TAXONOMY.genres;
export const ACT_TYPES = FALLBACK_ARTIST_TAXONOMY.actTypes;
export const ARTIST_TYPE_OPTIONS = FALLBACK_ARTIST_TAXONOMY.artistTypes;
/** @deprecated Prefer ARTIST_TYPE_OPTIONS or useArtistTaxonomy().artistTypes. */
export const ARTIST_TYPES = FALLBACK_ARTIST_TAXONOMY.artistTypes.map((option) => option.label);

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

/** Mirrors the server rule in ACTION-21 so the preview matches what is saved.
 *  One headliner plus support reads as the headliner alone; a co-headline bill
 *  joins the headliners. Support acts never enter the title. */
export function inferTitle(
  artistName?: string,
  venueName?: string,
  isOpenMic?: boolean,
  bill?: { acts: { id: string; name: string }[]; headlineIds?: string[] },
): string {
  if (isOpenMic) return venueName ? `Open Mic @ ${venueName}` : "Open Mic";
  if (bill && bill.acts.length > 1 && venueName) {
    return billTitle(bill.acts, venueName, bill.headlineIds);
  }
  if (artistName && venueName) return `${artistName} @ ${venueName}`;
  return "";
}

/** Every act on the draft bill, in display order. Act 1 first. */
export function draftActs(d: Draft): { id: string; name: string }[] {
  const first = d.artistId && d.artistName
    ? [{ id: d.artistId, name: d.artistName }]
    : d.newArtist?.name
      ? [{ id: NEW_ACT_ID, name: d.newArtist.name }]
      : [];
  return [...first, ...(d.extraActs ?? [])];
}

export const MAX_ACTS = 4;

/** Act 1 can be a brand new act that has no id until publish resolves it. It
 *  still needs a stable handle so it can sit on the bill and carry a billing
 *  chip. WizardShell swaps it for the real id at publish. */
export const NEW_ACT_ID = "__new__";

/** Wizard draft — persisted to sessionStorage so refresh never loses work. */
export interface NewArtistDraft {
  name: string;
  location: string;
  facebookUrl?: string;
  /** Image actually observed from the supplied Facebook page. The backend still
   *  owns the decision to download/store it when the artist is created. */
  profileImageUrl?: string;
  /** True only when the name came directly from Facebook page metadata. This
   *  activates the backend's existing verified-source-name data-quality path. */
  verifiedSourceName?: boolean;
  /** Source-backed profile details can survive the rest of the gig wizard and
   *  are only sent if the artist is genuinely created. */
  bio?: string;
  websiteUrl?: string;
  genres: string[];
  /** Originals / covers / tribute. */
  actType?: string[];
  /** Separate performance capability; never stored inside actType. */
  acoustic?: boolean;
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
  /** Feature 12 — the rest of the bill. Act 1 stays in artistId/artistName, so
   *  every existing path (resume, ?artistId= prefill, single-act publish) is
   *  untouched. Cap of 4 acts total is enforced in StepArtist and server-side. */
  extraActs?: { id: string; name: string }[];
  /** ids billed as headline. Absent means [act 1]. Every act may be headline. */
  headlineIds?: string[];
  /** the step 1 checkbox, kept in the draft so a refresh restores bill mode */
  multiAct?: boolean;
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
