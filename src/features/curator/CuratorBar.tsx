"use client";

// Edit + Hide controls, shown only to curators and staff.
// The server enforces the role again on every call.

import { useState } from "react";
import dynamic from "next/dynamic";
import { CalendarDays, CalendarX, EyeOff, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CancelGigSheet } from "./CancelGigSheet";
import { EditArtistSheet, EditGigSheet, EditVenueSheet, HideSheet } from "./CuratorSheets";
import { getOwnedArtistProfile } from "@/features/artists/artistManagementApi";
import { curatorApi } from "@/lib/curator";
import type { Artist, Gig, Venue } from "@/domain/types";
import { cn } from "@/lib/cn";

const ArtistAvailabilityEditor = dynamic(
  () => import("@/features/artists/ArtistAvailabilityEditor").then((module) => module.ArtistAvailabilityEditor),
  { ssr: false }
);

const btn =
  "flex items-center gap-1.5 rounded-xl border border-line glass px-3 py-2 text-[12px] font-extrabold text-dim transition-colors hover:text-txt";

type Target =
  | { kind: "artist"; artist: Artist }
  | { kind: "venue"; venue: Venue }
  | { kind: "gig"; gig: Gig };

export function CuratorBar({ target, className, onHidden, onArtistUpdated, onAvailabilityUpdated }: {
  target: Target;
  className?: string;
  onHidden?: () => void;
  onArtistUpdated?: (artist: Artist) => void;
  onAvailabilityUpdated?: (availability: import("@/domain/types").AvailabilityDate[]) => void;
}) {
  const { isCurator } = useAuth();
  const [editing, setEditing] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  if (!isCurator) return null;

  const name =
    target.kind === "artist" ? target.artist.name : target.kind === "venue" ? target.venue.name : target.gig.title;
  const id = target.kind === "artist" ? target.artist.id : target.kind === "venue" ? target.venue.id : target.gig.id;
  const entityType = target.kind === "gig" ? "event" : target.kind;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button type="button" onClick={() => setEditing(true)} className={btn}>
        <Pencil size={13} className="text-[var(--acc)]" /> Edit
      </button>
      {target.kind === "artist" && (
        <button type="button" onClick={() => setAvailabilityOpen(true)} className={btn}>
          <CalendarDays size={14} className="text-[var(--acc)]" /> Availability
        </button>
      )}
      {target.kind === "gig" && (
        <button type="button" onClick={() => setCancelling(true)} className={btn}>
          {target.gig.cancelled
            ? <><RotateCcw size={13} className="text-emerald-400" /> Un-cancel</>
            : <><CalendarX size={13} className="text-amber-400" /> Cancel</>}
        </button>
      )}
      {target.kind === "gig" ? (
        <button type="button" onClick={() => setHiding(true)} className={btn}>
          <Trash2 size={13} className="text-red-400" /> Delete
        </button>
      ) : (
        <button type="button" onClick={() => setHiding(true)} className={btn}>
          <EyeOff size={13} className="text-red-400" /> Hide
        </button>
      )}

      {target.kind === "artist" && (
        <EditArtistSheet
          artist={target.artist}
          open={editing}
          onClose={() => setEditing(false)}
          saveArtist={async (fields) => {
            const result = await curatorApi.updateArtist(target.artist.id, fields);
            const updated = await getOwnedArtistProfile(target.artist.id);
            onArtistUpdated?.(updated);
            return result;
          }}
        />
      )}
      {target.kind === "artist" && (
        <ArtistAvailabilityEditor
          artist={target.artist}
          open={availabilityOpen}
          onClose={() => setAvailabilityOpen(false)}
          onArtistUpdated={(updated) => onArtistUpdated?.(updated)}
          onAvailabilityUpdated={(updated) => onAvailabilityUpdated?.(updated)}
        />
      )}
      {target.kind === "venue" && <EditVenueSheet venue={target.venue} open={editing} onClose={() => setEditing(false)} />}
      {target.kind === "gig" && <EditGigSheet gig={target.gig} open={editing} onClose={() => setEditing(false)} />}

      {target.kind === "gig" && (
        <CancelGigSheet gig={target.gig} open={cancelling} onClose={() => setCancelling(false)} />
      )}

      <HideSheet
        type={entityType}
        id={id}
        name={name}
        open={hiding}
        onClose={() => {
          setHiding(false);
          onHidden?.();
        }}
      />
    </div>
  );
}
