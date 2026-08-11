"use client";

// Save a gig to my calendar (backlog 3a). No login needed.
// .ics download covers Apple, Outlook and the rest; a template link covers Google.

import { useState } from "react";
import { CalendarPlus, Download } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { downloadIcs, googleCalendarUrl } from "@/domain/calendar";
import { cn } from "@/lib/cn";
import type { Gig } from "@/domain/types";

export function AddToCalendarButton({ gig, className }: { gig: Gig; className?: string }) {
  const [open, setOpen] = useState(false);

  // A cancelled gig has no place in anyone's calendar.
  if (gig.cancelled) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border border-line glass px-3 py-2 text-[12px] font-extrabold text-dim transition-colors hover:text-txt",
          className,
        )}
      >
        <CalendarPlus size={13} className="text-[var(--acc)]" /> Add to calendar
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <h2 className="text-lg font-black tracking-tight text-txt">Add to calendar</h2>
        <p className="mt-1 text-[13px] font-semibold text-dim">
          {gig.artistName || gig.title} at {gig.venueName}
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <a
            href={googleCalendarUrl(gig)}
            target="_blank"
            rel="noopener"
            onClick={() => setOpen(false)}
            className="w-full rounded-xl bg-[var(--acc)] px-4 py-3 text-center text-[14px] font-extrabold text-black transition-opacity hover:opacity-90"
          >
            Google Calendar
          </a>
          <button
            type="button"
            onClick={() => {
              downloadIcs(gig);
              setOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-[14px] font-bold text-txt transition-colors hover:bg-white/5"
          >
            <Download size={16} /> Apple, Outlook &amp; others (.ics)
          </button>
        </div>
        <p className="mt-3 text-center text-[11.5px] font-semibold text-dim2">
          The .ics file opens in whatever calendar app you use.
        </p>
      </Sheet>
    </>
  );
}
