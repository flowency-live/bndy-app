// Repeating open mic nights (backlog item 13). Pure date maths, no React.
// The wizard expands a repeat rule into individual dates client-side  - 
// each date becomes its own event through the existing create endpoint.
// All arithmetic runs on UTC noon so DST switches never shift a date.

export type RepeatPattern = "weekly" | "fortnightly" | "monthly";

/** Hard ceiling on a series: 26 events (~6 months of weekly nights). */
export const MAX_SERIES_EVENTS = 26;
/** A series can run at most 6 months ahead. */
export const MAX_SERIES_MONTHS = 6;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDINALS = ["first", "second", "third", "fourth"];

function toUtc(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}
function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, days: number): string {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** 1-based occurrence of this date's weekday within its month (13th → 2). */
export function weekdayOrdinal(iso: string): number {
  return Math.ceil(toUtc(iso).getUTCDate() / 7);
}

/** True when this date is its month's LAST occurrence of that weekday. */
function isLastOfMonth(iso: string): boolean {
  const d = toUtc(iso);
  return d.getUTCDate() + 7 > lastDayOfMonth(d.getUTCFullYear(), d.getUTCMonth());
}
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** The nth (1–4) given weekday of a month, or the last when nth = 5. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): string {
  if (nth >= 5) {
    const last = lastDayOfMonth(year, month);
    const d = new Date(Date.UTC(year, month, last, 12));
    const back = (d.getUTCDay() - weekday + 7) % 7;
    d.setUTCDate(d.getUTCDate() - back);
    return toIso(d);
  }
  const first = new Date(Date.UTC(year, month, 1, 12));
  const forward = (weekday - first.getUTCDay() + 7) % 7;
  first.setUTCDate(1 + forward + (nth - 1) * 7);
  return toIso(first);
}

/** Latest allowed end date for a series starting on this date. */
export function maxUntilIso(startIso: string): string {
  const d = toUtc(startIso);
  const targetMonth = d.getUTCMonth() + MAX_SERIES_MONTHS;
  const year = d.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = targetMonth % 12;
  const day = Math.min(d.getUTCDate(), lastDayOfMonth(year, month));
  return toIso(new Date(Date.UTC(year, month, day, 12)));
}

/**
 * Every date in the series, start date first. Monthly repeats keep the
 * start date's weekday-in-month position ("first Sunday"); a start date
 * that is the 5th or last such weekday repeats as "last".
 */
export function seriesDates(startIso: string, pattern: RepeatPattern, untilIso: string): string[] {
  const cap = untilIso < maxUntilIso(startIso) ? untilIso : maxUntilIso(startIso);
  const out: string[] = [];
  if (pattern === "weekly" || pattern === "fortnightly") {
    const step = pattern === "weekly" ? 7 : 14;
    let d = startIso;
    while (d <= cap && out.length < MAX_SERIES_EVENTS) {
      out.push(d);
      d = addDays(d, step);
    }
    return out;
  }
  // monthly, same weekday position
  const start = toUtc(startIso);
  const weekday = start.getUTCDay();
  const nth = isLastOfMonth(startIso) && weekdayOrdinal(startIso) >= 4 ? 5 : weekdayOrdinal(startIso);
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  while (out.length < MAX_SERIES_EVENTS) {
    const d = out.length === 0 ? startIso : nthWeekdayOfMonth(year, month, weekday, nth);
    if (d > cap) break;
    if (d >= startIso) out.push(d);
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }
  return out;
}

/** Plain-words description shown in the wizard: "every Tuesday" etc. */
export function describeRepeat(startIso: string, pattern: RepeatPattern): string {
  const day = DAY_NAMES[toUtc(startIso).getUTCDay()];
  if (pattern === "weekly") return `every ${day}`;
  if (pattern === "fortnightly") return `every other ${day}`;
  const nth = isLastOfMonth(startIso) && weekdayOrdinal(startIso) >= 4 ? 5 : weekdayOrdinal(startIso);
  const ord = nth >= 5 ? "last" : ORDINALS[nth - 1];
  return `the ${ord} ${day} of the month`;
}
