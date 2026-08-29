"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  Check,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  MessageCircle,
  MessageSquareText,
  Phone,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { todayISO } from "@/domain/dates";
import {
  AVAILABILITY_WINDOW_SIZE,
  availabilityMonths,
  availabilityWindowLabel,
  availabilityWindowStart,
  type AvailabilityCalendarMonth,
} from "@/domain/availability";
import type { Artist, AvailabilityDate, AvailabilityDateStatus } from "@/domain/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ArtistAvailability({
  artist,
  availability,
  dateStatuses = [],
}: {
  artist: Artist;
  availability: AvailabilityDate[];
  dateStatuses?: AvailabilityDateStatus[];
}) {
  const today = useMemo(() => todayISO(), []);
  const dates = useMemo(() => new Map(availability.map((item) => [item.date, item])), [availability]);
  const statuses = useMemo(() => new Map(dateStatuses.map((item) => [item.date, item])), [dateStatuses]);
  const months = useMemo(() => availabilityMonths(today), [today]);
  const firstAvailableMonth = useMemo(() => {
    const validKeys = new Set(months.map((month) => month.key));
    return [...availability]
      .sort((a, b) => a.date.localeCompare(b.date))
      .find((item) => validKeys.has(item.date.slice(0, 7)))?.date.slice(0, 7) ?? months[0].key;
  }, [availability, months]);
  const [activeMonth, setActiveMonth] = useState(firstAvailableMonth);
  const [windowStart, setWindowStart] = useState(() => availabilityWindowStart(months, firstAvailableMonth));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const automatic = artist.availabilityMode === "free_weekends";

  useEffect(() => {
    if (months.some((month) => month.key === activeMonth)) return;
    setActiveMonth(firstAvailableMonth);
    setWindowStart(availabilityWindowStart(months, firstAvailableMonth));
  }, [activeMonth, firstAvailableMonth, months]);

  const visibleMonths = months.slice(windowStart, windowStart + AVAILABILITY_WINDOW_SIZE);
  const month = months.find((item) => item.key === activeMonth) ?? visibleMonths[0];
  const canMoveBack = windowStart > 0;
  const canMoveForward = windowStart + AVAILABILITY_WINDOW_SIZE < months.length;
  const selectedIsAvailable = selectedDate ? dates.has(selectedDate) : false;
  const contactActions = selectedDate ? bookingContactActions(artist, selectedDate) : [];

  const moveWindow = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(months.length - AVAILABILITY_WINDOW_SIZE, windowStart + direction * AVAILABILITY_WINDOW_SIZE));
    setWindowStart(next);
    setActiveMonth(months[next].key);
  };

  if (!month || availability.length === 0) return null;

  return (
    <div className="mx-auto max-w-[700px] rounded-[20px] border border-line bg-card p-5 shadow-[var(--shadow)]" aria-label="Booking availability">
      <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_minmax(340px,360px)] md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--acc)_13%,transparent)] text-[var(--acc)]">
              <CalendarCheck2 size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-black sm:text-[17px]">Booking availability</span>
                {automatic && (
                  <span className="flex items-center gap-1 rounded-full border border-line px-2 py-1 text-[10px] font-black uppercase tracking-wide text-dim">
                    <Sparkles size={10} className="text-[var(--acc)]" /> Live
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[13px] font-semibold leading-5 text-dim sm:text-[14px] sm:leading-[1.55]">
                {artist.availabilityMessage || (automatic
                  ? "Unbooked Fridays, Saturdays and Sundays are shown as available."
                  : "Checked dates are currently open for bookings.")}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="Previous 3 months" disabled={!canMoveBack} onClick={() => moveWindow(-1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-dim transition hover:bg-white/5 hover:text-txt disabled:opacity-25">
              <ChevronLeft size={17} />
            </button>
            <span className="min-w-0 truncate text-center text-[11px] font-black uppercase tracking-wide text-dim sm:text-[12px]">
              {availabilityWindowLabel(visibleMonths)}
            </span>
            <button type="button" aria-label="Next 3 months" disabled={!canMoveForward} onClick={() => moveWindow(1)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-dim transition hover:bg-white/5 hover:text-txt disabled:opacity-25">
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="mt-1 grid grid-cols-3 gap-1" role="tablist" aria-label="Availability month">
            {visibleMonths.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={item.key === month.key}
                onClick={() => setActiveMonth(item.key)}
                className={cn(
                  "min-h-9 min-w-0 rounded-lg px-1 text-[11px] font-black uppercase tracking-wide transition-colors sm:text-[12px]",
                  item.key === month.key ? "bg-acc text-on-acc" : "text-dim hover:bg-white/5 hover:text-txt"
                )}
              >
                <span className="block truncate">{item.shortLabel} <span className="opacity-70">{item.year}</span></span>
              </button>
            ))}
          </div>

          <AvailabilityMonth month={month} dates={dates} statuses={statuses} today={today} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] font-bold text-dim sm:text-[12.5px]">
          <Legend icon={<Check size={10} strokeWidth={4} />} className="bg-emerald-500 text-white" label="Available" />
          <Legend icon={<CalendarCheck2 size={10} />} className="bg-[color-mix(in_srgb,var(--acc)_18%,transparent)] text-[var(--acc-text)]" label="Public gig" />
          <Legend icon={<LockKeyhole size={9} />} className="bg-white/[0.06] text-dim2" label="Private booking" />
          <span>Unlisted dates may still be possible</span>
        </div>

        {selectedDate && <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-white/[0.025] p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0" aria-live="polite">
            <div className="text-[11px] font-black uppercase tracking-wide text-[var(--acc-text)]">{selectedIsAvailable ? "Marked available" : "Enquiry date"}</div>
            <div className="mt-0.5 text-[14px] font-black">{formatEnquiryDate(selectedDate)}</div>
          </div>
          {contactActions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contactActions.map((action, index) => (
                <a
                  key={action.kind}
                  href={action.href}
                  target={action.kind === "whatsapp" ? "_blank" : undefined}
                  rel={action.kind === "whatsapp" ? "noopener noreferrer" : undefined}
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-[12px] font-black transition-transform active:scale-[.98]",
                    index === 0 ? "bg-acc text-on-acc" : "border border-line text-txt hover:bg-white/5"
                  )}
                >
                  {action.kind === "whatsapp" ? <MessageCircle size={15} /> : action.kind === "sms" ? <MessageSquareText size={15} /> : <Phone size={14} />}
                  {action.label}
                </a>
              ))}
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}

function AvailabilityMonth({
  month,
  dates,
  statuses,
  today,
  selectedDate,
  onSelectDate,
}: {
  month: AvailabilityCalendarMonth;
  dates: Map<string, AvailabilityDate>;
  statuses: Map<string, AvailabilityDateStatus>;
  today: string;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const blanks = Array.from({ length: month.offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />);
  const days = Array.from({ length: month.days }, (_, index) => {
    const day = index + 1;
    const date = `${month.key}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(Date.UTC(month.year, month.month - 1, day)).getUTCDay();
    const prominent = [0, 5, 6].includes(weekday);
    const status = statuses.get(date);
    const available = dates.has(date) && !status;
    const past = date < today;
    const selected = selectedDate === date;
    const state = status?.state ?? (available ? "available" : past ? "past" : "unlisted");
    const className = dateCellClass(state, prominent, selected);
    const content = <DateCellContent day={day} state={state} />;
    const ariaLabel = dateAriaLabel(date, state);

    if (state === "public_gig" && status?.eventId) {
      return <Link key={date} href={`/gigs/${encodeURIComponent(status.eventId)}`} aria-label={`${ariaLabel}. Open gig.`} className={className}>{content}</Link>;
    }
    if (!past && (state === "available" || state === "unlisted")) {
      return (
        <button key={date} type="button" aria-label={`${ariaLabel}. Select to enquire.`} aria-pressed={selected} onClick={() => onSelectDate(date)} className={className}>
          {content}
        </button>
      );
    }
    return <span key={date} aria-label={ariaLabel} className={className}>{content}</span>;
  });

  return (
    <section className="mt-2" role="tabpanel" aria-label={month.label}>
      <h3 className="sr-only">{month.label}</h3>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, index) => (
          <span key={day} className={cn("pb-1 text-center text-[10px] font-black uppercase tracking-wide text-dim2 sm:text-[11px]", index >= 4 && "text-[var(--acc-text)]")}>
            {day}
          </span>
        ))}
        {blanks}
        {days}
      </div>
    </section>
  );
}

type CalendarCellState = AvailabilityDateStatus["state"] | "available" | "unlisted" | "past";

function dateCellClass(state: CalendarCellState, prominent: boolean, selected: boolean): string {
  return cn(
    "relative grid h-10 place-items-center rounded-lg text-[12.5px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)] sm:text-[13.5px]",
    state === "available" && "bg-emerald-500 text-white shadow-sm hover:bg-emerald-400",
    state === "public_gig" && "bg-[color-mix(in_srgb,var(--acc)_18%,transparent)] text-[var(--acc-text)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--acc)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--acc)_25%,transparent)]",
    state === "private_booking" && "bg-white/[0.035] text-dim2",
    state === "unlisted" && prominent && "bg-white/[0.03] text-txt hover:bg-white/[0.07]",
    state === "unlisted" && !prominent && "text-dim hover:bg-white/[0.05] hover:text-txt",
    state === "past" && "text-dim2 opacity-30",
    selected && "ring-2 ring-[var(--acc)] ring-offset-2 ring-offset-[var(--card)]"
  );
}

function DateCellContent({ day, state }: { day: number; state: CalendarCellState }) {
  const iconClass = "absolute right-1 top-1";
  return (
    <>
      <span>{day}</span>
      {state === "available" && <Check size={10} className={iconClass} strokeWidth={4} aria-hidden="true" />}
      {state === "public_gig" && <CalendarCheck2 size={10} className={iconClass} aria-hidden="true" />}
      {state === "private_booking" && <LockKeyhole size={9} className={iconClass} aria-hidden="true" />}
    </>
  );
}

function dateAriaLabel(date: string, state: CalendarCellState): string {
  const label = formatEnquiryDate(date);
  if (state === "public_gig") return `${label}, public gig`;
  if (state === "private_booking") return `${label}, private booking`;
  if (state === "available") return `${label}, available`;
  if (state === "past") return `${label}, past date`;
  return `${label}, availability not listed`;
}

function Legend({ icon, className, label }: { icon: React.ReactNode; className: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={cn("grid h-4 w-4 place-items-center rounded", className)}>{icon}</span>{label}</span>;
}

function formatEnquiryDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00.000Z`));
}

function bookingMessage(artist: Artist, date: string): string {
  return `Hi ${artist.name}, I am interested in booking you on ${formatEnquiryDate(date)}. Is that date available? I found you on bndy.`;
}

type ContactAction = { kind: "whatsapp" | "sms" | "phone"; href: string; label: string };

function bookingContactActions(artist: Artist, date: string): ContactAction[] {
  const message = bookingMessage(artist, date);
  const phone = artist.phoneNumber?.trim() || null;
  const whatsapp = artist.whatsappNumber?.replace(/\D/g, "") || null;
  const whatsappAction = whatsapp
    ? { kind: "whatsapp" as const, href: `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`, label: "Ask on WhatsApp" }
    : null;
  const callAction = phone ? { kind: "phone" as const, href: `tel:${phone}`, label: "Call" } : null;
  const textAction = phone && /^\+447\d{9}$/.test(phone.replace(/[\s()-]/g, ""))
    ? { kind: "sms" as const, href: `sms:${phone}?&body=${encodeURIComponent(message)}`, label: "Text enquiry" }
    : null;

  if (artist.contactMethod === "whatsapp" && whatsappAction) return [whatsappAction, callAction].filter(Boolean) as ContactAction[];
  if (artist.contactMethod === "phone" && callAction) return [callAction, whatsappAction || textAction].filter(Boolean) as ContactAction[];
  if (whatsappAction) return [whatsappAction, callAction].filter(Boolean) as ContactAction[];
  return [callAction, textAction].filter(Boolean) as ContactAction[];
}
