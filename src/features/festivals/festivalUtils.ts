import { DOW, MON, MON_FULL, parseISO, todayISO } from "@/domain/dates";
import type { FestivalSummary, Gig } from "@/domain/types";

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
