// One display name for a gig everywhere (backlog item 13, open mic).
// A normal gig reads the artist name with the stored title as fallback.
// An open mic keeps its OWN name when the lister gave it one ("Jam Halen
// JAM Night"); auto-generated titles ("Open Mic @ The Glebe" — always
// contain " @ ") read as "Open mic" / "Open mic with {host}" instead.

import { headlineActs } from "./lineup";

export interface GigNameParts {
  isOpenMic?: boolean;
  artistName?: string;
  title: string;
  /** Feature 12 — the bill. Absent on a single-act gig. */
  artistId?: string;
  artistIds?: string[];
  artistNames?: string[];
  headlineArtistIds?: string[];
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
  // Feature 12: a co-headline bill reads "A + B". A headliner with support acts
  // reads as the headliner alone; the support acts show as a chip on the card,
  // never in the name. That keeps a four-act bill quiet.
  const heads = headlineActs(g);
  if (heads.length > 1) return heads.map((a) => a.name).join(" + ");
  return g.artistName || heads[0]?.name || g.title;
}
