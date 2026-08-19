// Festival venue-blocks, DERIVED from gig times - never a stored "format".
//
// Two real festivals forced this (Jason, 2026-08-20). Tigerfest: one venue
// publishes "4pm to 8pm" and five acts, so every act carried 4pm and the
// schedule read as five simultaneous gigs. Congleton: twenty venues, one
// timed gig each, where the time IS the information. The data already says
// which is which:
//
//   several gigs, one venue, one day, ONE distinct start time (or none)
//     -> a BILL BLOCK. The time belongs to the venue, not the acts.
//   anything else
//     -> timed gigs. Show the times.
//
// An organiser never picks a type, so a festival that mixes both formats on
// different days renders each day correctly for free.

import { formatTime } from "./dates";
import type { Gig } from "./types";

export interface FestivalBlock {
  kind: "block";
  festivalId: string;
  festivalName?: string;
  festivalSlug?: string;
  venueId: string;
  venueName: string;
  venueCity?: string;
  date: string;
  /** The venue's shared start, when the acts carried one. */
  startTime?: string;
  /** Latest end time any act carried, if any. */
  endTime?: string;
  /** billingOrder then name. The order on the poster, not a fake running order. */
  gigs: Gig[];
}

export type ScheduleItem = { kind: "gig"; gig: Gig } | FestivalBlock;

const actName = (g: Gig) => g.artistName || g.title || "";

/**
 * Collapse festival venue-blocks inside an already-grouped list (one day on
 * the festival schedule, one month on a venue page, one day bucket on the
 * gigs list). Non-festival gigs and timed festival gigs pass through
 * untouched. Order is preserved chronologically; a block sits where its
 * shared start time puts it.
 */
export function blockFestivalGigs(gigs: Gig[]): ScheduleItem[] {
  const groups = new Map<string, Gig[]>();
  const keyOf = (g: Gig) => `${g.festivalId}|${g.venueId}|${g.date}`;
  for (const g of gigs) {
    if (!g.festivalId) continue;
    const k = keyOf(g);
    const arr = groups.get(k) || [];
    arr.push(g);
    groups.set(k, arr);
  }

  const blocked = new Set<string>(); // group keys that collapse
  for (const [k, arr] of groups) {
    if (arr.length < 2) continue;
    const times = new Set(arr.map((g) => g.startTime || ""));
    // One distinct value - a shared time or a shared blank - means the acts
    // never had individual times. Two or more distinct values is a running
    // order and every act keeps its slot.
    if (times.size <= 1) blocked.add(k);
  }

  const out: ScheduleItem[] = [];
  const emitted = new Set<string>();
  for (const g of gigs) {
    const k = g.festivalId ? keyOf(g) : null;
    if (!k || !blocked.has(k)) {
      out.push({ kind: "gig", gig: g });
      continue;
    }
    if (emitted.has(k)) continue;
    emitted.add(k);
    const members = [...(groups.get(k) || [])].sort((a, b) =>
      `${String(a.billingOrder ?? 9999).padStart(4, "0")}|${actName(a).toLowerCase()}`
        .localeCompare(`${String(b.billingOrder ?? 9999).padStart(4, "0")}|${actName(b).toLowerCase()}`),
    );
    const endTimes = members.map((m) => m.endTime).filter((t): t is string => !!t).sort();
    out.push({
      kind: "block",
      festivalId: g.festivalId!,
      festivalName: g.festivalName,
      festivalSlug: g.festivalSlug,
      venueId: g.venueId,
      venueName: g.venueName,
      venueCity: g.venueCity,
      date: g.date,
      startTime: g.startTime || undefined,
      endTime: endTimes[endTimes.length - 1],
      gigs: members,
    });
  }
  return out;
}

/** "4pm to 8pm" | "From 4pm" | "" - the venue's window, never a per-act claim. */
export function blockTimeLabel(b: FestivalBlock): string {
  if (b.startTime && b.endTime) return `${formatTime(b.startTime)} to ${formatTime(b.endTime)}`;
  if (b.startTime) return `From ${formatTime(b.startTime)}`;
  return "";
}

/** "5 acts · from 4pm" for the one-line collapsed row. */
export function blockSummary(b: FestivalBlock): string {
  const bits = [`${b.gigs.length} acts`];
  const t = blockTimeLabel(b);
  if (t) bits.push(t.replace(/^From /, "from "));
  return bits.join(" · ");
}
