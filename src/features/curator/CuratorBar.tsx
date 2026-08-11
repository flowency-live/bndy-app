"use client";

// Edit + Hide controls, shown only to curators and staff.
// The server enforces the role again on every call.

import { useState } from "react";
import { CalendarX, EyeOff, Pencil, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CancelGigSheet } from "./CancelGigSheet";
import { EditArtistSheet, EditGigSheet, EditVenueSheet, HideSheet } from "./CuratorSheets";
import type { Artist, Gig, Venue } from "@/domain/types";
import { cn } from "@/lib/cn";

const btn =
  "flex items-center gap-1.5 rounded-xl border border-line glass px-3 py-2 text-[12px] font-extrabold text-dim transition-colors hover:text-txt";

type Target =
  | { kind: "artist"; artist: Artist }
  | { kind: "venue"; venue: Venue }
  | { kind: "gig"; gig: Gig };

export function CuratorBar({ target, className, onHidden }: { target: Target; className?: string; onHidden?: () => void }) {
  const { isCurator } = useAuth();
  const [editing, setEditing] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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
      {target.kind === "gig" && (
        <button type="button" onClick={() => setCancelling(true)} className={btn}>
          {target.gig.cancelled
            ? <><RotateCcw size={13} className="text-emerald-400" /> Un-cancel</>
            : <><CalendarX size={13} className="text-amber-400" /> Cancel</>}
        </button>
      )}
      <button type="button" onClick={() => setHiding(true)} className={btn}>
        <EyeOff size={13} className="text-red-400" /> Hide
      </button>

      {target.kind === "artist" && <EditArtistSheet artist={target.artist} open={editing} onClose={() => setEditing(false)} />}
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
