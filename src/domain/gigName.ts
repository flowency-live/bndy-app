// One display name for a gig everywhere (backlog item 13, open mic).
// A normal gig reads the artist name with the stored title as fallback.
// An open mic keeps its OWN name when the lister gave it one ("Jam Halen
// JAM Night"); auto-generated titles ("Open Mic @ The Glebe" — always
// contain " @ ") read as "Open mic" / "Open mic with {host}" instead.

export interface GigNameParts {
  isOpenMic?: boolean;
  artistName?: string;
  title: string;
}

function isCustomTitle(title?: string): boolean {
  if (!title) return false;
  const t = title.trim();
  if (!t || t.includes("@")) return false; // auto pattern: "X @ Venue"
  return !/^open mic$/i.test(t);
}

export function gigDisplayName(g: GigNameParts): string {
  if (g.isOpenMic) {
    if (isCustomTitle(g.title)) return g.title.trim();
    return g.artistName ? `Open mic with ${g.artistName}` : "Open mic";
  }
  return g.artistName || g.title;
}
