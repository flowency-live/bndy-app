"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Moon, Sun } from "lucide-react";
import type { FeatureCollection, Point } from "geojson";
import { useUpcomingGigs, useVenues } from "@/lib/hooks";
import { useGeolocation } from "@/lib/useGeolocation";
import { useTheme } from "@/lib/theme";
import { distanceMiles } from "@/domain/geo";
import { todayISO } from "@/domain/dates";
import { type MapDateSel, matchesMapDate } from "@/domain/mapdate";
import { GigSheet } from "@/features/gigs/GigSheet";
import { VenueSheet } from "@/features/venues/VenueSheet";
import { MapDateControl } from "./MapDateControl";
import { cn } from "@/lib/cn";
import type { Gig, Venue } from "@/domain/types";
import { basemapFor, registerDiamonds, tokenSkin } from "./skinMap";
import { ALL_LAYERS, GIG_LAYERS, VEN_LAYERS, buildGigLayers, buildVenueLayers } from "./layers";

type Mode = "events" | "venues";

export function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
  const readyRef = useRef(false);
  const rafRef = useRef(0);
  const { mode: theme, toggle, appSkin } = useTheme();
  const { location } = useGeolocation();

  const { data: gigs = [] } = useUpcomingGigs();
  const { data: venues = [] } = useVenues();
  const [mode, setMode] = useState<Mode>("events");
  const [sel, setSel] = useState<MapDateSel>({ kind: "today" });
  const [selected, setSelected] = useState<Gig | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const today = todayISO();
  const modeRef = useRef(mode); modeRef.current = mode;
  const gigById = useMemo(() => { const m: Record<string, Gig> = {}; gigs.forEach((g) => (m[g.id] = g)); return m; }, [gigs]);
  const gigByIdRef = useRef(gigById); gigByIdRef.current = gigById;
  const venueById = useMemo(() => { const m: Record<string, Venue> = {}; venues.forEach((v) => (m[v.id] = v)); return m; }, [venues]);
  const venueByIdRef = useRef(venueById); venueByIdRef.current = venueById;
  const venueIdsLive = useMemo(() => new Set(gigs.map((g) => g.venueId)), [gigs]);
  const shownCount = useMemo(() => gigs.reduce((n, g) => (matchesMapDate(g.date, sel, today) ? n + 1 : n), 0), [gigs, sel, today]);

  const venueGigs = useMemo(() => {
    if (!selectedVenue) return [];
    return gigs.filter((g) => g.venueId === selectedVenue.id).sort((a, b) => `${a.date}${a.startTime ?? ""}`.localeCompare(`${b.date}${b.startTime ?? ""}`));
  }, [selectedVenue, gigs]);

  const gigGeo = useMemo<FeatureCollection<Point>>(
    () => ({ type: "FeatureCollection", features: gigs.filter((g) => matchesMapDate(g.date, sel, today)).map((g) => ({ type: "Feature", geometry: { type: "Point", coordinates: [g.location.lng, g.location.lat] }, properties: { id: g.id, tonight: g.date === today ? 1 : 0 } })) }),
    [gigs, sel, today],
  );
  const venGeo = useMemo<FeatureCollection<Point>>(
    () => ({ type: "FeatureCollection", features: venues.map((v) => ({ type: "Feature", geometry: { type: "Point", coordinates: [v.location.lng, v.location.lat] }, properties: { id: v.id, live: venueIdsLive.has(v.id) ? 1 : 0 } })) }),
    [venues, venueIdsLive],
  );
  const gigGeoRef = useRef(gigGeo); gigGeoRef.current = gigGeo;
  const venGeoRef = useRef(venGeo); venGeoRef.current = venGeo;

  function ensureSourcesAndLayers(map: maplibregl.Map) {
    if (!map.getSource("gigs")) map.addSource("gigs", { type: "geojson", data: gigGeoRef.current as GeoJSON.GeoJSON, cluster: true, clusterRadius: 46, clusterMaxZoom: 12, clusterProperties: { tonight: ["max", ["get", "tonight"]] } });
    if (!map.getSource("vens")) map.addSource("vens", { type: "geojson", data: venGeoRef.current as GeoJSON.GeoJSON, cluster: true, clusterRadius: 40, clusterMaxZoom: 11, clusterProperties: { live: ["max", ["get", "live"]] } });
    ALL_LAYERS.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
    const s = tokenSkin();
    registerDiamonds(map, s.colors);
    [...buildGigLayers(s), ...buildVenueLayers(s, modeRef.current === "venues")].forEach((spec) => map.addLayer(spec as unknown as maplibregl.AddLayerObject));
    applyMode(map);
  }
  function applyMode(map: maplibregl.Map) {
    const gv = modeRef.current === "events";
    GIG_LAYERS.forEach((id) => { if (map.getLayer(id)) { let vis = gv ? "visible" : "none"; if (id === "g-heat") vis = "none"; map.setLayoutProperty(id, "visibility", vis); } });
    VEN_LAYERS.forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", gv ? "none" : "visible"); });
  }
  function wireInteractions(map: maplibregl.Map) {
    const clExp = (src: string) => (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]; if (!f) return;
      (map.getSource(src) as maplibregl.GeoJSONSource).getClusterExpansionZoom((f.properties as { cluster_id: number }).cluster_id).then((z) => map.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom: Math.min(z + 0.2, 15), duration: 600 })).catch(() => {});
    };
    map.on("click", "g-cl-core", clExp("gigs")); map.on("click", "v-cl-core", clExp("vens"));
    const gigClick = (e: maplibregl.MapLayerMouseEvent) => { const f = e.features?.[0]; if (f && !f.properties?.point_count) { const g = gigByIdRef.current[(f.properties as { id: string }).id]; if (g) setSelected(g); } };
    map.on("click", "g-hit", gigClick); map.on("click", "g-core", gigClick);
    const venClick = (e: maplibregl.MapLayerMouseEvent) => { const f = e.features?.[0]; if (f && !f.properties?.point_count) { const v = venueByIdRef.current[(f.properties as { id: string }).id]; if (v) { map.easeTo({ center: [v.location.lng, v.location.lat], duration: 500, offset: [0, -120] }); setSelectedVenue(v); } } };
    map.on("click", "v-hit", venClick); map.on("click", "v-core", venClick);
    ["g-cl-core", "v-cl-core", "g-hit", "g-core", "v-hit", "v-core"].forEach((id) => { map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer")); map.on("mouseleave", id, () => (map.getCanvas().style.cursor = "")); });
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const map = new maplibregl.Map({ container: el, style: basemapFor(appSkin), center: [-2.1, 53.4], zoom: 6.2, pitch: 0, minZoom: 4, maxZoom: 18, attributionControl: { compact: true } });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    // @ts-expect-error showUserHeading exists in maplibre-gl API but missing from types
    const geolocate = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true, fitBoundsOptions: { maxZoom: 12 } });
    geolocateRef.current = geolocate;
    map.addControl(geolocate, "bottom-right");
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    requestAnimationFrame(() => map.resize());
    const startPulse = (m: maplibregl.Map) => {
      const frame = (t: number) => {
        if (m.getLayer("g-ping") && (m.getLayoutProperty("g-ping", "visibility") ?? "visible") !== "none") {
          const p = (t % 1600) / 1600;
          m.setPaintProperty("g-ping", "circle-radius", 10 + p * 22);
          m.setPaintProperty("g-ping", "circle-stroke-opacity", 0.85 * (1 - p));
        }
        rafRef.current = requestAnimationFrame(frame);
      };
      rafRef.current = requestAnimationFrame(frame);
    };
    map.on("load", () => {
      readyRef.current = true;
      map.resize();
      ensureSourcesAndLayers(map);
      wireInteractions(map);
      startPulse(map);
      setTimeout(() => { try { geolocate.trigger(); } catch { /* ignore */ } }, 600);
    });
    map.on("error", (e) => { console.error("[bndy-map] maplibre error:", e?.error?.message || e); });
    return () => { ro.disconnect(); cancelAnimationFrame(rafRef.current); map.remove(); mapRef.current = null; readyRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapRef.current; if (!m || !readyRef.current) return;
    // self-heal: if a style swap dropped the sources, rebuild instead of no-op
    if (!m.getSource("gigs") || !m.getSource("vens")) { if (m.isStyleLoaded()) ensureSourcesAndLayers(m); return; }
    (m.getSource("gigs") as maplibregl.GeoJSONSource).setData(gigGeo as GeoJSON.GeoJSON);
    (m.getSource("vens") as maplibregl.GeoJSONSource).setData(venGeo as GeoJSON.GeoJSON);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigGeo, venGeo]);
  useEffect(() => { const m = mapRef.current; if (m && readyRef.current) applyMode(m); }, [mode]);
  useEffect(() => {
    const m = mapRef.current; if (!m || !readyRef.current) return;
    // setStyle wipes sources/layers/images. styledata can fire BEFORE the new
    // style is fully loaded (and then never again), so poll until it is.
    let cancelled = false;
    const rebuild = () => {
      if (cancelled) return;
      if (m.isStyleLoaded()) ensureSourcesAndLayers(m);
      else window.setTimeout(rebuild, 80);
    };
    m.setStyle(basemapFor(appSkin));
    m.once("styledata", rebuild);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSkin]);

  return (
    <div className="relative -mt-6 h-[100dvh] w-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />

      <div className="absolute left-3 top-8 z-20 flex items-center gap-2 pt-[env(safe-area-inset-top,0px)] lg:left-4 lg:top-9">
        <div className="flex rounded-2xl border border-line glass p-1">
          {(["events", "venues"] as Mode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={cn("rounded-xl px-3.5 py-2 text-[12.5px] font-extrabold capitalize", mode === m ? "bg-white/10 text-txt" : "text-dim")}>{m === "events" ? "Gigs" : "Venues"}</button>
          ))}
        </div>
        {mode === "events" && (
          <div className="flex items-center gap-1.5 rounded-2xl border border-line glass px-3 py-2.5 text-[13px] font-black">
            <span className="h-2 w-2 rounded-full bg-acc shadow-[0_0_8px_var(--acc)]" />{shownCount}
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-dim">{sel.kind === "today" ? "tonight" : "gigs"}</span>
          </div>
        )}
      </div>

      {mode === "events" && (
        <div className="absolute left-3 top-[calc(env(safe-area-inset-top,0px)+82px)] z-20 lg:left-4 lg:top-[96px]">
          <MapDateControl sel={sel} onChange={setSel} gigs={gigs} today={today} />
        </div>
      )}

      <div className="absolute bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-3 z-20 flex items-center gap-2 lg:bottom-4 lg:left-4">
        <button onClick={toggle} aria-label="Toggle light/dark" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line glass text-txt">
          {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
        </button>
      </div>

      <GigSheet gig={selected} distance={selected ? distanceMiles(location, selected.location) : undefined} onClose={() => setSelected(null)} />
      <VenueSheet venue={selectedVenue} gigs={venueGigs} live={!!selectedVenue && venueIdsLive.has(selectedVenue.id)} onClose={() => setSelectedVenue(null)} onGigClick={(g) => { setSelectedVenue(null); setSelected(g); }} />
    </div>
  );
}
