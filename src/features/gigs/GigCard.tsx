import { memo } from "react";
import { ChevronRight, MapPin, Mic } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatTime } from "@/domain/dates";
import { formatDistance } from "@/domain/geo";
import { gigDisplayName } from "@/domain/gigName";
import { headlineActs, supportChipLabel } from "@/domain/lineup";
import { MicTile } from "@/features/shared/MicTile";
import { FestivalRibbon } from "@/features/festivals/FestivalRibbon";
import { cn } from "@/lib/cn";
import { TicketStub } from "@/components/TicketStub";
import type { Gig } from "@/domain/types";

export const GigCard = memo(function GigCard({ gig, imageUrl, distance, tonight, onClick }: { gig: Gig; imageUrl?: string; distance?: number; tonight: boolean; onClick: () => void }) {
  const hasDistance = distance !== undefined && isFinite(distance);
  const time = gig.startTime ? formatTime(gig.startTime) : "TBC";
  const lead = headlineActs(gig)[0];
  const support = supportChipLabel(gig);

  return (
    <button
      onClick={onClick}
      className={cn(
        "bndy-gig-row group relative grid w-full grid-cols-[48px_56px_minmax(0,1fr)_18px] items-center gap-3 border-b border-[color-mix(in_srgb,var(--line)_55%,transparent)] px-2 py-3 text-left transition-[background-color,transform] duration-150 last:border-b-0 hover:bg-card2 active:scale-[.997] lg:grid-cols-[68px_22px_72px_minmax(200px,1fr)_minmax(180px,.68fr)_72px_22px] lg:gap-4 lg:px-0 lg:py-3.5",
        tonight && !gig.cancelled && "before:absolute before:bottom-3 before:left-0 before:top-3 before:w-[3px] before:rounded-full before:bg-acc lg:before:hidden",
        gig.cancelled && "opacity-50 saturate-50",
      )}
    >
      <div className="text-right lg:pr-1">
        <div className={cn("tnum text-[14px] font-black uppercase tracking-tight lg:text-[17px]", tonight && !gig.cancelled ? "text-[var(--acc)]" : "text-txt")}>{time}</div>
        {tonight && !gig.cancelled && <div className="mt-0.5 text-[8.5px] font-extrabold uppercase tracking-[1.1px] text-[var(--acc)]">Tonight</div>}
      </div>

      <div className="relative hidden h-full items-center justify-center lg:flex" aria-hidden>
        <span className="absolute inset-y-[-14px] left-1/2 w-px -translate-x-1/2 bg-[color-mix(in_srgb,var(--line)_55%,transparent)] group-first:top-1/2 group-last:bottom-1/2" />
        <span className={cn(
          "relative z-[1] h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-dim2 shadow-[0_0_0_1px_color-mix(in_srgb,var(--line)_65%,transparent)] transition-transform duration-150 group-hover:scale-125",
          tonight && !gig.cancelled && "bg-acc shadow-[0_0_0_1px_var(--acc)]",
        )} />
      </div>

      <div className="transition-transform duration-200 ease-smooth group-hover:scale-[1.045]">
        {gig.isOpenMic && !imageUrl ? (
          <>
            <div className="lg:hidden"><MicTile size={56} radius={13} /></div>
            <div className="hidden lg:block"><MicTile size={72} radius={16} /></div>
          </>
        ) : (
          <>
            <div className="lg:hidden"><Avatar id={lead?.id || gig.venueId} name={lead?.name || gig.venueName} src={imageUrl} size={56} radius={13} /></div>
            <div className="hidden lg:block"><Avatar id={lead?.id || gig.venueId} name={lead?.name || gig.venueName} src={imageUrl} size={72} radius={16} /></div>
          </>
        )}
      </div>

      <div className="min-w-0 lg:pl-1">
        {gig.festivalName && <FestivalRibbon name={gig.festivalName} compact className="mb-1.5 max-w-[280px]" />}
        <div className="truncate text-[15px] font-extrabold tracking-tight transition-transform duration-150 group-hover:translate-x-0.5 lg:text-[18px]">{gigDisplayName(gig)}</div>

        <div className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-[11.5px] font-semibold text-dim lg:hidden">
          <MapPin size={12} className="shrink-0 opacity-65" />
          <span className="truncate">{gig.venueName}{gig.venueCity ? ` · ${gig.venueCity}` : ""}</span>
          {hasDistance && <span className="shrink-0 text-dim2">· {formatDistance(distance)}</span>}
        </div>

        {(gig.cancelled || gig.isOpenMic || gig.ticketed || support) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {gig.cancelled && <Status tone="cancelled">CANCELLED</Status>}
            {gig.isOpenMic && <Status tone="mic"><Mic size={10} strokeWidth={2.75} /> OPEN MIC</Status>}
            {support && <Status tone="bill">{support}</Status>}
            {gig.ticketed && <TicketStub onCard price={gig.ticketing?.price} />}
          </div>
        )}
      </div>

      <div className="hidden min-w-0 items-start gap-2 text-[13px] font-semibold text-dim lg:flex">
        <MapPin size={14} className="mt-0.5 shrink-0 opacity-55" />
        <div className="min-w-0">
          <div className="truncate font-bold text-txt">{gig.venueName}</div>
          {gig.venueCity && <div className="mt-0.5 truncate text-[11.5px] text-dim">{gig.venueCity}</div>}
        </div>
      </div>

      <div className="hidden text-right lg:block">
        {hasDistance && <span className="tnum text-[12px] font-extrabold text-dim">{formatDistance(distance)}</span>}
      </div>

      <ChevronRight size={18} className="shrink-0 text-dim2 transition-[transform,opacity] duration-150 group-hover:translate-x-1 lg:opacity-35 lg:group-hover:opacity-100" />
    </button>
  );
});

const TONE: Record<string, string> = {
  cancelled: "bg-red-500/20 text-red-400 uppercase tracking-wide",
  mic: "bg-[color-mix(in_srgb,var(--acc2)_18%,transparent)] text-[var(--acc2)] uppercase tracking-wide",
  bill: "bg-card2 text-dim",
};

function Status({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold", TONE[tone])}>{children}</span>;
}
