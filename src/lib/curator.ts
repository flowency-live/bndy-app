"use client";

// Curator API + hooks (backlog feature 4). Server gates every call by role;
// the UI only decides what to show. All calls send the session cookie.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";

import { apiBase } from "@/lib/apiBase";

// Same-origin on bndy.live (session cookie is scoped .bndy.live): an absolute
// api.bndy.co.uk call carries no cookie and every curator write 401s.
const BASE = apiBase();

export type CuratorEntity = "artist" | "venue" | "event" | "festival";

/** Full festival record from the curator read - drafts included. */
export interface CuratorFestivalRecord {
  id: string;
  slug: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  town?: string;
  location?: string;
  primaryVenueId?: string;
  venueIds?: string[];
  ticketed?: boolean;
  price?: string;
  ticketUrl?: string;
  websiteUrl?: string;
  lineupUrl?: string;
  posterImageUrl?: string;
  isPublic?: boolean;
  createdBy?: string;
  createdByName?: string;
}

export interface FestivalTagResult {
  tagged: string[];
  untagged: string[];
  skipped: { id: string; reason: string }[];
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export const curatorApi = {
  updateArtist: (id: string, fields: Record<string, unknown>) => send("PUT", `/api/curator/artists/${id}`, fields),
  updateVenue: (id: string, fields: Record<string, unknown>) => send("PUT", `/api/curator/venues/${id}`, fields),
  updateEvent: (id: string, fields: Record<string, unknown>) => send("PUT", `/api/curator/events/${id}`, fields),
  hide: (type: CuratorEntity, id: string, reason?: string) =>
    send("POST", `/api/curator/${type}s/${id}/hide`, { reason: reason || null }),
  restore: (type: CuratorEntity, id: string) => send("POST", `/api/curator/${type}s/${id}/restore`),
  // Feature 7: cancel is public information, not a hide.
  cancelEvent: (id: string, reason?: string) => send("POST", `/api/curator/events/${id}/cancel`, { reason: reason || null }),
  uncancelEvent: (id: string) => send("POST", `/api/curator/events/${id}/uncancel`),
  // Festival curator builder (FESTIVAL-CURATOR-PLAN.md). Creates are born drafts.
  createFestival: (fields: Record<string, unknown>) =>
    send<{ festivalId: string; slug: string }>("POST", "/api/curator/festivals", fields),
  getFestival: (idOrSlug: string) =>
    send<{ festival: CuratorFestivalRecord }>("GET", `/api/curator/festivals/${encodeURIComponent(idOrSlug)}`),
  updateFestival: (id: string, fields: Record<string, unknown>) =>
    send<{ festival: CuratorFestivalRecord }>("PATCH", `/api/curator/festivals/${id}`, fields),
  tagFestivalEvents: (payload: { festivalId: string; festivalName?: string; add?: string[]; remove?: string[] }) =>
    send<FestivalTagResult>("POST", "/api/curator/events/festival-tag", payload),
};

export interface ActivityEntry {
  at: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  detail: string | null;
}

export function useMyActivity() {
  const { isAuthenticated } = useAuth();
  return useQuery<{ entries: ActivityEntry[] }>({
    queryKey: ["my-activity"],
    queryFn: () => send("GET", "/users/activity"),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

/** Invalidate every cache a curator write can touch. */
export function useCuratorInvalidate() {
  const qc = useQueryClient();
  return async (type: CuratorEntity, id: string) => {
    const keys: string[][] =
      type === "artist" ? [["artists"], ["artist", id], ["gigs"], ["artist-gigs", id]]
      : type === "venue" ? [["venues"], ["venue", id], ["gigs"], ["venue-gigs", id]]
      : type === "festival" ? [["festivals"], ["festival", id], ["curator-festival", id], ["gigs"]]
      : [["gigs"]];
    await Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
    qc.invalidateQueries({ queryKey: ["my-activity"] });
  };
}
