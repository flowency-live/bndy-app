"use client";

import { useState } from "react";
import { CalendarRange, ExternalLink, MapPin, Share2 } from "lucide-react";
import type { Festival } from "@/domain/types";
import { ShareSheet } from "@/features/shared/ShareSheet";
import { ManageFestivalChip } from "./curate/CuratorFestivalLinks";
import { safeHref } from "@/lib/safeHref";
import { festivalCountLine, festivalDateRange, festivalStatus } from "./festivalUtils";
import { FestivalPosterFallback } from "./FestivalPosterFallback";
import { FestivalPosterImg } from "./FestivalPosterImg";

export function FestivalHero({ festival }: { festival: Festival }) {
  const [sharing, setSharing] = useState(false);
  const image = festival.posterImageUrl || festival.heroImageUrl;
  const counts = festivalCountLine(festival);
  const status = festivalStatus(festival);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/festivals/${festival.slug}` : `/festivals/${festival.slug}`;
  const shareText = `${festival.name} · ${festivalDateRange(festival.startDate, festival.endDate)}${festival.location ? ` · ${festival.location}` : ""}${counts ? ` · ${counts}` : ""} · on bndy`;
  const website = festival.websiteUrl ? safeHref(festival.websiteUrl) : null;

  return (
    <>
      <section className="relative overflow-hidden rounded-[var(--rad-lg)] border-2 border-line bg-card shadow-[var(--shadow-lg)]">
        <div className="absolute inset-x-0 top-0 z-20 h-1.5 bg-[var(--acc)]" />
        <div className="grid lg:grid-cols-[minmax(300px,.9fr)_minmax(0,1.1fr)]">
          <div className="relative min-h-[210px] border-b border-line sm:min-h-[260px] lg:min-h-[420px] lg:border-b-0 lg:border-r">
            {image ? (
              <FestivalPosterImg src={image} name={festival.name} slug={festival.slug} startDate={festival.startDate} eager imgClassName="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <FestivalPosterFallback name={festival.name} slug={festival.slug} startDate={festival.startDate} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl border border-white/40 bg-black/70 px-3 py-2 text-white backdrop-blur sm:bottom-4 sm:left-4">
              <CalendarRange size={16} />
              <div><div className="font-meta text-[7.5px] font-black uppercase tracking-[1.4px] text-white">Festival</div><div className="text-[11.5px] font-black">{status}</div></div>
            </div>
          </div>

          <div className="flex flex-col justify-center p-4 sm:p-5 lg:p-8 xl:p-10">
            <div className="font-meta text-[8.5px] font-black uppercase tracking-[1.8px] text-[var(--acc)]">Grassroots programme</div>
            <h1 className="font-disp mt-2 text-[30px] font-black leading-[.98] tracking-tight sm:text-[40px] xl:text-[58px]">{festival.name}</h1>
            <div className="mt-4 space-y-2 text-[12.5px] font-bold text-dim lg:mt-5 lg:text-[14px]">
              <div className="flex items-center gap-2"><CalendarRange size={14} className="text-[var(--acc)]" /><span>{festivalDateRange(festival.startDate, festival.endDate)}</span></div>
              {festival.location && <div className="flex items-center gap-2"><MapPin size={14} className="text-[var(--acc)]" /><span>{festival.location}</span></div>}
            </div>
            {counts && <div className="mt-4 inline-flex self-start rounded-xl border border-line bg-card2 px-3 py-2 text-[10px] font-black uppercase tracking-[.8px] text-txt lg:mt-5 lg:text-[11px]">{counts}</div>}
            {festival.description && <p className="mt-4 line-clamp-3 text-[12.5px] font-semibold leading-relaxed text-dim sm:line-clamp-4 lg:mt-5 lg:text-[14px]">{festival.description}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:mt-6">
              <button type="button" onClick={() => setSharing(true)} className="bndy-btn inline-flex items-center justify-center gap-2 px-3 py-2.5 text-[11.5px] font-black sm:px-4 sm:text-[12px]"><Share2 size={14} /> Share</button>
              {website && <a href={website} target="_blank" rel="noopener" className="bndy-btn2 inline-flex items-center justify-center gap-2 px-3 py-2.5 text-[11.5px] font-black sm:px-4 sm:text-[12px]">Website <ExternalLink size={13} /></a>}
              <ManageFestivalChip slug={festival.slug} />
            </div>
          </div>
        </div>
      </section>
      <ShareSheet open={sharing} onClose={() => setSharing(false)} url={shareUrl} title={`Share ${festival.name}`} text={shareText} />
    </>
  );
}
