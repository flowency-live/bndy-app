"use client";

// The festival programme, day by day.
//
// TWO FORMATS, ONE RENDERER (Jason, 2026-08-20). A day's gigs pass through
// blockFestivalGigs: acts sharing one venue and one start time (Tigerfest)
// render as a venue BLOCK - the time belongs to the venue, the acts carry
// none, "running order to be announced". Venues with real times (Congleton)
// keep a timed GigCard per act. Derived from the data; nobody picks a type.

import { useState } from "react";
import { Clock3, MapPin } from "lucide-react";
import type { Festival, Gig } from "@/domain/types";
import { useArtistImageMap } from "@/lib/hooks";
import { isTonight } from "@/domain/dates";
import { blockFestivalGigs, blockTimeLabel, type FestivalBlock } from "@/domain/festivalBlocks";
import { Avatar } from "@/components/ui/Avatar";
import { GigCard } from "@/features/gigs/GigCard";
import { GigSheet } from "@/features/gigs/GigSheet";
import { TicketStub } from "@/components/TicketStub";
import { festivalDayHeading, groupFestivalGigs } from "./festivalUtils";

export function FestivalSchedule({ festival, gigs }: { festival: Festival; gigs: Gig[] }) {
  const [selected, setSelected] = useState<Gig | null>(null);
  const imgMap = useArtistImageMap();
  const groups = groupFestivalGigs(gigs);
  const stageById = new Map(festival.stages.map((s) => [s.id, s.name]));

  if (!groups.length) {
    return (
      <div className="rounded-[var(--rad-lg)] border border-line bg-card p-8 text-center">
        <Clock3 size={28} className="mx-auto text-[var(--acc)]" />
        <h2 className="mt-3 text-xl font-black">Programme coming soon.</h2>
        <p className="mt-2 text-[13px] font-semibold text-dim">The festival is listed, but its individual bndy gigs have not been linked yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {groups.map((group) => {
          const items = blockFestivalGigs(group.gigs);
          return (
            <section key={group.date}>
              <div className="mb-2 flex items-center gap-3 border-b border-line pb-2">
                <div className="h-2.5 w-2.5 rotate-45 bg-[var(--acc)]" />
                <h2 className="font-meta text-[11px] font-black uppercase tracking-[1.6px] text-txt">{festivalDayHeading(group.date)}</h2>
                <span className="ml-auto tnum text-[10px] font-bold text-dim">{group.gigs.length} gig{group.gigs.length === 1 ? "" : "s"}</span>
              </div>
              <div className="space-y-3">
                {items.map((item) =>
                  item.kind === "gig" ? (
                    <div key={item.gig.id} className="overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card">
                      {item.gig.stageId && stageById.get(item.gig.stageId) && (
                        <div className="border-b border-line bg-card2 px-3 py-1.5 font-meta text-[8px] font-black uppercase tracking-[1.2px] text-[var(--acc)]">{stageById.get(item.gig.stageId)}</div>
                      )}
                      <GigCard
                        gig={{ ...item.gig, festivalName: undefined, festivalSlug: undefined }}
                        tonight={isTonight(item.gig.date, item.gig.startTime)}
                        imageUrl={item.gig.artistId ? imgMap.get(item.gig.artistId) : undefined}
                        onClick={() => setSelected(item.gig)}
                      />
                    </div>
                  ) : (
                    <BlockPanel key={`${item.venueId}-${item.date}`} block={item} imgMap={imgMap} onPick={setSelected} />
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

/** The venue's bill: header owns the time window, acts carry none. */
function BlockPanel({ block, imgMap, onPick }: { block: FestivalBlock; imgMap: Map<string, string>; onPick: (g: Gig) => void }) {
  const time = blockTimeLabel(block);
  return (
    <div className="overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-3" style={{ background: "color-mix(in srgb, var(--acc) 10%, var(--card2))" }}>
        <span className="flex items-center gap-1.5 text-[15px] font-black"><MapPin size={14} className="text-[var(--acc)]" /> {block.venueName}</span>
        {time && <span className="tnum text-[12.5px] font-black text-[var(--acc)]">{time}</span>}
        <span className="ml-auto font-meta text-[8.5px] font-black uppercase tracking-[1.2px] text-dim">Running order to be announced</span>
      </div>
      <div>
        {block.gigs.map((g) => (
          <button
            key={g.id}
            onClick={() => onPick(g)}
            className="flex w-full items-center gap-3 border-b border-[color-mix(in_srgb,var(--line)_55%,transparent)] px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-card2"
          >
            <Avatar id={g.artistId || g.id} name={g.artistName || g.title} src={g.artistId ? imgMap.get(g.artistId) : undefined} size={40} radius={11} />
            <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold">{g.artistName || g.title}</span>
            {g.ticketed && <TicketStub price={g.ticketing?.price} />}
          </button>
        ))}
      </div>
    </div>
  );
}
