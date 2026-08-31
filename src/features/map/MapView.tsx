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
  const startupTimerRef = useRef<number | null>(null);
  const prevBasemapRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const epochRef = useRef(0);
  const { appSkin } = useTheme();
  const { location } = useGeolocation();

  const today = todayISO();
  const geoEndDate = addDaysISO(today, 30);

  const [bbox, setBbox] = useState<BBox | null>(null);
  const updateBbox = useCallback((m: maplibregl.Map) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const b = m.getBounds();
      setBbox({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() });
    }, 300);
  }, []);

  const { data: gigs = [] } = useUpcomingGigs();
  const { data: geoData } = useGigsInView(bbox, today, geoEndDate);
  const lightEvents = useMemo(() => geoData?.events ?? [], [geoData]);

  const { data: venues = [] } = useVenues();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("events");
  useEffect(() => {
    const m = searchParams.get("mode");
    setMode(m === "venues" ? "venues" : "events");
  }, [searchParams]);
  const chooseMode = (next: Mode) => {
    setMode(next);
    setSearchQuery("");
    // Keep shell/nav state shareable without router navigation remounting MapLibre.
    const url = next === "venues" ? "/map?mode=venues" : "/map";
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState(window.history.state, "", url);
    }
  };

  const [sel, setSel] = useState<MapDateSel>({ kind: "today" });
  const { isAuthenticated } = useAuth();
  const { artistSet: favArtists, venueSet: favVenues } = useFavourites();
  const [favOnly, setFavOnly] = useState(false);
  const favActive = favOnly && isAuthenticated;
  const { showOpenMics, toggleOpenMics } = useOpenMicPref();
  const [selected, setSelected] = useState<Gig | null>(null);
  const [selectedStack, setSelectedStack] = useState<Gig[] | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loadingGig, setLoadingGig] = useState(false);
  const [gigError, setGigError] = useState(false);
  const gigRequestId = useRef(0);
  const [searchQuery, setSearchQuery] = useState("");
  const modeRef = useRef(mode); modeRef.current = mode;
  const gigById = useMemo(() => { const m: Record<string, Gig> = {}; gigs.forEach((g) => (m[g.id] = g)); return m; }, [gigs]);
  const gigByIdRef = useRef(gigById); gigByIdRef.current = gigById;
  const venueById = useMemo(() => { const m: Record<string, Venue> = {}; venues.forEach((v) => (m[v.id] = v)); return m; }, [venues]);
  const venueByIdRef = useRef(venueById); venueByIdRef.current = venueById;
  const venueIdsLive = useMemo(() => new Set(gigs.map((g) => g.venueId)), [gigs]);
  const gigSearchIndex = useMemo(() => {
    const index: Record<string, { artistName?: string; venueName?: string; lat: number; lng: number }> = {};
    for (const g of gigs) index[g.id] = { artistName: g.artistName, venueName: g.venueName, lat: g.location.lat, lng: g.location.lng };
    return index;
  }, [gigs]);
  const venueSearchIndex = useMemo(() => {
    const index: Record<string, { name: string; lat: number; lng: number }> = {};
    for (const v of venues) index[v.id] = { name: v.name, lat: v.location.lat, lng: v.location.lng };
    return index;
  }, [venues]);

  const sq = searchQuery.trim().toLowerCase();
  const matchingEventIds = useMemo(() => {
    if (!sq) return null;
    const ids = new Set<string>();
    for (const e of lightEvents) {
      const info = gigSearchIndex[e.id];
      if (info && ((info.artistName?.toLowerCase().includes(sq)) || (info.venueName?.toLowerCase().includes(sq)))) ids.add(e.id);
    }
    return ids;
  }, [sq, lightEvents, gigSearchIndex]);
  const matchingVenueIds = useMemo(() => {
    if (!sq) return null;
    const ids = new Set<string>();
    for (const v of venues) if (v.name.toLowerCase().includes(sq)) ids.add(v.id);
    return ids;
  }, [sq, venues]);

  const cancById = useMemo(() => {
    const m = new Set<string>();
    for (const g of gigs) if (g.cancelled) m.add(g.id);
    return m;
  }, [gigs]);

  const micById = useMemo(() => {
    const m = new Set<string>();
    for (const g of gigs) if (g.isOpenMic) m.add(g.id);
    return m;
  }, [gigs]);

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

  const tikById = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const g of gigs) if (g.ticketed) m.set(g.id, true);
    return m;
  }, [gigs]);

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
    map.on("click", "g-cl", clExp("gigs")); map.on("click", "v-cl", clExp("vens"));
    const gigClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.point_count) return;
      const id = (f.properties as { id: string }).id;
      const ids = stackForRef.current(id);
      const wanted = ids.length ? ids : [id];
      const thisRequest = ++gigRequestId.current;
      setGigError(false);

      const cached = wanted.map((x) => gigByIdRef.current[x]).filter((g): g is Gig => !!g);
      const cachedChoice = cached.find((g) => g.id === id) ?? cached[0];
      if (cachedChoice) {
        setSelectedStack(cached.length > 1 ? cached : null);
        setSelected(cachedChoice);
      }

      const missing = wanted.filter((x) => !gigByIdRef.current[x]);
      if (!missing.length) {
        setLoadingGig(false);
        return;
      }

      setLoadingGig(!cachedChoice);
      fetchEventsBatch(missing)
        .then((fetched) => {
          if (thisRequest !== gigRequestId.current) return;
          for (const g of fetched) gigByIdRef.current[g.id] = g;
          const stack = wanted.map((x) => gigByIdRef.current[x]).filter((g): g is Gig => !!g);
          const chosen = stack.find((g) => g.id === id) ?? stack[0];
          if (!chosen) {
            setGigError(true);
            return;
          }
          setSelectedStack(stack.length > 1 ? stack : null);
          setSelected(chosen);
        })
        .catch(() => {
          if (thisRequest !== gigRequestId.current || cachedChoice) return;
          setGigError(true);
          window.setTimeout(() => setGigError(false), 4000);
        })
        .finally(() => {
          if (thisRequest === gigRequestId.current) setLoadingGig(false);
        });
    };
    map.on("click", "g-pin", gigClick); map.on("click", "g-count", gigClick);
    const venClick = (e: maplibregl.MapLayerMouseEvent) => { const f = e.features?.[0]; if (f && !f.properties?.point_count) { const v = venueByIdRef.current[(f.properties as { id: string }).id]; if (v) { map.easeTo({ center: [v.location.lng, v.location.lat], duration: 500, offset: [0, -120] }); setSelectedVenue(v); } } };
    map.on("click", "v-hit", venClick); map.on("click", "v-pin", venClick); map.on("click", "v-label", venClick);
    ["g-cl", "v-cl", "g-pin", "g-count", "v-hit", "v-pin", "v-label"].forEach((id) => { map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer")); map.on("mouseleave", id, () => (map.getCanvas().style.cursor = "")); });
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const initialBasemap = basemapFor(appSkin);
    prevBasemapRef.current = initialBasemap;
    const map = new maplibregl.Map({ container: el, style: initialBasemap, center: [-2.1, 53.4], zoom: 6.2, pitch: 0, minZoom: 4, maxZoom: 18, attributionControl: false });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    // @ts-expect-error showUserHeading exists at runtime but is missing from this MapLibre type surface.
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
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) startPulse(map);
      updateBbox(map);
      map.on("moveend", () => updateBbox(map));
      map.on("idle", () => {
        if (map.isStyleLoaded() && (!map.getSource("gigs") || !map.getLayer("g-count"))) ensureSourcesAndLayers(map);
      });
      startupTimerRef.current = window.setTimeout(() => { try { geolocate.trigger(); } catch { /* ignore */ } }, 600);
    });
    map.on("error", (e) => { console.error("[bndy-map] maplibre error:", e?.error?.message || e); });
    return () => {
      epochRef.current += 1;
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (startupTimerRef.current !== null) window.clearTimeout(startupTimerRef.current);
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapRef.current; if (!m || !readyRef.current) return;
    if (!m.getSource("gigs") || !m.getSource("vens")) { if (m.isStyleLoaded()) ensureSourcesAndLayers(m); return; }
    (m.getSource("gigs") as maplibregl.GeoJSONSource).setData(gigGeo as GeoJSON.GeoJSON);
    (m.getSource("vens") as maplibregl.GeoJSONSource).setData(venGeo as GeoJSON.GeoJSON);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigGeo, venGeo]);
  useEffect(() => { const m = mapRef.current; if (m && readyRef.current) applyMode(m); }, [mode]);

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
    epochRef.current += 1;
    const epoch = epochRef.current;
    const newUrl = basemapFor(appSkin);
    let cancelled = false;
    const rebuild = () => {
      if (cancelled || epochRef.current !== epoch) return;
      if (m.isStyleLoaded()) ensureSourcesAndLayers(m, epoch);
      else window.setTimeout(rebuild, 80);
    };
    if (newUrl === prevBasemapRef.current) {
      rebuild();
      return () => { cancelled = true; };
    }
    prevBasemapRef.current = newUrl;
    m.once("styledata", rebuild);
    m.setStyle(newUrl);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSkin]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden" style={{ marginTop: `calc(-1.5rem - env(safe-area-inset-top, 0px))` }}>
      <div ref={containerRef} role="region" aria-label="Live music map" className="absolute inset-0" style={{ width: "100%", height: "100%" }} />

      <div className="absolute left-3 right-3 top-8 z-20 flex items-center gap-2 pt-[env(safe-area-inset-top,0px)] lg:left-4 lg:right-auto lg:top-9">
        <div className="flex rounded-2xl border border-line glass p-1">
          {(["events", "venues"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => chooseMode(m)}
              className={cn(
                "rounded-xl px-3.5 py-2 text-[12.5px] font-extrabold capitalize transition-[background-color,color,box-shadow,transform] active:scale-[.98]",
                mode === m ? "bg-acc text-on-acc shadow-sm" : "text-dim hover:text-txt",
              )}
            >
              {m === "events" ? "Gigs" : "Venues"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 lg:w-52 lg:flex-none">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            enterKeyHint="search"
            aria-label={mode === "events" ? "Search map by artist or venue" : "Search map by venue"}
            placeholder={mode === "events" ? "Artist or venue…" : "Venue name…"}
            className="w-full rounded-2xl border border-line glass py-2.5 pl-9 pr-8 text-[13px] font-semibold outline-none placeholder:text-dim focus:border-acc/50"
          />
          {searchQuery && (
            <button type="button" aria-label="Clear map search" onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-dim hover:text-txt active:scale-90">
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
            className={cn("flex shrink-0 items-center justify-center rounded-2xl border border-line glass p-2.5 transition-[color,background-color,transform] active:scale-95", favOnly ? "text-[var(--acc)]" : "text-dim")}
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
            className={cn("flex shrink-0 items-center justify-center rounded-2xl border border-line glass p-2.5 transition-[color,background-color,transform] active:scale-95", showOpenMics ? "text-[var(--acc2)]" : "text-dim")}
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

      {(loadingGig || gigError) && (
        <div role="status" className="pointer-events-none absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-line glass-hi px-4 py-2.5 text-[13px] font-extrabold shadow-lg">
          {gigError ? (
            <span className="text-red-700 dark:text-red-300">Could not open that gig. Tap it again.</span>
          ) : (
            <><Loader2 size={15} className="animate-spin text-[var(--acc)]" /><span className="text-dim">Opening…</span></>
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
