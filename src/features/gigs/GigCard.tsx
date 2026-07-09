import { ChevronRight, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { prettyDate, formatTime } from "@/domain/dates";
import { formatDistance } from "@/domain/geo";
import { cn } from "@/lib/cn";
import type { Gig } from "@/domain/types";

export function GigCard({ gig, imageUrl, distance, tonight, onClick }: { gig: Gig; imageUrl?: string; distance?: number; tonight: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "bndy-card flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3.5 text-left transition-transform active:scale-[.985]",
        tonight && "border-[var(--acc)]",
      )}
    >
      <Avatar id={gig.artistId || gig.venueId} name={gig.artistName || gig.venueName} src={imageUrl} size={52} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-extrabold tracking-tight">{gig.artistName || gig.title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] font-semibold text-dim">
          <MapPin size={13} className="shrink-0 opacity-70" />
          <span className="truncate">{gig.venueName}{gig.venueCity ? ` · ${gig.venueCity}` : ""}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Pill tone={tonight ? "ton" : "date"}>{prettyDate(gig.date)}{gig.startTime ? ` · ${formatTime(gig.startTime)}` : ""}</Pill>
          {distance !== undefined && isFinite(distance) && <Pill tone="dist">{formatDistance(distance)}</Pill>}
          {gig.ticketed && <Pill tone="tik">Ticketed</Pill>}
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-dim2" />
    </button>
  );
}

const TONE: Record<string, string> = {
  date: "bg-card2 text-txt",
  ton: "bg-acc text-on-acc",
  dist: "bg-card2 text-dim",
  tik: "bg-acc2 text-on-acc2",
};
function Pill({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-extrabold", TONE[tone])}>{children}</span>;
}
