// Deterministic monogram avatars until real images arrive from the API.

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "·";
}

export function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** CSS gradient string for an id-derived avatar. */
export function avatarGradient(id: string): string {
  const h = hueFromId(id);
  return `linear-gradient(140deg, hsl(${h} 85% 55%), hsl(${(h + 40) % 360} 80% 42%))`;
}
