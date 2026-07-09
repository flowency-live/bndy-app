"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchArtist, fetchArtistGigs, fetchArtists, fetchGigs, fetchVenue, fetchVenueGigs, fetchVenues } from "./api";
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
