"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchBrassBands,
  fetchBrassConcerts,
  fetchBrassFestivals,
  fetchBrassProductions,
} from "./brass-api";

const MIN = 60 * 1000;

export function useBrassBands(enabled = true) {
  return useQuery({
    queryKey: ["brass", "bands"],
    queryFn: fetchBrassBands,
    enabled,
    staleTime: 10 * MIN,
    gcTime: 30 * MIN,
  });
}

export function useBrassConcerts(enabled = true) {
  return useQuery({
    queryKey: ["brass", "concerts"],
    queryFn: fetchBrassConcerts,
    enabled,
    staleTime: 5 * MIN,
    gcTime: 30 * MIN,
  });
}

export function useBrassFestivals(enabled = true) {
  return useQuery({
    queryKey: ["brass", "festivals"],
    queryFn: fetchBrassFestivals,
    enabled,
    staleTime: 5 * MIN,
    gcTime: 30 * MIN,
  });
}

export function useBrassProductions(bandId?: string, enabled = true) {
  return useQuery({
    queryKey: ["brass", "productions", bandId ?? "all"],
    queryFn: () => fetchBrassProductions(bandId),
    enabled,
    staleTime: 10 * MIN,
    gcTime: 30 * MIN,
  });
}
