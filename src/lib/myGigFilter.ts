"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Artist, Gig } from "@/domain/types";
import { fetchGigFilter, updateGigFilter, type GigFilter } from "@/lib/auth/authApi";
import { useAuth } from "@/lib/auth/AuthProvider";

export const EMPTY_GIG_FILTER: GigFilter = { genres: [], actTypes: [], includeOpenMic: false, enabled: false };

function keyFor(userId?: string | null) { return ["my-gig-filter", userId ?? "signed-out"] as const; }

export function hasGigFilterCriteria(filter: GigFilter) {
  return filter.genres.length > 0 || filter.actTypes.length > 0 || filter.includeOpenMic;
}

export function gigFilterCriteriaCount(filter: GigFilter) {
  return filter.genres.length + filter.actTypes.length + (filter.includeOpenMic ? 1 : 0);
}

export function useMyGigFilter() {
  const { isAuthenticated, user } = useAuth();
  const queryKey = keyFor(user?.id);
  const { data, isLoading } = useQuery({ queryKey, queryFn: fetchGigFilter, enabled: isAuthenticated, staleTime: 5 * 60 * 1000 });
  const filter = isAuthenticated ? (data ?? EMPTY_GIG_FILTER) : EMPTY_GIG_FILTER;
  const hasCriteria = hasGigFilterCriteria(filter);
  return {
    filter,
    hasCriteria,
    isActive: isAuthenticated && hasCriteria && filter.enabled,
    criteriaCount: gigFilterCriteriaCount(filter),
    isLoading,
    queryKey,
  };
}

export function useSaveMyGigFilter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = keyFor(user?.id);
  return useMutation({
    mutationFn: updateGigFilter,
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<GigFilter>(queryKey);
      qc.setQueryData<GigFilter>(queryKey, next);
      return { prev };
    },
    onError: (_error, _next, ctx) => { if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev); },
    onSuccess: (saved) => qc.setQueryData<GigFilter>(queryKey, saved),
    onSettled: () => { qc.invalidateQueries({ queryKey }); },
  });
}

export function useToggleMyGigFilter() {
  const { filter, hasCriteria } = useMyGigFilter();
  const save = useSaveMyGigFilter();
  const toggle = useCallback(() => {
    if (!hasCriteria || save.isPending) return;
    save.mutate({ ...filter, enabled: !filter.enabled });
  }, [filter, hasCriteria, save]);
  return { toggle, isPending: save.isPending };
}

export function artistMap(artists: Artist[]) { return new Map(artists.map((artist) => [artist.id, artist])); }

/** Values within a category are ORed; categories are ANDed; Open Mic is additive. */
export function matchesMyGigFilter(
  gig: Pick<Gig, "artistId" | "artistIds" | "isOpenMic">,
  artistsById: Map<string, Artist>,
  filter: GigFilter,
) {
  if (!hasGigFilterCriteria(filter)) return true;
  if (filter.includeOpenMic && gig.isOpenMic) return true;
  const needsArtistMatch = filter.genres.length > 0 || filter.actTypes.length > 0;
  if (!needsArtistMatch) return false;
  const ids = gig.artistIds?.length ? gig.artistIds : gig.artistId ? [gig.artistId] : [];
  const wantedGenres = new Set(filter.genres.map((g) => g.toLowerCase()));
  const wantedActs = new Set(filter.actTypes.map((a) => a.toLowerCase()));
  return ids.some((id) => {
    const artist = artistsById.get(id);
    if (!artist) return false;
    const genresOk = wantedGenres.size === 0 || (artist.genres ?? []).some((g) => wantedGenres.has(g.toLowerCase()));
    const actsOk = wantedActs.size === 0 || (artist.actType ?? []).some((a) => wantedActs.has(a.toLowerCase()));
    return genresOk && actsOk;
  });
}

export function describeGigFilter(filter: GigFilter) {
  const parts: string[] = [];
  if (filter.genres.length) parts.push(filter.genres.join(" / "));
  if (filter.actTypes.length) {
    const labels: Record<string, string> = { originals: "Originals", covers: "Covers", tribute: "Tribute", acoustic: "Acoustic" };
    parts.push(filter.actTypes.map((x) => labels[x] ?? x).join(" / "));
  }
  if (filter.includeOpenMic) parts.push("+ Open Mic");
  return parts.join(" · ") || "No preferences selected";
}
