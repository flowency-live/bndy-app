"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Clock3, MapPin } from "lucide-react";
import type { Festival, Gig } from "@/domain/types";
import { useArtistImageMap } from "@/lib/hooks";
import { isTonight } from "@/domain/dates";
import { blockFestivalGigs, blockTimeLabel, type FestivalBlock } from "@/domain/festivalBlocks";
import { Avatar } from "@/components/ui/Avatar";
import { GigSheet } from "@/features/gigs/GigSheet";
import { TicketStub } from "@/components/TicketStub";
import { festivalDayHeading, groupFestivalGigs } from "./festivalUtils";

export function FestivalSchedule({ festival, gigs }: { festival: Festival; gigs: Gig[] }) {
  const [selected, setSelected] = useState<Gig | null>(null);
  const imgMap = useArtistImageMap();
  const groups = groupFestivalGigs(gigs);
  const stageById = useMemo(() => new Map(festival.stages.map((s) => [s.id, s.name])), [festival.stages]);

  if (!groups.length) {
    return (
      <div className="rounded-[var(--rad-lg)] border border-line bg-card p-8 text-center">
        <Clock3 size={28} className="mx-auto text-[var(--acc)]" />
        <h2 className="mt-3 text-xl font-black">Programme coming soon.</h2>
        <p className="mt-2 text-[13px] font-semibold text-dim">The festival is listed, but its individual bndy gigs have not been linked yet.</p>
      </div>
    );
  }

  const jumpTo = (date: string) => {
    document.getElementById(`festival-day-${date}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div className="mb-5 -mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
        <div className="flex min-w-max gap-2">
          {groups.map((group) => (
            <button
              key={group.date}
              type="button"
              onClick={() => jumpTo(group.date)}
              className="group flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-card px-3.5 py-2 text-left shadow-[var(--shadow)] transition-[transform,border-color,background-color] active:scale-[.98] hover:border-[color-mix(in_srgb,var(--acc)_50%,var(--line))] hover:bg-card2"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--acc)_14%,var(--card2))] text-[var(--acc)]">
                <CalendarDays size={15} strokeWidth={2.4} />
              </span>
              <span>
                <span className="block text-[12px] font-black leading-tight text-txt">{shortDay(group.date)}</span>
                <span className="mt-0.5 block text-[9px] font-extrabold uppercase tracking-[.9px] text-dim">{group.gigs.length} gig{group.gigs.length === 1 ? "" : "s"}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-9">
        {groups.map((group, dayIndex) => {
          const items = blockFestivalGigs(group.gigs);
          return (
            <section key={group.date} id={`festival-day-${group.date}`} className="scroll-mt-24">
              <div className="mb-3 flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-meta text-[8px] font-black uppercase tracking-[1.6px] text-[var(--acc)]">Day {dayIndex + 1}</div>
                  <h2 className="font-disp mt-0.5 text-[24px] font-black leading-none tracking-tight text-txt sm:text-[28px]">{festivalDayHeading(group.date)}</h2>
                </div>
                <span className="tnum shrink-0 rounded-full border border-line bg-card px-2.5 py-1 text-[9px] font-black text-dim">{group.gigs.length} gigs</span>
              </div>

              <div className="overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card shadow-[var(--shadow)]">
                {items.map((item, index) =>
                  item.kind === "gig" ? (
                    <ProgrammeRow
                      key={item.gig.id}
                      gig={item.gig}
                      stageName={item.gig.stageId ? stageById.get(item.gig.stageId) : undefined}
                      imageUrl={item.gig.artistId ? imgMap.get(item.gig.artistId) : undefined}
                      onPick={setSelected}
                      first={index === 0}
                    />
                  ) : (
                    <BlockPanel
                      key={`${item.venueId}-${item.date}`}
                      block={item}
                      imgMap={imgMap}
                      onPick={setSelected}
                      first={index === 0}
                    />
                  ),
                )}
              </div>
            </section>
          );
        })}
      </div>

      <GigSheet gig={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function ProgrammeRow({ gig, stageName, imageUrl, onPick, first }: { gig: Gig; stageName?: string; imageUrl?: string; onPick: (g: Gig) => void; first: boolean }) {
  const live = isTonight(gig.date, gig.startTime);
  const time = gig.startTime || "TBA";

  return (
    <button
      type="button"
      onClick={() => onPick(gig)}
      className={`group grid w-full grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition-[background-color,transform] active:scale-[.995] hover:bg-card2 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:px-4 ${first ? "" : "border-t border-line"}`}
    >
      <div className="self-stretch border-r border-line pr-3 sm:pr-4">
        <div className={`tnum text-[16px] font-black leading-none sm:text-[18px] ${live ? "text-[var(--acc)]" : "text-txt"}`}>{time}</div>
        {gig.endTime && <div className="tnum mt-1 text-[9px] font-bold text-dim">– {gig.endTime}</div>}
        {live && <div className="mt-2 inline-flex items-center gap-1 font-meta text-[7.5px] font-black uppercase tracking-[1px] text-[var(--acc)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--acc)] shadow-[0_0_8px_var(--acc)]" /> Live</div>}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <Avatar id={gig.artistId || gig.id} name={gig.artistName || gig.title} src={imageUrl} size={42} radius={12} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-black leading-tight text-txt sm:text-[15px]">{gig.artistName || gig.title}</div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-dim">
            <span className="flex min-w-0 items-center gap-1"><MapPin size={10} className="shrink-0 text-[var(--acc)]" /><span className="truncate">{gig.venueName}</span></span>
            {stageName && <span className="rounded-md bg-card2 px-1.5 py-0.5 font-meta text-[7.5px] font-black uppercase tracking-[.8px] text-[var(--acc)]">{stageName}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pl-1">
        {gig.ticketed && <TicketStub price={gig.ticketing?.price} />}
        <ChevronRight size={15} className="text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-txt" />
      </div>
    </button>
  );
}

/** A venue programme where the venue owns the time window and act order is not final. */
function BlockPanel({ block, imgMap, onPick, first }: { block: FestivalBlock; imgMap: Map<string, string>; onPick: (g: Gig) => void; first: boolean }) {
  const time = blockTimeLabel(block);
  return (
    <div className={first ? "" : "border-t border-line"}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-3 sm:px-4" style={{ background: "color-mix(in srgb, var(--acc) 9%, var(--card2))" }}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <MapPin size={13} className="shrink-0 text-[var(--acc)]" />
          <span className="truncate text-[13px] font-black text-txt sm:text-[14px]">{block.venueName}</span>
        </div>
        {time && <span className="tnum rounded-full border border-[color-mix(in_srgb,var(--acc)_28%,var(--line))] bg-card px-2 py-1 text-[10px] font-black text-[var(--acc)]">{time}</span>}
        <span className="w-full pl-5 font-meta text-[7.5px] font-black uppercase tracking-[1px] text-dim sm:ml-auto sm:w-auto sm:pl-0">Running order to be announced</span>
      </div>

      <div>
        {block.gigs.map((g, index) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onPick(g)}
            className={`group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-[background-color,transform] active:scale-[.995] hover:bg-card2 sm:px-4 ${index ? "border-t border-[color-mix(in_srgb,var(--line)_55%,transparent)]" : ""}`}
          >
            <div className="w-[38px] shrink-0 border-r border-line pr-3 text-right font-meta text-[8px] font-black uppercase tracking-[.8px] text-dim">Act {index + 1}</div>
            <Avatar id={g.artistId || g.id} name={g.artistName || g.title} src={g.artistId ? imgMap.get(g.artistId) : undefined} size={38} radius={11} />
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold text-txt">{g.artistName || g.title}</span>
            {g.ticketed && <TicketStub price={g.ticketing?.price} />}
            <ChevronRight size={14} className="text-dim transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

function shortDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(d);
}
