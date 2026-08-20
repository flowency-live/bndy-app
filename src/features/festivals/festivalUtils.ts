import { DOW, EVENING_FROM, MON, MON_FULL, parseISO, todayISO } from "@/domain/dates";
import { distanceMiles, formatDistance } from "@/domain/geo";
import type { FestivalSummary, Gig, LatLng, Venue } from "@/domain/types";

export function festivalDateRange(start: string, end: string): string {
  const s = parseISO(start);
  const e = parseISO(end || start);
  const same = start === end;
  if (same) return `${DOW[s.getDay()]} ${s.getDate()} ${MON[s.getMonth()]} ${s.getFullYear()}`;
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.getDate()}–${e.getDate()} ${MON[s.getMonth()]} ${s.getFullYear()}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} ${MON[s.getMonth()]} – ${e.getDate()} ${MON[e.getMonth()]} ${s.getFullYear()}`;
  }
  return `${s.getDate()} ${MON[s.getMonth()]} ${s.getFullYear()} – ${e.getDate()} ${MON[e.getMonth()]} ${e.getFullYear()}`;
}

export function festivalStatus(f: FestivalSummary, today = todayISO()): string {
  if (f.startDate <= today && f.endDate >= today) return "On now";
  const start = parseISO(f.startDate);
  const now = parseISO(today);
  const diff = Math.round((start.getTime() - now.getTime()) / 86400000);
  if (diff === 1) return "Starts tomorrow";
  if (diff > 1 && diff <= 7) return `Starts in ${diff} days`;
  return festivalDateRange(f.startDate, f.endDate);
}

export function festivalCountLine(f: FestivalSummary): string {
  const bits: string[] = [];
  if (typeof f.gigCount === "number") bits.push(`${f.gigCount} gig${f.gigCount === 1 ? "" : "s"}`);
  else if (typeof f.actCount === "number") bits.push(`${f.actCount} act${f.actCount === 1 ? "" : "s"}`);
  const vc = f.venueCount ?? f.venueIds.length;
  if (vc) bits.push(`${vc} venue${vc === 1 ? "" : "s"}`);
  return bits.join(" · ");
}

export function festivalDayHeading(iso: string): string {
  const d = parseISO(iso);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON_FULL[d.getMonth()]}`;
}

export function groupFestivalGigs(gigs: Gig[]): { date: string; gigs: Gig[] }[] {
  const byDate = new Map<string, Gig[]>();
  for (const gig of gigs) {
    const arr = byDate.get(gig.date) || [];
    arr.push(gig);
    byDate.set(gig.date, arr);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      gigs: items.sort((a, b) => `${a.startTime || "99:99"}|${String(a.billingOrder ?? 9999).padStart(4, "0")}|${a.title}`.localeCompare(`${b.startTime || "99:99"}|${String(b.billingOrder ?? 9999).padStart(4, "0")}|${b.title}`)),
    }));
}

/** Time-of-day section for a schedule row. Shares EVENING_FROM with isTonight. */
export type DayPeriod = "morning" | "afternoon" | "evening" | "tba";

export function dayPeriod(startTime?: string): DayPeriod {
  if (!startTime) return "tba";
  if (startTime < "12:00") return "morning";
  if (startTime < EVENING_FROM) return "afternoon";
  return "evening";
}

export const DAY_PERIOD_LABEL: Record<DayPeriod, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  tba: "Time to confirm",
};

export function datesForFestival(f: FestivalSummary): string[] {
  const out: string[] = [];
  const end = f.endDate || f.startDate;
  let cursor = f.startDate;
  while (cursor <= end && out.length < 32) {
    out.push(cursor);
    const d = parseISO(cursor);
    d.setDate(d.getDate() + 1);
    cursor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return out;
}

/* ---------------- proximity (derived, never stored) ---------------- */


export interface FestivalProximity {
  /** Miles to the NEAREST festival venue. Undefined when no venue has resolved. */
  distanceMiles?: number;
  /** "Congleton" | "4 towns" | "UK wide". Undefined when no venue has resolved. */
  scope?: string;
}

/**
 * Distance and scope come from the festival's VENUES, never from a typed-in
 * location field. A hand-typed "city" drifts the first time a venue is added;
 * the venue set cannot, because every venue carries a verified coordinate.
 * Scope rule: venues spread over 90 miles read "UK wide"; one town reads as
 * that town; anything between reads "N towns".
 */
export function festivalProximity(f: FestivalSummary, venueById: Map<string, Venue>, from?: LatLng): FestivalProximity {
  const found = f.venueIds.map((id) => venueById.get(id)).filter((v): v is Venue => !!v);
  if (!found.length) return {};

  let distance: number | undefined;
  if (from) {
    distance = Math.min(...found.map((v) => distanceMiles(from, v.location)));
  }

  let spread = 0;
  for (let i = 0; i < found.length; i++) {
    for (let j = i + 1; j < found.length; j++) {
      const d = distanceMiles(found[i].location, found[j].location);
      if (d > spread) spread = d;
    }
  }
  const towns = new Set(found.map((v) => (v.city || "").trim().toLowerCase()).filter(Boolean));
  let scope: string;
  if (spread > 90) scope = "UK wide";
  else if (towns.size === 1) scope = found.find((v) => v.city)?.city ?? "1 town";
  else if (towns.size > 1) scope = `${towns.size} towns`;
  else scope = f.location || "";

  return { distanceMiles: distance, scope: scope || undefined };
}

/** "Congleton · 12 mi" or whichever half exists. */
export function festivalWhereLine(p: FestivalProximity): string {
  const bits: string[] = [];
  if (p.scope) bits.push(p.scope);
  if (p.distanceMiles !== undefined && isFinite(p.distanceMiles)) bits.push(formatDistance(p.distanceMiles));
  return bits.join(" · ");
}
