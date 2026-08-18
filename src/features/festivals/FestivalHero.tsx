"use client";

import { useState } from "react";
import { CalendarRange, ExternalLink, MapPin, Share2 } from "lucide-react";
import type { Festival } from "@/domain/types";
import { ShareSheet } from "@/features/shared/ShareSheet";
import { safeHref } from "@/lib/safeHref";
import { festivalCountLine, festivalDateRange, festivalStatus } from "./festivalUtils";

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
          <div className="relative min-h-[250px] border-b border-line lg:min-h-[420px] lg:border-b-0 lg:border-r">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={`${festival.name} poster`} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(circle at 28% 22%, color-mix(in srgb, var(--acc) 78%, transparent), transparent 36%), radial-gradient(circle at 72% 72%, color-mix(in srgb, var(--acc2) 55%, transparent), transparent 42%), repeating-linear-gradient(-12deg, transparent 0 20px, color-mix(in srgb, var(--line) 18%, transparent) 20px 22px), var(--card2)" }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-white/20 bg-black/65 px-3 py-2 text-white backdrop-blur">
              <CalendarRange size={17} />
              <div><div className="font-meta text-[8px] font-black uppercase tracking-[1.5px] opacity-75">Festival</div><div className="text-[12px] font-black">{status}</div></div>
            </div>
          </div>

          <div className="flex flex-col justify-center p-5 lg:p-8 xl:p-10">
            <div className="font-meta text-[9px] font-black uppercase tracking-[2px] text-[var(--acc)]">Grassroots programme</div>
            <h1 className="font-disp mt-2 text-[34px] font-black leading-[.98] tracking-tight sm:text-[44px] xl:text-[58px]">{festival.name}</h1>
            <div className="mt-5 space-y-2 text-[13px] font-bold text-dim lg:text-[14px]">
              <div className="flex items-center gap-2"><CalendarRange size={15} className="text-[var(--acc)]" /><span>{festivalDateRange(festival.startDate, festival.endDate)}</span></div>
              {festival.location && <div className="flex items-center gap-2"><MapPin size={15} className="text-[var(--acc)]" /><span>{festival.location}</span></div>}
            </div>
            {counts && <div className="mt-5 border-y border-line py-3 text-[12px] font-black uppercase tracking-[.9px] text-txt">{counts}</div>}
            {festival.description && <p className="mt-5 line-clamp-4 text-[13px] font-semibold leading-relaxed text-dim lg:text-[14px]">{festival.description}</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={() => setSharing(true)} className="bndy-btn inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-black"><Share2 size={15} /> Share festival</button>
              {website && <a href={website} target="_blank" rel="noopener" className="bndy-btn2 inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-black">Website <ExternalLink size={14} /></a>}
            </div>
          </div>
        </div>
      </section>
      <ShareSheet open={sharing} onClose={() => setSharing(false)} url={shareUrl} title={`Share ${festival.name}`} text={shareText} />
    </>
  );
}
