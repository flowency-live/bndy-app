"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, Check, ChevronLeft, ChevronRight, MessageCircle, Phone, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { todayISO } from "@/domain/dates";
import {
  AVAILABILITY_WINDOW_SIZE,
  availabilityMonths,
  availabilityWindowLabel,
  availabilityWindowStart,
  type AvailabilityCalendarMonth,
} from "@/domain/availability";
import type { Artist, AvailabilityDate } from "@/domain/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ArtistAvailability({
  artist,
  availability,
  busyDates = new Set<string>(),
}: {
  artist: Artist;
  availability: AvailabilityDate[];
  busyDates?: Set<string>;
}) {
  const today = useMemo(() => todayISO(), []);
  const dates = useMemo(() => new Map(availability.map((item) => [item.date, item])), [availability]);
  const months = useMemo(() => availabilityMonths(today), [today]);
  const firstAvailableMonth = useMemo(() => {
    const validKeys = new Set(months.map((month) => month.key));
    return [...availability]
      .sort((a, b) => a.date.localeCompare(b.date))
      .find((item) => validKeys.has(item.date.slice(0, 7)))?.date.slice(0, 7) ?? months[0].key;
  }, [availability, months]);
  const [activeMonth, setActiveMonth] = useState(firstAvailableMonth);
  const [windowStart, setWindowStart] = useState(() => availabilityWindowStart(months, firstAvailableMonth));
  const contact = preferredContact(artist);
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
  const busyDateList = useMemo(() => [...busyDates], [busyDates]);
  const hasBookedDates = months.some((item) => {
    const start = `${item.key}-01`;
    const end = `${item.key}-${String(item.days).padStart(2, "0")}`;
    return busyDateList.some((date) => date >= start && date <= end);
  });

  const moveWindow = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(months.length - AVAILABILITY_WINDOW_SIZE, windowStart + direction * AVAILABILITY_WINDOW_SIZE));
    setWindowStart(next);
    setActiveMonth(months[next].key);
  };

  if (!month || availability.length === 0) return null;

  return (
    <div className="mx-auto max-w-[760px] rounded-[20px] border border-line bg-card p-4 shadow-[var(--shadow)] sm:p-5" aria-label="Booking availability">
      <div className="grid gap-5 md:grid-cols-[minmax(0,240px)_minmax(320px,380px)] md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--acc)_13%,transparent)] text-[var(--acc)]">
              <CalendarCheck2 size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-black">Booking availability</span>
                {automatic && (
                  <span className="flex items-center gap-1 rounded-full border border-line px-2 py-1 text-[8px] font-black uppercase tracking-wide text-dim">
                    <Sparkles size={9} className="text-[var(--acc)]" /> Live
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] font-semibold leading-relaxed text-dim">
                {artist.availabilityMessage || (automatic
                  ? "Unbooked Fridays, Saturdays and Sundays are shown as available."
                  : "Checked dates are currently open for bookings.")}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous 3 months"
              disabled={!canMoveBack}
              onClick={() => moveWindow(-1)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-dim transition hover:bg-white/5 hover:text-txt disabled:opacity-25"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-0 truncate text-center text-[9.5px] font-black uppercase tracking-wide text-dim">
              {availabilityWindowLabel(visibleMonths)}
            </span>
            <button
              type="button"
              aria-label="Next 3 months"
              disabled={!canMoveForward}
              onClick={() => moveWindow(1)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-dim transition hover:bg-white/5 hover:text-txt disabled:opacity-25"
            >
              <ChevronRight size={16} />
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
                  "min-h-8 min-w-0 rounded-lg px-1 text-[9.5px] font-black uppercase tracking-wide transition-colors",
                  item.key === month.key ? "bg-acc text-on-acc" : "text-dim hover:bg-white/5 hover:text-txt"
                )}
              >
                <span className="block truncate">{item.shortLabel} <span className="opacity-70">{item.year}</span></span>
              </button>
            ))}
          </div>

          <AvailabilityMonth month={month} dates={dates} busyDates={busyDates} today={today} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[9px] font-bold text-dim">
          <span className="flex items-center gap-1.5"><span className="grid h-3.5 w-3.5 place-items-center rounded bg-emerald-500 text-white"><Check size={9} strokeWidth={4} /></span> Available</span>
          {hasBookedDates && <span className="flex items-center gap-1.5"><span className="grid h-3.5 w-3.5 place-items-center rounded bg-white/[0.07] text-dim2"><X size={9} strokeWidth={3} /></span> Booked</span>}
          <span>Unlisted dates may still be possible</span>
        </div>
        {contact && (
          <a
            href={contact.href}
            target={contact.kind === "whatsapp" ? "_blank" : undefined}
            rel={contact.kind === "whatsapp" ? "noopener noreferrer" : undefined}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-acc px-3.5 text-[11px] font-black text-on-acc transition-transform active:scale-[.98]"
          >
            {contact.kind === "whatsapp" ? <MessageCircle size={14} /> : <Phone size={13} />}
            {contact.label}
          </a>
        )}
      </div>
    </div>
  );
}

function AvailabilityMonth({
  month,
  dates,
  busyDates,
  today,
}: {
  month: AvailabilityCalendarMonth;
  dates: Map<string, AvailabilityDate>;
  busyDates: Set<string>;
  today: string;
}) {
  const blanks = Array.from({ length: month.offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />);
  const days = Array.from({ length: month.days }, (_, index) => {
    const day = index + 1;
    const date = `${month.key}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(Date.UTC(month.year, month.month - 1, day)).getUTCDay();
    const prominent = [0, 5, 6].includes(weekday);
    const available = dates.has(date);
    const booked = busyDates.has(date) && !available;
    const past = date < today;
    const state = available ? "available" : booked ? "booked" : past ? "past" : "not listed";
    return (
      <span
        key={date}
        aria-label={`${date}, ${state}`}
        className={cn(
          "relative grid h-10 place-items-center rounded-lg text-[11px] font-extrabold",
          available && "bg-emerald-500 text-white shadow-sm",
          booked && "bg-white/[0.065] text-dim2",
          !available && !booked && prominent && "bg-white/[0.025] text-txt",
          !available && !booked && !prominent && "text-dim",
          past && !available && "opacity-35"
        )}
      >
        {day}
        {available && <Check size={9} className="absolute right-1 top-1" strokeWidth={4} aria-hidden="true" />}
        {booked && <X size={9} className="absolute right-1 top-1" strokeWidth={3} aria-hidden="true" />}
      </span>
    );
  });

  return (
    <section className="mt-3" role="tabpanel" aria-label={month.label}>
      <h3 className="sr-only">{month.label}</h3>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, index) => (
          <span key={day} className={cn("pb-1 text-center text-[8px] font-black uppercase tracking-wide text-dim2", index >= 4 && "text-[var(--acc-text)]")}>
            {day}
          </span>
        ))}
        {blanks}
        {days}
      </div>
    </section>
  );
}

function preferredContact(artist: Artist): { kind: "phone" | "whatsapp"; href: string; label: string } | null {
  if (artist.contactMethod === "whatsapp" && artist.whatsappNumber) {
    return { kind: "whatsapp", href: `https://wa.me/${artist.whatsappNumber.replace(/\D/g, "")}`, label: "WhatsApp" };
  }
  if (artist.contactMethod === "phone" && artist.phoneNumber) {
    return { kind: "phone", href: `tel:${artist.phoneNumber}`, label: "Call" };
  }
  if (artist.whatsappNumber) {
    return { kind: "whatsapp", href: `https://wa.me/${artist.whatsappNumber.replace(/\D/g, "")}`, label: "WhatsApp" };
  }
  if (artist.phoneNumber) {
    return { kind: "phone", href: `tel:${artist.phoneNumber}`, label: "Call" };
  }
  return null;
}
