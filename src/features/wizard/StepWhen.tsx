"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import { useUpcomingGigs } from "@/lib/hooks";
import { todayISO, addDaysISO } from "@/domain/dates";
import { cn } from "@/lib/cn";
import { defaultStartTime, type Draft } from "./lib";
import { WizardCalendar } from "./WizardCalendar";

/** Quick date chips: tonight / tomorrow / next Fri / next Sat. */
function quickDates(today: string): { label: string; date: string }[] {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
  const toFri = (5 - dow + 7) % 7 || 7;
  const toSat = (6 - dow + 7) % 7 || 7;
  return [
    { label: "Tonight", date: today },
    { label: "Tomorrow", date: addDaysISO(today, 1) },
    { label: "Friday", date: addDaysISO(today, toFri) },
    { label: "Saturday", date: addDaysISO(today, toSat) },
  ];
}

const TIMES: string[] = [];
for (let h = 11; h <= 23; h++) for (const m of ["00", "15", "30", "45"]) TIMES.push(`${String(h).padStart(2, "0")}:${m}`);

function TimeSelect({ value, onChange, allowNone, label }: { value?: string; onChange: (v?: string) => void; allowNone?: boolean; label: string }) {
  return (
    <label className="relative block flex-1">
      <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full appearance-none rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none focus:border-orange/55"
      >
        {allowNone && <option value="">None</option>}
        {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute bottom-3.5 right-3.5 text-dim" />
    </label>
  );
}

export function StepWhen({ draft, onDone }: { draft: Draft; onDone: (patch: Partial<Draft>) => void }) {
  const today = todayISO();
  const { data: gigs = [] } = useUpcomingGigs();
  const [date, setDate] = useState(draft.date ?? "");
  const [timeTouched, setTimeTouched] = useState(!!draft.startTime);
  const [startTime, setStartTime] = useState<string | undefined>(draft.startTime);
  const [endTime, setEndTime] = useState<string | undefined>(draft.endTime);
  const [ticketed, setTicketed] = useState(draft.ticketed);
  const [ticketUrl, setTicketUrl] = useState(draft.ticketUrl ?? "");
  const [ticketInfo, setTicketInfo] = useState(draft.ticketInfo ?? "");
  const [more, setMore] = useState(!!(draft.info || draft.posterUrl));
  const [info, setInfo] = useState(draft.info ?? "");
  const [posterUrl, setPosterUrl] = useState(draft.posterUrl ?? "");

  /** busy-night dots on the calendar: dates where this venue already has a gig */
  const venueBusy = useMemo(() => {
    if (!draft.venueId) return undefined;
    const s = new Set<string>();
    for (const g of gigs) if (g.venueId === draft.venueId) s.add(g.date);
    return s;
  }, [gigs, draft.venueId]);

  /** proactive conflict warnings from the cached gig list (server gate still has final say) */
  const clashes = useMemo(() => {
    if (!date) return [];
    const artistName = draft.artistName ?? draft.newArtist?.name ?? "This artist";
    const out: { hard: boolean; text: string }[] = [];
    if (draft.artistId) {
      const c = gigs.find((g) => g.artistId === draft.artistId && g.date === date);
      if (c) {
        out.push(c.venueId === draft.venueId
          ? { hard: true, text: `${artistName} is already listed at ${draft.venueName} that night. This gig may already be on bndy.` }
          : { hard: false, text: `${artistName} already has a gig that night at ${c.venueName}. Double-check your date.` });
      }
    }
    if (draft.venueId) {
      const c = gigs.find((g) => g.venueId === draft.venueId && g.date === date && g.artistId !== draft.artistId);
      if (c) out.push({ hard: false, text: `${draft.venueName} already has ${c.artistName ?? "another act"} listed that night.` });
    }
    return out;
  }, [date, gigs, draft.artistId, draft.venueId, draft.venueName, draft.artistName, draft.newArtist]);

  const pickDate = (d: string) => {
    setDate(d);
    // smart default start time by day (runbook §5.6) — follows the date until the user picks a time
    if (!timeTouched) setStartTime(defaultStartTime(d));
  };

  return (
    <div>
      <h2 className="text-[19px] font-black tracking-tight">When is it?</h2>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {quickDates(today).map((qd) => (
          <button key={qd.label} onClick={() => pickDate(qd.date)}
            className={cn("rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors", date === qd.date ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt")}>
            {qd.label}
          </button>
        ))}
      </div>

      <div className="mt-2.5">
        <WizardCalendar value={date || undefined} onPick={pickDate} today={today} dots={venueBusy} />
        {venueBusy && venueBusy.size > 0 && (
          <p className="mt-1.5 text-[11.5px] font-semibold text-dim2">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--acc2)] align-middle" /> nights {draft.venueName} already has a gig
          </p>
        )}
      </div>

      {clashes.map((c, i) => (
        <div key={i} className={cn("mt-2.5 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] font-bold", c.hard ? "bg-acc/15 text-txt" : "bg-card2 text-dim")}>
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--hl)]" />
          {c.text}
        </div>
      ))}

      <div className="mt-3.5 flex gap-2.5">
        <TimeSelect label="Starts" value={startTime} onChange={(v) => { setStartTime(v); setTimeTouched(true); }} />
        <TimeSelect label="Ends (optional)" value={endTime} onChange={setEndTime} allowNone />
      </div>
      {date && !timeTouched && (
        <p className="mt-1.5 text-[11.5px] font-semibold text-dim2">We&apos;ve guessed a typical start time for a {new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" })}. Change it if you know better.</p>
      )}

      <button onClick={() => setTicketed((v) => !v)} aria-pressed={ticketed}
        className="mt-4 flex w-full items-center gap-2.5 rounded-2xl border border-line glass px-4 py-3 text-left text-[14px] font-extrabold">
        <span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-md border", ticketed ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi")}>
          {ticketed && <Check size={12} strokeWidth={3.5} />}
        </span>
        It&apos;s ticketed
        <span className="ml-auto text-[11.5px] font-semibold text-dim2">most bndy gigs are free</span>
      </button>
      {ticketed && (
        <div className="mt-2.5 space-y-2.5">
          <input value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="Ticket link (https://…)" inputMode="url"
            className="w-full rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55" />
          <input value={ticketInfo} onChange={(e) => setTicketInfo(e.target.value)} placeholder="Ticket info, e.g. £8 adv / £10 door"
            className="w-full rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55" />
        </div>
      )}

      {!more ? (
        <button onClick={() => setMore(true)} className="mt-3.5 text-[13px] font-extrabold text-dim transition-colors hover:text-txt">+ More details (info, poster)</button>
      ) : (
        <div className="mt-3.5 space-y-2.5">
          <textarea value={info} onChange={(e) => setInfo(e.target.value)} placeholder="Anything else people should know…" rows={3}
            className="w-full rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55" />
          <input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="Poster image URL (optional)" inputMode="url"
            className="w-full rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55" />
        </div>
      )}

      <button
        onClick={() => onDone({ date, startTime, endTime, ticketed, ticketUrl: ticketUrl.trim() || undefined, ticketInfo: ticketInfo.trim() || undefined, info: info.trim() || undefined, posterUrl: posterUrl.trim() || undefined })}
        disabled={!date || !startTime}
        className="bndy-btn mt-5 flex w-full items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-40"
      >
        <Check size={16} /> Review &amp; publish
      </button>
    </div>
  );
}
