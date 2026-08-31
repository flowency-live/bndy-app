"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchArtist, fetchArtistGigs, fetchArtists, fetchFestival, fetchFestivals, fetchGigs, fetchGigsInView, fetchVenue, fetchVenueGigs, fetchVenues, type BBox } from "./api";
import type { Gig } from "@/domain/types";
import { todayISO, addDaysISO } from "@/domain/dates";
import { artistMap, matchesMyGigFilter, useMyGigFilter } from "@/lib/myGigFilter";

const MIN = 60 * 1000;

function useUpcomingGigsRaw(enabled = true) {
  const today = todayISO();
  const endDate = addDaysISO(today, 730);
  return useQuery({
    queryKey: ["gigs", "upcoming", today, endDate],
    queryFn: () => fetchGigs({ startDate: today, endDate }),
    enabled,
    staleTime: 5 * MIN,
    gcTime: 30 * MIN,
  });
}

/** Raw shared upcoming-gig catalogue: no festival enrichment and no My Gigs
 * filtering. Use this for simple existence/count joins. */
export function useUpcomingGigsBasic(enabled = true) {
  return useUpcomingGigsRaw(enabled);
}

export function useFestivals(enabled = true) {
  const today = todayISO();
  const endDate = addDaysISO(today, 730);
  return useQuery({
    queryKey: ["festivals", "upcoming", today, endDate],
    queryFn: () => fetchFestivals({ startDate: today, endDate }),
    enabled,
    staleTime: 5 * MIN,
    gcTime: 30 * MIN,
  });
}

export function useFestival(slug: string) {
  return useQuery({
    queryKey: ["festival", slug],
    queryFn: () => fetchFestival(slug),
    enabled: !!slug,
    staleTime: 2 * MIN,
    gcTime: 30 * MIN,
  });
}

/** Main enriched gig catalogue. Detail/sheet callers may pass `false` while
 * closed so hidden UI does not trigger the two-year discovery payload. */
export function useUpcomingGigs(enabled = true) {
  const query = useUpcomingGigsRaw(enabled);
  const { filter, isActive } = useMyGigFilter();
  const { data: artists = [] } = useArtists(enabled && isActive);
  const { data: festivals = [] } = useFestivals(enabled);
  const artistsById = useMemo(() => artistMap(artists), [artists]);
  const festivalsById = useMemo(() => new Map(festivals.map((f) => [f.id, f])), [festivals]);
  const enriched = useMemo(() => (query.data ?? []).map((gig) => {
    if (!gig.festivalId) return gig;
    const festival = festivalsById.get(gig.festivalId);
    if (!festival) return gig;
    return {
      ...gig,
      festivalName: gig.festivalName || festival.name,
      festivalSlug: gig.festivalSlug || festival.slug,
    };
  }), [query.data, festivalsById]);
  const data = useMemo(
    () => isActive ? enriched.filter((gig) => matchesMyGigFilter(gig, artistsById, filter)) : enriched,
    [enriched, isActive, artistsById, filter],
  );
  return { ...query, data };
}

/** Shared venue catalogue. `enabled=false` lets tabbed/detail surfaces avoid
 * downloading every venue until that catalogue is actually needed. */
export function useVenues(enabled = true) {
  return useQuery({ queryKey: ["venues"], queryFn: fetchVenues, enabled, staleTime: 10 * MIN, gcTime: 30 * MIN });
}
export function useVenue(id: string) {
  return useQuery({ queryKey: ["venue", id], queryFn: () => fetchVenue(id), enabled: !!id, staleTime: 10 * MIN });
}

/** Same opt-in gate as venues for screens that only need artists in a later tab/state.
 * Pass `{ gigging: true }` to fetch only artists with upcoming gigs (~80% smaller payload). */
export function useArtists(opts?: { enabled?: boolean; gigging?: boolean } | boolean) {
  const enabled = typeof opts === "boolean" ? opts : opts?.enabled ?? true;
  const gigging = typeof opts === "boolean" ? false : opts?.gigging ?? false;
  return useQuery({
    queryKey: ["artists", gigging ? "gigging" : "all"],
    queryFn: () => fetchArtists({ gigging }),
    enabled,
    staleTime: gigging ? 2 * MIN : 10 * MIN,
    gcTime: 30 * MIN,
  });
}
export function useArtist(id: string) {
  return useQuery({ queryKey: ["artist", id], queryFn: () => fetchArtist(id), enabled: !!id, staleTime: 10 * MIN });
}
export function useArtistGigs(id: string) {
  const today = todayISO();
  return useQuery({ queryKey: ["artist-gigs", id, today], queryFn: () => fetchArtistGigs(id, today), enabled: !!id, staleTime: 5 * MIN });
}
export function useVenueGigs(id: string) {
  const today = todayISO();
  return useQuery({ queryKey: ["venue-gigs", id, today], queryFn: () => fetchVenueGigs(id, today), enabled: !!id, staleTime: 5 * MIN });
}

/** artistId → profileImageUrl, from the cached artists list. */
export function useArtistImageMap(enabled = true): Map<string, string> {
  const { data: artists = [] } = useArtists(enabled);
  return useMemo(() => {
    const m = new Map<string, string>();
    for (const a of artists) if (a.profileImageUrl) m.set(a.id, a.profileImageUrl);
    return m;
  }, [artists]);
}

/** Round bbox to 2dp so tiny pans hit cache. */
function roundBBox(bbox: BBox): BBox {
  return {
    west: Math.round(bbox.west * 100) / 100,
    south: Math.round(bbox.south * 100) / 100,
    east: Math.round(bbox.east * 100) / 100,
    north: Math.round(bbox.north * 100) / 100,
  };
}

/** Fetch gigs within a viewport bbox (geo endpoint). My gigs is applied here too,
 * using the full upcoming-gig cache as the metadata fallback because the geo GSI
 * deliberately returns a very small event projection. */
export function useGigsInView(bbox: BBox | null, startDate: string, endDate: string) {
  const rounded = bbox ? roundBBox(bbox) : null;
  const query = useQuery({
    queryKey: ["gigs", "geo", rounded?.west, rounded?.south, rounded?.east, rounded?.north, startDate, endDate],
    queryFn: () => fetchGigsInView(rounded!, startDate, endDate),
    enabled: !!rounded,
    staleTime: MIN,
    gcTime: 5 * MIN,
    placeholderData: keepPreviousData,
  });

  const fullQuery = useUpcomingGigsRaw();
  const { filter, isActive } = useMyGigFilter();
  const { data: artists = [] } = useArtists(isActive);
  const artistsById = useMemo(() => artistMap(artists), [artists]);
  const fullById = useMemo(
    () => new Map<string, Gig>((fullQuery.data ?? []).map((gig): [string, Gig] => [gig.id, gig])),
    [fullQuery.data],
  );

  const data = useMemo(() => {
    if (!query.data || !isActive) return query.data;
    return {
      ...query.data,
      events: query.data.events.filter((event) => {
        const full = fullById.get(event.id);
        const candidate = full ?? ({ artistId: event.artistId } as Pick<Gig, "artistId" | "artistIds" | "isOpenMic">);
        return matchesMyGigFilter(candidate, artistsById, filter);
      }),
    };
  }, [query.data, isActive, fullById, artistsById, filter]);

  return { ...query, data };
}
