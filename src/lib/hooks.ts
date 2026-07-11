"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchArtist, fetchArtistGigs, fetchArtists, fetchGigs, fetchGigsInView, fetchVenue, fetchVenueGigs, fetchVenues, type BBox } from "./api";
import { todayISO, addDaysISO } from "@/domain/dates";

const MIN = 60 * 1000;

export function useUpcomingGigs() {
  const today = todayISO();
  const endDate = addDaysISO(today, 730); // ~2 years — some endpoints window out far-future gigs without an explicit endDate
  return useQuery({ queryKey: ["gigs", "upcoming", today, endDate], queryFn: () => fetchGigs({ startDate: today, endDate }), staleTime: 5 * MIN, gcTime: 30 * MIN });
}

export function useVenues() {
  return useQuery({ queryKey: ["venues"], queryFn: fetchVenues, staleTime: 10 * MIN, gcTime: 30 * MIN });
}
export function useVenue(id: string) {
  return useQuery({ queryKey: ["venue", id], queryFn: () => fetchVenue(id), enabled: !!id, staleTime: 10 * MIN });
}

export function useArtists() {
  return useQuery({ queryKey: ["artists"], queryFn: fetchArtists, staleTime: 10 * MIN, gcTime: 30 * MIN });
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

/** artistId → profileImageUrl, from the cached artists list. Used to show real avatars on gigs. */
export function useArtistImageMap(): Map<string, string> {
  const { data: artists = [] } = useArtists();
  return useMemo(() => {
    const m = new Map<string, string>();
    for (const a of artists) if (a.profileImageUrl) m.set(a.id, a.profileImageUrl);
    return m;
  }, [artists]);
}

const GEO_ENABLED = process.env.NEXT_PUBLIC_GEO_EVENTS === "1";

/** Round bbox to 2dp so tiny pans hit cache. */
function roundBBox(bbox: BBox): BBox {
  return {
    west: Math.round(bbox.west * 100) / 100,
    south: Math.round(bbox.south * 100) / 100,
    east: Math.round(bbox.east * 100) / 100,
    north: Math.round(bbox.north * 100) / 100,
  };
}

/** Fetch gigs within a viewport bbox (geo endpoint). Only enabled when NEXT_PUBLIC_GEO_EVENTS=1. */
export function useGigsInView(bbox: BBox | null, startDate: string, endDate: string) {
  const rounded = bbox ? roundBBox(bbox) : null;
  return useQuery({
    queryKey: ["gigs", "geo", rounded?.west, rounded?.south, rounded?.east, rounded?.north, startDate, endDate],
    queryFn: () => fetchGigsInView(rounded!, startDate, endDate),
    enabled: GEO_ENABLED && !!rounded,
    staleTime: MIN,
    gcTime: 5 * MIN,
    placeholderData: keepPreviousData,
  });
}
