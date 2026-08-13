"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Info, Repeat } from "lucide-react";
import { useUpcomingGigs } from "@/lib/hooks";
import { todayISO, addDaysISO } from "@/domain/dates";
import { describeRepeat, maxUntilIso, seriesDates, type RepeatPattern } from "@/domain/recurrence";
import { cn } from "@/lib/cn";
import { defaultStartTime, type Draft, type RepeatRule } from "./lib";
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

interface TimeOption { value: string; nextDay?: boolean }

/** End options: only AFTER the start, then the early hours (00:00–03:00) of the
 *  next day — a gig can finish at 1am, and can never end before it starts. */
function endOptions(start?: string): TimeOption[] {
  const out: TimeOption[] = [];
  for (const t of TIMES) if (!start || t > start) out.push({ value: t });
  for (let h = 0; h <= 3; h++) {
    for (const m of ["00", "15", "30", "45"]) {
      if (h === 3 && m !== "00") continue;
      out.push({ value: `${String(h).padStart(2, "0")}:${m}`, nextDay: true });
    }
  }
  return out;
}

/** Skin-styled time dropdown — the native <select> popup ignores the skin. */
function TimeDropdown({ label, value, options, onChange, allowNone }: {
  label: string;
  value?: string;
  options: TimeOption[];
  onChange: (v?: string) => void;
  allowNone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={wrapRef} className="relative flex-1">
      <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none focus:border-orange/55"
      >
        <span className={value ? "" : "text-dim"}>
          {value ?? "None"}
          {selected?.nextDay && <span className="ml-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--acc2)]">next day</span>}
        </span>
        <ChevronDown size={15} className={cn("text-dim transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-56 overflow-y-auto rounded-xl border border-line-hi glass-hi p-1.5 shadow-[0_16px_50px_rgba(0,0,0,.6)]">
          {allowNone && (
            <button type="button" onClick={() => { onChange(undefined); setOpen(false); }}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[14px] font-semibold text-dim transition hover:bg-white/5">
              None
            </button>
          )}
          {options.map((o) => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[14px] font-semibold transition hover:bg-white/5", o.value === value && "bg-acc/15 text-[var(--acc)]")}>
              {o.value}
              {o.nextDay && <span className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--acc2)]">next day</span>}
            </button>
          ))}
        </div>
      )}
    </div>
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
  // item 13: repeats, open mic nights only
  const [repeatOn, setRepeatOn] = useState(!!draft.repeat);
  const [pattern, setPattern] = useState<RepeatPattern>(draft.repeat?.pattern ?? "weekly");
  const [until, setUntil] = useState(draft.repeat?.until ?? "");

  const repeat: RepeatRule | undefined =
    draft.isOpenMic && repeatOn && date && until ? { pattern, until } : undefined;
  const seriesCount = repeat ? seriesDates(date, repeat.pattern, repeat.until).length : 0;

  const enableRepeat = () => {
    setRepeatOn(true);
    // sensible default horizon: 12 weeks out, clamped to the 6-month cap
    if (!until && date) {
      const twelveWeeks = addDaysISO(date, 84);
      const cap = maxUntilIso(date);
      setUntil(twelveWeeks < cap ? twelveWeeks : cap);
    }
  };

  /** busy-night dots on the calendar: dates where this venue already has a gig */
  const venueBusy = useMemo(() => {
    if (!draft.venueId) return undefined;
    const s = new Set<string>();
    for (const g of gigs) if (g.venueId === draft.venueId) s.add(g.date);
    return s;
  }, [gigs, draft.venueId]);

  /** Proactive notes from the cached gig list. The server gate still has final say.
   *
   *  Three tones, and the difference matters:
   *   block — the server gate WILL bounce this. Same act, same venue, same date.
   *   warn  — probably a mistake. Same act, same date, a different venue.
   *   info  — allowed and normal. Another act at the same venue that night.
   *
   *  The info case used to render as a warning with a caution triangle. It reads
   *  as a refusal, but two gigs at one venue on one night have always been legal:
   *  the gate keys on (venue | artist | date), one key per act. Feature 12. */
  const clashes = useMemo(() => {
    if (!date) return [];
    const artistName = draft.artistName ?? draft.newArtist?.name ?? "This artist";
    const out: { tone: "block" | "warn" | "info"; text: string }[] = [];
    if (draft.artistId) {
      // Match the whole bill, not just the headliner. An act listed as SUPPORT on
      // an existing gig at this venue that night is still a gate bounce.
      const onBill = (g: (typeof gigs)[number]) =>
        g.artistId === draft.artistId || !!g.artistIds?.includes(draft.artistId!);
      const c = gigs.find((g) => onBill(g) && g.date === date);
      if (c) {
        out.push(c.venueId === draft.venueId
          ? { tone: "block", text: `${artistName} is already listed at ${draft.venueName} that night. This gig may already be on bndy.` }
          : { tone: "warn", text: `${artistName} already has a gig that night at ${c.venueName}. Double-check your date.` });
      }
    }
    if (draft.venueId) {
      const c = gigs.find((g) => g.venueId === draft.venueId && g.date === date && g.artistId !== draft.artistId);
      if (c) {
        const who = c.artistName ?? "another act";
        const when = c.startTime ? ` at ${c.startTime}` : "";
        out.push({ tone: "info", text: `${draft.venueName} also has ${who}${when} that night. That is fine. Two gigs at one venue on one night are allowed.` });
      }
    }
    return out;
  }, [date, gigs, draft.artistId, draft.venueId, draft.venueName, draft.artistName, draft.newArtist]);

  const pickDate = (d: string) => {
    setDate(d);
    // smart default start time by day (runbook §5.6) — follows the date until the user picks a time
    if (!timeTouched) setStartTime(defaultStartTime(d));
  };

  // End is early-hours (next day) or after the start — a stale in-between value
  // (e.g. 13:30 after a 22:00 start) is invalid and gets cleared.
  const pickStart = (v?: string) => {
    setStartTime(v);
    setTimeTouched(true);
    if (v && endTime && endTime > "03:00" && endTime <= v) setEndTime(undefined);
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
        <div key={i} className={cn("mt-2.5 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] font-bold", c.tone === "block" ? "bg-acc/15 text-txt" : "bg-card2 text-dim")}>
          {c.tone === "info"
            ? <Info size={15} className="mt-0.5 shrink-0 text-dim" />
            : <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--hl)]" />}
          {c.text}
        </div>
      ))}

      <div className="mt-3.5 flex gap-2.5">
        <TimeDropdown label="Starts" value={startTime} options={TIMES.map((t) => ({ value: t }))} onChange={pickStart} />
        <TimeDropdown label="Ends (optional)" value={endTime} options={endOptions(startTime)} onChange={setEndTime} allowNone />
      </div>
      {date && !timeTouched && (
        <p className="mt-1.5 text-[11.5px] font-semibold text-dim2">We&apos;ve guessed a typical start time for a {new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" })}. Change it if you know better.</p>
      )}

      {/* item 13: open mic nights can repeat */}
      {draft.isOpenMic && (
        <>
          <button onClick={() => (repeatOn ? setRepeatOn(false) : enableRepeat())} aria-pressed={repeatOn} disabled={!date}
            className="mt-4 flex w-full items-center gap-2.5 rounded-2xl border border-line glass px-4 py-3 text-left text-[14px] font-extrabold disabled:opacity-50">
            <span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-md border", repeatOn ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi")}>
              {repeatOn && <Check size={12} strokeWidth={3.5} />}
            </span>
            It repeats
            <Repeat size={14} className="text-[var(--acc2)]" />
            <span className="ml-auto text-[11.5px] font-semibold text-dim2">weekly or monthly</span>
          </button>
          {repeatOn && date && (
            <div className="mt-2.5 space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {(["weekly", "fortnightly", "monthly"] as RepeatPattern[]).map((p) => (
                  <button key={p} onClick={() => setPattern(p)}
                    className={cn("rounded-full border px-3 py-1.5 text-[12.5px] font-bold capitalize transition-colors", pattern === p ? "border-transparent bg-acc2 text-on-acc2" : "border-line text-dim hover:text-txt")}>
                    {p === "fortnightly" ? "Every 2 weeks" : p}
                  </button>
                ))}
              </div>
              <div>
                <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">Until</span>
                {/* skinned calendar, not the OS date popup; picks clamp to the 6-month cap */}
                <WizardCalendar
                  value={until || undefined}
                  onPick={(d) => setUntil(d > maxUntilIso(date) ? maxUntilIso(date) : d)}
                  today={date}
                />
              </div>
              {seriesCount > 0 && (
                <p className="text-[12.5px] font-bold text-dim">
                  Runs {describeRepeat(date, pattern)}. This creates {seriesCount} event{seriesCount === 1 ? "" : "s"}.
                </p>
              )}
            </div>
          )}
        </>
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
        onClick={() => onDone({ date, startTime, endTime, ticketed, repeat, ticketUrl: ticketUrl.trim() || undefined, ticketInfo: ticketInfo.trim() || undefined, info: info.trim() || undefined, posterUrl: posterUrl.trim() || undefined })}
        disabled={!date || !startTime}
        className="bndy-btn mt-5 flex w-full items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-40"
      >
        <Check size={16} /> Review &amp; publish
      </button>
    </div>
  );
}
