// One display name for a gig everywhere (backlog item 13, open mic).
// An open mic reads "Open mic" or "Open mic with {host}"; a normal gig
// reads the artist name with the stored title as fallback.

export interface GigNameParts {
  isOpenMic?: boolean;
  artistName?: string;
  title: string;
}

export function gigDisplayName(g: GigNameParts): string {
  if (g.isOpenMic) return g.artistName ? `Open mic with ${g.artistName}` : "Open mic";
  return g.artistName || g.title;
}
