"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, List, MapPin } from "lucide-react";
import { useFestivals } from "@/lib/hooks";
import { MON_FULL, todayISO } from "@/domain/dates";
import type { FestivalSummary } from "@/domain/types";
import { cn } from "@/lib/cn";
import { FestivalCard } from "./FestivalCard";
import { festivalCountLine } from "./festivalUtils";

type View = "calendar" | "list";

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function festivalsOnDay(festivals: FestivalSummary[], iso: string) {
  return festivals.filter((f) => f.startDate <= iso && f.endDate >= iso);
}

function MonthGrid({ year, month, festivals, dense = false }: { year: number; month: number; festivals: FestivalSummary[]; dense?: boolean }) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= days ? day : null;
  });
  const today = todayISO();

  return (
    <section className={cn("rounded-[var(--rad-lg)] border border-line bg-card", dense ? "p-3" : "p-4")}>
      <h3 className="font-disp text-[18px] font-black tracking-tight">{MON_FULL[month]}</h3>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {WEEK.map((w, i) => <div key={`${w}-${i}`} className="font-meta py-1 text-[8px] font-black uppercase tracking-[1px] text-dim2">{w}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className={dense ? "min-h-9" : "min-h-12"} />;
          const iso = isoDate(year, month, day);
          const hits = festivalsOnDay(festivals, iso);
          const hot = hits.length > 0;
          const now = iso === today;
          return (
            <div
              key={iso}
              className={cn("relative overflow-hidden rounded-lg border text-left", dense ? "min-h-9 p-1" : "min-h-12 p-1.5", hot ? "border-[color-mix(in_srgb,var(--acc)_48%,var(--line))]" : "border-transparent", now && "ring-1 ring-[var(--acc)]")}
              style={hot ? { background: "color-mix(in srgb, var(--acc) 12%, var(--card2))" } : undefined}
            >
              <div className={cn("tnum text-[9px] font-black", hot ? "text-txt" : "text-dim2")}>{day}</div>
              {hot && (
                <div className="mt-0.5 space-y-0.5">
                  {hits.slice(0, dense ? 1 : 2).map((f) => (
                    <Link key={f.id} href={`/festivals/${f.slug}`} title={f.name} className="block truncate rounded bg-[var(--acc)] px-1 py-0.5 text-[7px] font-black leading-tight text-on-acc hover:opacity-90">
                      {dense ? "●" : f.name}
                    </Link>
                  ))}
                  {hits.length > (dense ? 1 : 2) && <div className="text-[7px] font-black text-[var(--acc)]">+{hits.length - (dense ? 1 : 2)}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FestivalIndex() {
  const { data: festivals = [], isLoading, error } = useFestivals();
  const today = todayISO();
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7)) - 1;
  const years = useMemo(() => {
    const values = new Set<number>([currentYear]);
    festivals.forEach((f) => {
      values.add(Number(f.startDate.slice(0, 4)));
      values.add(Number(f.endDate.slice(0, 4)));
    });
    return [...values].sort((a, b) => a - b);
  }, [festivals, currentYear]);
  const [view, setView] = useState<View>("calendar");
  const [year, setYear] = useState(currentYear);
  const [mobileMonth, setMobileMonth] = useState(currentMonth);

  const upcoming = useMemo(() => festivals.filter((f) => f.endDate >= today), [festivals, today]);
  const yearFestivals = useMemo(() => upcoming.filter((f) => Number(f.startDate.slice(0, 4)) <= year && Number(f.endDate.slice(0, 4)) >= year), [upcoming, year]);
  const mobileMonthFestivals = useMemo(() => {
    const start = isoDate(year, mobileMonth, 1);
    const end = isoDate(year, mobileMonth, new Date(year, mobileMonth + 1, 0).getDate());
    return yearFestivals.filter((f) => f.startDate <= end && f.endDate >= start);
  }, [yearFestivals, year, mobileMonth]);

  const moveMonth = (delta: number) => {
    const next = new Date(year, mobileMonth + delta, 1);
    setYear(next.getFullYear());
    setMobileMonth(next.getMonth());
  };

  return (
    <main className="mx-auto max-w-content px-4 pb-28 pt-[calc(env(safe-area-inset-top,0px)+18px)] lg:px-8 lg:pb-12 lg:pt-9">
      <header className="relative overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card p-5 shadow-[var(--shadow)] lg:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-[var(--acc)]" />
        <div className="font-meta text-[9px] font-black uppercase tracking-[2px] text-[var(--acc)]">Plan something worth travelling for</div>
        <h1 className="font-disp mt-2 text-[36px] font-black leading-none tracking-tight lg:text-[52px]">Festivals</h1>
        <p className="mt-3 max-w-2xl text-[13px] font-semibold leading-relaxed text-dim lg:text-[15px]">
          Grassroots festivals and short live-music programmes. Pick a weekend, explore the full schedule, then drop straight back into bndy gigs and venues.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-line bg-card2 p-1">
            <ViewButton active={view === "calendar"} onClick={() => setView("calendar")} icon={<CalendarDays size={14} />} label="Calendar" />
            <ViewButton active={view === "list"} onClick={() => setView("list")} icon={<List size={14} />} label="List" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {years.length > 1 && (
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border border-line bg-card2 px-3 py-2 text-[12px] font-black outline-none focus:border-[var(--acc)]">
                {years.map((y) => <option key={y}>{y}</option>)}
              </select>
            )}
            <div className="rounded-xl border border-line bg-card2 px-3 py-2 text-[12px] font-black">{upcoming.length} upcoming</div>
          </div>
        </div>
      </header>

      {isLoading && <div className="mt-6 grid gap-4 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-[var(--rad-lg)] border border-line bg-card" />)}</div>}
      {error && <div className="mt-6 rounded-[var(--rad-lg)] border border-line bg-card p-6 text-center font-bold text-dim">Couldn&apos;t load festivals right now.</div>}

      {!isLoading && !error && upcoming.length === 0 && (
        <div className="mt-6 rounded-[var(--rad-lg)] border border-line bg-card p-8 text-center">
          <CalendarDays size={28} className="mx-auto text-[var(--acc)]" />
          <h2 className="mt-3 text-xl font-black">No upcoming grassroots festivals listed yet.</h2>
          <Link href="/gigs" className="mt-4 inline-flex rounded-xl bg-[var(--acc)] px-4 py-2.5 text-[12px] font-black text-on-acc">Browse gigs instead</Link>
        </div>
      )}

      {!isLoading && !error && upcoming.length > 0 && view === "calendar" && (
        <div className="mt-6">
          <div className="lg:hidden">
            <div className="mb-3 flex items-center justify-between rounded-xl border border-line bg-card px-2 py-1.5">
              <button onClick={() => moveMonth(-1)} aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-card2"><ChevronLeft size={18} /></button>
              <div className="text-center"><div className="text-[15px] font-black">{MON_FULL[mobileMonth]}</div><div className="font-meta text-[9px] font-bold text-dim">{year}</div></div>
              <button onClick={() => moveMonth(1)} aria-label="Next month" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-card2"><ChevronRight size={18} /></button>
            </div>
            <MonthGrid year={year} month={mobileMonth} festivals={yearFestivals} />
            <div className="mt-5 space-y-3">
              {mobileMonthFestivals.length ? mobileMonthFestivals.map((f) => <FestivalCard key={f.id} festival={f} compact />) : (
                <div className="rounded-xl border border-line bg-card p-5 text-center text-[12px] font-bold text-dim">Nothing listed in {MON_FULL[mobileMonth]} yet.</div>
              )}
            </div>
          </div>
          <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4">
            {Array.from({ length: 12 }, (_, month) => <MonthGrid key={month} year={year} month={month} festivals={yearFestivals} dense />)}
          </div>
        </div>
      )}

      {!isLoading && !error && upcoming.length > 0 && view === "list" && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {upcoming.map((festival) => <FestivalCard key={festival.id} festival={festival} />)}
        </div>
      )}

      {!isLoading && upcoming.length > 0 && (
        <footer className="mt-8 flex items-start gap-2 rounded-xl border border-line bg-card2 px-4 py-3 text-[11px] font-semibold text-dim">
          <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--acc)]" />
          Festivals are deliberately broader than your normal gig radius — this page is for finding programmes you might travel to.
        </footer>
      )}
    </main>
  );
}

function ViewButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-black transition-all", active ? "border-[var(--acc)] bg-[var(--acc)] text-on-acc shadow-sm" : "border-transparent text-dim hover:text-txt")}
    >
      {icon}{label}
    </button>
  );
}
