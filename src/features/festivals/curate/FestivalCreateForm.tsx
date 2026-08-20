"use client";

// Festival curator builder step 1 (FESTIVAL-CURATOR-PLAN.md).
// One screen creates a DRAFT festival, then hands over to the manage page.
// The venue entry point (?venueId=&venueName=) attaches that venue as primary,
// which is how a venue starts a festival series for itself.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { curatorApi } from "@/lib/curator";
import { PlaceInput } from "@/features/shared/PlaceInput";
import { todayISO } from "@/domain/dates";

const field =
  "w-full rounded-2xl border border-line glass px-4 py-3 text-[14.5px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-orange/55";
const label = "mb-1.5 mt-4 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim";

export function FestivalCreateForm() {
  const { isCurator } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const venueId = params.get("venueId");
  const venueName = params.get("venueName");

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [town, setTown] = useState("");
  const [free, setFree] = useState(true);
  const [price, setPrice] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isCurator) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <ShieldAlert size={28} className="mx-auto text-[var(--acc)]" />
        <h1 className="mt-3 text-xl font-black">Curator access needed.</h1>
        <p className="mt-2 text-[13px] font-semibold text-dim">
          Festivals are created by bndy curators. If you run a festival and want it listed, get in touch through Help.
        </p>
      </div>
    );
  }

  const valid = name.trim().length >= 3 && !!startDate && (!endDate || endDate >= startDate);

  const create = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await curatorApi.createFestival({
        name: name.trim(),
        startDate,
        endDate: endDate || startDate,
        town: town.trim() || undefined,
        location: town.trim() || undefined,
        ticketed: !free,
        price: free ? "FREE" : price.trim() || undefined,
        ticketUrl: !free && ticketUrl.trim() ? ticketUrl.trim() : undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        ...(venueId ? { primaryVenueId: venueId, venueIds: [venueId] } : {}),
      });
      router.push(`/festivals/${res.slug}/manage`);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Could not create the festival. Try again.");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-4">
      <div className="font-meta text-[9px] font-black uppercase tracking-[2px] text-[var(--acc)]">Festival builder</div>
      <h1 className="mt-1 text-[24px] font-black tracking-tight">Create a festival</h1>
      <p className="mt-1.5 text-[13px] font-semibold text-dim">
        It starts as a draft only curators can see. Add venues and gigs, then publish when it is ready.
      </p>
      {venueName && (
        <div className="mt-3 rounded-xl border border-line bg-card2 px-3.5 py-2.5 text-[12.5px] font-bold text-txt">
          Starting from <span className="text-[var(--acc)]">{venueName}</span>. It becomes the festival&apos;s first venue.
        </div>
      )}

      <label className={label} htmlFor="fest-name">Festival name</label>
      <input id="fest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Beartown Blues Weekender 2027" className={field} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="fest-start">First day</label>
          <input id="fest-start" type="date" min={todayISO()} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="fest-end">Last day</label>
          <input id="fest-end" type="date" min={startDate || todayISO()} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
        </div>
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-dim2">One day festival? Leave the last day empty.</p>

      <label className={label}>Town</label>
      <PlaceInput value={town} onChange={setTown} placeholder="Congleton" className={field} ariaLabel="Festival town" />

      <label className={label}>Entry</label>
      <div className="flex overflow-hidden rounded-2xl border border-line">
        <button type="button" onClick={() => setFree(true)} className={`flex-1 py-3 text-[13px] font-black transition-colors ${free ? "bg-[var(--acc)] text-on-acc" : "bg-card text-dim"}`}>
          Free to attend
        </button>
        <button type="button" onClick={() => setFree(false)} className={`flex-1 py-3 text-[13px] font-black transition-colors ${!free ? "bg-[var(--acc)] text-on-acc" : "bg-card text-dim"}`}>
          Ticketed
        </button>
      </div>
      {!free && (
        <>
          <label className={label} htmlFor="fest-price">Price <span className="text-dim2">(as billed)</span></label>
          <input id="fest-price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="£15 weekend" className={field} />
          <label className={label} htmlFor="fest-tickets">Ticket link</label>
          <input id="fest-tickets" type="url" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="https://" className={field} />
        </>
      )}

      <label className={label} htmlFor="fest-web">Festival website <span className="text-dim2">(optional)</span></label>
      <input id="fest-web" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" className={field} />

      {error && <p className="mt-4 rounded-xl bg-card2 px-3.5 py-3 text-[13px] font-bold text-[var(--acc)]">{error}</p>}

      <button type="button" onClick={create} disabled={!valid || busy} className="bndy-btn mt-6 flex w-full items-center justify-center gap-2 py-4 text-[15px] disabled:opacity-60">
        {busy ? <><Loader2 size={17} className="animate-spin" /> Creating draft…</> : <><CalendarRange size={17} /> Create draft festival</>}
      </button>
      <p className="mt-2.5 text-center text-[11.5px] font-semibold text-dim2">Nothing goes public until you publish it.</p>
    </div>
  );
}
