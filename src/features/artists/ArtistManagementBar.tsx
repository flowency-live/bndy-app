"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CalendarDays, Loader2, Pencil, RefreshCw } from "lucide-react";
import { EditArtistSheet } from "@/features/curator/CuratorSheets";
import { getOwnedArtistProfile, updateOwnedArtistProfile, type OwnedArtistProfileUpdate } from "./artistManagementApi";
import { useArtistManagementAccess } from "./useArtistManagementAccess";
import type { Artist } from "@/domain/types";

const ArtistAvailabilityEditor = dynamic(
  () => import("./ArtistAvailabilityEditor").then((module) => module.ArtistAvailabilityEditor),
  { ssr: false }
);

const button = "flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white/[0.035] px-3.5 text-[11.5px] font-black text-dim transition hover:border-line-hi hover:text-txt active:scale-[.98]";

export function ArtistManagementBar({
  artist,
  onArtistUpdated,
  onAvailabilityUpdated,
}: {
  artist: Artist;
  onArtistUpdated: (artist: Artist) => void;
  onAvailabilityUpdated: (availability: import("@/domain/types").AvailabilityDate[]) => void;
}) {
  const { canManage, membership } = useArtistManagementAccess(artist.id);
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["owned-artist-profile", artist.id],
    queryFn: () => getOwnedArtistProfile(artist.id),
    enabled: canManage,
    staleTime: 30_000,
  });
  const editableArtist = profileQuery.data ?? artist;
  const handledDeepLink = useRef(false);
  const [editing, setEditing] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  useEffect(() => {
    if (!canManage || !profileQuery.data || handledDeepLink.current) return;
    const url = new URL(window.location.href);
    const requested = url.searchParams.get("manage");
    if (requested === "profile") setEditing(true);
    if (requested === "availability") setAvailabilityOpen(true);
    if (requested) {
      handledDeepLink.current = true;
      url.searchParams.delete("manage");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [canManage, profileQuery.data]);

  if (!canManage) return null;

  return (
    <div className="mt-4 rounded-[20px] border border-[color-mix(in_srgb,var(--acc)_34%,var(--line))] bg-[color-mix(in_srgb,var(--acc)_7%,transparent)] p-3">
      <div className="flex items-center gap-2 px-1 text-[9.5px] font-black uppercase tracking-[1.15px] text-[var(--acc-text)]">
        <BadgeCheck size={13} /> You manage this artist · {membership?.role}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={!profileQuery.data} onClick={() => setEditing(true)} className={`${button} disabled:cursor-wait disabled:opacity-55`}>{profileQuery.isLoading ? <Loader2 size={14} className="animate-spin text-[var(--acc)]" /> : <Pencil size={14} className="text-[var(--acc)]" />} Edit profile and media</button>
        <button type="button" disabled={!profileQuery.data} onClick={() => setAvailabilityOpen(true)} className={`${button} disabled:cursor-wait disabled:opacity-55`}><CalendarDays size={15} className="text-[var(--acc)]" /> Availability</button>
      </div>
      {profileQuery.isError && <button type="button" onClick={() => profileQuery.refetch()} className="mt-2 flex min-h-9 items-center gap-2 px-1 text-[10.5px] font-bold text-red-400"><RefreshCw size={13} /> Could not load private profile settings. Retry</button>}

      <EditArtistSheet
        artist={editableArtist}
        open={editing}
        onClose={() => setEditing(false)}
        ownerMode
        saveArtist={async (fields) => {
          const updated = await updateOwnedArtistProfile(artist.id, fields as OwnedArtistProfileUpdate);
          queryClient.setQueryData(["owned-artist-profile", artist.id], updated);
          onArtistUpdated(updated);
          return updated;
        }}
      />
      <ArtistAvailabilityEditor
        artist={editableArtist}
        open={availabilityOpen}
        onClose={() => setAvailabilityOpen(false)}
        onArtistUpdated={onArtistUpdated}
        onAvailabilityUpdated={onAvailabilityUpdated}
      />
    </div>
  );
}
