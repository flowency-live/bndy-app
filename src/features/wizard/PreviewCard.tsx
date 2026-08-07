"use client";

import { MapPin } from "lucide-react";
import { TicketStub } from "@/components/TicketStub";
import { useArtistImageMap } from "@/lib/hooks";
import { avatarGradient, initials } from "@/domain/avatar";
import { formatTime } from "@/domain/dates";
import { cn } from "@/lib/cn";
import type { Draft } from "./lib";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dateParts(iso: string): { dow: string; label: string } {
  const [y, m, d] = iso.split("-").map(Number);
  return { dow: DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], label: `${d} ${MON[m - 1]}` };
}

function Slab({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[76px] rounded-xl bg-card2 px-3 py-1.5 text-center" style={{ boxShadow: "inset 0 2.5px 0 var(--acc)" }}>
      <div className="text-[9px] font-extrabold uppercase tracking-[1.2px] text-dim">{label}</div>
      <div className="tnum mt-0.5 text-[13.5px] font-black leading-tight">{value}</div>
    </div>
  );
}

/** The gig card that assembles itself as the wizard progresses — the wizard's signature.
 *  Empty slots render as ghost placeholders so users see what's still to come. */
export function PreviewCard({ draft, compact }: { draft: Draft; compact?: boolean }) {
  const imgMap = useArtistImageMap();
  const artistName = draft.artistName ?? draft.newArtist?.name;
  const src = draft.artistId ? imgMap.get(draft.artistId) : undefined;
  const seed = draft.artistId ?? artistName ?? draft.venueId ?? "bndy";

  return (
    <div className="bndy-card overflow-hidden rounded-2xl border border-line bg-card">
      {!compact && (
        <div className="relative h-28">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={artistName ?? ""} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ background: artistName ? avatarGradient(seed) : "var(--card2)" }}>
              <span className={cn("text-[30px] font-black drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]", artistName ? "text-white/95" : "text-dim2")}>
                {artistName ? initials(artistName) : "?"}
              </span>
            </div>
          )}
          {draft.ticketed && <TicketStub onCard className="absolute right-2.5 top-2.5" />}
        </div>
      )}
      <div className="p-3.5">
        <div className={cn("text-[17px] font-black leading-tight tracking-tight", !artistName && "text-dim2")}>
          {draft.title || artistName || "Who's playing?"}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-dim">
          <MapPin size={12} className="shrink-0 opacity-70" />
          {draft.venueName ? (
            <span className="truncate">
              at <span className="font-extrabold text-txt">{draft.venueName}</span>
              {draft.venueCity ? ` · ${draft.venueCity}` : ""}
            </span>
          ) : (
            <span className="text-dim2">Where&apos;s it happening?</span>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {draft.date ? <Slab label={dateParts(draft.date).dow} value={dateParts(draft.date).label} /> : <div className="rounded-xl border border-dashed border-line px-3 py-1.5 text-[11px] font-bold text-dim2">date</div>}
          {draft.startTime && <Slab label={draft.endTime ? "Time" : "From"} value={`${formatTime(draft.startTime)}${draft.endTime ? ` – ${formatTime(draft.endTime)}` : ""}`} />}
        </div>
      </div>
    </div>
  );
}
