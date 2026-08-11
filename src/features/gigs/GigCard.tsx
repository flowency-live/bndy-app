import { memo } from "react";
import { ChevronRight, MapPin, Mic } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { prettyDate, formatTime } from "@/domain/dates";
import { formatDistance } from "@/domain/geo";
import { gigDisplayName } from "@/domain/gigName";
import { cn } from "@/lib/cn";
import { TicketStub } from "@/components/TicketStub";
import type { Gig } from "@/domain/types";

export const GigCard = memo(function GigCard({ gig, imageUrl, distance, tonight, onClick }: { gig: Gig; imageUrl?: string; distance?: number; tonight: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "bndy-card flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3.5 text-left transition-transform active:scale-[.985]",
        tonight && !gig.cancelled && "border-[var(--acc)]",
        gig.cancelled && "opacity-50 saturate-50", // feature 7: ghosted row
      )}
    >
      <Avatar id={gig.artistId || gig.venueId} name={gig.artistName || gig.venueName} src={imageUrl} size={52} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-extrabold tracking-tight">{gigDisplayName(gig)}</div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] font-semibold text-dim">
          <MapPin size={13} className="shrink-0 opacity-70" />
          <span className="truncate">{gig.venueName}{gig.venueCity ? ` · ${gig.venueCity}` : ""}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {gig.cancelled && <Pill tone="cancelled">CANCELLED</Pill>}
          {gig.isOpenMic && <Pill tone="mic"><Mic size={10} strokeWidth={2.75} /> OPEN MIC</Pill>}
          <Pill tone={tonight && !gig.cancelled ? "ton" : "date"}>{prettyDate(gig.date, gig.startTime)}{gig.startTime ? ` · ${formatTime(gig.startTime)}` : ""}</Pill>
          {distance !== undefined && isFinite(distance) && <Pill tone="dist">{formatDistance(distance)}</Pill>}
          {gig.ticketed && <TicketStub onCard price={gig.ticketing?.price} />}
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-dim2" />
    </button>
  );
});

const TONE: Record<string, string> = {
  date: "bg-card2 text-txt",
  ton: "bg-acc text-on-acc",
  dist: "bg-card2 text-dim",
  cancelled: "bg-red-500/20 text-red-400 uppercase tracking-wide",
  // item 13: bndy-styled mic chip — second accent, works on every skin
  mic: "bg-[color-mix(in_srgb,var(--acc2)_18%,transparent)] text-[var(--acc2)] uppercase tracking-wide",
};
function Pill({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-extrabold", TONE[tone])}>{children}</span>;
}
