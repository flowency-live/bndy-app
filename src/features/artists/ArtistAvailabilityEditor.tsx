"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { CalendarCheck2, CalendarDays, Check, ChevronLeft, ChevronRight, Loader2, LockKeyhole, MessageCircle, Phone } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { SheetFooter, SheetHeader } from "@/features/curator/CuratorSheets";
import {
  getManagedArtistAvailability,
  getOwnedArtistProfile,
  getPublicArtistAvailability,
  toggleArtistAvailability,
  updateOwnedArtistProfile,
} from "./artistManagementApi";
import { todayISO } from "@/domain/dates";
import {
  AVAILABILITY_WINDOW_SIZE,
  availabilityMonths,
  availabilityRangeEnd,
  availabilityWindowLabel,
  type AvailabilityCalendarMonth,
} from "@/domain/availability";
import type { Artist, AvailabilityDate } from "@/domain/types";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function normalisePhone(value?: string | null): string {
  if (!value) return "";
  const compact = value.replace(/[\s()-]/g, "");
  return /^0\d+$/.test(compact) ? `+44${compact.slice(1)}` : value;
}

export function ArtistAvailabilityEditor({
  artist,
  open,
  onClose,
  onArtistUpdated,
  onAvailabilityUpdated,
}: {
  artist: Artist;
  open: boolean;
  onClose: () => void;
  onArtistUpdated: (artist: Artist) => void;
  onAvailabilityUpdated: (availability: AvailabilityDate[]) => void;
}) {
  const todayIso = useMemo(() => todayISO(), []);
  const months = useMemo(() => availabilityMonths(todayIso), [todayIso]);
  const rangeEnd = useMemo(() => availabilityRangeEnd(todayIso), [todayIso]);
  const [windowStart, setWindowStart] = useState(0);
  const visibleMonths = months.slice(windowStart, windowStart + AVAILABILITY_WINDOW_SIZE);
  const canMoveBack = windowStart > 0;
  const canMoveForward = windowStart + AVAILABILITY_WINDOW_SIZE < months.length;
  const router = useRouter();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["owned-artist-profile", artist.id],
    queryFn: () => getOwnedArtistProfile(artist.id),
    enabled: open,
    staleTime: 30_000,
  });
  const editableArtist = profileQuery.data ?? artist;

  const [publishing, setPublishing] = useState(editableArtist.publishAvailability ?? false);
  const [mode, setMode] = useState<"selected_dates_only" | "free_weekends">(editableArtist.availabilityMode ?? "selected_dates_only");
  const [contactMethod, setContactMethod] = useState<"phone" | "whatsapp">(editableArtist.contactMethod ?? "phone");
  const [phoneNumber, setPhoneNumber] = useState(normalisePhone(editableArtist.phoneNumber));
  const [whatsappNumber, setWhatsappNumber] = useState(normalisePhone(editableArtist.whatsappNumber));
  const [availabilityMessage, setAvailabilityMessage] = useState(editableArtist.availabilityMessage ?? "");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pendingDates, setPendingDates] = useState<Set<string>>(() => new Set());
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setWindowStart(0);
    setPublishing(editableArtist.publishAvailability ?? false);
    setMode(editableArtist.availabilityMode ?? "selected_dates_only");
    setContactMethod(editableArtist.contactMethod ?? "phone");
    setPhoneNumber(normalisePhone(editableArtist.phoneNumber));
    setWhatsappNumber(normalisePhone(editableArtist.whatsappNumber));
    setAvailabilityMessage(editableArtist.availabilityMessage ?? "");
    setDateError(null);
  }, [open, editableArtist]);

  const availabilityQuery = useQuery({
    queryKey: ["managed-artist-availability", artist.id, todayIso, rangeEnd],
    queryFn: () => getManagedArtistAvailability(artist.id, todayIso, rangeEnd),
    enabled: open,
    staleTime: 20_000,
  });

  useEffect(() => {
    if (availabilityQuery.data) {
      setSelected(new Set(availabilityQuery.data.availability.map((item) => item.date)));
    }
  }, [availabilityQuery.data]);

  const busyDates = useMemo(() => new Set(availabilityQuery.data?.busyDates ?? []), [availabilityQuery.data]);
  const freeWeekendCount = useMemo(() => {
    let count = 0;
    for (const month of months) {
      for (let day = 1; day <= month.days; day += 1) {
        const date = `${month.key}-${String(day).padStart(2, "0")}`;
        const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
        if (date >= todayIso && [0, 5, 6].includes(weekday) && !busyDates.has(date)) count += 1;
      }
    }
    return count;
  }, [busyDates, months, todayIso]);

  const toggleDate = async (date: string) => {
    if (pendingDates.has(date) || (busyDates.has(date) && !selected.has(date))) return;
    const wasSelected = selected.has(date);
    setDateError(null);
    setSelected((current) => {
      const next = new Set(current);
      if (wasSelected) next.delete(date); else next.add(date);
      return next;
    });
    setPendingDates((current) => new Set(current).add(date));
    try {
      await toggleArtistAvailability(artist.id, date);
      await queryClient.invalidateQueries({ queryKey: ["managed-artist-availability", artist.id] });
    } catch (error) {
      setSelected((current) => {
        const next = new Set(current);
        if (wasSelected) next.add(date); else next.delete(date);
        return next;
      });
      setDateError(error instanceof Error ? error.message : "Could not update that date.");
    } finally {
      setPendingDates((current) => {
        const next = new Set(current);
        next.delete(date);
        return next;
      });
    }
  };

  const selectedContact = contactMethod === "whatsapp" ? whatsappNumber : phoneNumber;
  const contactMissing = publishing && (!selectedContact || !isValidPhoneNumber(selectedContact));
  const settingsMutation = useMutation({
    mutationFn: () => updateOwnedArtistProfile(artist.id, {
      publishAvailability: publishing,
      availabilityMode: mode,
      contactMethod,
      phoneNumber: phoneNumber || null,
      whatsappNumber: whatsappNumber || null,
      availabilityMessage: availabilityMessage.trim() || null,
    }),
    onSuccess: async (updated) => {
      onArtistUpdated(updated);
      const publicAvailability = updated.publishAvailability
        ? await getPublicArtistAvailability(artist.id, todayIso, rangeEnd).catch(() => availabilityQuery.data?.availability ?? [])
        : [];
      onAvailabilityUpdated(publicAvailability);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["artist", artist.id] }),
        queryClient.invalidateQueries({ queryKey: ["managed-artists"] }),
        queryClient.invalidateQueries({ queryKey: ["owned-artist-profile", artist.id] }),
      ]);
      router.refresh();
      onClose();
    },
  });

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title="Availability" sub={`Publish bookable dates for ${artist.name} without opening Backstage.`} />

      <button
        type="button"
        onClick={() => setPublishing((value) => !value)}
        aria-pressed={publishing}
        className={cn(
          "mt-5 flex w-full items-center gap-3 rounded-[20px] border p-4 text-left transition",
          publishing ? "border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_9%,transparent)]" : "border-line bg-white/[0.025]"
        )}
      >
        <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition", publishing ? "bg-acc" : "bg-white/10")}>
          <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform", publishing ? "translate-x-6" : "translate-x-1")} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-black">Publish availability</span>
          <span className="mt-0.5 block text-[11px] font-semibold leading-relaxed text-dim">{publishing ? "Bookable dates are visible on the public artist page." : "Saved dates stay private until you switch this on."}</span>
        </span>
      </button>

      <div className="mt-6">
        <div className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc-text)]">How availability works</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <ModeCard
            active={mode === "selected_dates_only"}
            icon={<CalendarCheck2 size={18} />}
            title="Pick dates"
            detail="Tap the exact days you want to advertise."
            onClick={() => setMode("selected_dates_only")}
          />
          <ModeCard
            active={mode === "free_weekends"}
            icon={<CalendarDays size={18} />}
            title="Free weekends"
            detail="Show every unbooked Friday, Saturday and Sunday."
            onClick={() => setMode("free_weekends")}
          />
        </div>
      </div>

      {mode === "selected_dates_only" ? (
        <div className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc-text)]">Pick dates</div>
              <p className="mt-1 text-[11px] font-semibold text-dim">Tap to save instantly. Booked dates are locked.</p>
            </div>
            <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-black text-dim">{selected.size} selected</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-line bg-white/[0.02] p-1.5">
            <button
              type="button"
              aria-label="Previous 3 months"
              disabled={!canMoveBack}
              onClick={() => setWindowStart((current) => Math.max(0, current - AVAILABILITY_WINDOW_SIZE))}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-dim transition hover:bg-white/5 hover:text-txt disabled:opacity-25"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-0 truncate text-center text-[10px] font-black uppercase tracking-wide text-dim">
              {availabilityWindowLabel(visibleMonths)}
            </span>
            <button
              type="button"
              aria-label="Next 3 months"
              disabled={!canMoveForward}
              onClick={() => setWindowStart((current) => Math.min(months.length - AVAILABILITY_WINDOW_SIZE, current + AVAILABILITY_WINDOW_SIZE))}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-dim transition hover:bg-white/5 hover:text-txt disabled:opacity-25"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {availabilityQuery.isLoading ? (
            <div className="grid min-h-40 place-items-center"><Loader2 size={20} className="animate-spin text-dim" /></div>
          ) : availabilityQuery.isError ? (
            <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11.5px] font-bold text-red-400">Could not load saved availability.</p>
          ) : (
            <div className="mt-3 space-y-5">
              {visibleMonths.map((month) => (
                <MonthPicker
                  key={month.key}
                  month={month}
                  today={todayIso}
                  selected={selected}
                  busy={busyDates}
                  pending={pendingDates}
                  onToggle={toggleDate}
                />
              ))}
              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3 text-[9.5px] font-bold text-dim">
                <span className="flex items-center gap-1.5"><span className="grid h-3.5 w-3.5 place-items-center rounded bg-emerald-500 text-white"><Check size={9} strokeWidth={4} /></span> Available</span>
                <span className="flex items-center gap-1.5"><span className="grid h-3.5 w-3.5 place-items-center rounded bg-white/[0.07] text-dim2"><LockKeyhole size={8} /></span> Booked</span>
              </div>
            </div>
          )}
          {dateError && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11.5px] font-bold text-red-400">{dateError}</p>}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[22px] border border-line bg-gradient-to-br from-[color-mix(in_srgb,var(--acc)_14%,transparent)] to-transparent p-5">
          <CalendarDays size={24} className="text-[var(--acc)]" />
          <div className="mt-3 text-[21px] font-black tracking-tight">{availabilityQuery.isLoading ? <Loader2 size={20} className="animate-spin text-dim" /> : `${freeWeekendCount} free weekend days`}</div>
          <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-dim">Across the next twelve months. BNDY removes a date automatically whenever this artist has an active event.</p>
          {selected.size > 0 && <p className="mt-3 text-[10.5px] font-bold text-dim">Your {selected.size} picked date{selected.size === 1 ? "" : "s"} remain saved if you switch back.</p>}
        </div>
      )}

      <div className="mt-7 border-t border-line pt-6">
        <div className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc-text)]">Availability message</div>
        <p className="mt-1 text-[11px] font-semibold leading-relaxed text-dim">Optional. Add a short note for bookers who cannot see the date they need.</p>
        <textarea
          className="mt-3 w-full rounded-2xl border border-line glass px-4 py-3 text-[14px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-orange/55"
          rows={3}
          maxLength={500}
          value={availabilityMessage}
          onChange={(event) => setAvailabilityMessage(event.target.value)}
          placeholder="If you cannot see the date you need, please get in contact anyway. We will try to help."
        />
        <div className="mt-1 text-right text-[9.5px] font-bold text-dim2">{availabilityMessage.length}/500</div>
      </div>

      <div className="mt-7 border-t border-line pt-6">
        <div className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc-text)]">Booking contact</div>
        <div className="mt-2 flex rounded-2xl border border-line p-1">
          <ContactChoice active={contactMethod === "phone"} icon={<Phone size={14} />} label="Phone" onClick={() => setContactMethod("phone")} />
          <ContactChoice active={contactMethod === "whatsapp"} icon={<MessageCircle size={14} />} label="WhatsApp" onClick={() => setContactMethod("whatsapp")} />
        </div>
        <div className="mt-3">
          <PhoneInput
            international
            defaultCountry="GB"
            value={contactMethod === "phone" ? phoneNumber : whatsappNumber}
            onChange={(value) => contactMethod === "phone" ? setPhoneNumber(value || "") : setWhatsappNumber(value || "")}
            aria-label={contactMethod === "phone" ? "Booking phone number" : "Booking WhatsApp number"}
            placeholder="7700 900000"
            className="phone-input-bndy"
          />
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/[0.035] px-3 py-2.5 text-[10.5px] font-semibold leading-relaxed text-dim">
          <LockKeyhole size={14} className="mt-0.5 shrink-0 text-[var(--acc)]" />
          This number is public only while availability is published. It is used as the booking action on the artist page.
        </div>
        {contactMissing && <p className="mt-2 text-[11px] font-bold text-amber-400">Add the selected booking contact before publishing.</p>}
      </div>

      {settingsMutation.error && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11.5px] font-bold text-red-400">{settingsMutation.error.message}</p>}
      <SheetFooter
        busy={settingsMutation.isPending}
        disabled={contactMissing}
        saveLabel={publishing ? "Save and publish" : "Save privately"}
        onCancel={onClose}
        onSave={() => settingsMutation.mutate()}
      />
    </Sheet>
  );
}

function ModeCard({ active, icon, title, detail, onClick }: { active: boolean; icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("flex min-h-[86px] items-start gap-3 rounded-2xl border p-3.5 text-left transition", active ? "border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_9%,transparent)]" : "border-line hover:border-line-hi")}>
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", active ? "bg-acc text-on-acc" : "bg-white/5 text-dim")}>{icon}</span>
      <span><span className="block text-[13px] font-black">{title}</span><span className="mt-1 block text-[10.5px] font-semibold leading-snug text-dim">{detail}</span></span>
    </button>
  );
}

function ContactChoice({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={cn("flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[11.5px] font-black transition", active ? "bg-acc text-on-acc" : "text-dim hover:text-txt")}>{icon}{label}</button>;
}

function MonthPicker({ month, today, selected, busy, pending, onToggle }: {
  month: AvailabilityCalendarMonth;
  today: string;
  selected: Set<string>;
  busy: Set<string>;
  pending: Set<string>;
  onToggle: (date: string) => void;
}) {
  const blanks = Array.from({ length: month.offset }, (_, index) => <span key={`blank-${index}`} />);
  const days = Array.from({ length: month.days }, (_, index) => {
    const day = index + 1;
    const date = `${month.key}-${String(day).padStart(2, "0")}`;
    const isPast = date < today;
    const isSelected = selected.has(date);
    const isBusy = busy.has(date) && !isSelected;
    const isPending = pending.has(date);
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const prominent = [0, 5, 6].includes(weekday);
    return (
      <button
        key={date}
        type="button"
        disabled={isPast || isBusy || isPending}
        onClick={() => onToggle(date)}
        aria-pressed={isSelected}
        aria-label={`${date}${isBusy ? ", booked" : isSelected ? ", available" : ""}`}
        className={cn(
          "relative grid h-10 place-items-center rounded-xl text-[12px] font-black transition active:scale-95 disabled:active:scale-100",
          isSelected ? "bg-emerald-500 text-white shadow-md" : "border border-transparent hover:border-line-hi hover:bg-white/5",
          prominent && !isSelected && !isBusy && "bg-white/[0.025] text-txt",
          isPast && "text-dim2 opacity-35",
          isBusy && "cursor-not-allowed bg-white/[0.025] text-dim2 opacity-60"
        )}
      >
        {isPending ? <Loader2 size={13} className="animate-spin" /> : isSelected ? <><span>{day}</span><Check size={9} className="absolute right-1 top-1" strokeWidth={4} /></> : day}
        {isBusy && <LockKeyhole size={8} className="absolute right-1 top-1" aria-hidden="true" />}
      </button>
    );
  });

  return (
    <section>
      <h3 className="text-[13px] font-black">{month.label}</h3>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, index) => <span key={`${day}-${index}`} className={cn("pb-1 text-center text-[9px] font-black text-dim2", index >= 4 && "text-[var(--acc-text)]")}>{day}</span>)}
        {blanks}
        {days}
      </div>
    </section>
  );
}
