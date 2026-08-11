"use client";

// Favourites state (backlog feature 3). One query, optimistic toggles.
// Server model: string sets on the user record. See users-lambda.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { fetchFavourites, toggleFavourite, type FavouriteType, type Favourites } from "@/lib/auth/authApi";
import { useAuth } from "@/lib/auth/AuthProvider";

const KEY = ["favourites"];
const EMPTY: Favourites = { artistIds: [], venueIds: [] };

export function useFavourites() {
  const { isAuthenticated } = useAuth();
  const { data } = useQuery({
    queryKey: KEY,
    queryFn: fetchFavourites,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const fav = isAuthenticated ? (data ?? EMPTY) : EMPTY;
  const artistSet = useMemo(() => new Set(fav.artistIds), [fav.artistIds]);
  const venueSet = useMemo(() => new Set(fav.venueIds), [fav.venueIds]);

  const isFavourite = useCallback(
    (type: FavouriteType, id: string) => (type === "artist" ? artistSet.has(id) : venueSet.has(id)),
    [artistSet, venueSet],
  );

  const hasAny = artistSet.size > 0 || venueSet.size > 0;

  return { artistSet, venueSet, isFavourite, hasAny };
}

export function useToggleFavourite() {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ type, id, favourite }: { type: FavouriteType; id: string; favourite: boolean }) =>
      toggleFavourite(type, id, favourite),
    onMutate: async ({ type, id, favourite }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<Favourites>(KEY) ?? EMPTY;
      const field = type === "artist" ? "artistIds" : "venueIds";
      const next = favourite
        ? Array.from(new Set([...prev[field], id]))
        : prev[field].filter((x) => x !== id);
      qc.setQueryData<Favourites>(KEY, { ...prev, [field]: next });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });

  return mutation.mutate;
}
