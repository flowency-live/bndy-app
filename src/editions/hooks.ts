"use client";

import { useMemo } from "react";
import { useArtists, useFestivals, useUpcomingGigsBasic } from "@/lib/hooks";
import { isPublishedInEdition } from "@/domain/edition";

/**
 * Brass-only wrappers deliberately sit on top of the existing live hooks.
 * The live hooks are left untouched. Legacy records have no brass scope and
 * therefore cannot leak into these views.
 */
export function useBrassBands(enabled = true) {
  const query = useArtists(enabled);
  const data = useMemo(
    () => (query.data ?? []).filter(
      (artist) => artist.performerKind === "brass_band" && isPublishedInEdition(artist, "brass"),
    ),
    [query.data],
  );
  return { ...query, data };
}

export function useBrassConcerts(enabled = true) {
  const query = useUpcomingGigsBasic(enabled);
  const data = useMemo(
    () => (query.data ?? []).filter((gig) => isPublishedInEdition(gig, "brass")),
    [query.data],
  );
  return { ...query, data };
}

export function useBrassFestivals(enabled = true) {
  const query = useFestivals(enabled);
  const data = useMemo(
    () => (query.data ?? []).filter((festival) => isPublishedInEdition(festival, "brass")),
    [query.data],
  );
  return { ...query, data };
}
