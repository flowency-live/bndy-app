// Alphabetical grouping with a leading "#" bucket for digits/symbols.

export function alphaKey(name: string): string {
  const c = (name ?? "").trim().charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

export interface AlphaGroup<T> {
  key: string;
  items: T[];
}

/** Groups items by first-letter bucket, "#" first, then A–Z. Items within a group keep input order. */
export function groupByInitial<T>(items: T[], nameOf: (t: T) => string): AlphaGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const k = alphaKey(nameOf(it));
    const bucket = map.get(k);
    if (bucket) bucket.push(it);
    else map.set(k, [it]);
  }
  const keys = [...map.keys()].sort((a, b) => (a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b)));
  return keys.map((key) => ({ key, items: map.get(key)! }));
}

/** The full A–Z index plus "#", for a jump bar (letters with no items are still returned). */
export const ALPHA_INDEX: string[] = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
