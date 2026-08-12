"use client";

// Curator edit sheets + hide flow (backlog feature 4).
// The server whitelist is the contract; these forms only offer fields the
// server accepts. Jason rulings 2026-08-11:
// - Venue address/postcode/city come from the VERIFIED Google Place ID and
//   are never hand-edited. Curators touch socials, website, ticketing only.
// - Artist location works like godmode: town (places look-up, with
//   coordinates) OR region, two explicit modes.
// - Every sheet has a visible close button and a Cancel action.

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, MapPin, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { curatorApi, useCuratorInvalidate, type CuratorEntity } from "@/lib/curator";
import { GENRES, REGIONS } from "@/features/wizard/lib";
import { placesSuggest, placesDetails, type PlaceSuggestion } from "@/features/wizard/wizardApi";
import { cn } from "@/lib/cn";
import type { Artist, Gig, Venue } from "@/domain/types";

const field =
  "w-full rounded-2xl border border-line glass px-4 py-3 text-[14.5px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-orange/55";
const label = "mb-1.5 mt-4 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim";

function useSubmit(type: CuratorEntity, id: string, onDone: () => void) {
  const invalidate = useCuratorInvalidate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await invalidate(type, id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

/** Header with a real close button, and a Cancel + primary footer. */
export function SheetHeader({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-[19px] font-black tracking-tight text-txt">{title}</h2>
        {sub && <p className="mt-0.5 text-[12px] font-semibold text-dim">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line glass text-dim transition-colors hover:text-txt"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function SheetFooter({ busy, disabled, saveLabel, onCancel, onSave, tone = "acc" }: {
  busy: boolean;
  disabled?: boolean;
  saveLabel: string;
  onCancel: () => void;
  onSave: () => void;
  tone?: "acc" | "red" | "amber" | "green";
}) {
  const toneCls =
    tone === "red" ? "bg-red-600 text-white"
    : tone === "amber" ? "bg-amber-600 text-white"
    : tone === "green" ? "bg-emerald-600 text-white"
    : "bg-acc text-on-acc";
  return (
    <div className="mt-5 flex gap-2.5">
      <button type="button" onClick={onCancel} disabled={busy} className="bndy-btn2 flex-1 rounded-2xl py-3 text-[14px] font-extrabold">
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={busy || disabled}
        className={cn("flex flex-[2] items-center justify-center rounded-2xl py-3 text-[14px] font-extrabold transition-opacity hover:opacity-90 disabled:opacity-50", toneCls)}
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : saveLabel}
      </button>
    </div>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] font-semibold text-red-400">
      {error}
    </p>
  );
}

function socialOf(entity: { socials?: { platform: string; url: string }[] }, platform: string): string {
  return entity.socials?.find((s) => s.platform === platform)?.url ?? "";
}

/* ---------- venue ---------- */

export function EditVenueSheet({ venue, open, onClose }: { venue: Venue; open: boolean; onClose: () => void }) {
  const [f, setF] = useState({
    website: venue.website ?? "",
    facebookUrl: socialOf(venue, "facebook"),
    instagramUrl: socialOf(venue, "instagram"),
    standardTicketed: venue.standardTicketed ?? false,
    standardTicketUrl: venue.standardTicketUrl ?? "",
    standardTicketInformation: venue.standardTicketInformation ?? "",
  });
  // A8 fix: reset form when sheet opens or venue changes to prevent stale data
  useEffect(() => {
    if (open) {
      setF({
        website: venue.website ?? "",
        facebookUrl: socialOf(venue, "facebook"),
        instagramUrl: socialOf(venue, "instagram"),
        standardTicketed: venue.standardTicketed ?? false,
        standardTicketUrl: venue.standardTicketUrl ?? "",
        standardTicketInformation: venue.standardTicketInformation ?? "",
      });
    }
  }, [open, venue]);
  const { busy, error, run } = useSubmit("venue", venue.id, onClose);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title={`Edit ${venue.name}`} sub="Name and address stay locked to the verified Google listing. Wrong address? Flag the venue for staff." onClose={onClose} />
      <label className={label}>Website</label>
      <input className={field} value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://…" inputMode="url" />
      <label className={label}>Facebook</label>
      <input className={field} value={f.facebookUrl} onChange={(e) => setF({ ...f, facebookUrl: e.target.value })} placeholder="https://facebook.com/…" inputMode="url" />
      <label className={label}>Instagram</label>
      <input className={field} value={f.instagramUrl} onChange={(e) => setF({ ...f, instagramUrl: e.target.value })} placeholder="https://instagram.com/…" inputMode="url" />
      <button
        type="button"
        onClick={() => setF({ ...f, standardTicketed: !f.standardTicketed })}
        aria-pressed={f.standardTicketed}
        className="mt-4 flex w-full items-center gap-2.5 rounded-2xl border border-line glass px-4 py-3 text-left text-[14px] font-extrabold"
      >
        <span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-md border", f.standardTicketed ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi")}>
          {f.standardTicketed && <Check size={12} strokeWidth={3.5} />}
        </span>
        Usually ticketed
      </button>
      {f.standardTicketed && (
        <>
          <label className={label}>Ticket URL</label>
          <input className={field} value={f.standardTicketUrl} onChange={(e) => setF({ ...f, standardTicketUrl: e.target.value })} placeholder="https://…" inputMode="url" />
          <label className={label}>Ticket info</label>
          <input className={field} value={f.standardTicketInformation} onChange={(e) => setF({ ...f, standardTicketInformation: e.target.value })} placeholder="e.g. £8 adv / £10 door" />
        </>
      )}
      <ErrorLine error={error} />
      <SheetFooter busy={busy} saveLabel="Save venue" onCancel={onClose} onSave={() => run(() => curatorApi.updateVenue(venue.id, f))} />
    </Sheet>
  );
}

/* ---------- artist ---------- */

type LocMode = "town" | "region";

export function EditArtistSheet({ artist, open, onClose }: { artist: Artist; open: boolean; onClose: () => void }) {
  const isRegion = (REGIONS as readonly string[]).includes(artist.location ?? "");
  const [f, setF] = useState({
    bio: artist.bio ?? "",
    genres: artist.genres ?? [],
    facebookUrl: socialOf(artist, "facebook"),
    instagramUrl: socialOf(artist, "instagram"),
    websiteUrl: socialOf(artist, "website"),
  });
  const [locMode, setLocMode] = useState<LocMode>(isRegion ? "region" : "town");
  const [region, setRegion] = useState(isRegion ? artist.location ?? "" : "");
  const [townQ, setTownQ] = useState(isRegion ? "" : artist.location ?? "");
  const [townPicked, setTownPicked] = useState<string | null>(isRegion ? null : artist.location ?? null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [preds, setPreds] = useState<PlaceSuggestion[]>([]);
  const deb = useRef<number | undefined>(undefined);
  const { busy, error, run } = useSubmit("artist", artist.id, onClose);

  // A8 fix: reset form when sheet opens or artist changes to prevent stale data
  useEffect(() => {
    if (open) {
      const isReg = (REGIONS as readonly string[]).includes(artist.location ?? "");
      setF({
        bio: artist.bio ?? "",
        genres: artist.genres ?? [],
        facebookUrl: socialOf(artist, "facebook"),
        instagramUrl: socialOf(artist, "instagram"),
        websiteUrl: socialOf(artist, "website"),
      });
      setLocMode(isReg ? "region" : "town");
      setRegion(isReg ? artist.location ?? "" : "");
      setTownQ(isReg ? "" : artist.location ?? "");
      setTownPicked(isReg ? null : artist.location ?? null);
      setCoords(null);
      setPreds([]);
    }
  }, [open, artist]);

  // Town look-up via bndy's own Places proxy — same source as the wizard.
  useEffect(() => {
    window.clearTimeout(deb.current);
    if (locMode !== "town" || townQ.trim().length < 2 || townPicked === townQ) { setPreds([]); return; }
    deb.current = window.setTimeout(async () => {
      try { setPreds(await placesSuggest(townQ, "town")); } catch { setPreds([]); }
    }, 220);
    return () => window.clearTimeout(deb.current);
  }, [townQ, townPicked, locMode]);

  const tidy = (s: string) => s.replace(/,\s*UK$/i, "").trim();
  const pickTown = async (p: PlaceSuggestion) => {
    const clean = tidy(p.name);
    setTownQ(clean);
    setTownPicked(clean);
    setPreds([]);
    const d = await placesDetails(p.placeId).catch(() => null);
    setCoords(d && typeof d.lat === "number" ? { lat: d.lat, lng: d.lng } : null);
  };

  const location = locMode === "town" ? (townPicked ?? townQ.trim()) : region;
  const toggleGenre = (g: string) =>
    setF((prev) => ({ ...prev, genres: prev.genres.includes(g) ? prev.genres.filter((x) => x !== g) : [...prev.genres, g] }));

  const payload = useMemo(() => ({
    bio: f.bio,
    location,
    locationType: locMode === "town" ? "city" : "region",
    ...(locMode === "town" && coords ? { locationLat: coords.lat, locationLng: coords.lng } : {}),
    ...(locMode === "region" ? { locationLat: null, locationLng: null } : {}),
    genres: f.genres,
    facebookUrl: f.facebookUrl.trim(),
    instagramUrl: f.instagramUrl.trim(),
    websiteUrl: f.websiteUrl.trim(),
  }), [f, location, locMode, coords]);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title={`Edit ${artist.name}`} sub="Name changes stay with bndy staff." onClose={onClose} />

      <label className={label}>Based in</label>
      <div className="flex gap-2">
        {locMode === "town" ? (
          <div className="relative flex-1">
            <MapPin size={15} className="absolute left-3.5 top-[15px] text-dim" />
            <input
              value={townQ}
              onChange={(e) => { setTownQ(e.target.value); setTownPicked(null); setCoords(null); }}
              placeholder="Their home town…"
              className={cn(field, "pl-9", townPicked && "pr-9")}
            />
            {townPicked && <Check size={15} className="absolute right-3.5 top-[15px] text-[var(--acc)]" />}
            {preds.length > 0 && (
              <div className="absolute inset-x-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-line-hi glass-hi shadow-lg">
                {preds.slice(0, 5).map((p) => (
                  <button key={p.placeId} type="button" onClick={() => pickTown(p)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition-colors hover:bg-white/5">
                    <MapPin size={13} className="shrink-0 text-dim" />
                    <span className="min-w-0 truncate">{tidy(p.name)}<span className="text-dim"> · {tidy(p.address) || "UK"}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex-1">
            <select value={region} onChange={(e) => setRegion(e.target.value)} className={cn(field, "appearance-none")}>
              <option value="">Choose a region…</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-[16px] text-dim" />
          </div>
        )}
        <div className="flex shrink-0 gap-1 self-start rounded-2xl border border-line p-1">
          {(["town", "region"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setLocMode(m)}
              className={cn("rounded-xl px-2.5 py-2 text-[11px] font-extrabold uppercase tracking-wide transition-colors", locMode === m ? "bg-acc text-on-acc" : "text-dim hover:text-txt")}>
              {m === "town" ? "Town" : "Region"}
            </button>
          ))}
        </div>
      </div>

      <label className={label}>Bio</label>
      <textarea className={field} rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />

      <label className={label}>Genres</label>
      <div className="flex flex-wrap gap-1.5">
        {GENRES.map((g) => (
          <button key={g} type="button" onClick={() => toggleGenre(g)}
            className={cn("rounded-full border px-2.5 py-1 text-[12px] font-bold transition-colors", f.genres.includes(g) ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt")}>
            {g}
          </button>
        ))}
      </div>

      <label className={label}>Facebook</label>
      <input className={field} value={f.facebookUrl} onChange={(e) => setF({ ...f, facebookUrl: e.target.value })} placeholder="https://facebook.com/…" inputMode="url" />
      <label className={label}>Instagram</label>
      <input className={field} value={f.instagramUrl} onChange={(e) => setF({ ...f, instagramUrl: e.target.value })} placeholder="https://instagram.com/…" inputMode="url" />
      <label className={label}>Website</label>
      <input className={field} value={f.websiteUrl} onChange={(e) => setF({ ...f, websiteUrl: e.target.value })} placeholder="https://…" inputMode="url" />

      <ErrorLine error={error} />
      <SheetFooter
        busy={busy}
        disabled={!location}
        saveLabel="Save artist"
        onCancel={onClose}
        onSave={() => run(() => curatorApi.updateArtist(artist.id, payload))}
      />
    </Sheet>
  );
}

/* ---------- gig ---------- */

export function EditGigSheet({ gig, open, onClose }: { gig: Gig; open: boolean; onClose: () => void }) {
  const [f, setF] = useState({
    title: gig.title ?? "",
    date: gig.date,
    startTime: gig.startTime ?? "",
    endTime: gig.endTime ?? "",
    ticketed: gig.ticketed ?? false,
    ticketUrl: gig.ticketUrl ?? "",
    isOpenMic: gig.isOpenMic ?? false,
  });
  // A8 fix: reset form when sheet opens or gig changes to prevent stale data
  useEffect(() => {
    if (open) {
      setF({
        title: gig.title ?? "",
        date: gig.date,
        startTime: gig.startTime ?? "",
        endTime: gig.endTime ?? "",
        ticketed: gig.ticketed ?? false,
        ticketUrl: gig.ticketUrl ?? "",
        isOpenMic: gig.isOpenMic ?? false,
      });
    }
  }, [open, gig]);
  const { busy, error, run } = useSubmit("event", gig.id, onClose);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title="Edit gig" onClose={onClose} />
      <label className={label}>Title</label>
      <input className={field} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <label className={label}>Date</label>
      <input type="date" className={field} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={label}>Start</label>
          <input type="time" className={field} value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} />
        </div>
        <div className="flex-1">
          <label className={label}>End</label>
          <input type="time" className={field} value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setF({ ...f, ticketed: !f.ticketed })}
        aria-pressed={f.ticketed}
        className="mt-4 flex w-full items-center gap-2.5 rounded-2xl border border-line glass px-4 py-3 text-left text-[14px] font-extrabold"
      >
        <span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-md border", f.ticketed ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi")}>
          {f.ticketed && <Check size={12} strokeWidth={3.5} />}
        </span>
        Ticketed
      </button>
      {f.ticketed && (
        <>
          <label className={label}>Ticket URL</label>
          <input className={field} value={f.ticketUrl} onChange={(e) => setF({ ...f, ticketUrl: e.target.value })} placeholder="https://…" inputMode="url" />
        </>
      )}
      <button
        type="button"
        onClick={() => setF({ ...f, isOpenMic: !f.isOpenMic })}
        aria-pressed={f.isOpenMic}
        className="mt-2.5 flex w-full items-center gap-2.5 rounded-2xl border border-line glass px-4 py-3 text-left text-[14px] font-extrabold"
      >
        <span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-md border", f.isOpenMic ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi")}>
          {f.isOpenMic && <Check size={12} strokeWidth={3.5} />}
        </span>
        Open mic
      </button>
      <ErrorLine error={error} />
      <SheetFooter busy={busy} saveLabel="Save gig" onCancel={onClose} onSave={() => run(() => curatorApi.updateEvent(gig.id, f))} />
    </Sheet>
  );
}

/* ---------- hide ---------- */

export function HideSheet({
  type,
  id,
  name,
  open,
  onClose,
}: {
  type: CuratorEntity;
  id: string;
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const { busy, error, run } = useSubmit(type, id, onClose);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader
        title={`Hide ${name}?`}
        sub="This removes it from every public page. Nothing is destroyed. bndy staff can restore it from godmode."
        onClose={onClose}
      />
      <label className={label}>Reason</label>
      <input
        className={field}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Duplicate, closed down, wrong listing…"
      />
      <ErrorLine error={error} />
      <SheetFooter
        busy={busy}
        disabled={!reason.trim()}
        saveLabel="Hide it"
        tone="red"
        onCancel={onClose}
        onSave={() => run(() => curatorApi.hide(type, id, reason.trim()))}
      />
    </Sheet>
  );
}
