"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import maplibregl from "maplibre-gl";
import { Heart, Loader2, Mic, MicOff, Search, X } from "lucide-react";
import type { FeatureCollection, Point } from "geojson";
import { useUpcomingGigs, useVenues, useGigsInView } from "@/lib/hooks";
import { fetchEventsBatch, type BBox } from "@/lib/api";
import { useGeolocation } from "@/lib/useGeolocation";
import { useTheme } from "@/lib/theme";
import { distanceMiles } from "@/domain/geo";
import { todayISO, addDaysISO } from "@/domain/dates";
import { type MapDateSel, matchesMapDate } from "@/domain/mapdate";
import { GigSheet } from "@/features/gigs/GigSheet";
import { VenueSheet } from "@/features/venues/VenueSheet";
import { MapDateControl } from "./MapDateControl";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFavourites } from "@/lib/favourites";
import { useOpenMicPref } from "@/lib/openMicPref";
import type { Gig, Venue } from "@/domain/types";
import { basemapFor, registerDiamonds, registerMic, registerPills, tokenSkin } from "./skinMap";
import { ALL_LAYERS, GIG_LAYERS, VEN_LAYERS, buildGigLayers, buildVenueLayers } from "./layers";

type Mode = "events" | "venues";

export function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
  const readyRef = useRef(false);
  const rafRef = useRef(0);
  const prevBasemapRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const epochRef = useRef(0); // incremented on each skin change to kill stale closures
  const { appSkin } = useTheme();
  const { location } = useGeolocation();

  const today = todayISO();
  // geo endpoint caps windows at 400 days; the map only browses 14 days ahead — keep this window small
  const geoEndDate = addDaysISO(today, 30);

  // Bbox state for geo-based fetching (flag on)
  const [bbox, setBbox] = useState<BBox | null>(null);
  const updateBbox = useCallback((m: maplibregl.Map) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const b = m.getBounds();
      setBbox({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() });
    }, 300);
  }, []);

  // Data fetching: geo endpoint for map pins, full gigs for venue sheet
  const { data: gigs = [] } = useUpcomingGigs();
  const { data: geoData } = useGigsInView(bbox, today, geoEndDate);
  const lightEvents = useMemo(() => geoData?.events ?? [], [geoData]);

  const { data: venues = [] } = useVenues();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("events");
  // A5 fix: Sync mode from URL param bidirectionally (was only setting venues, not resetting to events)
  useEffect(() => {
    const m = searchParams.get("mode");
    setMode(m === "venues" ? "venues" : "events");
  }, [searchParams]);
  const [sel, setSel] = useState<MapDateSel>({ kind: "today" });
  // Favourites filter (backlog feature 3): pins narrow to favourite artists + venues.
  const { isAuthenticated } = useAuth();
  const { artistSet: favArtists, venueSet: favVenues } = useFavourites();
  const [favOnly, setFavOnly] = useState(false);
  const favActive = favOnly && isAuthenticated;
  // Open mics (item 13): shown by default, mic button hides them, remembered per device.
  const { showOpenMics, toggleOpenMics } = useOpenMicPref();
  const [selected, setSelected] = useState<Gig | null>(null);
  const [selectedStack, setSelectedStack] = useState<Gig[] | null>(null); // same-venue gigs in the active filter (carousel when >1)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loadingGig, setLoadingGig] = useState(false);
  // C3 fix: the tap-to-open state was tracked but never shown.
  const [gigError, setGigError] = useState(false);
  const gigRequestId = useRef(0); // A4 fix: track latest request to ignore stale responses
  const [searchQuery, setSearchQuery] = useState("");
  const modeRef = useRef(mode); modeRef.current = mode;
  // When flag off: use full gigs. When flag on: gigById only used for venue sheet fallback.
  const gigById = useMemo(() => { const m: Record<string, Gig> = {}; gigs.forEach((g) => (m[g.id] = g)); return m; }, [gigs]);
  const gigByIdRef = useRef(gigById); gigByIdRef.current = gigById;
  const venueById = useMemo(() => { const m: Record<string, Venue> = {}; venues.forEach((v) => (m[v.id] = v)); return m; }, [venues]);
  const venueByIdRef = useRef(venueById); venueByIdRef.current = venueById;
  // venueIdsLive needs full gigs for venue mode (geo endpoint is for gig pins only)
  const venueIdsLive = useMemo(() => new Set(gigs.map((g) => g.venueId)), [gigs]);
  // Search: build indices from full data for name lookups
  const gigSearchIndex = useMemo(() => {
    const index: Record<string, { artistName?: string; venueName?: string; lat: number; lng: number }> = {};
    for (const g of gigs) {
      index[g.id] = { artistName: g.artistName, venueName: g.venueName, lat: g.location.lat, lng: g.location.lng };
    }
    return index;
  }, [gigs]);
  const venueSearchIndex = useMemo(() => {
    const index: Record<string, { name: string; lat: number; lng: number }> = {};
    for (const v of venues) {
      index[v.id] = { name: v.name, lat: v.location.lat, lng: v.location.lng };
    }
    return index;
  }, [venues]);

  // Filter logic for search
  const sq = searchQuery.trim().toLowerCase();
  const matchingEventIds = useMemo(() => {
    if (!sq) return null; // null = no filter
    const ids = new Set<string>();
    for (const e of lightEvents) {
      const info = gigSearchIndex[e.id];
      if (info && ((info.artistName?.toLowerCase().includes(sq)) || (info.venueName?.toLowerCase().includes(sq)))) {
        ids.add(e.id);
      }
    }
    return ids;
  }, [sq, lightEvents, gigSearchIndex]);
  const matchingVenueIds = useMemo(() => {
    if (!sq) return null;
    const ids = new Set<string>();
    for (const v of venues) {
      if (v.name.toLowerCase().includes(sq)) ids.add(v.id);
    }
    return ids;
  }, [sq, venues]);

  // Feature 7: cancelled gigs leave the map. Join fallback for geo events
  // whose GSI projection lacks the flag — same pattern as tikById.
  const cancById = useMemo(() => {
    const m = new Set<string>();
    for (const g of gigs) if (g.cancelled) m.add(g.id);
    return m;
  }, [gigs]);

  // Item 13: the geo shape carries no open-mic flag — join the full gigs cache,
  // same fallback pattern as tikById/cancById.
  const micById = useMemo(() => {
    const m = new Set<string>();
    for (const g of gigs) if (g.isOpenMic) m.add(g.id);
    return m;
  }, [gigs]);

  // shownCount: count lightEvents in viewport matching date filter AND search
  const shownCount = useMemo(() => {
    let filtered = lightEvents.filter((e) => matchesMapDate(e.date, sel, today));
    if (matchingEventIds) filtered = filtered.filter((e) => matchingEventIds.has(e.id));
    if (favActive) filtered = filtered.filter((e) => (e.artistId && favArtists.has(e.artistId)) || favVenues.has(e.venueId));
    filtered = filtered.filter((e) => !(e.cancelled ?? cancById.has(e.id)));
    if (!showOpenMics) filtered = filtered.filter((e) => !micById.has(e.id));
    return filtered.length;
  }, [lightEvents, sel, today, matchingEventIds, favActive, favArtists, favVenues, cancById, showOpenMics, micById]);

  const venueGigs = useMemo(() => {
    if (!selectedVenue) return [];
    return gigs.filter((g) => g.venueId === selectedVenue.id).sort((a, b) => `${a.date}${a.startTime ?? ""}`.localeCompare(`${b.date}${b.startTime ?? ""}`));
  }, [selectedVenue, gigs]);

  // ticketed lookup: fallback join for geo-endpoint events until the GSI projects `ticketed`
  // (TASK 7) — remove with the whole-window path when it retires.
  const tikById = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const g of gigs) if (g.ticketed) m.set(g.id, true);
    return m;
  }, [gigs]);

  // gigGeo: build from lightEvents (geo endpoint), filtered by date and search
  const gigGeo = useMemo<FeatureCollection<Point>>(() => {
    let filtered = lightEvents.filter((e) => matchesMapDate(e.date, sel, today));
    if (matchingEventIds) filtered = filtered.filter((e) => matchingEventIds.has(e.id));
    if (favActive) filtered = filtered.filter((e) => (e.artistId && favArtists.has(e.artistId)) || favVenues.has(e.venueId));
    filtered = filtered.filter((e) => !(e.cancelled ?? cancById.has(e.id)));
    if (!showOpenMics) filtered = filtered.filter((e) => !micById.has(e.id));
    return {
      type: "FeatureCollection",
      features: filtered.map((e) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [e.geoLng, e.geoLat] },
        properties: { id: e.id, tonight: e.date === today ? 1 : 0, ticketed: (e.ticketed ?? tikById.get(e.id)) ? 1 : 0, openmic: micById.has(e.id) ? 1 : 0 },
      })),
    };
  }, [lightEvents, sel, today, matchingEventIds, tikById, favActive, favArtists, favVenues, cancById, showOpenMics, micById]);
  // Same-venue stack: gig pins at one venue overlap at identical coordinates, so a tap on
  // "a pin" must surface ALL that venue's gigs within the active date filter + search —
  // otherwise only the top-of-stack feature is reachable. Ref pattern (like gigByIdRef)
  // because the click handler lives in a closure created once per style build.
  const stackForRef = useRef<(id: string) => string[]>(() => []);
  stackForRef.current = (id: string) => {
    let filtered = lightEvents.filter((e) => matchesMapDate(e.date, sel, today));
    if (matchingEventIds) filtered = filtered.filter((e) => matchingEventIds.has(e.id));
    if (favActive) filtered = filtered.filter((e) => (e.artistId && favArtists.has(e.artistId)) || favVenues.has(e.venueId));
    filtered = filtered.filter((e) => !(e.cancelled ?? cancById.has(e.id)));
    if (!showOpenMics) filtered = filtered.filter((e) => !micById.has(e.id));
    const me = filtered.find((e) => e.id === id);
    if (!me || !me.venueId) return [id];
    return filtered
      .filter((e) => e.venueId === me.venueId)
      .sort((a, b) => `${a.date}${a.startTime ?? ""}`.localeCompare(`${b.date}${b.startTime ?? ""}`))
      .map((e) => e.id);
  };

  const venGeo = useMemo<FeatureCollection<Point>>(() => {
    let filtered = venues;
    if (matchingVenueIds) filtered = venues.filter((v) => matchingVenueIds.has(v.id));
    if (favActive) filtered = filtered.filter((v) => favVenues.has(v.id));
    return {
      type: "FeatureCollection",
      features: filtered.map((v) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [v.location.lng, v.location.lat] },
        properties: { id: v.id, name: v.name, live: venueIdsLive.has(v.id) ? 1 : 0 },
      })),
    };
  }, [venues, venueIdsLive, matchingVenueIds, favActive, favVenues]);
  const gigGeoRef = useRef(gigGeo); gigGeoRef.current = gigGeo;
  const venGeoRef = useRef(venGeo); venGeoRef.current = venGeo;

  function ensureSourcesAndLayers(map: maplibregl.Map, epoch?: number) {
    try {
      if (!map.getSource("gigs")) map.addSource("gigs", { type: "geojson", data: gigGeoRef.current as GeoJSON.GeoJSON, cluster: true, clusterRadius: 46, clusterMaxZoom: 12, clusterProperties: { tonight: ["max", ["get", "tonight"]] } });
      if (!map.getSource("vens")) map.addSource("vens", { type: "geojson", data: venGeoRef.current as GeoJSON.GeoJSON, cluster: true, clusterRadius: 40, clusterMaxZoom: 11, clusterProperties: { live: ["max", ["get", "live"]] } });
      ALL_LAYERS.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
      const s = tokenSkin();
      registerDiamonds(map, s.colors);
      registerPills(map, s.colors);
      registerMic(map, s.colors);
      [...buildGigLayers(s), ...buildVenueLayers(s, modeRef.current === "venues")].forEach((spec) => map.addLayer(spec as unknown as maplibregl.AddLayerObject));
      applyMode(map);
    } catch (err) {
      console.warn("[bndy-map] ensureSourcesAndLayers failed, will retry on idle:", err);
      const capturedEpoch = epoch ?? epochRef.current;
      map.once("idle", () => { if (epochRef.current === capturedEpoch) ensureSourcesAndLayers(map, capturedEpoch); });
    }
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
    const gigClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.point_count) return;
      const id = (f.properties as { id: string }).id;
      // Whole same-venue stack (soonest first) via batch endpoint — order is preserved server-side
      const ids = stackForRef.current(id);
      // A4 fix: use request ID to ignore stale responses from race conditions
      const thisRequest = ++gigRequestId.current;
      setLoadingGig(true);
      fetchEventsBatch(ids.length ? ids : [id])
        .then((gigs) => {
          if (thisRequest !== gigRequestId.current) return; // stale response, ignore
          if (!gigs.length) return;
          setSelectedStack(gigs.length > 1 ? gigs : null);
          setSelected(gigs[0]);
        })
        .catch(() => {
          // C3 fix: a failed tap used to show the user nothing at all, so the
          // pin looked dead. Say so, and clear the message by itself.
          if (thisRequest !== gigRequestId.current) return;
          setGigError(true);
          window.setTimeout(() => setGigError(false), 4000);
        })
        .finally(() => {
          if (thisRequest === gigRequestId.current) setLoadingGig(false);
        });
    };
    map.on("click", "g-hit", gigClick); map.on("click", "g-core", gigClick);
    const venClick = (e: maplibregl.MapLayerMouseEvent) => { const f = e.features?.[0]; if (f && !f.properties?.point_count) { const v = venueByIdRef.current[(f.properties as { id: string }).id]; if (v) { map.easeTo({ center: [v.location.lng, v.location.lat], duration: 500, offset: [0, -120] }); setSelectedVenue(v); } } };
    map.on("click", "v-hit", venClick); map.on("click", "v-core", venClick); map.on("click", "v-label", venClick);
    ["g-cl-core", "v-cl-core", "g-hit", "g-core", "v-hit", "v-core", "v-label"].forEach((id) => { map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer")); map.on("mouseleave", id, () => (map.getCanvas().style.cursor = "")); });
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const initialBasemap = basemapFor(appSkin);
    prevBasemapRef.current = initialBasemap;
    const map = new maplibregl.Map({ container: el, style: initialBasemap, center: [-2.1, 53.4], zoom: 6.2, pitch: 0, minZoom: 4, maxZoom: 18, attributionControl: { compact: true } });
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
      let last = 0;
      const frame = (t: number) => {
        if (document.hidden || t - last < 33) { rafRef.current = requestAnimationFrame(frame); return; }
        last = t;
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
      // Track viewport bbox for geo-based fetching
      updateBbox(map);
      map.on("moveend", () => updateBbox(map));
      // Safety net: if any race eats the layers, this restores them within a frame (idempotent)
      map.on("idle", () => {
        if (map.isStyleLoaded() && (!map.getSource("gigs") || !map.getLayer("g-core"))) {
          ensureSourcesAndLayers(map);
        }
      });
      setTimeout(() => { try { geolocate.trigger(); } catch { /* ignore */ } }, 600);
    });
    map.on("error", (e) => { console.error("[bndy-map] maplibre error:", e?.error?.message || e); });
    return () => { ro.disconnect(); cancelAnimationFrame(rafRef.current); if (debounceRef.current) clearTimeout(debounceRef.current); map.remove(); mapRef.current = null; readyRef.current = false; };
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

  // Fly to single match when search yields exactly one result
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !readyRef.current || !sq) return;
    if (mode === "events" && matchingEventIds?.size === 1) {
      const id = [...matchingEventIds][0];
      const info = gigSearchIndex[id];
      if (info) m.flyTo({ center: [info.lng, info.lat], zoom: 14, duration: 800 });
    } else if (mode === "venues" && matchingVenueIds?.size === 1) {
      const id = [...matchingVenueIds][0];
      const info = venueSearchIndex[id];
      if (info) m.flyTo({ center: [info.lng, info.lat], zoom: 14, duration: 800 });
    }
  }, [sq, mode, matchingEventIds, matchingVenueIds, gigSearchIndex, venueSearchIndex]);
  useEffect(() => {
    const m = mapRef.current; if (!m || !readyRef.current) return;
    // Increment epoch to invalidate stale closures from rapid skin cycling
    epochRef.current += 1;
    const epoch = epochRef.current;
    const newUrl = basemapFor(appSkin);
    // If basemap URL unchanged (skins sharing a basemap), skip setStyle entirely
    // and just rebuild layers with new CSS tokens. This avoids the race where
    // styledata fires synchronously before m.once() attaches.
    if (newUrl === prevBasemapRef.current) {
      const poll = () => {
        if (epochRef.current !== epoch) return; // stale closure
        if (m.isStyleLoaded()) ensureSourcesAndLayers(m, epoch);
        else window.setTimeout(poll, 80);
      };
      poll();
      return;
    }
    // Basemap changed: setStyle wipes sources/layers/images. Attach listener
    // BEFORE calling setStyle to avoid missing a synchronous styledata event.
    prevBasemapRef.current = newUrl;
    let cancelled = false;
    const rebuild = () => {
      if (cancelled || epochRef.current !== epoch) return; // stale closure
      if (m.isStyleLoaded()) ensureSourcesAndLayers(m, epoch);
      else window.setTimeout(rebuild, 80);
    };
    m.once("styledata", rebuild);
    m.setStyle(newUrl);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSkin]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden" style={{ marginTop: `calc(-1.5rem - env(safe-area-inset-top, 0px))` }}>
      <div ref={containerRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />

      <div className="absolute left-3 right-3 top-8 z-20 flex items-center gap-2 pt-[env(safe-area-inset-top,0px)] lg:left-4 lg:right-auto lg:top-9">
        <div className="flex rounded-2xl border border-line glass p-1">
          {(["events", "venues"] as Mode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setSearchQuery(""); }} className={cn("rounded-xl px-3.5 py-2 text-[12.5px] font-extrabold capitalize", mode === m ? "bg-white/10 text-txt" : "text-dim")}>{m === "events" ? "Gigs" : "Venues"}</button>
          ))}
        </div>
        <div className="relative flex-1 lg:w-52 lg:flex-none">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={mode === "events" ? "Artist or venue…" : "Venue name…"}
            className="w-full rounded-2xl border border-line glass py-2.5 pl-9 pr-8 text-[13px] font-semibold outline-none placeholder:text-dim focus:border-acc/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-dim hover:text-txt">
              <X size={14} />
            </button>
          )}
        </div>
        {isAuthenticated && (
          <button
            onClick={() => setFavOnly((v) => !v)}
            aria-pressed={favOnly}
            aria-label="Show favourites only"
            style={favOnly ? { borderColor: "color-mix(in srgb, var(--acc) 60%, transparent)", background: "color-mix(in srgb, var(--acc) 22%, var(--glass))" } : undefined}
            className={cn("flex shrink-0 items-center justify-center rounded-2xl border border-line glass p-2.5 transition-colors", favOnly ? "text-[var(--acc)]" : "text-dim")}
          >
            <Heart size={16} fill={favOnly ? "currentColor" : "none"} strokeWidth={2.5} />
          </button>
        )}
        {mode === "events" && (
          <button
            onClick={toggleOpenMics}
            aria-pressed={showOpenMics}
            aria-label={showOpenMics ? "Hide open mics" : "Show open mics"}
            title={showOpenMics ? "Open mics shown. Tap to hide them." : "Open mics hidden. Tap to show them."}
            style={showOpenMics ? { borderColor: "color-mix(in srgb, var(--acc2) 60%, transparent)", background: "color-mix(in srgb, var(--acc2) 22%, var(--glass))" } : undefined}
            className={cn("flex shrink-0 items-center justify-center rounded-2xl border border-line glass p-2.5 transition-colors", showOpenMics ? "text-[var(--acc2)]" : "text-dim")}
          >
            {showOpenMics ? <Mic size={16} strokeWidth={2.5} /> : <MicOff size={16} strokeWidth={2.5} />}
          </button>
        )}
        {mode === "events" && (
          <div className="hidden items-center gap-1.5 rounded-2xl border border-line glass px-3 py-2.5 text-[13px] font-black lg:flex">
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

      {/* C3 fix: tell the user what the tap did. Nothing was shown before. */}
      {(loadingGig || gigError) && (
        <div
          role="status"
          className="pointer-events-none absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-line glass-hi px-4 py-2.5 text-[13px] font-extrabold shadow-lg"
        >
          {gigError ? (
            <span className="text-red-400">Could not open that gig. Tap it again.</span>
          ) : (
            <>
              <Loader2 size={15} className="animate-spin text-[var(--acc)]" />
              <span className="text-dim">Opening…</span>
            </>
          )}
        </div>
      )}


      <GigSheet
        gig={selected}
        stack={selectedStack}
        distance={selected ? distanceMiles(location, selected.location) : undefined}
        distanceOf={(g) => distanceMiles(location, g.location)}
        onClose={() => { setSelected(null); setSelectedStack(null); }}
      />
      <VenueSheet venue={selectedVenue} gigs={venueGigs} live={!!selectedVenue && venueIdsLive.has(selectedVenue.id)} onClose={() => setSelectedVenue(null)} onGigClick={(g) => { setSelectedVenue(null); setSelected(g); }} />
    </div>
  );
}
