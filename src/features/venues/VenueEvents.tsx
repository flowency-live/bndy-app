"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useArtistImageMap, useUpcomingGigs } from "@/lib/hooks";
import { todayISO, formatTime, addDaysISO } from "@/domain/dates";
import { relativeLabel } from "@/domain/relative";
import { Avatar } from "@/components/ui/Avatar";
import { GigSheet } from "@/features/gigs/GigSheet";
import { TicketStub } from "@/components/TicketStub";
import type { Gig } from "@/domain/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Reads all upcoming gigs (cached) and filters to this venue — robust vs the per-venue endpoint. */
export function VenueEvents({ venueId }: { venueId: string }) {
  const { data: allGigs = [], isLoading } = useUpcomingGigs();
  const imgMap = useArtistImageMap();
  const today = todayISO();
  const collapse90 = addDaysISO(today, 90); // anything starting at or after this date defaults to collapsed
  const [selected, setSelected] = useState<Gig | null>(null);

  const gigs = useMemo(
    () => allGigs.filter((g) => g.venueId === venueId).sort((a, b) => `${a.date}${a.startTime ?? ""}`.localeCompare(`${b.date}${b.startTime ?? ""}`)),
    [allGigs, venueId],
  );

  // Group by month
  const byMonth = useMemo(() => {
    const groups: { key: string; label: string; items: Gig[]; firstDate: string }[] = [];
    for (const g of gigs) {
      const [y, m] = g.date.split("-");
      const key = `${y}-${m}`;
      let grp = groups.find((x) => x.key === key);
      if (!grp) {
        grp = { key, label: `${MON_FULL[Number(m) - 1]} ${y}`, items: [], firstDate: g.date };
        groups.push(grp);
      }
      grp.items.push(g);
    }
    return groups;
  }, [gigs]);

  // Track which months are expanded; default collapsed for months starting 90+ days out
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    for (const m of byMonth) {
      if (m.firstDate < collapse90) expanded.add(m.key);
    }
    return expanded;
  });
  const toggleMonth = (key: string) => setExpandedMonths((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <section className="mt-7">
      <div className="mb-1 flex items-center justify-between border-b border-line pb-1.5">
        <span className="text-[12px] font-extrabold uppercase tracking-[1.6px] text-[var(--acc)]">What&apos;s on</span>
        {!isLoading && <span className="text-[11px] font-bold uppercase tracking-wide text-dim2">{gigs.length} gig{gigs.length === 1 ? "" : "s"}</span>}
      </div>

      {isLoading ? (
        <div className="space-y-2 pt-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[64px] animate-pulse rounded-lg bg-white/[.04]" />)}
        </div>
      ) : gigs.length ? (
        <div className="space-y-1">
          {byMonth.map((m) => {
            const isExpanded = expandedMonths.has(m.key);
            return (
              <div key={m.key}>
                <button
                  onClick={() => toggleMonth(m.key)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2"
                  style={{ background: "var(--dayhead-bg)", color: "var(--dayhead-fg)" }}
                >
                  <span className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="text-[12px] font-extrabold uppercase tracking-[1.5px]">{m.label}</span>
                  </span>
                  <span className="text-[11px] font-bold">{m.items.length} gig{m.items.length === 1 ? "" : "s"}</span>
                </button>
                {isExpanded && (
                  <div className="mt-1">
                    {m.items.map((g) => <EventRow key={g.id} g={g} today={today} imgMap={imgMap} onClick={() => setSelected(g)} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-8 text-center font-semibold text-dim">No upcoming gigs listed.</p>
      )}

      <GigSheet gig={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function EventRow({ g, today, imgMap, onClick }: { g: Gig; today: string; imgMap: Map<string, string>; onClick: () => void }) {
  const [, m, d] = g.date.split("-").map(Number);
  const dow = new Date(Date.UTC(Number(g.date.slice(0, 4)), m - 1, d)).getUTCDay();
  return (
    <button onClick={onClick} className="group flex w-full items-center gap-4 border-l-2 border-orange/70 py-3 pl-4 pr-1 text-left transition hover:bg-white/[.03]">
      <div className="w-12 shrink-0 leading-none">
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--acc)]">{DOW[dow]}</div>
        <div className="my-0.5 text-[22px] font-black">{d}</div>
        <div className="text-[10px] font-extrabold uppercase text-dim">{MON[m - 1]}</div>
      </div>
      <Avatar id={g.artistId || g.id} name={g.artistName || g.title} src={g.artistId ? imgMap.get(g.artistId) : undefined} size={40} radius={12} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[15px] font-extrabold">{g.artistName || g.title}</span>
          <span className="rounded bg-card2 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[var(--acc)]">{relativeLabel(g.date, today)}</span>
          {g.ticketed && <TicketStub price={g.ticketing?.price} />}
        </div>
        {g.startTime && <div className="mt-0.5 text-[12.5px] font-semibold text-dim">{formatTime(g.startTime)}</div>}
      </div>
      <ChevronRight size={18} className="shrink-0 text-dim2" />
    </button>
  );
}
