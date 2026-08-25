// Feature 12  -  the bill on a gig. Pure. No I/O.
//
// The backend stores act 1 in `artistId` and the rest in `collaboratingArtistIds`,
// then denormalises both into `artistIds` + `artistNames` on read. Billing is a
// SEPARATE fact: `headlineArtistIds` lists the acts billed as headline, and every
// other act on the bill is support. All acts may be headline at once (a co-headline
// bill). When `headlineArtistIds` is absent, act 1 is the headliner  -  so every gig
// created before this feature reads correctly with no backfill.
//
// `artistId` means "the first act in display order". It does NOT mean "headliner".

/** Structural input. `Gig` satisfies it, and so does the wizard draft shape and
 *  `GigNameParts`, so this module never has to import a concrete type. */
export interface BillParts {
  artistId?: string;
  artistName?: string;
  title?: string;
  isOpenMic?: boolean;
  artistIds?: string[];
  artistNames?: string[];
  headlineArtistIds?: string[];
}

export interface Act {
  id: string;
  name: string;
  headline: boolean;
}

/** Every act on the bill, in display order. Empty for an open mic with no host. */
export function lineupOf(gig: BillParts): Act[] {
  const ids = gig.artistIds?.length ? gig.artistIds : gig.artistId ? [gig.artistId] : [];
  if (ids.length === 0) return [];

  // Names come denormalised and parallel to artistIds. Fall back to the single
  // artistName for act 1, then to a neutral label rather than an empty string.
  const names = gig.artistNames ?? [];
  const headlineSet = new Set(
    gig.headlineArtistIds?.length ? gig.headlineArtistIds : ids.slice(0, 1),
  );

  return ids.map((id, i) => ({
    id,
    name: names[i] || (i === 0 ? gig.artistName : undefined) || "Unknown act",
    headline: headlineSet.has(id),
  }));
}

export function headlineActs(gig: BillParts): Act[] {
  const all = lineupOf(gig);
  const billed = all.filter((a) => a.headline);
  // Defensive: a bill where nothing is marked headline still needs a headliner.
  return billed.length > 0 ? billed : all.slice(0, 1);
}

export function supportActs(gig: BillParts): Act[] {
  const heads = new Set(headlineActs(gig).map((a) => a.id));
  return lineupOf(gig).filter((a) => !heads.has(a.id));
}

/** True when the gig carries more than one act. */
export function hasBill(gig: BillParts): boolean {
  return lineupOf(gig).length > 1;
}

/** Card label. Headline acts only  -  support never enters the label, so the card
 *  stays quiet on a four-act bill. Contains no em-dash. */
export function lineupLabel(gig: BillParts): string {
  const acts = lineupOf(gig);
  if (acts.length === 0) return gig.isOpenMic ? "Open mic" : gig.title || "Live music";
  return headlineActs(gig).map((a) => a.name).join(" + ");
}

/** Small chip beside the label: "+2 acts". Empty string when there is no support. */
export function supportChipLabel(gig: BillParts): string {
  const n = supportActs(gig).length;
  return n === 0 ? "" : n === 1 ? "+1 act" : `+${n} acts`;
}

/** Artist-page row context: "Supporting The Foo" when this artist is not billed
 *  as headline on the gig. Empty string when they are, or when there is no bill. */
export function supportingLabel(gig: BillParts, artistId: string): string {
  const acts = lineupOf(gig);
  if (acts.length < 2) return "";
  const me = acts.find((a) => a.id === artistId);
  if (!me || me.headline) return "";
  const heads = headlineActs(gig).map((a) => a.name).join(" + ");
  return heads ? `Supporting ${heads}` : "";
}

/** Wizard title inference, mirroring the ACTION-21 server rule so the preview
 *  matches what is saved. `headlineIds` defaults to [acts[0]]. */
export function billTitle(
  acts: { id: string; name: string }[],
  venueName: string | undefined,
  headlineIds?: string[],
): string {
  if (acts.length === 0 || !venueName) return "";
  const heads = headlineIds?.length ? acts.filter((a) => headlineIds.includes(a.id)) : acts.slice(0, 1);
  const billed = heads.length > 0 ? heads : acts.slice(0, 1);
  // Every act headline reads as a co-headline bill. One headline plus support
  // reads as the headliner alone; the support acts show on the card, not the title.
  return `${billed.map((a) => a.name).join(" + ")} @ ${venueName}`;
}
