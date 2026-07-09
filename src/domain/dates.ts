const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function prettyDate(iso: string, today = todayISO()): string {
  if (iso === today) return "Tonight";
  if (iso === addDaysISO(today, 1)) return "Tomorrow";
  const d = parse(iso);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}
export function shortDate(iso: string): { day: number; mon: string } {
  const d = parse(iso);
  return { day: d.getDate(), mon: MON[d.getMonth()] };
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
