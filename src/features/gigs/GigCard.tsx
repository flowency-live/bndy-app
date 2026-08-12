import { memo } from "react";
import { ChevronRight, MapPin, Mic } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatTime } from "@/domain/dates";
import { formatDistance } from "@/domain/geo";
import { gigDisplayName } from "@/domain/gigName";
import { MicTile } from "@/features/shared/MicTile";
import { cn } from "@/lib/cn";
import { TicketStub } from "@/components/TicketStub";
import type { Gig } from "@/domain/types";

export const GigCard = memo(function GigCard({ gig, imageUrl, distance, tonight, onClick }: { gig: Gig; imageUrl?: string; distance?: number; tonight: boolean; onClick: () => void }) {
  const hasDistance = distance !== undefined && isFinite(distance);
  const time = gig.startTime ? formatTime(gig.startTime) : "TBC";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative grid w-full grid-cols-[52px_64px_minmax(0,1fr)_18px] items-center gap-3 border-b border-line px-2 py-3 text-left transition-[background-color,transform] duration-150 last:border-b-0 hover:bg-card2 active:scale-[.995] sm:grid-cols-[64px_64px_minmax(0,1fr)_minmax(170px,.8fr)_72px_20px] sm:gap-4 sm:px-4 sm:py-3.5",
        tonight && !gig.cancelled && "before:absolute before:bottom-3 before:left-0 before:top-3 before:w-[3px] before:rounded-full before:bg-acc",
        gig.cancelled && "opacity-50 saturate-50",
      )}
    >
      <div className="text-right">
        <div className={cn("tnum text-[15px] font-black uppercase tracking-tight sm:text-[16px]", tonight && !gig.cancelled ? "text-[var(--acc)]" : "text-txt")}>{time}</div>
        {tonight && !gig.cancelled && <div className="mt-0.5 text-[9px] font-extrabold uppercase tracking-[1.2px] text-[var(--acc)]">Tonight</div>}
      </div>

      <div className="transition-transform duration-200 ease-smooth group-hover:scale-[1.035]">
        {gig.isOpenMic && !imageUrl ? (
          <MicTile size={64} radius={15} />
        ) : (
          <Avatar id={gig.artistId || gig.venueId} name={gig.artistName || gig.venueName} src={imageUrl} size={64} radius={15} />
        )}
      </div>

      <div className="min-w-0">
        <div className="truncate text-[15px] font-extrabold tracking-tight sm:text-[16px]">{gigDisplayName(gig)}</div>

        <div className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-[12px] font-semibold text-dim sm:hidden">
          <MapPin size={12} className="shrink-0 opacity-70" />
          <span className="truncate">{gig.venueName}{gig.venueCity ? ` · ${gig.venueCity}` : ""}</span>
          {hasDistance && <span className="shrink-0 text-dim2">· {formatDistance(distance)}</span>}
        </div>

        {(gig.cancelled || gig.isOpenMic || gig.ticketed) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {gig.cancelled && <Status tone="cancelled">CANCELLED</Status>}
            {gig.isOpenMic && <Status tone="mic"><Mic size={10} strokeWidth={2.75} /> OPEN MIC</Status>}
            {gig.ticketed && <TicketStub onCard price={gig.ticketing?.price} />}
          </div>
        )}
      </div>

      <div className="hidden min-w-0 items-start gap-2 text-[12.5px] font-semibold text-dim sm:flex">
        <MapPin size={14} className="mt-0.5 shrink-0 opacity-60" />
        <div className="min-w-0">
          <div className="truncate text-txt">{gig.venueName}</div>
          {gig.venueCity && <div className="mt-0.5 truncate text-[11.5px] text-dim">{gig.venueCity}</div>}
        </div>
      </div>

      <div className="hidden text-right sm:block">
        {hasDistance && <span className="tnum text-[12px] font-bold text-dim">{formatDistance(distance)}</span>}
      </div>

      <ChevronRight size={18} className="shrink-0 text-dim2 transition-[transform,opacity] duration-150 group-hover:translate-x-0.5 sm:opacity-45 sm:group-hover:opacity-100" />
    </button>
  );
});

const TONE: Record<string, string> = {
  cancelled: "bg-red-500/20 text-red-400 uppercase tracking-wide",
  mic: "bg-[color-mix(in_srgb,var(--acc2)_18%,transparent)] text-[var(--acc2)] uppercase tracking-wide",
};

function Status({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold", TONE[tone])}>{children}</span>;
}
