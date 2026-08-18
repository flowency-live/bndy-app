import Link from "next/link";
import { ArrowUpRight, CalendarRange, MapPin, Music2 } from "lucide-react";
import type { FestivalSummary } from "@/domain/types";
import { festivalCountLine, festivalDateRange, festivalStatus } from "./festivalUtils";

export function FestivalCard({ festival, compact = false }: { festival: FestivalSummary; compact?: boolean }) {
  const counts = festivalCountLine(festival);
  const image = festival.posterImageUrl || festival.heroImageUrl;
  const status = festivalStatus(festival);
  return (
    <Link
      href={`/festivals/${festival.slug}`}
      className="group relative block overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card shadow-[var(--shadow)] transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-line-hi"
    >
      <div className={compact ? "grid grid-cols-[96px_minmax(0,1fr)]" : ""}>
        <div className={compact ? "relative min-h-[112px]" : "relative aspect-[16/9] min-h-[150px]"}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={`${festival.name} poster`} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--acc) 65%, transparent), transparent 42%), radial-gradient(circle at 80% 75%, color-mix(in srgb, var(--acc2) 48%, transparent), transparent 45%), var(--card2)" }}
            />
          )}
          <div className="absolute inset-x-0 top-0 h-1 bg-[var(--acc)]" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/65 px-2 py-1 text-[9px] font-black uppercase tracking-[1.25px] text-white backdrop-blur">
            <CalendarRange size={11} /> Festival
          </div>
        </div>
        <div className={compact ? "min-w-0 p-3" : "p-4"}>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc)]">{status}</div>
              <h2 className={compact ? "mt-1 line-clamp-2 text-[16px] font-black leading-tight" : "mt-1 text-[21px] font-black leading-tight tracking-tight"}>{festival.name}</h2>
            </div>
            <ArrowUpRight size={18} className="shrink-0 text-dim transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11.5px] font-bold text-dim">
            <CalendarRange size={13} className="shrink-0" />
            <span>{festivalDateRange(festival.startDate, festival.endDate)}</span>
          </div>
          {festival.location && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-bold text-dim">
              <MapPin size={13} className="shrink-0" /> <span className="truncate">{festival.location}</span>
            </div>
          )}
          {counts && (
            <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5 text-[10.5px] font-extrabold uppercase tracking-[.7px] text-txt">
              <Music2 size={13} className="text-[var(--acc)]" /> {counts}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
