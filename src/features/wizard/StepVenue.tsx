"use client";

import { useMemo, useState } from "react";
import { Check, Globe, Loader2, MapPin, Search } from "lucide-react";
import { useVenues } from "@/lib/hooks";
import { useGeolocation } from "@/lib/useGeolocation";
import { distanceMiles, formatDistance } from "@/domain/geo";
import { cn } from "@/lib/cn";
import { normKey } from "./lib";
import { findOrCreateVenue, placesDetails, placesSuggest, type PlaceDetails, type PlaceSuggestion } from "./wizardApi";

/** WHERE step. Venue is NEVER free-text (runbook §0.8): pick a known bndy venue
 *  or confirm a Google Places result — which round-trips the place_id gate. */
export function StepVenue({ onPick }: { onPick: (v: { id: string; name: string; city?: string }) => void }) {
  const { data: venues = [] } = useVenues();
  const [q, setQ] = useState("");
  const [placesResults, setPlacesResults] = useState<PlaceSuggestion[] | null>(null);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [confirming, setConfirming] = useState<PlaceDetails | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Matches ranked name-startsWith > name-contains > town-contains, then nearest-first
  // when we have the user's location. Distance is computed only for the MATCHED subset
  // (tens of rows, not the whole list): no per-keystroke cost beyond the string filter.
  const { location: userLoc, located } = useGeolocation();
  const local = useMemo(() => {
    const key = normKey(q);
    if (key.length < 2) return [];
    const matched: { v: (typeof venues)[number]; s: number; d: number }[] = [];
    for (const v of venues) {
      const nk = normKey(v.name);
      let s = 0;
      if (nk.startsWith(key)) s = 3;
      else if (nk.includes(key)) s = 2;
      else if (v.city && normKey(v.city).includes(key)) s = 1;
      if (s) {
        const d = located ? distanceMiles(userLoc, v.location) : Infinity;
        matched.push({ v, s, d: isFinite(d) ? d : Infinity });
      }
    }
    matched.sort((a, b) => b.s - a.s || a.d - b.d || a.v.name.localeCompare(b.v.name));
    return matched.slice(0, 8);
  }, [q, venues, located, userLoc]);

  const searchPlaces = async () => {
    setSearchingPlaces(true);
    setError(null);
    try {
      setPlacesResults(await placesSuggest(q));
    } catch {
      setError("Search isn't available right now. Try again in a minute.");
    } finally {
      setSearchingPlaces(false);
    }
  };

  const pickPlace = async (p: PlaceSuggestion) => {
    setError(null);
    const d = await placesDetails(p.placeId);
    if (!d) { setError("Couldn't load that venue's details. Try another result."); return; }
    setConfirming(d);
  };

  const confirmPlace = async () => {
    if (!confirming) return;
    setCreating(true);
    setError(null);
    const r = await findOrCreateVenue({
      name: confirming.name,
      address: confirming.address,
      city: confirming.city,
      googlePlaceId: confirming.placeId,
      latitude: confirming.lat,
      longitude: confirming.lng,
    });
    setCreating(false);
    if (r.ok && r.venueId) {
      onPick({ id: r.venueId, name: r.venueName ?? confirming.name, city: r.city ?? confirming.city });
    } else {
      setConfirming(null);
      setError(r.needsReview
        ? "We couldn't verify that venue. Double-check the name and town, or pick a venue bndy already knows."
        : r.error ?? "Something went wrong adding that venue.");
    }
  };

  if (confirming) {
    return (
      <div>
        <h2 className="text-[19px] font-black tracking-tight">Is this the venue?</h2>
        <div className="mt-3 rounded-2xl border border-line bg-card p-4">
          <div className="text-[16px] font-extrabold">{confirming.name}</div>
          <div className="mt-1 flex items-start gap-1.5 text-[13px] font-semibold text-dim">
            <MapPin size={13} className="mt-0.5 shrink-0 opacity-70" />
            {confirming.address}
          </div>
        </div>
        <p className="mt-2.5 text-[12.5px] font-semibold text-dim">This is what we found. Make sure it&apos;s the right place, not a same-named venue in another town.</p>
        <div className="mt-3.5 flex gap-2.5">
          <button onClick={confirmPlace} disabled={creating} className="bndy-btn flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px]">
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Yes, that&apos;s it
          </button>
          <button onClick={() => setConfirming(null)} className="bndy-btn2 flex flex-1 items-center justify-center py-3.5 text-[14px]">
            No, go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[19px] font-black tracking-tight">Where&apos;s the gig?</h2>
      <div className="relative mt-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPlacesResults(null); setError(null); }}
          placeholder="Venue name or town…"
          aria-label="Search for a venue"
          autoFocus
          className="w-full rounded-2xl border border-line glass px-10 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55"
        />
      </div>

      {local.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {local.map(({ v, d }) => (
            <button key={v.id} onClick={() => onPick({ id: v.id, name: v.name, city: v.city })}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-3 text-left transition-colors hover:border-line-hi">
              <MapPin size={15} className="shrink-0 text-[var(--acc2)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-extrabold">{v.name}</span>
                {(v.city || isFinite(d)) && (
                  <span className="block text-[12px] font-semibold text-dim">
                    {v.city}{v.city && isFinite(d) ? " · " : ""}{isFinite(d) ? formatDistance(d) : ""}
                  </span>
                )}
              </span>
              <span className="rounded-md bg-card2 px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-wide text-dim">on bndy ✓</span>
            </button>
          ))}
        </div>
      )}

      {q.trim().length >= 3 && (
        <div className="mt-4">
          {placesResults === null ? (
            <button onClick={searchPlaces} disabled={searchingPlaces}
              className={cn("flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-hi py-3 text-[13px] font-extrabold text-dim transition-colors hover:text-txt")}>
              {searchingPlaces ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
              {local.length ? "Not listed? Search everywhere" : "Search everywhere for it"}
            </button>
          ) : placesResults.length ? (
            <div className="space-y-1.5">
              <div className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim2">New to bndy</div>
              {placesResults.map((p) => (
                <button key={p.placeId} onClick={() => pickPlace(p)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-3 text-left transition-colors hover:border-line-hi">
                  <Globe size={15} className="shrink-0 text-dim" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-extrabold">{p.name}</span>
                    <span className="block truncate text-[12px] font-semibold text-dim">{p.address}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-card2 px-3.5 py-3 text-[13px] font-semibold text-dim">
              Nothing found for &ldquo;{q}&rdquo;. Check the spelling, or add the town, e.g. &ldquo;The Swan, Stone&rdquo;.
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-3 rounded-xl bg-card2 px-3.5 py-3 text-[13px] font-bold text-[var(--acc)]">{error}</p>}
    </div>
  );
}
