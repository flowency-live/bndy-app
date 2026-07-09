export function daysBetween(fromISO: string, toISO: string): number {
  const [ay, am, ad] = fromISO.split("-").map(Number);
  const [by, bm, bd] = toISO.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** Uppercase "IN 6 WEEKS" style label relative to today. */
export function relativeLabel(iso: string, today: string): string {
  const d = daysBetween(today, iso);
  if (d <= 0) return "TODAY";
  if (d === 1) return "TOMORROW";
  if (d < 7) return `IN ${d} DAYS`;
  const w = Math.round(d / 7);
  return `IN ${w} WEEK${w === 1 ? "" : "S"}`;
}
