"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysISO, isoOf, MON } from "@/domain/dates";
import { cn } from "@/lib/cn";

const WEEKDAYS = [
  { short: "M", label: "Monday" },
  { short: "T", label: "Tuesday" },
  { short: "W", label: "Wednesday" },
  { short: "T", label: "Thursday" },
  { short: "F", label: "Friday" },
  { short: "S", label: "Saturday" },
  { short: "S", label: "Sunday" },
];
const MONTHS_AHEAD = 12;

function mondayIdx(iso: string) { const [y, m, d] = iso.split("-").map(Number); return (new Date(y, m - 1, d).getDay() + 6) % 7; }
function ym(iso: string) { return { y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1 }; }
function fullDateLabel(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00`));
}

export function WizardCalendar({ value, onPick, today, dots }: {
  value?: string;
  onPick: (d: string) => void;
  today: string;
  dots?: Set<string>;
}) {
  const [view, setView] = useState(() => ym(value ?? today));

  const maxIso = addDaysISO(today, MONTHS_AHEAD * 31);
  const first = isoOf(new Date(view.y, view.m, 1));
  const lastDay = isoOf(new Date(view.y, view.m + 1, 0));
  const gridStart = addDaysISO(first, -mondayIdx(first));
  const gridEnd = addDaysISO(lastDay, 6 - mondayIdx(lastDay));
  const cells: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDaysISO(d, 1)) cells.push(d);

  const canPrev = `${view.y}-${String(view.m + 1).padStart(2, "0")}` > today.slice(0, 7);
  const canNext = first < maxIso.slice(0, 7) + "-99";
  const shiftMonth = (delta: number) => setView((v) => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div className="rounded-2xl border border-line glass p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <button type="button" aria-label="Previous month" disabled={!canPrev} onClick={() => shiftMonth(-1)} className={cn("flex h-9 w-9 items-center justify-center rounded-xl", canPrev ? "text-dim hover:bg-white/5 hover:text-txt" : "text-dim2/30")}>
          <ChevronLeft size={18} />
        </button>
        <span className="text-[14px] font-extrabold" aria-live="polite">{MON[view.m]} {view.y}</span>
        <button type="button" aria-label="Next month" disabled={!canNext} onClick={() => shiftMonth(1)} className={cn("flex h-9 w-9 items-center justify-center rounded-xl", canNext ? "text-dim hover:bg-white/5 hover:text-txt" : "text-dim2/30")}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase text-dim2" aria-hidden="true">
        {WEEKDAYS.map((w) => <span key={w.label}>{w.short}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1" role="group" aria-label={`Choose a date in ${MON[view.m]} ${view.y}`}>
        {cells.map((d) => {
          const inMonth = d >= first && d <= lastDay;
          const selectable = d >= today && d <= maxIso;
          const isToday = d === today;
          const isSel = d === value;
          const busy = selectable && dots?.has(d);
          if (!selectable) return <span key={d} aria-hidden="true" className="flex h-10 items-center justify-center text-[13.5px] font-bold text-dim2/25">{Number(d.slice(8, 10))}</span>;
          return (
            <button
              key={d}
              type="button"
              aria-label={`${fullDateLabel(d)}${isToday ? ", today" : ""}${busy ? ", venue already has a gig" : ""}`}
              aria-pressed={isSel}
              onClick={() => onPick(d)}
              className={cn("relative flex h-10 items-center justify-center rounded-lg text-[13.5px] font-bold transition-colors", !inMonth && "text-dim2/50", inMonth && !isSel && "text-txt hover:bg-white/5", isSel && "bg-acc font-black text-on-acc", isToday && !isSel && "ring-1 ring-inset ring-[var(--acc)]")}
            >
              {Number(d.slice(8, 10))}
              {busy && !isSel && <span aria-hidden="true" className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--acc2)]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
