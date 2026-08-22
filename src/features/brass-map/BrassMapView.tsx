"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Heart, MapPin, Music, Search, X } from "lucide-react";
import { useBrassBands, useBrassConcerts } from "@/editions/hooks";
import type { BrassBand, BrassConcert } from "@/editions/brass-api";
import { todayISO } from "@/domain/dates";
import { dayLabel, matchesMapDate, nextDays, type MapDateSel } from "@/domain/mapdate";
import { basemapFor } from "@/features/map/skinMap";
import { useTheme } from "@/lib/theme";
import { useGeolocation } from "@/lib/useGeolocation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFavourites } from "@/lib/favourites";
import { cn } from "@/lib/cn";

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
  const days = useMemo(() => nextDays(today, 7), [today]);

  const [mode, setMode] = useState<Mode>("concerts");
  const [dateSel, setDateSel] = useState<MapDateSel>({ kind: "today" });
  const [favOnly, setFavOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedConcert, setSelectedConcert] = useState<BrassConcert | null>(null);
  const [selectedBand, setSelectedBand] = useState<BrassBand | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basemapFor(appSkin),
      center: [location.lng, location.lat],
      zoom: 6.5,
      attributionControl: {},
    });
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), "bottom-right");
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
      if (concert.cancelled || !matchesMapDate(concert.date, dateSel, today)) return false;
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
      if (q && !`${band.name} ${band.location} ${band.names.map((name) => name.name).join(" ")} ${band.nameVariants.join(" ")}`.toLowerCase().includes(q)) return false;
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
        Object.assign(el.style, { width: "18px", height: "18px", borderRadius: "999px", border: "3px solid rgba(5,6,11,.78)", background: accent, boxShadow: `0 0 0 2px ${accent}`, cursor: "pointer" });
        el.addEventListener("click", () => { setSelectedBand(null); setSelectedConcert(concert); });
        markerRefs.current.push(new maplibregl.Marker({ element: el }).setLngLat([concert.geoLng, concert.geoLat]).addTo(map));
      }
    } else {
      for (const band of locatedBands) {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", `${band.name}, ${band.location || "brass band"}`);
        Object.assign(el.style, { width: "20px", height: "20px", transform: "rotate(45deg)", borderRadius: "4px", border: "3px solid rgba(5,6,11,.78)", background: accent2, boxShadow: `0 0 0 2px ${accent2}`, cursor: "pointer" });
        el.addEventListener("click", () => { setSelectedConcert(null); setSelectedBand(band); });
        markerRefs.current.push(new maplibregl.Marker({ element: el }).setLngLat([band.locationLng!, band.locationLat!]).addTo(map));
      }
    }
  }, [filteredConcerts, locatedBands, mode]);

  const shownCount = mode === "concerts" ? filteredConcerts.length : locatedBands.length;
  const loading = mode === "concerts" ? concertsLoading : bandsLoading;

  return (
    <div className="relative h-[calc(100dvh-4rem)] min-h-[520px] lg:h-[calc(100dvh-1.5rem)]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute left-3 right-3 top-3 z-10 flex flex-col gap-2 lg:left-6 lg:right-auto lg:top-6 lg:w-[470px]">
        <div className="flex gap-2">
          <div className="grid flex-1 grid-cols-2 rounded-2xl border border-line glass p-1 shadow-[0_6px_22px_rgba(0,0,0,.3)]">
            <ModeButton active={mode === "concerts"} onClick={() => setMode("concerts")} icon={<Music size={15} />} label="Concerts" />
            <ModeButton active={mode === "bands"} onClick={() => setMode("bands")} icon={<MapPin size={15} />} label="Bands" />
          </div>
          <div className="flex min-w-[70px] flex-col items-center justify-center rounded-2xl border border-line glass px-3"><strong className="tnum text-[16px]">{loading ? "…" : shownCount}</strong><span className="text-[7px] font-black uppercase tracking-[1.2px] text-[var(--acc)]">{mode}</span></div>
        </div>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={mode === "concerts" ? "Search bands or venues…" : "Search bands or towns…"} className="h-10 w-full rounded-2xl border border-line glass pl-9 pr-3 text-[12px] font-bold outline-none" /></div>
          {isAuthenticated && <button type="button" aria-pressed={favOnly} onClick={() => setFavOnly((v) => !v)} className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border glass", favOnly ? "border-red-500/60 text-red-500" : "border-line text-dim")}><Heart size={16} fill={favOnly ? "currentColor" : "none"} /></button>}
        </div>
        {mode === "concerts" && <div className="flex gap-1 overflow-x-auto rounded-2xl border border-line glass p-1">{days.map((day) => <button key={day} type="button" onClick={() => setDateSel(day === today ? { kind: "today" } : { kind: "date", date: day })} className={cn("shrink-0 rounded-xl px-3 py-2 text-[10px] font-extrabold", matchesDateButton(dateSel, day, today) ? "bg-acc text-on-acc" : "text-dim")}>{dayLabel(day, today)}</button>)}</div>}
      </div>

      {(selectedBand || selectedConcert) && <div className="absolute bottom-20 left-3 right-3 z-20 rounded-2xl border border-line glass-hi p-4 shadow-2xl lg:bottom-6 lg:left-auto lg:right-6 lg:w-[360px]">
        <button type="button" onClick={() => { setSelectedBand(null); setSelectedConcert(null); }} className="absolute right-3 top-3 text-dim" aria-label="Close"><X size={18} /></button>
        {selectedBand ? <><div className="text-[10px] font-black uppercase tracking-[1.4px] text-[var(--acc2)]">Brass band</div><h2 className="mt-1 pr-7 text-xl font-black">{selectedBand.name}</h2><p className="mt-2 text-sm text-dim">{selectedBand.location}</p>{selectedBand.websiteUrl && <a className="mt-3 inline-block text-sm font-bold text-[var(--acc)]" href={selectedBand.websiteUrl} target="_blank" rel="noreferrer">Official website ↗</a>}</> : selectedConcert ? <><div className="text-[10px] font-black uppercase tracking-[1.4px] text-[var(--acc)]">Concert</div><h2 className="mt-1 pr-7 text-xl font-black">{selectedConcert.artistName || selectedConcert.title}</h2>{selectedConcert.productionName && <p className="mt-1 font-bold">{selectedConcert.productionName}</p>}<p className="mt-2 text-sm text-dim">{selectedConcert.venueName}{selectedConcert.venueCity ? ` · ${selectedConcert.venueCity}` : ""}</p><p className="mt-1 text-sm font-bold">{selectedConcert.date}{selectedConcert.startTime ? ` · ${selectedConcert.startTime}` : ""}</p>{selectedConcert.conductorName && <p className="mt-2 text-sm">Conducted by {selectedConcert.conductorName}</p>}{selectedConcert.ticketUrl && <a className="mt-3 inline-block text-sm font-bold text-[var(--acc)]" href={selectedConcert.ticketUrl} target="_blank" rel="noreferrer">Tickets ↗</a>}</> : null}
      </div>}
    </div>
  );
}

function matchesDateButton(sel: MapDateSel, day: string, today: string): boolean {
  return (sel.kind === "today" && day === today) || (sel.kind === "date" && sel.date === day);
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={cn("flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-extrabold", active ? "bg-acc text-on-acc" : "text-dim")}>{icon}{label}</button>;
}
