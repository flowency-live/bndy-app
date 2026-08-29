"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, ChevronDown, MessageCircle, Phone, Sparkles } from "lucide-react";
import { DOW, MON } from "@/domain/dates";
import type { Artist, AvailabilityDate } from "@/domain/types";

const INITIAL_DATES = 8;

export function ArtistAvailability({ artist, availability }: { artist: Artist; availability: AvailabilityDate[] }) {
  const [expanded, setExpanded] = useState(false);
  const dates = useMemo(() => [...availability].sort((a, b) => a.date.localeCompare(b.date)), [availability]);
  const visibleDates = expanded ? dates : dates.slice(0, INITIAL_DATES);
  const contact = preferredContact(artist);
  const automatic = artist.availabilityMode === "free_weekends";

  return (
    <section className="relative mt-7 overflow-hidden rounded-[26px] border border-[color-mix(in_srgb,var(--acc)_35%,var(--line))] bg-card shadow-[var(--shadow)]" aria-labelledby="artist-availability-title">
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[var(--acc)] opacity-[0.11] blur-3xl" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">
              <CalendarCheck2 size={13} /> Booking availability
            </div>
            <h2 id="artist-availability-title" className="font-disp mt-1.5 text-[27px] font-black leading-none tracking-tight">Available to book.</h2>
            <p className="mt-2 max-w-lg text-[11.5px] font-semibold leading-relaxed text-dim">
              {automatic ? "Unbooked Fridays, Saturdays and Sundays over the next few months." : "Dates this artist has chosen to advertise for bookings."}
            </p>
          </div>
          {automatic && <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white/5 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide text-dim"><Sparkles size={11} className="text-[var(--acc)]" /> Live</span>}
        </div>

        {dates.length > 0 ? (
          <>
            <div className={expanded
              ? "mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6"
              : "no-scrollbar -mx-5 mt-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-6"}>
              {visibleDates.map((date, index) => <AvailabilityDateCard key={date.id} date={date} next={index === 0} />)}
            </div>
            {dates.length > INITIAL_DATES && (
              <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-[11px] font-black text-dim transition hover:bg-white/5 hover:text-txt" aria-expanded={expanded}>
                {expanded ? "Show fewer dates" : `Show all ${dates.length} dates`}
                <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-line px-4 py-6 text-center">
            <p className="text-[13px] font-black">No dates are listed right now.</p>
            <p className="mt-1 text-[11px] font-semibold text-dim">Check back soon for new booking availability.</p>
          </div>
        )}

        {contact && (
          <a
            href={contact.href}
            target={contact.kind === "whatsapp" ? "_blank" : undefined}
            rel={contact.kind === "whatsapp" ? "noopener noreferrer" : undefined}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-acc px-4 text-[13px] font-black text-on-acc shadow-lg transition-transform active:scale-[.98] sm:w-auto sm:px-6"
          >
            {contact.kind === "whatsapp" ? <MessageCircle size={17} /> : <Phone size={16} />}
            {contact.label}
          </a>
        )}
      </div>
    </section>
  );
}

function AvailabilityDateCard({ date, next }: { date: AvailabilityDate; next: boolean }) {
  const [year, month, day] = date.date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (
    <div className={`relative min-w-[94px] snap-start rounded-[18px] border px-3 py-3.5 text-center ${next ? "border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_11%,transparent)]" : "border-line bg-white/[0.025]"}`}>
      {next && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-acc px-2 py-0.5 text-[7.5px] font-black uppercase tracking-[.8px] text-on-acc">Next</span>}
      <div className="text-[9px] font-black uppercase tracking-[1.2px] text-[var(--acc-text)]">{DOW[weekday]}</div>
      <div className="font-disp mt-1 text-[31px] font-black leading-none tracking-tight">{day}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-dim">{MON[month - 1]}</div>
      {date.notes && date.type !== "free_weekend" && <div className="mt-2 line-clamp-2 text-[9.5px] font-semibold leading-snug text-dim2">{date.notes}</div>}
    </div>
  );
}

function preferredContact(artist: Artist): { kind: "phone" | "whatsapp"; href: string; label: string } | null {
  if (artist.contactMethod === "whatsapp" && artist.whatsappNumber) {
    return { kind: "whatsapp", href: `https://wa.me/${artist.whatsappNumber.replace(/\D/g, "")}`, label: "WhatsApp for bookings" };
  }
  if (artist.contactMethod === "phone" && artist.phoneNumber) {
    return { kind: "phone", href: `tel:${artist.phoneNumber}`, label: "Call about a booking" };
  }
  if (artist.whatsappNumber) {
    return { kind: "whatsapp", href: `https://wa.me/${artist.whatsappNumber.replace(/\D/g, "")}`, label: "WhatsApp for bookings" };
  }
  if (artist.phoneNumber) {
    return { kind: "phone", href: `tel:${artist.phoneNumber}`, label: "Call about a booking" };
  }
  return null;
}
