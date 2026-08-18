"use client";

import { MapPin, Mic } from "lucide-react";
import { TicketStub } from "@/components/TicketStub";
import { useArtistImageMap } from "@/lib/hooks";
import { avatarGradient, initials } from "@/domain/avatar";
import { formatTime, DOW, MON } from "@/domain/dates";
import { cn } from "@/lib/cn";
import { draftActs, type Draft } from "./lib";

function dateParts(iso: string): { dow: string; label: string } {
  const [y, m, d] = iso.split("-").map(Number);
  return { dow: DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], label: `${d} ${MON[m - 1]}` };
}

function Slab({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[88px] border border-line-hi bg-card2 px-3 py-2 text-center shadow-[inset_0_3px_0_var(--acc)]">
      <div className="text-[9px] font-black uppercase tracking-[1.35px] text-dim">{label}</div>
      <div className="tnum mt-0.5 text-[14px] font-black leading-tight text-txt">{value}</div>
    </div>
  );
}

export function PreviewCard({ draft, compact }: { draft: Draft; compact?: boolean }) {
  const imgMap = useArtistImageMap();
  const acts = draftActs(draft);
  const heads = draft.headlineIds?.length ? draft.headlineIds : acts.slice(0, 1).map((a) => a.id);
  const support = acts.filter((a) => !heads.includes(a.id));
  const artistName = draft.artistName ?? draft.newArtist?.name;
  const src = draft.artistId ? imgMap.get(draft.artistId) : undefined;
  const seed = draft.artistId ?? artistName ?? draft.venueId ?? "bndy";

  return (
    <div className="bndy-card relative overflow-hidden border-2 border-line-hi bg-card shadow-[var(--sh-lg)]">
      <div className="h-1.5 w-full bg-acc" />
      {!compact && (
        <div className="relative h-32 border-b-2 border-line-hi">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={artistName ?? ""} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ background: artistName || draft.isOpenMic ? avatarGradient(seed) : "var(--card2)" }}>
              {draft.isOpenMic && !artistName ? (
                <Mic size={34} className="text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]" />
              ) : (
                <span className={cn("text-[34px] font-black drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]", artistName ? "text-white/95" : "text-dim2")}>
                  {artistName ? initials(artistName) : "?"}
                </span>
              )}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/45 to-transparent" />
          {draft.ticketed && <TicketStub onCard className="absolute right-3 top-3" />}
        </div>
      )}

      <div className="p-4">
        <div className="mb-2 text-[9.5px] font-black uppercase tracking-[1.8px] text-[var(--acc)]">bndy gig</div>
        <div className={cn("text-[20px] font-black leading-[1.05] tracking-tight text-txt", !artistName && !draft.isOpenMic && "text-dim2")}>
          {draft.title || artistName || "Who's playing?"}
        </div>
        {support.length > 0 && (
          <div className="mt-1.5 truncate text-[12.5px] font-bold text-dim">
            with {support.map((a) => a.name).join(", ")}
          </div>
        )}

        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-dim">
            <MapPin size={13} className="shrink-0 text-[var(--acc2)]" />
            {draft.venueName ? (
              <span className="truncate">
                at <span className="font-extrabold text-txt">{draft.venueName}</span>
                {draft.venueCity ? ` · ${draft.venueCity}` : ""}
              </span>
            ) : (
              <span className="text-dim2">Where&apos;s it happening?</span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {draft.date ? <Slab label={dateParts(draft.date).dow} value={dateParts(draft.date).label} /> : <div className="border border-dashed border-line-hi px-3 py-2 text-[11px] font-bold text-dim2">date</div>}
            {draft.startTime && <Slab label={draft.endTime ? "Time" : "From"} value={`${formatTime(draft.startTime)}${draft.endTime ? ` – ${formatTime(draft.endTime)}` : ""}`} />}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line-hi bg-card2 px-4 py-2.5">
        <span className="text-[9px] font-black uppercase tracking-[1.5px] text-dim">live music near you</span>
        <span className="text-[10px] font-black text-[var(--acc)]">bndy</span>
      </div>
    </div>
  );
}
