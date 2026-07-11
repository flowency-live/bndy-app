"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar, ArrowRight } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { addDaysISO } from "@/domain/dates";
import { cn } from "@/lib/cn";
import type { Gig } from "@/domain/types";
import { type MapDateSel, mapDateLabel, matchesMapDate, weekendDates, focusedDay, selFromDay } from "@/domain/mapdate";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const HORIZON = 14;

function dow(iso: string) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).getDay(); } // 0 Sun … 6 Sat
function mondayIdx(iso: string) { return (dow(iso) + 6) % 7; } // Mon 0 … Sun 6

export function MapDateControl({ sel, onChange, gigs, today }: { sel: MapDateSel; onChange: (s: MapDateSel) => void; gigs: Gig[]; today: string }) {
  const [open, setOpen] = useState(false);
  const focused = focusedDay(sel, today);
  const endWin = addDaysISO(today, HORIZON - 1);

  const countOn = (pred: (d: string) => boolean) => gigs.reduce((n, g) => (pred(g.date) ? n + 1 : n), 0);
  const dayCounts = new Map<string, number>();
  for (const g of gigs) dayCounts.set(g.date, (dayCounts.get(g.date) ?? 0) + 1);
  const todayCount = countOn((d) => d === today);
  const thisWknd = countOn((d) => weekendDates("this", today).includes(d));
  const nextWknd = countOn((d) => weekendDates("next", today).includes(d));

  // calendar cells: whole weeks (Mon-first) covering [today … today+13]
  const start = addDaysISO(today, -mondayIdx(today));
  const last = addDaysISO(endWin, 6 - mondayIdx(endWin));
  const cells: string[] = [];
  for (let d = start; d <= last; d = addDaysISO(d, 1)) cells.push(d);
  const mA = MON[Number(today.slice(5, 7)) - 1];
  const mB = MON[Number(endWin.slice(5, 7)) - 1];
  const monthLabel = mA === mB ? mA : `${mA} – ${mB}`;

  const step = (delta: number) => { if (!focused) return; const d = addDaysISO(focused, delta); if (d >= today && d <= endWin) onChange(selFromDay(d, today)); };
  const pick = (s: MapDateSel) => { onChange(s); setOpen(false); };

  return (
    <>
      <div className="flex items-center rounded-2xl border border-line glass shadow-[0_6px_22px_rgba(0,0,0,.3)]">
        {focused && (
          <button aria-label="Previous day" disabled={focused <= today} onClick={() => step(-1)}
            className={cn("flex h-10 w-9 items-center justify-center rounded-l-2xl", focused <= today ? "text-dim2/40" : "text-dim hover:text-txt")}>
            <ChevronLeft size={18} />
          </button>
        )}
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-3 py-2.5 text-[13.5px] font-extrabold">
          <Calendar size={15} className="text-[var(--acc)]" />
          {mapDateLabel(sel, today)}
        </button>
        {focused && (
          <button aria-label="Next day" disabled={focused >= endWin} onClick={() => step(1)}
            className={cn("flex h-10 w-9 items-center justify-center rounded-r-2xl", focused >= endWin ? "text-dim2/40" : "text-dim hover:text-txt")}>
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <h3 className="mb-3 text-[17px] font-black tracking-tight">When&apos;s good?</h3>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <Quick label="Today" count={todayCount} on={sel.kind === "today"} onClick={() => pick({ kind: "today" })} />
          <Quick label="This weekend" count={thisWknd} on={sel.kind === "weekend" && sel.which === "this"} onClick={() => pick({ kind: "weekend", which: "this" })} />
          <Quick label="Next weekend" count={nextWknd} on={sel.kind === "weekend" && sel.which === "next"} onClick={() => pick({ kind: "weekend", which: "next" })} />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim2">Pick a day</span>
          <span className="text-[12px] font-bold text-dim">{monthLabel}</span>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase text-dim2">
          {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d) => {
            const inRange = d >= today && d <= endWin;
            const selected = sel.kind !== "weekend" && matchesMapDate(d, sel, today);
            const isToday = d === today;
            const hasGigs = inRange && (dayCounts.get(d) ?? 0) > 0;
            return (
              <button key={d} disabled={!inRange} onClick={() => pick(selFromDay(d, today))}
                className={cn("relative flex h-9 items-center justify-center rounded-lg text-[13.5px] font-bold transition-colors",
                  !inRange && "text-dim2/25",
                  inRange && !selected && "text-txt hover:bg-white/5",
                  selected && "bg-acc font-black text-on-acc",
                  isToday && !selected && "ring-1 ring-inset ring-[var(--acc)]")}>
                {Number(d.slice(8, 10))}
                {hasGigs && !selected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-acc" />}
              </button>
            );
          })}
        </div>

        <Link href="/gigs" className="mt-5 flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-white/5 py-3 text-[13px] font-bold text-dim">
          Planning further ahead? Browse all gigs <ArrowRight size={15} />
        </Link>
      </Sheet>
    </>
  );
}

function Quick({ label, count, on, onClick }: { label: string; count: number; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn("flex flex-col items-center gap-0.5 rounded-2xl border py-3 text-center transition-colors",
        on ? "bndy-chip on" : "bndy-chip text-dim hover:text-txt")}>
      <span className="text-[12.5px] font-extrabold leading-tight">{label}</span>
      <span className={cn("text-[10px] font-bold", on ? "opacity-75" : "text-dim2")}>{count} gig{count === 1 ? "" : "s"}</span>
    </button>
  );
}
