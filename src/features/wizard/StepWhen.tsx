"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, Check, ChevronDown, Info, Repeat } from "lucide-react";
import { useUpcomingGigs } from "@/lib/hooks";
import { todayISO, addDaysISO } from "@/domain/dates";
import { describeRepeat, maxUntilIso, seriesDates, type RepeatPattern } from "@/domain/recurrence";
import { cn } from "@/lib/cn";
import { defaultStartTime, type Draft, type RepeatRule } from "./lib";
import { WizardCalendar } from "./WizardCalendar";

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

function prettyPickedDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const TIMES: string[] = [];
for (let h = 11; h <= 23; h++) for (const m of ["00", "15", "30", "45"]) TIMES.push(`${String(h).padStart(2, "0")}:${m}`);

interface TimeOption { value: string; nextDay?: boolean }

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[1.35px] text-txt">{children}</span>;
}

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
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <FieldLabel>{label}</FieldLabel>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex min-h-14 w-full items-center justify-between rounded-[var(--rad)] border bg-card px-4 py-3 text-[16px] font-extrabold text-txt shadow-[var(--sh)] outline-none transition",
          open ? "border-[var(--acc)]" : "border-line-hi",
        )}
      >
        <span className={value ? "text-txt" : "text-dim"}>
          {value ?? "None"}
          {selected?.nextDay && <span className="ml-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--acc2)]">next day</span>}
        </span>
        <ChevronDown size={17} className={cn("shrink-0 text-dim transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-60 overflow-y-auto rounded-[var(--rad)] border border-line-hi bg-card p-1.5 shadow-[var(--sh-lg)]">
          {allowNone && (
            <button type="button" onClick={() => { onChange(undefined); setOpen(false); }}
              className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[14px] font-bold text-dim transition hover:bg-card2 hover:text-txt">
              None
            </button>
          )}
          {options.map((o) => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[14px] font-bold text-txt transition hover:bg-card2", o.value === value && "bg-[color-mix(in_srgb,var(--acc)_16%,var(--card))] text-[var(--acc)]")}>
              {o.value}
              {o.nextDay && <span className="text-[10px] font-black uppercase tracking-wide text-[var(--acc2)]">next day</span>}
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
  const [calendarOpen, setCalendarOpen] = useState(!draft.date);
  const [timeTouched, setTimeTouched] = useState(!!draft.startTime);
  const [startTime, setStartTime] = useState<string | undefined>(draft.startTime);
  const [endTime, setEndTime] = useState<string | undefined>(draft.endTime);
  const [ticketed, setTicketed] = useState(draft.ticketed);
  const [ticketUrl, setTicketUrl] = useState(draft.ticketUrl ?? "");
  const [ticketInfo, setTicketInfo] = useState(draft.ticketInfo ?? "");
  const [more, setMore] = useState(!!(draft.info || draft.posterUrl));
  const [info, setInfo] = useState(draft.info ?? "");
  const [posterUrl, setPosterUrl] = useState(draft.posterUrl ?? "");
  const [repeatOn, setRepeatOn] = useState(!!draft.repeat);
  const [pattern, setPattern] = useState<RepeatPattern>(draft.repeat?.pattern ?? "weekly");
  const [until, setUntil] = useState(draft.repeat?.until ?? "");

  const repeat: RepeatRule | undefined = draft.isOpenMic && repeatOn && date && until ? { pattern, until } : undefined;
  const seriesCount = repeat ? seriesDates(date, repeat.pattern, repeat.until).length : 0;

  const enableRepeat = () => {
    setRepeatOn(true);
    if (!until && date) {
      const twelveWeeks = addDaysISO(date, 84);
      const cap = maxUntilIso(date);
      setUntil(twelveWeeks < cap ? twelveWeeks : cap);
    }
  };

  const venueBusy = useMemo(() => {
    if (!draft.venueId) return undefined;
    const s = new Set<string>();
    for (const g of gigs) if (g.venueId === draft.venueId) s.add(g.date);
    return s;
  }, [gigs, draft.venueId]);

  const clashes = useMemo(() => {
    if (!date) return [];
    const artistName = draft.artistName ?? draft.newArtist?.name ?? "This artist";
    const out: { tone: "block" | "warn" | "info"; text: string }[] = [];
    if (draft.artistId) {
      const onBill = (g: (typeof gigs)[number]) => g.artistId === draft.artistId || !!g.artistIds?.includes(draft.artistId!);
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
        out.push({ tone: "info", text: `${draft.venueName} also has ${who}${when} that night. Are you sure?` });
      }
    }
    return out;
  }, [date, gigs, draft.artistId, draft.venueId, draft.venueName, draft.artistName, draft.newArtist]);

  const pickDate = (d: string) => {
    setDate(d);
    setCalendarOpen(false);
    if (!timeTouched) setStartTime(defaultStartTime(d));
  };

  const pickStart = (v?: string) => {
    setStartTime(v);
    setTimeTouched(true);
    if (v && endTime && endTime > "03:00" && endTime <= v) setEndTime(undefined);
  };

  const toggleRow = "flex w-full items-center gap-3 rounded-[var(--rad)] border border-line-hi bg-card px-4 py-3.5 text-left shadow-[var(--sh)] transition hover:border-[var(--acc)]";
  const inputClass = "w-full rounded-[var(--rad)] border border-line-hi bg-card px-4 py-3.5 text-[15px] font-semibold text-txt shadow-[var(--sh)] outline-none placeholder:text-dim focus:border-[var(--acc)]";

  return (
    <div>
      <h2 className="text-[22px] font-black tracking-tight text-txt">When is it?</h2>
      <p className="mt-1 text-[13px] font-semibold text-dim">Pick the date and time. You can change anything before publishing.</p>

      <section className="mt-4">
        <FieldLabel>Date</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {quickDates(today).map((qd) => (
            <button key={qd.label} onClick={() => pickDate(qd.date)}
              className={cn("rounded-full border px-3.5 py-2 text-[13px] font-extrabold transition-colors", date === qd.date ? "border-[var(--acc)] bg-acc text-on-acc" : "border-line-hi bg-card text-txt hover:border-[var(--acc)]")}>
              {qd.label}
            </button>
          ))}
        </div>

        {date && !calendarOpen ? (
          <button type="button" onClick={() => setCalendarOpen(true)} className="mt-3 flex w-full items-center gap-3 rounded-[var(--rad)] border border-line-hi bg-card px-4 py-3.5 text-left shadow-[var(--sh)] transition hover:border-[var(--acc)]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[calc(var(--rad)-2px)] bg-[color-mix(in_srgb,var(--acc)_14%,var(--card2))] text-[var(--acc)]">
              <CalendarDays size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-[1.35px] text-dim">Selected date</span>
              <span className="mt-0.5 block truncate text-[16px] font-extrabold text-txt">{prettyPickedDate(date)}</span>
            </span>
            <span className="text-[11px] font-extrabold text-[var(--acc)]">Change</span>
          </button>
        ) : (
          <div className="mt-3 rounded-[var(--rad-lg)] border border-line-hi bg-card p-2 shadow-[var(--sh)]">
            <WizardCalendar value={date || undefined} onPick={pickDate} today={today} dots={venueBusy} />
          </div>
        )}

        {venueBusy && venueBusy.size > 0 && calendarOpen && (
          <p className="mt-2 flex items-center gap-2 text-[12px] font-bold text-dim">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--acc2)]" />
            Dot = {draft.venueName} already has a gig that night
          </p>
        )}
      </section>

      {clashes.map((c, i) => (
        <div key={i} className={cn(
          "mt-3 flex items-start gap-3 rounded-[var(--rad)] border px-4 py-3.5 text-[13px] font-bold leading-relaxed",
          c.tone === "block" ? "border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_12%,var(--card))] text-txt" :
          c.tone === "warn" ? "border-[var(--hl)] bg-card text-txt" : "border-line-hi bg-card2 text-txt",
        )}>
          {c.tone === "info" ? <Info size={17} className="mt-0.5 shrink-0 text-[var(--acc2)]" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--hl)]" />}
          <span>{c.text}</span>
        </div>
      ))}

      <section className="mt-5 rounded-[var(--rad-lg)] border border-line bg-[color-mix(in_srgb,var(--card)_92%,transparent)] p-3.5 sm:p-4">
        <div className="grid grid-cols-2 gap-3">
          <TimeDropdown label="Starts" value={startTime} options={TIMES.map((t) => ({ value: t }))} onChange={pickStart} />
          <TimeDropdown label="Ends · optional" value={endTime} options={endOptions(startTime)} onChange={setEndTime} allowNone />
        </div>
        {date && !timeTouched && (
          <p className="mt-3 border-t border-line pt-3 text-[12px] font-semibold leading-relaxed text-dim">Suggested start time for a {new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" })}. Tap Starts to change it.</p>
        )}
      </section>

      {draft.isOpenMic && (
        <>
          <button onClick={() => (repeatOn ? setRepeatOn(false) : enableRepeat())} aria-pressed={repeatOn} disabled={!date} className={cn("mt-4", toggleRow, "disabled:opacity-50")}>
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2", repeatOn ? "border-[var(--acc2)] bg-acc2 text-on-acc2" : "border-line-hi bg-card2")}>
              {repeatOn && <Check size={14} strokeWidth={3.5} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[15px] font-extrabold text-txt">It repeats <Repeat size={15} className="text-[var(--acc2)]" /></span>
              <span className="mt-0.5 block text-[11.5px] font-semibold text-dim">Weekly, fortnightly or monthly</span>
            </span>
          </button>
          {repeatOn && date && (
            <div className="mt-3 rounded-[var(--rad-lg)] border border-line bg-card2 p-3.5">
              <div className="flex flex-wrap gap-2">
                {(["weekly", "fortnightly", "monthly"] as RepeatPattern[]).map((p) => (
                  <button key={p} onClick={() => setPattern(p)} className={cn("rounded-full border px-3 py-2 text-[12.5px] font-bold capitalize", pattern === p ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi bg-card text-txt")}>
                    {p === "fortnightly" ? "Every 2 weeks" : p}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <FieldLabel>Repeat until</FieldLabel>
                <WizardCalendar value={until || undefined} onPick={(d) => setUntil(d > maxUntilIso(date) ? maxUntilIso(date) : d)} today={date} />
              </div>
              {seriesCount > 0 && <p className="mt-2 text-[12.5px] font-bold text-txt">Runs {describeRepeat(date, pattern)}. This creates {seriesCount} event{seriesCount === 1 ? "" : "s"}.</p>}
            </div>
          )}
        </>
      )}

      <button onClick={() => setTicketed((v) => !v)} aria-pressed={ticketed} className={cn("mt-4", toggleRow)}>
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2", ticketed ? "border-[var(--acc2)] bg-acc2 text-on-acc2" : "border-line-hi bg-card2")}>
          {ticketed && <Check size={14} strokeWidth={3.5} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold text-txt">It&apos;s ticketed</span>
          <span className="mt-0.5 block text-[11.5px] font-semibold text-dim">Most bndy gigs are free</span>
        </span>
      </button>
      {ticketed && (
        <div className="mt-3 space-y-3 rounded-[var(--rad-lg)] border border-line bg-card2 p-3.5">
          <label><FieldLabel>Ticket link</FieldLabel><input value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="https://…" inputMode="url" className={inputClass} /></label>
          <label><FieldLabel>Ticket info</FieldLabel><input value={ticketInfo} onChange={(e) => setTicketInfo(e.target.value)} placeholder="e.g. £8 advance / £10 door" className={inputClass} /></label>
        </div>
      )}

      {!more ? (
        <button onClick={() => setMore(true)} className="mt-4 rounded-full border border-line-hi bg-card px-3.5 py-2 text-[12.5px] font-extrabold text-txt transition hover:border-[var(--acc)]">+ Add more details</button>
      ) : (
        <section className="mt-4 space-y-3">
          <label><FieldLabel>Anything else people should know?</FieldLabel><textarea value={info} onChange={(e) => setInfo(e.target.value)} placeholder="Useful details for gig-goers…" rows={3} className={inputClass} /></label>
          <label><FieldLabel>Poster image URL · optional</FieldLabel><input value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="https://…" inputMode="url" className={inputClass} /></label>
        </section>
      )}

      <button
        onClick={() => onDone({ date, startTime, endTime, ticketed, repeat, ticketUrl: ticketUrl.trim() || undefined, ticketInfo: ticketInfo.trim() || undefined, info: info.trim() || undefined, posterUrl: posterUrl.trim() || undefined })}
        disabled={!date || !startTime}
        className="bndy-btn mt-6 flex w-full items-center justify-center gap-2 py-4 text-[15px] disabled:opacity-40"
      >
        <Check size={17} /> Review &amp; publish
      </button>
    </div>
  );
}