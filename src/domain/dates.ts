export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const MON_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

/** Local "today" as YYYY-MM-DD. */
export function todayISO(base: Date = new Date()): string {
  return isoOf(new Date(base.getFullYear(), base.getMonth(), base.getDate()));
}
export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return isoOf(new Date(y, m - 1, d + n));
}
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
/** @deprecated Use parseISO */
const parse = parseISO;

/** A gig starting at or after this hour counts as an evening gig. */
export const EVENING_FROM = "17:00";

/**
 * "Tonight" means today AND an evening start. A 2pm gig today is "Today".
 * A gig today with no start time is "Today" — we cannot claim an evening we do not know.
 * This is the single source for the label, the badge and the card accent. Do not
 * re-test `date === today` at a call site; that is the bug this replaces.
 */
export function isTonight(iso: string, startTime?: string, today = todayISO()): boolean {
  if (iso !== today) return false;
  if (!startTime) return false;
  return startTime >= EVENING_FROM;
}

export function prettyDate(iso: string, startTime?: string, today = todayISO()): string {
  if (iso === today) return isTonight(iso, startTime, today) ? "Tonight" : "Today";
  if (iso === addDaysISO(today, 1)) return "Tomorrow";
  const d = parse(iso);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

/** Minutes from start to end, wrapping past midnight (21:00–00:30 is 210, not −1230). */
export function spanMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins < 0 ? mins + 1440 : mins;
}

/** Above this, a start–end pair is a venue opening window, not a set time. */
export const MAX_SET_MINUTES = 240;

/**
 * Sources often give venue opening hours instead of a stage time, which rendered
 * as `2pm – 8pm` on a gig card. Over four hours, show the start alone.
 */
export function isSetWindow(start?: string, end?: string): boolean {
  if (!start || !end) return false;
  const mins = spanMinutes(start, end);
  return mins > 0 && mins <= MAX_SET_MINUTES;
}

/** The value for a gig's time block: a range when it is a real set, otherwise the start alone. */
export function setTimeLabel(start?: string, end?: string): { label: "Time" | "From"; value: string } | null {
  if (!start) return null;
  return isSetWindow(start, end)
    ? { label: "Time", value: `${formatTime(start)} – ${formatTime(end)}` }
    : { label: "From", value: formatTime(start) };
}
export function formatTime(t?: string): string {
  if (!t) return "";
  const [hh, mm] = t.split(":").map(Number);
  const ap = hh >= 12 ? "pm" : "am";
  const h = hh % 12 || 12;
  return mm ? `${h}:${String(mm).padStart(2, "0")}${ap}` : `${h}${ap}`;
}

export type WhenRange = "all" | "tonight" | "weekend" | "week";

/** Whether a gig date is within a named range (feed semantics). */
export function inWhenRange(iso: string, range: WhenRange, today = todayISO()): boolean {
  if (iso < today) return false;
  switch (range) {
    case "all":
      return true;
    case "tonight":
      return iso === today;
    case "week":
      return iso <= addDaysISO(today, 6);
    case "weekend": {
      if (iso > addDaysISO(today, 7)) return false;
      const dow = parse(iso).getDay();
      return dow === 5 || dow === 6 || dow === 0;
    }
  }
}
