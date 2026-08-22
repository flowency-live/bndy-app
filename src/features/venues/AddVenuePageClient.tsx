"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, CheckCircle2, Globe, Loader2, MapPin, RotateCcw, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useVenues } from "@/lib/hooks";
import { useGeolocation } from "@/lib/useGeolocation";
import { distanceMiles, formatDistance } from "@/domain/geo";
import { cn } from "@/lib/cn";
import { FacebookSourceAssist } from "@/features/wizard/FacebookSourceAssist";
import { normKey } from "@/features/wizard/lib";
import {
  findOrCreateVenue,
  placesDetails,
  placesSuggest,
  type FacebookSourceInspection,
  type PlaceDetails,
  type PlaceSuggestion,
} from "@/features/wizard/wizardApi";

type Success = { id: string; name: string; city?: string };

export function AddVenuePageClient() {
  const { data: venues = [] } = useVenues();
  const { location: userLoc, located } = useGeolocation();
  const queryClient = useQueryClient();
  const [formKey, setFormKey] = useState(0);
  const [facebookInput, setFacebookInput] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [q, setQ] = useState("");
  const [placesResults, setPlacesResults] = useState<PlaceSuggestion[] | null>(null);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [confirming, setConfirming] = useState<PlaceDetails | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);

  const local = useMemo(() => {
    const key = normKey(q);
    if (key.length < 2) return [];
    const matched: { venue: (typeof venues)[number]; score: number; distance: number }[] = [];
    for (const venue of venues) {
      const venueKey = normKey(venue.name);
      let score = 0;
      if (venueKey.startsWith(key)) score = 3;
      else if (venueKey.includes(key)) score = 2;
      else if (venue.city && normKey(venue.city).includes(key)) score = 1;
      if (!score) continue;
      const rawDistance = located ? distanceMiles(userLoc, venue.location) : Infinity;
      matched.push({ venue, score, distance: isFinite(rawDistance) ? rawDistance : Infinity });
    }
    return matched
      .sort((a, b) => b.score - a.score || a.distance - b.distance || a.venue.name.localeCompare(b.venue.name))
      .slice(0, 8);
  }, [q, venues, located, userLoc]);

  const applyInspection = (result: FacebookSourceInspection) => {
    setError(null);
    if (result.facebookUrl) {
      setFacebookUrl(result.facebookUrl);
      setFacebookInput(result.facebookUrl);
    }
    if (result.observed?.name && !q.trim()) setQ(result.observed.name);
  };

  const searchPlaces = async () => {
    if (q.trim().length < 3) return;
    setSearchingPlaces(true);
    setError(null);
    try {
      setPlacesResults(await placesSuggest(q));
    } catch {
      setError("Venue search isn't available right now. Try again in a minute.");
    } finally {
      setSearchingPlaces(false);
    }
  };

  const pickPlace = async (place: PlaceSuggestion) => {
    setError(null);
    const details = await placesDetails(place.placeId);
    if (!details) {
      setError("Couldn't load that venue's details. Try another result.");
      return;
    }
    setConfirming(details);
  };

  const confirmPlace = async () => {
    if (!confirming) return;
    setCreating(true);
    setError(null);
    try {
      const result = await findOrCreateVenue({
        name: confirming.name,
        address: confirming.address,
        city: confirming.city,
        googlePlaceId: confirming.placeId,
        latitude: confirming.lat,
        longitude: confirming.lng,
        socialMediaUrls: facebookUrl || facebookInput.trim() ? [facebookUrl || facebookInput.trim()] : undefined,
      });
      if (result.ok && result.venueId) {
        setSuccess({ id: result.venueId, name: result.venueName ?? confirming.name, city: result.city ?? confirming.city });
        queryClient.invalidateQueries({ queryKey: ["venues"] });
      } else {
        setConfirming(null);
        setError(result.needsReview
          ? "We couldn't verify that venue as a physical live-music place. Check the result and try again."
          : result.error ?? "Something went wrong adding that venue.");
      }
    } catch {
      setError("Network hiccup. Nothing was added — try again.");
    } finally {
      setCreating(false);
    }
  };

  const reset = () => {
    setFacebookInput("");
    setFacebookUrl("");
    setQ("");
    setPlacesResults(null);
    setConfirming(null);
    setCreating(false);
    setError(null);
    setSuccess(null);
    setFormKey((value) => value + 1);
  };

  if (success) {
    return (
      <main className="mx-auto max-w-xl px-4 pb-36 pt-8 lg:pt-12">
        <div className="py-8 text-center sm:py-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-acc text-on-acc"><CheckCircle2 size={26} /></span>
          <div className="mt-4 font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc-text)]">Venue ready</div>
          <h1 className="mt-1 text-[28px] font-black tracking-tight">{success.name}</h1>
          {success.city && <p className="mt-1 text-[13px] font-semibold text-dim">{success.city}</p>}
          <p className="mx-auto mt-2 max-w-md text-[13px] font-semibold text-dim">The Facebook page helped us get there, but Google Places remains the physical venue identity in bndy.</p>
          <div className="mx-auto mt-6 grid max-w-md gap-2 sm:grid-cols-2">
            <Link href={`/venues/${success.id}`} className="bndy-btn2 flex min-h-11 items-center justify-center px-4 text-[13px]">View venue</Link>
            <button type="button" onClick={reset} className="bndy-btn flex min-h-11 items-center justify-center gap-2 px-4 text-[13px]"><RotateCcw size={14} /> Add another venue</button>
          </div>
        </div>
      </main>
    );
  }

  if (confirming) {
    return (
      <main className="mx-auto max-w-xl px-4 pb-36 pt-5 lg:pt-9">
        <header className="mb-7">
          <div className="font-meta text-[9px] font-black uppercase tracking-[1.8px] text-[var(--acc-text)]">Confirm the building</div>
          <h1 className="font-disp mt-1 text-[34px] font-black leading-none tracking-tight">Is this the venue?</h1>
        </header>

        <section className="border-y border-line py-4" aria-label="Venue to confirm">
          <div className="text-[18px] font-black">{confirming.name}</div>
          <div className="mt-1 flex items-start gap-1.5 text-[13px] font-semibold text-dim"><MapPin size={14} className="mt-0.5 shrink-0" />{confirming.address}</div>
        </section>

        {confirming.typeWarning && <p className="mt-4 border-l-2 border-[var(--acc)] py-1 pl-3 text-[12.5px] font-bold text-txt">Heads up: Google thinks this looks like {confirming.typeWarning}. Double-check it really hosts live music.</p>}
        {facebookUrl && <p className="mt-4 text-[11.5px] font-semibold text-dim">We&apos;ll keep the Facebook page with the new venue if this is a new bndy record.</p>}
        {error && <p role="alert" className="mt-4 border-l-2 border-[var(--acc)] py-1 pl-3 text-[12.5px] font-bold text-txt">{error}</p>}

        <div className="mt-6 flex gap-2.5">
          <button type="button" onClick={() => void confirmPlace()} disabled={creating} className="bndy-btn flex min-h-12 flex-1 items-center justify-center gap-2 text-[13px]">
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Yes, that&apos;s it
          </button>
          <button type="button" onClick={() => setConfirming(null)} disabled={creating} className="bndy-btn2 min-h-12 flex-1 text-[13px]">Go back</button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-36 pt-5 lg:pt-9">
      <header className="mb-7">
        <div className="font-meta text-[9px] font-black uppercase tracking-[1.8px] text-[var(--acc-text)]">Help grow bndy</div>
        <h1 className="font-disp mt-1 text-[34px] font-black leading-none tracking-tight">Add a venue</h1>
        <p className="mt-3 max-w-lg text-[13px] font-semibold leading-relaxed text-dim">Paste its Facebook page if you have it. We&apos;ll use the page as a clue, then you confirm the real place through Google.</p>
      </header>

      <div key={formKey} className="space-y-5">
        <FacebookSourceAssist expectedType="venue" value={facebookInput} onChange={(value) => { setFacebookInput(value); if (value !== facebookUrl) setFacebookUrl(""); }} onInspection={applyInspection} flat />

        <div>
          <label htmlFor="venue-search" className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">Venue name or town</label>
          <div className="relative">
            <input id="venue-search" value={q} onChange={(event) => { setQ(event.target.value); setPlacesResults(null); setError(null); }} placeholder="The venue, town…" className="w-full rounded-2xl border border-line glass py-3 pl-4 pr-11 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-[var(--acc)]" />
            <Search size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-dim" />
          </div>
        </div>

        {local.length > 0 && (
          <section>
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-[1px] text-dim">Already on bndy</div>
            <div className="divide-y divide-line border-y border-line">
              {local.map(({ venue, distance }) => (
                <Link key={venue.id} href={`/venues/${venue.id}`} className="flex min-h-12 w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-card2">
                  <MapPin size={15} className="shrink-0 text-[var(--acc2)]" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14.5px] font-extrabold">{venue.name}</span>{(venue.city || isFinite(distance)) && <span className="block truncate text-[12px] font-semibold text-dim">{venue.city}{venue.city && isFinite(distance) ? " · " : ""}{isFinite(distance) ? formatDistance(distance) : ""}</span>}</span>
                  <span className="text-[10px] font-black uppercase tracking-wide text-[var(--acc-text)]">View</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {q.trim().length >= 3 && (
          <div>
            {placesResults === null ? (
              <button type="button" onClick={() => void searchPlaces()} disabled={searchingPlaces} className={cn("flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-hi py-3 text-[13px] font-extrabold text-dim transition-colors hover:text-txt")}>
                {searchingPlaces ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}{local.length ? "Not there? Search Google Places" : "Search Google Places"}
              </button>
            ) : placesResults.length ? (
              <section>
                <div className="mb-1.5 text-[10px] font-black uppercase tracking-[1px] text-dim">Physical places</div>
                <div className="divide-y divide-line border-y border-line">
                  {placesResults.map((place) => (
                    <button key={place.placeId} type="button" onClick={() => void pickPlace(place)} className="flex min-h-12 w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-card2">
                      <Globe size={15} className="shrink-0 text-dim" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-[14.5px] font-extrabold">{place.name}</span><span className="block truncate text-[12px] font-semibold text-dim">{place.address}</span></span>
                    </button>
                  ))}
                </div>
              </section>
            ) : <p className="border-l-2 border-line-hi py-1 pl-3 text-[12.5px] font-semibold text-dim">Nothing found for “{q}”. Add the town or check the spelling.</p>}
          </div>
        )}

        {error && <p role="alert" className="border-l-2 border-[var(--acc)] py-1 pl-3 text-[12.5px] font-bold text-txt">{error}</p>}
      </div>
    </main>
  );
}
