"use client";

// Curator API + hooks (backlog feature 4). Server gates every call by role;
// the UI only decides what to show. All calls send the session cookie.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk";

export type CuratorEntity = "artist" | "venue" | "event";

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
      : [["gigs"]];
    await Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
    qc.invalidateQueries({ queryKey: ["my-activity"] });
  };
}
