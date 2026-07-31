"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronRight, Phone, MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Artist, AvailabilityDate } from "@/domain/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function ArtistAvailability({ artist, availability }: { artist: Artist; availability: AvailabilityDate[] }) {
  // Group availability by month
  const byMonth = useMemo(() => {
    const groups: { key: string; label: string; dates: AvailabilityDate[] }[] = [];
    const sorted = [...availability].sort((a, b) => a.date.localeCompare(b.date));

    for (const avail of sorted) {
      const [y, m] = avail.date.split("-");
      const key = `${y}-${m}`;
      let grp = groups.find((g) => g.key === key);
      if (!grp) {
        grp = { key, label: `${MON_FULL[Number(m) - 1]} ${y}`, dates: [] };
        groups.push(grp);
      }
      grp.dates.push(avail);
    }
    return groups;
  }, [availability]);

  // Track which months are expanded; all expanded by default
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    return new Set(byMonth.map((m) => m.key));
  });

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasContact = !!(artist.phoneNumber || artist.whatsappNumber);

  if (!availability.length) {
    return (
      <div className="mt-8 py-16 text-center">
        <Calendar size={48} className="mx-auto mb-3 text-dim2" strokeWidth={1.5} />
        <p className="font-semibold text-dim">No availability listed</p>
        <p className="mt-1 text-[13px] text-dim2">Check back later for available dates</p>
      </div>
    );
  }

  return (
    <section className="mt-7">
      {/* Contact information card */}
      {hasContact && (
        <div className="mb-6 rounded-2xl border border-line glass p-4">
          <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[1.5px] text-[var(--acc)]">Contact for booking</h3>
          <div className="flex flex-wrap gap-2">
            {artist.phoneNumber && (
              <a
                href={`tel:${artist.phoneNumber}`}
                className="flex items-center gap-2 rounded-xl border border-line glass px-4 py-2.5 text-[13px] font-extrabold transition-colors hover:border-[var(--acc)] hover:bg-acc/10"
              >
                <Phone size={16} />
                <span>{artist.phoneNumber}</span>
              </a>
            )}
            {artist.whatsappNumber && (
              <a
                href={`https://wa.me/${artist.whatsappNumber.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-line glass px-4 py-2.5 text-[13px] font-extrabold transition-colors hover:border-[var(--acc)] hover:bg-acc/10"
              >
                <MessageCircle size={16} />
                <span>{artist.whatsappNumber}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Available dates grouped by month */}
      <div className="space-y-1">
        {byMonth.map((m) => {
          const isExpanded = expandedMonths.has(m.key);
          return (
            <div key={m.key}>
              <button
                onClick={() => toggleMonth(m.key)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2"
                style={{ background: "var(--dayhead-bg)", color: "var(--dayhead-fg)" }}
              >
                <span className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="text-[12px] font-extrabold uppercase tracking-[1.5px]">{m.label}</span>
                </span>
                <span className="text-[11px] font-bold">
                  {m.dates.length} date{m.dates.length === 1 ? "" : "s"}
                </span>
              </button>
              {isExpanded && (
                <div className="mt-1 grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">
                  {m.dates.map((avail) => (
                    <DateCard key={avail.id} date={avail} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DateCard({ date }: { date: AvailabilityDate }) {
  const [y, m, d] = date.date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  return (
    <div className="rounded-xl border border-line glass p-3 text-center">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--acc)]">{DOW[dow]}</div>
      <div className="my-1 text-[28px] font-black leading-none">{d}</div>
      <div className="text-[11px] font-bold text-dim">{MON[m - 1]} {y}</div>
      {date.notes && <div className="mt-2 text-[11px] text-dim2">{date.notes}</div>}
    </div>
  );
}
