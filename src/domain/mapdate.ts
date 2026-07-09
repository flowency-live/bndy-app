// Map "when" selection: Today (default), a specific day within the next fortnight,
// or a weekend (this / next). Anything further ahead → the full gig list.

import { addDaysISO } from "./dates";

export type MapDateSel =
  | { kind: "today" }
  | { kind: "date"; date: string }
  | { kind: "weekend"; which: "this" | "next" };

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dowOf(iso: string): number { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).getDay(); }

/** N consecutive days starting today. */
export function nextDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDaysISO(today, i));
}

/** The [Fri, Sat, Sun] of this or next weekend. */
export function weekendDates(which: "this" | "next", today: string): string[] {
  const mondayIdx = (dowOf(today) + 6) % 7; // Mon=0 … Sun=6
  const friOffset = 4 - mondayIdx + (which === "next" ? 7 : 0);
  const fri = addDaysISO(today, friOffset);
  return [fri, addDaysISO(fri, 1), addDaysISO(fri, 2)];
}

export function matchesMapDate(gigDate: string, sel: MapDateSel, today: string): boolean {
  switch (sel.kind) {
    case "today": return gigDate === today;
    case "date": return gigDate === sel.date;
    case "weekend": return weekendDates(sel.which, today).includes(gigDate);
  }
}

export function dayLabel(iso: string, today: string): string {
  if (iso === today) return "Today";
  if (iso === addDaysISO(today, 1)) return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number);
  return `${DOW[new Date(y, m - 1, d).getDay()]} ${d} ${MON[m - 1]}`;
}

export function mapDateLabel(sel: MapDateSel, today: string): string {
  switch (sel.kind) {
    case "today": return "Today";
    case "date": return dayLabel(sel.date, today);
    case "weekend": return sel.which === "this" ? "This weekend" : "Next weekend";
  }
}

/** The single focused day for a selection, or null for weekends (used by the ± stepper). */
export function focusedDay(sel: MapDateSel, today: string): string | null {
  if (sel.kind === "today") return today;
  if (sel.kind === "date") return sel.date;
  return null;
}

/** Selection from a concrete day, collapsing today → {today}. */
export function selFromDay(date: string, today: string): MapDateSel {
  return date === today ? { kind: "today" } : { kind: "date", date };
}
