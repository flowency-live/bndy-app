"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, ChevronRight, Clock3, LayoutList, MapPin, Ticket } from "lucide-react";
import type { Festival, Gig } from "@/domain/types";
import { useArtistImageMap } from "@/lib/hooks";
import { formatTime, isTonight, todayISO } from "@/domain/dates";
import { blockFestivalGigs, blockTimeLabel, type FestivalBlock, type ScheduleItem } from "@/domain/festivalBlocks";
import { Avatar } from "@/components/ui/Avatar";
import { GigSheet } from "@/features/gigs/GigSheet";
import { TicketStub } from "@/components/TicketStub";
import { DAY_PERIOD_LABEL, dayPeriod, festivalDayHeading, groupFestivalGigs, type DayPeriod } from "./festivalUtils";

type ScheduleView = "time" | "venue";
type PriceFilter = "all" | "free" | "ticketed";

export function FestivalSchedule({ festival, gigs }: { festival: Festival; gigs: Gig[] }) {
  const [selected, setSelected] = useState<Gig | null>(null);
  const [view, setView] = useState<ScheduleView>("venue");
  const [price, setPrice] = useState<PriceFilter>("all");
  const [venueId, setVenueId] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const imgMap = useArtistImageMap();
  const stageById = useMemo(() => new Map(festival.stages.map((s) => [s.id, s.name])), [festival.stages]);

  const today = todayISO();
  const liveNow = festival.startDate <= today && festival.endDate >= today;

  const venues = useMemo(() => {
    const seen = new Map<string, string>();
    for (const g of gigs) if (g.venueId && !seen.has(g.venueId)) seen.set(g.venueId, g.venueName);
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [gigs]);

  const filtered = useMemo(
    () =>
      gigs.filter(
        (g) =>
          (price === "all" || (price === "free" ? !g.ticketed : !!g.ticketed)) &&
          (!venueId || g.venueId === venueId) &&
          (!todayOnly || g.date === today),
      ),
    [gigs, price, venueId, todayOnly, today],
  );
  const groups = useMemo(() => groupFestivalGigs(filtered), [filtered]);
  const filtering = price !== "all" || !!venueId || todayOnly;

  // Scroll spy for the sticky day pills. Click still jumps; scrolling updates the highlight.
  useEffect(() => {
    const onScroll = () => {
      let current: string | null = null;
      for (const g of groups) {
        const el = document.getElementById(`festival-day-${g.date}`);
        if (el && el.getBoundingClientRect().top <= 170) current = g.date;
      }
      setActiveDay(current ?? groups[0]?.date ?? null);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [groups]);

  if (!gigs.length) {
    return (
      <div className="rounded-[var(--rad-lg)] border border-line bg-card p-8 text-center">
        <Clock3 size={28} className="mx-auto text-[var(--acc)]" />
        <h2 className="mt-3 text-xl font-black">Programme coming soon.</h2>
        <p className="mt-2 text-[13px] font-semibold text-dim">The festival is listed, but its individual bndy gigs have not been linked yet.</p>
      </div>
    );
  }

  const jumpTo = (date: string) => {
    setActiveDay(date);
    document.getElementById(`festival-day-${date}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const clearFilters = () => {
    setPrice("all");
    setVenueId("");
    setTodayOnly(false);
  };

  return (
    <>
      {/* Sticky day rail + view toggle */}
      <div className="sticky top-0 z-30 -mx-4 mb-3 border-b border-line bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-4 py-2 backdrop-blur lg:mx-0 lg:rounded-2xl lg:border lg:px-3 lg:shadow-[var(--shadow)]">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-1.5">
              {groups.map((group) => {
                const active = group.date === activeDay;
                return (
                  <button
                    key={group.date}
                    type="button"
                    onClick={() => jumpTo(group.date)}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-[border-color,background-color,transform] active:scale-[.97] ${
                      active
                        ? "border-[color-mix(in_srgb,var(--acc)_60%,var(--line))] bg-[color-mix(in_srgb,var(--acc)_14%,var(--card2))]"
                        : "border-line bg-card hover:bg-card2"
                    }`}
                  >
                    <CalendarDays size={13} strokeWidth={2.4} className={active ? "text-[var(--acc)]" : "text-dim"} />
                    <span>
                      <span className={`block text-[11px] font-black leading-tight ${active ? "text-[var(--acc)]" : "text-txt"}`}>{shortDay(group.date)}</span>
                      <span className="mt-0.5 block font-meta text-[8px] font-extrabold uppercase tracking-[.9px] text-dim">
                        {group.gigs.length} gig{group.gigs.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {venues.length > 1 && (
            <div className="flex shrink-0 overflow-hidden rounded-xl border border-line">
              <ViewButton label="Time" icon={<Clock3 size={12} strokeWidth={2.6} />} active={view === "time"} onClick={() => setView("time")} />
              <ViewButton label="Venue" icon={<MapPin size={12} strokeWidth={2.6} />} active={view === "venue"} onClick={() => setView("venue")} />
            </div>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <Chip active={price === "free"} onClick={() => setPrice(price === "free" ? "all" : "free")}>
          Free
        </Chip>
        <Chip active={price === "ticketed"} onClick={() => setPrice(price === "ticketed" ? "all" : "ticketed")}>
          <Ticket size={11} strokeWidth={2.6} /> Ticketed
        </Chip>
        {liveNow && (
          <Chip active={todayOnly} onClick={() => setTodayOnly(!todayOnly)} glow>
            <span className="h-1.5 w-1.5 rounded-full bg-current" /> Today
          </Chip>
        )}
        {venues.length > 1 && (
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className={`h-[30px] max-w-[180px] rounded-full border bg-card px-2.5 font-meta text-[9.5px] font-black uppercase tracking-[.8px] outline-none transition-colors sm:max-w-[240px] ${
              venueId ? "border-[color-mix(in_srgb,var(--acc)_60%,var(--line))] text-[var(--acc)]" : "border-line text-dim"
            }`}
          >
            <option value="">All venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}
        {filtering && (
          <button type="button" onClick={clearFilters} className="font-meta text-[9.5px] font-black uppercase tracking-[.8px] text-dim underline underline-offset-2 hover:text-txt">
            Clear
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-[var(--rad-lg)] border border-line bg-card p-8 text-center">
          <LayoutList size={26} className="mx-auto text-[var(--acc)]" />
          <h2 className="mt-3 text-lg font-black">No gigs match these filters.</h2>
          <button type="button" onClick={clearFilters} className="bndy-btn2 mt-4 inline-flex px-4 py-2 text-[11.5px] font-black">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-9">
          {groups.map((group, dayIndex) => (
            <section key={group.date} id={`festival-day-${group.date}`} className="scroll-mt-24">
              <div className="mb-3 flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-meta text-[8px] font-black uppercase tracking-[1.6px] text-[var(--acc)]">Day {dayIndex + 1}</div>
                  <h2 className="font-disp mt-0.5 text-[24px] font-black leading-none tracking-tight text-txt sm:text-[28px]">{festivalDayHeading(group.date)}</h2>
                </div>
                <span className="tnum shrink-0 rounded-full border border-line bg-card px-2.5 py-1 text-[9px] font-black text-dim">{group.gigs.length} gigs</span>
              </div>

              <div className="overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card shadow-[var(--shadow)]">
                {view === "time" ? (
                  <TimeView gigs={group.gigs} stageById={stageById} imgMap={imgMap} onPick={setSelected} />
                ) : (
                  <VenueView gigs={group.gigs} imgMap={imgMap} onPick={setSelected} />
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <GigSheet gig={selected} onClose={() => setSelected(null)} />
    </>
  );
}

/* ---------------- By time: chronological with time-of-day sections ---------------- */

const MIN_ITEMS_FOR_PERIODS = 8;

function TimeView({ gigs, stageById, imgMap, onPick }: { gigs: Gig[]; stageById: Map<string, string>; imgMap: Map<string, string>; onPick: (g: Gig) => void }) {
  const items = blockFestivalGigs(gigs);
  const periodOf = (item: ScheduleItem): DayPeriod => (item.kind === "gig" ? dayPeriod(item.gig.startTime) : dayPeriod(item.startTime));
  const distinct = new Set(items.map(periodOf));
  const showPeriods = items.length >= MIN_ITEMS_FOR_PERIODS && distinct.size > 1;

  let lastPeriod: DayPeriod | null = null;
  const rows: ReactNode[] = [];
  items.forEach((item, index) => {
    const period = periodOf(item);
    if (showPeriods && period !== lastPeriod) {
      rows.push(<PeriodHeader key={`period-${period}-${index}`} label={DAY_PERIOD_LABEL[period]} first={index === 0} />);
      lastPeriod = period;
    }
    rows.push(
      item.kind === "gig" ? (
        <ProgrammeRow
          key={item.gig.id}
          gig={item.gig}
          stageName={item.gig.stageId ? stageById.get(item.gig.stageId) : undefined}
          imageUrl={item.gig.artistId ? imgMap.get(item.gig.artistId) : undefined}
          onPick={onPick}
          first={index === 0 && !showPeriods}
        />
      ) : (
        <BlockPanel key={`${item.venueId}-${item.date}`} block={item} imgMap={imgMap} onPick={onPick} first={index === 0 && !showPeriods} />
      ),
    );
  });
  return <>{rows}</>;
}

function PeriodHeader({ label, first }: { label: string; first: boolean }) {
  return (
    <div className={`flex items-center gap-2 bg-card2 px-3 py-1.5 sm:px-4 ${first ? "" : "border-t border-line"}`}>
      <span className="h-1.5 w-1.5 rotate-45 bg-[var(--acc)]" />
      <span className="font-meta text-[8px] font-black uppercase tracking-[1.6px] text-dim">{label}</span>
    </div>
  );
}

/* ---------------- By venue: the crawl-planning view ---------------- */

function VenueView({ gigs, imgMap, onPick }: { gigs: Gig[]; imgMap: Map<string, string>; onPick: (g: Gig) => void }) {
  const byVenue = new Map<string, Gig[]>();
  for (const g of gigs) {
    const arr = byVenue.get(g.venueId) || [];
    arr.push(g);
    byVenue.set(g.venueId, arr);
  }
  const venueGroups = [...byVenue.values()].sort((a, b) => (a[0].startTime || "99:99").localeCompare(b[0].startTime || "99:99") || a[0].venueName.localeCompare(b[0].venueName));

  return (
    <>
      {venueGroups.map((venueGigs, vi) => {
        // A venue whose acts share one time window is already a block; reuse that panel.
        const items = blockFestivalGigs(venueGigs);
        if (items.length === 1 && items[0].kind === "block") {
          return <BlockPanel key={venueGigs[0].venueId} block={items[0]} imgMap={imgMap} onPick={onPick} first={vi === 0} />;
        }
        const times = venueGigs.map((g) => g.startTime).filter((t): t is string => !!t).sort();

        // Group gigs by time period within this venue
        const sorted = [...venueGigs].sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
        const periods = new Set(sorted.map((g) => dayPeriod(g.startTime)));
        const showPeriods = sorted.length >= 4 && periods.size > 1;

        return (
          <div key={venueGigs[0].venueId} className={vi === 0 ? "" : "border-t border-line"}>
            <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4" style={{ background: "color-mix(in srgb, var(--acc) 9%, var(--card2))" }}>
              <MapPin size={13} className="shrink-0 text-[var(--acc)]" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-black text-txt sm:text-[14px]">{venueGigs[0].venueName}</span>
              <span className="tnum shrink-0 rounded-full border border-line bg-card px-2 py-0.5 text-[9px] font-black text-dim">
                {venueGigs.length} gig{venueGigs.length === 1 ? "" : "s"}
                {times.length ? ` · from ${formatTime(times[0])}` : ""}
              </span>
            </div>
            {(() => {
              let lastPeriod: DayPeriod | null = null;
              return sorted.map((g, gi) => {
                const period = dayPeriod(g.startTime);
                const needsHeader = showPeriods && period !== lastPeriod;
                lastPeriod = period;
                return (
                  <div key={g.id}>
                    {needsHeader && <VenuePeriodHeader label={DAY_PERIOD_LABEL[period]} />}
                    <ProgrammeRow gig={g} imageUrl={g.artistId ? imgMap.get(g.artistId) : undefined} onPick={onPick} first={gi === 0 && !needsHeader} hideVenue />
                  </div>
                );
              });
            })()}
          </div>
        );
      })}
    </>
  );
}

function VenuePeriodHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border-t border-line bg-card px-3 py-1.5 sm:px-4">
      <span className="h-1.5 w-1.5 rotate-45 bg-[var(--acc2)]" />
      <span className="font-meta text-[8px] font-black uppercase tracking-[1.6px] text-dim">{label}</span>
    </div>
  );
}

/* ---------------- Shared rows ---------------- */

function ProgrammeRow({
  gig,
  stageName,
  imageUrl,
  onPick,
  first,
  hideVenue = false,
}: {
  gig: Gig;
  stageName?: string;
  imageUrl?: string;
  onPick: (g: Gig) => void;
  first: boolean;
  hideVenue?: boolean;
}) {
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
        {live && <div className="mt-2 inline-flex items-center gap-1 font-meta text-[7.5px] font-black uppercase tracking-[1px] text-[var(--acc)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--acc)] shadow-[0_0_8px_var(--acc)]" /> Live</div>}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <Avatar id={gig.artistId || gig.id} name={gig.artistName || gig.title} src={imageUrl} size={42} radius={12} />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-black leading-tight text-txt sm:text-[15px]">{gig.artistName || gig.title}</div>
          {(!hideVenue || stageName) && (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-dim">
              {!hideVenue && (
                <span className="flex min-w-0 items-center gap-1"><MapPin size={10} className="shrink-0 text-[var(--acc)]" /><span className="truncate">{gig.venueName}</span></span>
              )}
              {stageName && <span className="rounded-md bg-card2 px-1.5 py-0.5 font-meta text-[7.5px] font-black uppercase tracking-[.8px] text-[var(--acc)]">{stageName}</span>}
            </div>
          )}
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

/* ---------------- Small controls ---------------- */

function ViewButton({ label, icon, active, onClick }: { label: string; icon: ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 font-meta text-[9px] font-black uppercase tracking-[.9px] transition-colors ${
        active ? "bg-[color-mix(in_srgb,var(--acc)_16%,var(--card2))] text-[var(--acc)]" : "bg-card text-dim hover:text-txt"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function Chip({ active, onClick, glow = false, children }: { active: boolean; onClick: () => void; glow?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-[30px] items-center gap-1.5 rounded-full border px-3 font-meta text-[9.5px] font-black uppercase tracking-[.8px] transition-[border-color,background-color,color] active:scale-[.97] ${
        active
          ? `border-[color-mix(in_srgb,var(--acc)_60%,var(--line))] bg-[color-mix(in_srgb,var(--acc)_14%,var(--card2))] text-[var(--acc)] ${glow ? "shadow-[0_0_12px_color-mix(in_srgb,var(--acc)_35%,transparent)]" : ""}`
          : "border-line bg-card text-dim hover:text-txt"
      }`}
    >
      {children}
    </button>
  );
}

function shortDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(d);
}
