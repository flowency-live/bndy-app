"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, MessageCircle, Phone, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { todayISO } from "@/domain/dates";
import type { Artist, AvailabilityDate } from "@/domain/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthModel(key: string) {
  const [year, month] = key.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  return {
    key,
    year,
    month,
    label: first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    shortLabel: first.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
    offset: (first.getUTCDay() + 6) % 7,
    days: last.getUTCDate(),
  };
}

function calendarMonths(availability: AvailabilityDate[]) {
  const [year, month] = todayISO().split("-").map(Number);
  const keys = new Set<string>();
  for (let offset = 0; offset < 3; offset += 1) {
    keys.add(monthKey(new Date(Date.UTC(year, month - 1 + offset, 1))));
  }
  for (const item of availability) keys.add(item.date.slice(0, 7));
  return [...keys].sort().map(monthModel);
}

export function ArtistAvailability({ artist, availability }: { artist: Artist; availability: AvailabilityDate[] }) {
  const dates = useMemo(() => new Map(availability.map((item) => [item.date, item])), [availability]);
  const months = useMemo(() => calendarMonths(availability), [availability]);
  const firstAvailableMonth = availability.length
    ? [...availability].sort((a, b) => a.date.localeCompare(b.date))[0].date.slice(0, 7)
    : months[0]?.key;
  const [activeMonth, setActiveMonth] = useState(firstAvailableMonth);
  const contact = preferredContact(artist);
  const automatic = artist.availabilityMode === "free_weekends";

  useEffect(() => {
    if (!months.some((month) => month.key === activeMonth)) setActiveMonth(firstAvailableMonth);
  }, [activeMonth, firstAvailableMonth, months]);

  const month = months.find((item) => item.key === activeMonth) ?? months[0];
  if (!month || availability.length === 0) return null;

  return (
    <div className="rounded-[22px] border border-line bg-card p-4 shadow-[var(--shadow)] sm:p-5" aria-label="Booking availability">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--acc)_13%,transparent)] text-[var(--acc)]">
          <CalendarCheck2 size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-black">Booking availability</div>
          <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-dim">
            {artist.availabilityMessage || (automatic
              ? "Unbooked Fridays, Saturdays and Sundays are highlighted."
              : "Highlighted dates are currently open for bookings.")}
          </p>
        </div>
        {automatic && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-1 text-[8px] font-black uppercase tracking-wide text-dim">
            <Sparkles size={9} className="text-[var(--acc)]" /> Live
          </span>
        )}
      </div>

      <div className="no-scrollbar -mx-1 mt-4 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Availability month">
        {months.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={item.key === month.key}
            onClick={() => setActiveMonth(item.key)}
            className={cn(
              "min-h-9 shrink-0 rounded-xl px-3 text-[10.5px] font-black uppercase tracking-wide transition-colors",
              item.key === month.key ? "bg-acc text-on-acc" : "text-dim hover:bg-white/5 hover:text-txt"
            )}
          >
            {item.shortLabel} <span className="opacity-70">{item.year}</span>
          </button>
        ))}
      </div>

      <AvailabilityMonth month={month} dates={dates} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex items-center gap-3 text-[9.5px] font-bold text-dim">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-acc" /> Available</span>
          <span>Other dates may still be possible</span>
        </div>
        {contact && (
          <a
            href={contact.href}
            target={contact.kind === "whatsapp" ? "_blank" : undefined}
            rel={contact.kind === "whatsapp" ? "noopener noreferrer" : undefined}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-acc px-3.5 text-[11px] font-black text-on-acc transition-transform active:scale-[.98]"
          >
            {contact.kind === "whatsapp" ? <MessageCircle size={14} /> : <Phone size={13} />}
            {contact.label}
          </a>
        )}
      </div>
    </div>
  );
}

type CalendarMonth = ReturnType<typeof monthModel>;

function AvailabilityMonth({ month, dates }: { month: CalendarMonth; dates: Map<string, AvailabilityDate> }) {
  const blanks = Array.from({ length: month.offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />);
  const days = Array.from({ length: month.days }, (_, index) => {
    const day = index + 1;
    const date = `${month.key}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(Date.UTC(month.year, month.month - 1, day)).getUTCDay();
    const prominent = [0, 5, 6].includes(weekday);
    const available = dates.get(date);
    return (
      <span
        key={date}
        aria-label={`${date}${available ? ", available" : ""}`}
        className={cn(
          "relative grid aspect-square min-h-9 place-items-center rounded-xl text-[11.5px] font-extrabold",
          prominent && !available && "bg-white/[0.025] text-txt",
          !prominent && !available && "text-dim",
          available && "bg-acc text-on-acc shadow-sm"
        )}
      >
        {day}
        {available && <span className="absolute bottom-1 h-0.5 w-2 rounded-full bg-current opacity-55" />}
      </span>
    );
  });

  return (
    <section className="mt-3" role="tabpanel" aria-label={month.label}>
      <h3 className="sr-only">{month.label}</h3>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, index) => (
          <span key={day} className={cn("pb-1 text-center text-[8.5px] font-black uppercase tracking-wide text-dim2", index >= 4 && "text-[var(--acc-text)]")}>
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
