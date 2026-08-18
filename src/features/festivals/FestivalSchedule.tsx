"use client";

import { useState } from "react";
import { Clock3 } from "lucide-react";
import type { Festival, Gig } from "@/domain/types";
import { useArtistImageMap } from "@/lib/hooks";
import { isTonight } from "@/domain/dates";
import { GigCard } from "@/features/gigs/GigCard";
import { GigSheet } from "@/features/gigs/GigSheet";
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
        {groups.map((group) => (
          <section key={group.date}>
            <div className="mb-2 flex items-center gap-3 border-b border-line pb-2">
              <div className="h-2.5 w-2.5 rotate-45 bg-[var(--acc)]" />
              <h2 className="font-meta text-[11px] font-black uppercase tracking-[1.6px] text-txt">{festivalDayHeading(group.date)}</h2>
              <span className="ml-auto tnum text-[10px] font-bold text-dim">{group.gigs.length} gig{group.gigs.length === 1 ? "" : "s"}</span>
            </div>
            <div className="overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card">
              {group.gigs.map((gig) => (
                <div key={gig.id}>
                  {gig.stageId && stageById.get(gig.stageId) && (
                    <div className="border-b border-line bg-card2 px-3 py-1.5 font-meta text-[8px] font-black uppercase tracking-[1.2px] text-[var(--acc)]">{stageById.get(gig.stageId)}</div>
                  )}
                  <GigCard
                    gig={{ ...gig, festivalName: undefined, festivalSlug: undefined }}
                    tonight={isTonight(gig.date, gig.startTime)}
                    imageUrl={gig.artistId ? imgMap.get(gig.artistId) : undefined}
                    onClick={() => setSelected(gig)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <GigSheet gig={selected} onClose={() => setSelected(null)} />
    </>
  );
}
