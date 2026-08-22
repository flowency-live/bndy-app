"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Heart, MapPin, Music, Search } from "lucide-react";
import { useBrassBands, useBrassConcerts } from "@/editions/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFavourites } from "@/lib/favourites";
import { useGeolocation } from "@/lib/useGeolocation";
import { useTheme } from "@/lib/theme";
import { todayISO } from "@/domain/dates";
import { matchesMapDate, type MapDateSel } from "@/domain/mapdate";
import { basemapFor } from "@/features/map/skinMap";
import { BrassMapDateControl } from "./BrassMapDateControl";
import { ConcertSheet } from "@/features/concerts/ConcertSheet";
import { BandMapSheet } from "./BandMapSheet";
import { cn } from "@/lib/cn";
import type { Gig } from "@/domain/types";
import type { BrassBand } from "@/editions/brass-api";

type Mode = "concerts" | "bands";

export function BrassMapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const { appSkin } = useTheme();
  const { location } = useGeolocation();
  const { data: concerts = [], isLoading: concertsLoading } = useBrassConcerts();
  const { data: bands = [], isLoading: bandsLoading } = useBrassBands();
  const { isAuthenticated } = useAuth();
  const { artistSet: favouriteBands } = useFavourites();
  const today = todayISO();

  const [mode, setMode] = useState<Mode>("concerts");
  const [dateSel, setDateSel] = useState<MapDateSel>({ kind: "today" });
  const [favOnly, setFavOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedConcert, setSelectedConcert] = useState<Gig | null>(null);
  const [selectedBand, setSelectedBand] = useState<BrassBand | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basemapFor(appSkin),
      center: [location.lng, location.lat],
      zoom: 8,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), "bottom-right");
    mapRef.current = map;
    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [appSkin, location.lat, location.lng]);

  const filteredConcerts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return concerts.filter((concert) => {
      if (!matchesMapDate(concert.date, dateSel, today)) return false;
      if (concert.cancelled) return false;
      if (favOnly && isAuthenticated && (!concert.artistId || !favouriteBands.has(concert.artistId))) return false;
      if (q && !`${concert.artistName ?? ""} ${concert.productionName ?? ""} ${concert.venueName} ${concert.venueCity ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [concerts, dateSel, favOnly, favouriteBands, isAuthenticated, query, today]);

  const locatedBands = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bands.filter((band) => {
      if (typeof band.locationLat !== "number" || typeof band.locationLng !== "number") return false;
      if (favOnly && isAuthenticated && !favouriteBands.has(band.id)) return false;
      if (q && !`${band.name} ${band.location ?? ""} ${(band.names ?? []).map((name) => name.name).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [bands, favOnly, favouriteBands, isAuthenticated, query]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];
    const rootStyle = getComputedStyle(document.documentElement);
    const accent = rootStyle.getPropertyValue("--acc").trim() || "#ff7a1a";
    const accent2 = rootStyle.getPropertyValue("--acc2").trim() || "#19d3f5";

    if (mode === "concerts") {
      for (const concert of filteredConcerts) {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", `${concert.artistName || concert.title} at ${concert.venueName}`);
        Object.assign(el.style, {
          width: "18px",
          height: "18px",
          borderRadius: "999px",
          border: "3px solid rgba(5,6,11,.78)",
          background: accent,
          boxShadow: `0 0 0 2px ${accent}, 0 4px 12px rgba(0,0,0,.38)`,
          cursor: "pointer",
        });
        el.addEventListener("click", () => { setSelectedBand(null); setSelectedConcert(concert); });
        markerRefs.current.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([concert.location.lng, concert.location.lat]).addTo(map));
      }
    } else {
      for (const band of locatedBands) {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", `${band.name}, ${band.location || "brass band"}`);
        Object.assign(el.style, {
          width: "20px",
          height: "20px",
          transform: "rotate(45deg)",
          borderRadius: "5px",
          border: "3px solid rgba(5,6,11,.78)",
          background: accent2,
          boxShadow: `0 0 0 2px ${accent2}, 0 4px 12px rgba(0,0,0,.38)`,
          cursor: "pointer",
        });
        el.addEventListener("click", () => { setSelectedConcert(null); setSelectedBand(band); });
        markerRefs.current.push(new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([band.locationLng!, band.locationLat!]).addTo(map));
      }
    }
  }, [filteredConcerts, locatedBands, mode]);

  const shownCount = mode === "concerts" ? filteredConcerts.length : locatedBands.length;
  const isLoading = mode === "concerts" ? concertsLoading : bandsLoading;

  return (
    <div className="relative h-[calc(100dvh-4rem)] min-h-[500px] lg:h-[calc(100dvh-1.5rem)]">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute left-3 right-3 top-3 z-10 flex flex-col gap-2 lg:left-6 lg:right-auto lg:top-6 lg:w-[440px]">
        <div className="flex gap-2">
          <div className="grid flex-1 grid-cols-2 rounded-2xl border border-line glass p-1 shadow-[0_6px_22px_rgba(0,0,0,.3)]">
            <ModeButton active={mode === "concerts"} onClick={() => { setMode("concerts"); setSelectedBand(null); }} icon={<Music size={15} />} label="Concerts" />
            <ModeButton active={mode === "bands"} onClick={() => { setMode("bands"); setSelectedConcert(null); }} icon={<MapPin size={15} />} label="Bands" />
          </div>
          <div className="flex min-w-[66px] flex-col items-center justify-center rounded-2xl border border-line glass px-3 shadow-[0_6px_22px_rgba(0,0,0,.3)]">
            <span className="tnum text-[16px] font-black leading-none">{isLoading ? "…" : shownCount}</span>
            <span className="mt-1 text-[7px] font-black uppercase tracking-[1.2px] text-[var(--acc)]">{mode}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={mode === "concerts" ? "Search concerts" : "Search bands"}
              placeholder={mode === "concerts" ? "Search bands or venues…" : "Search bands or towns…"}
              className="h-10 w-full rounded-2xl border border-line glass pl-9 pr-3 text-[12px] font-bold outline-none placeholder:text-dim focus:border-[var(--acc)]"
            />
          </div>
          {isAuthenticated && (
            <button
              type="button"
              aria-pressed={favOnly}
              onClick={() => setFavOnly((value) => !value)}
              className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border glass shadow-[0_6px_22px_rgba(0,0,0,.3)]", favOnly ? "border-red-500/60 text-red-500" : "border-line text-dim")}
            >
              <Heart size={16} fill={favOnly ? "currentColor" : "none"} />
            </button>
          )}
        </div>

        {mode === "concerts" && <BrassMapDateControl sel={dateSel} onChange={setDateSel} concerts={concerts} today={today} />}
      </div>

      <ConcertSheet concert={selectedConcert} onClose={() => setSelectedConcert(null)} />
      <BandMapSheet band={selectedBand} onClose={() => setSelectedBand(null)} />
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-extrabold transition-colors", active ? "bg-acc text-on-acc" : "text-dim hover:text-txt")}>
      {icon}{label}
    </button>
  );
}
