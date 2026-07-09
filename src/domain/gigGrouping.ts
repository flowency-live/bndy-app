// Group gigs into collapsible periods (Today / This week / Next week / Later),
// and within each period stack them by day. Most gigs fall Thu–Sun, so day
// headers read naturally.

import { addDaysISO } from "./dates";
import type { Gig } from "./types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function mondayIdx(iso: string) { const [y, m, d] = iso.split("-").map(Number); return (new Date(y, m - 1, d).getDay() + 6) % 7; }

export function dayHeading(iso: string, today: string): string {
  if (iso === today) return "Today";
  if (iso === addDaysISO(today, 1)) return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number);
  return `${DOW[new Date(y, m - 1, d).getDay()]} ${d} ${MON[m - 1]}`;
}

export interface DayGroup { date: string; gigs: Gig[] }
export interface GigBucket { key: string; label: string; count: number; days: DayGroup[] }

export function bucketGigs(gigs: Gig[], today: string): GigBucket[] {
  const sorted = [...gigs].sort((a, b) => `${a.date}${a.startTime ?? ""}`.localeCompare(`${b.date}${b.startTime ?? ""}`));
  const endThisWeek = addDaysISO(today, 6 - mondayIdx(today)); // Sunday of this week
  const endNextWeek = addDaysISO(endThisWeek, 7);

  const groups: Record<string, Gig[]> = { today: [], week: [], next: [], later: [] };
  for (const g of sorted) {
    const k = g.date === today ? "today" : g.date <= endThisWeek ? "week" : g.date <= endNextWeek ? "next" : "later";
    groups[k].push(g);
  }

  const toDays = (arr: Gig[]): DayGroup[] => {
    const m = new Map<string, Gig[]>();
    for (const g of arr) { const b = m.get(g.date); if (b) b.push(g); else m.set(g.date, [g]); }
    return [...m.entries()].map(([date, dayGigs]) => ({ date, gigs: dayGigs }));
  };

  const order: { key: string; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "next", label: "Next week" },
    { key: "later", label: "Later" },
  ];
  return order
    .map((o) => ({ key: o.key, label: o.label, count: groups[o.key].length, days: toDays(groups[o.key]) }))
    .filter((b) => b.count > 0);
}
