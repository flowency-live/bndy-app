"use client";

// Curator edit sheets + hide flow (backlog feature 4).
// One compact form per entity. The server whitelist is the contract;
// these forms only offer fields the server accepts.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { curatorApi, useCuratorInvalidate, type CuratorEntity } from "@/lib/curator";
import type { Artist, Gig, Venue } from "@/domain/types";

const field =
  "w-full rounded-xl border border-line bg-white/5 px-3.5 py-2.5 text-[14px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-[var(--acc)]";
const label = "mb-1 mt-3 block text-[11px] font-extrabold uppercase tracking-wide text-dim";
const primaryBtn =
  "mt-5 w-full rounded-xl bg-[var(--acc)] px-4 py-3 text-[14px] font-extrabold text-black transition-opacity hover:opacity-90 disabled:opacity-50";

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

function SheetHeader({ title }: { title: string }) {
  return <h2 className="text-lg font-black tracking-tight text-txt">{title}</h2>;
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] font-semibold text-red-400">
      {error}
    </p>
  );
}

/* ---------- venue ---------- */

export function EditVenueSheet({ venue, open, onClose }: { venue: Venue; open: boolean; onClose: () => void }) {
  const [f, setF] = useState({
    address: venue.address ?? "",
    postcode: venue.postcode ?? "",
    city: venue.city ?? "",
    website: venue.website ?? "",
    standardTicketed: venue.standardTicketed ?? false,
    standardTicketUrl: venue.standardTicketUrl ?? "",
  });
  const { busy, error, run } = useSubmit("venue", venue.id, onClose);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title={`Edit ${venue.name}`} />
      <p className="mt-0.5 text-[12px] font-semibold text-dim">Name changes stay with bndy staff.</p>
      <label className={label}>Address</label>
      <input className={field} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      <label className={label}>Postcode</label>
      <input className={field} value={f.postcode} onChange={(e) => setF({ ...f, postcode: e.target.value })} />
      <label className={label}>City</label>
      <input className={field} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
      <label className={label}>Website</label>
      <input className={field} value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
      <label className="mt-4 flex items-center gap-2 text-[13.5px] font-bold text-txt">
        <input
          type="checkbox"
          checked={f.standardTicketed}
          onChange={(e) => setF({ ...f, standardTicketed: e.target.checked })}
        />
        Usually ticketed
      </label>
      {f.standardTicketed && (
        <>
          <label className={label}>Ticket URL</label>
          <input className={field} value={f.standardTicketUrl} onChange={(e) => setF({ ...f, standardTicketUrl: e.target.value })} />
        </>
      )}
      <ErrorLine error={error} />
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => curatorApi.updateVenue(venue.id, f))}
        className={primaryBtn}
      >
        {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Save venue"}
      </button>
    </Sheet>
  );
}

/* ---------- artist ---------- */

export function EditArtistSheet({ artist, open, onClose }: { artist: Artist; open: boolean; onClose: () => void }) {
  const [f, setF] = useState({
    bio: artist.bio ?? "",
    location: artist.location ?? "",
    genres: (artist.genres ?? []).join(", "),
  });
  const { busy, error, run } = useSubmit("artist", artist.id, onClose);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title={`Edit ${artist.name}`} />
      <p className="mt-0.5 text-[12px] font-semibold text-dim">Name changes stay with bndy staff.</p>
      <label className={label}>Bio</label>
      <textarea className={field} rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
      <label className={label}>Location</label>
      <input className={field} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Read it off the act's own page" />
      <label className={label}>Genres (comma separated)</label>
      <input className={field} value={f.genres} onChange={(e) => setF({ ...f, genres: e.target.value })} />
      <ErrorLine error={error} />
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(() =>
            curatorApi.updateArtist(artist.id, {
              bio: f.bio,
              location: f.location,
              genres: f.genres.split(",").map((g) => g.trim()).filter(Boolean),
            }),
          )
        }
        className={primaryBtn}
      >
        {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Save artist"}
      </button>
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
  const { busy, error, run } = useSubmit("event", gig.id, onClose);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title="Edit gig" />
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
      <label className="mt-4 flex items-center gap-2 text-[13.5px] font-bold text-txt">
        <input type="checkbox" checked={f.ticketed} onChange={(e) => setF({ ...f, ticketed: e.target.checked })} />
        Ticketed
      </label>
      {f.ticketed && (
        <>
          <label className={label}>Ticket URL</label>
          <input className={field} value={f.ticketUrl} onChange={(e) => setF({ ...f, ticketUrl: e.target.value })} />
        </>
      )}
      <label className="mt-3 flex items-center gap-2 text-[13.5px] font-bold text-txt">
        <input type="checkbox" checked={f.isOpenMic} onChange={(e) => setF({ ...f, isOpenMic: e.target.checked })} />
        Open mic
      </label>
      <ErrorLine error={error} />
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => curatorApi.updateEvent(gig.id, f))}
        className={primaryBtn}
      >
        {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Save gig"}
      </button>
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
      <SheetHeader title={`Hide ${name}?`} />
      <p className="mt-1 text-[13px] font-semibold text-dim">
        This removes it from every public page. Nothing is destroyed. bndy staff can restore it from godmode.
      </p>
      <label className={label}>Reason</label>
      <input
        className={field}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Duplicate, closed down, wrong listing…"
      />
      <ErrorLine error={error} />
      <button
        type="button"
        disabled={busy || !reason.trim()}
        onClick={() => run(() => curatorApi.hide(type, id, reason.trim()))}
        className="mt-5 w-full rounded-xl bg-red-600 px-4 py-3 text-[14px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Hide it"}
      </button>
    </Sheet>
  );
}
