"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Clock3, MapPin } from "lucide-react";
import type { Festival, Gig } from "@/domain/types";
import { useTheme } from "@/lib/theme";
import { useVenues } from "@/lib/hooks";
import { basemapFor } from "@/features/map/skinMap";
import { formatTime } from "@/domain/dates";
import { GigSheet } from "@/features/gigs/GigSheet";

export function FestivalMap({ festival, gigs }: { festival: Festival; gigs: Gig[] }) {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const { appSkin } = useTheme();
  const { data: allVenues = [] } = useVenues();
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);

  const venueGroups = useMemo(() => {
    const ids = new Set([...festival.venueIds, ...gigs.map((g) => g.venueId)]);
    return [...ids].map((id) => {
      const venue = allVenues.find((v) => v.id === id);
      const venueGigs = gigs.filter((g) => g.venueId === id).sort((a, b) => `${a.date}${a.startTime || ""}`.localeCompare(`${b.date}${b.startTime || ""}`));
      const fallback = venueGigs[0];
      const location = venue?.location || fallback?.location;
      if (!location) return null;
      return {
        id,
        name: venue?.name || fallback?.venueName || "Festival venue",
        city: venue?.city || fallback?.venueCity,
        location,
        gigs: venueGigs,
      };
    }).filter((x): x is NonNullable<typeof x> => !!x);
  }, [festival.venueIds, gigs, allVenues]);

  const selected = venueGroups.find((v) => v.id === selectedVenueId) || null;

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const centre = venueGroups[0]?.location || { lat: 53.16, lng: -2.2 };
    const map = new maplibregl.Map({
      container: container.current,
      style: basemapFor(appSkin),
      center: [centre.lng, centre.lat],
      zoom: venueGroups.length === 1 ? 14 : 10,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // map is intentionally created once; skin and venue updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(basemapFor(appSkin));
  }, [appSkin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    venueGroups.forEach((venue) => {
      bounds.extend([venue.location.lng, venue.location.lat]);
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `${venue.name}, ${venue.gigs.length} festival gigs`);
      el.style.cssText = "display:flex;align-items:center;gap:6px;max-width:170px;padding:7px 9px;border:2px solid var(--surface);border-radius:12px;background:var(--acc);color:var(--on-acc);font:800 11px/1.1 var(--font-ui,system-ui);box-shadow:0 5px 18px rgba(0,0,0,.28);cursor:pointer;";
      const name = document.createElement("span");
      name.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      name.textContent = venue.name;
      const count = document.createElement("span");
      count.style.cssText = "display:flex;min-width:22px;height:22px;align-items:center;justify-content:center;border-radius:7px;background:rgba(0,0,0,.2);font-variant-numeric:tabular-nums;";
      count.textContent = String(venue.gigs.length);
      el.append(name, count);
      el.addEventListener("click", () => setSelectedVenueId(venue.id));
      markersRef.current.push(new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([venue.location.lng, venue.location.lat]).addTo(map));
    });

    if (venueGroups.length === 1) {
      map.easeTo({ center: [venueGroups[0].location.lng, venueGroups[0].location.lat], zoom: 14, duration: 450 });
    } else if (venueGroups.length > 1 && !bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 54, maxZoom: 14, duration: 600 });
    }
  }, [venueGroups]);

  if (!venueGroups.length) {
    return (
      <div className="rounded-[var(--rad-lg)] border border-line bg-card p-8 text-center">
        <MapPin size={28} className="mx-auto text-[var(--acc)]" />
        <h2 className="mt-3 text-xl font-black">Venue map coming soon.</h2>
        <p className="mt-2 text-[13px] font-semibold text-dim">This festival does not have mapped participating venues yet.</p>
      </div>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card shadow-[var(--shadow)]">
        <div className="relative h-[56dvh] min-h-[390px] max-h-[650px] lg:h-[600px]">
          <div ref={container} className="absolute inset-0" />
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-xl border border-line glass px-3 py-2 shadow-[var(--shadow)]">
            <div className="font-meta text-[8px] font-black uppercase tracking-[1.4px] text-[var(--acc)]">Festival map</div>
            <div className="mt-0.5 text-[11px] font-black">{venueGroups.length} venue{venueGroups.length === 1 ? "" : "s"}</div>
          </div>
        </div>

        {selected && (
          <div className="border-t border-line bg-card p-4 lg:p-5">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-[var(--acc)]" />
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-black">{selected.name}</div>
                {selected.city && <div className="mt-0.5 text-[11px] font-semibold text-dim">{selected.city}</div>}
              </div>
              <button onClick={() => setSelectedVenueId(null)} className="rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-black text-dim hover:text-txt">Close</button>
            </div>
            {selected.gigs.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {selected.gigs.map((gig) => (
                  <button key={gig.id} onClick={() => setSelectedGig(gig)} className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-card2 px-3 py-2.5 text-left transition-colors hover:border-line-hi">
                    <Clock3 size={14} className="shrink-0 text-[var(--acc)]" />
                    <span className="tnum shrink-0 text-[11px] font-black">{gig.startTime ? formatTime(gig.startTime) : "TBC"}</span>
                    <span className="min-w-0 truncate text-[12px] font-extrabold">{gig.artistName || gig.title}</span>
                  </button>
                ))}
              </div>
            ) : <div className="mt-3 text-[12px] font-semibold text-dim">This venue is announced for the festival; linked gigs are still to come.</div>}
          </div>
        )}
      </section>
      <GigSheet gig={selectedGig} onClose={() => setSelectedGig(null)} />
    </>
  );
}
