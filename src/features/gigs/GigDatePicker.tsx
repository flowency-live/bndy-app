"use client";

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { addDaysISO, isoOf } from "@/domain/dates";
import { cn } from "@/lib/cn";

export interface DateSel { start: string; end: string }

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS_AHEAD = 12;

function mondayIdx(iso: string) { const [y, m, d] = iso.split("-").map(Number); return (new Date(y, m - 1, d).getDay() + 6) % 7; }
function ym(iso: string) { return { y: Number(iso.slice(0, 4)), m: Number(iso.slice(5, 7)) - 1 }; }

/** Short label for the trigger: single day or a range. */
function label(sel: DateSel | null, today: string): string {
  if (!sel) return "Any date";
  const f = (iso: string) => { const d = Number(iso.slice(8, 10)); const mo = MON[Number(iso.slice(5, 7)) - 1]; return iso === today ? "Today" : iso === addDaysISO(today, 1) ? "Tomorrow" : `${d} ${mo}`; };
  return sel.start === sel.end ? f(sel.start) : `${Number(sel.start.slice(8, 10))} ${MON[Number(sel.start.slice(5, 7)) - 1]} – ${f(sel.end)}`;
}

export function GigDatePicker({ value, onChange, today, dayCounts, onClosed }: {
  value: DateSel | null;
  onChange: (s: DateSel | null) => void;
  today: string;
  dayCounts: Map<string, number>;
  onClosed?: () => void; // fired whenever the sheet closes — lets the parent shield stray taps
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ym(today)); // month being shown
  const [anchor, setAnchor] = useState<string | null>(null); // first click of a pending range

  const close = () => { setOpen(false); setAnchor(null); onClosed?.(); };

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

  const pick = (d: string) => {
    if (!anchor) { setAnchor(d); onChange({ start: d, end: d }); return; }
    // second tap completes the range → apply and auto-close
    const start = anchor < d ? anchor : d;
    const end = anchor < d ? d : anchor;
    onChange({ start, end });
    close();
  };
  const clear = () => { onChange(null); setAnchor(null); };

  return (
    <>
      <div
        style={value ? { borderColor: "color-mix(in srgb, var(--acc) 55%, transparent)", background: "color-mix(in srgb, var(--acc) 18%, var(--glass))" } : undefined}
        className={cn("flex shrink-0 items-center rounded-2xl border border-line glass text-[12.5px] font-extrabold transition-colors", value ? "text-white" : "text-dim")}
      >
        <button onClick={() => setOpen(true)} aria-label="Pick dates" className="flex items-center gap-2 py-2 pl-3.5 pr-2.5">
          <Calendar size={14} className={value ? "text-[var(--acc)]" : "text-dim"} />
          {label(value, today)}
        </button>
        {value && (
          <button onClick={clear} aria-label="Clear dates" className="py-2 pl-1 pr-3 text-dim2 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      <Sheet open={open} onClose={close}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-black tracking-tight">Pick a day or range</h3>
          <div className="flex items-center gap-3">
            {value && <button onClick={clear} className="text-[12px] font-bold text-dim hover:text-txt">Clear</button>}
            <button onClick={close} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-dim hover:bg-white/10 hover:text-txt">
              <X size={18} />
            </button>
          </div>
        </div>

        <p className="mb-3 text-[12px] font-semibold text-dim2">Tap one day, or tap a start then an end for a range.</p>

        <div className="mb-2 flex items-center justify-between">
          <button aria-label="Previous month" disabled={!canPrev} onClick={() => shiftMonth(-1)}
            className={cn("flex h-9 w-9 items-center justify-center rounded-xl", canPrev ? "text-dim hover:bg-white/5 hover:text-txt" : "text-dim2/30")}>
            <ChevronLeft size={18} />
          </button>
          <span className="text-[14px] font-extrabold">{MON[view.m]} {view.y}</span>
          <button aria-label="Next month" disabled={!canNext} onClick={() => shiftMonth(1)}
            className={cn("flex h-9 w-9 items-center justify-center rounded-xl", canNext ? "text-dim hover:bg-white/5 hover:text-txt" : "text-dim2/30")}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase text-dim2">
          {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d) => {
            const inMonth = d >= first && d <= lastDay;
            const selectable = d >= today && d <= maxIso;
            const isToday = d === today;
            const inSel = value && d >= value.start && d <= value.end;
            const isEnd = value && (d === value.start || d === value.end);
            const isAnchor = anchor === d;
            const hasGigs = selectable && (dayCounts.get(d) ?? 0) > 0;
            if (!selectable) return <span key={d} className="flex h-10 items-center justify-center text-[13.5px] font-bold text-dim2/25">{Number(d.slice(8, 10))}</span>;
            return (
              <button key={d} onClick={() => pick(d)}
                className={cn("relative flex h-10 items-center justify-center text-[13.5px] font-bold transition-colors",
                  inSel ? "bg-[color-mix(in_srgb,var(--acc)_25%,transparent)]" : "rounded-lg",
                  value && d === value.start && "rounded-l-lg",
                  value && d === value.end && "rounded-r-lg",
                  !inMonth && "text-dim2/50",
                  inMonth && !inSel && "text-txt hover:bg-white/5",
                  (isEnd || isAnchor) && "bg-acc font-black text-on-acc",
                  isToday && !inSel && "ring-1 ring-inset ring-[var(--acc)]")}>
                {Number(d.slice(8, 10))}
                {hasGigs && !inSel && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-acc" />}
              </button>
            );
          })}
        </div>

        <button onClick={close} className="bndy-btn mt-5 w-full py-3 text-[14px] transition-transform active:scale-[.98]">
          {value ? `Show ${label(value, today)}` : "Done"}
        </button>
      </Sheet>
    </>
  );
}
