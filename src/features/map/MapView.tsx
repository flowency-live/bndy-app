"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const epochRef = useRef(0);
  const { appSkin } = useTheme();
  const { location } = useGeolocation();
  const router = useRouter();

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
  const changeMode = (next: Mode) => {
    setMode(next);
    setSearchQuery("");
    router.replace(next === "venues" ? "/map?mode=venues" : "/map", { scroll: false });
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
    return filtered.filter((e) => e.venueId === me.venueId).sort((a, b) => `${a.date}${a.startTime ?? ""}`.localeCompare(`${b.date}${b.startTime ?? ""}`)).map((e) => e.id);
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
      (map.getSource(src) as maplibregl.GeoJSONSource).getClusterExpansionZoom((f.properties as { cluster_id: number }).cluster_id).then((z) => map.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom: z }));
    };
    map.on("click", "g-cl", clExp("gigs"));
    map.on("click", "v-cl", clExp("vens"));
    const pointer = ["g-cl", "g-pin", "g-count", "v-cl", "v-pin", "v-label"];
    pointer.forEach((id) => {
      map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; });
    });
    const onGig = async (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id as string | undefined; if (!id) return;
      const ids = stackForRef.current(id);
      const reqId = ++gigRequestId.current;
      setGigError(false); setLoadingGig(true);
      try {
        const missing = ids.filter((x) => !gigByIdRef.current[x]);
        if (missing.length) {
          const fetched = await fetchEventsBatch(missing);
          if (gigRequestId.current !== reqId) return;
          fetched.forEach((g) => { gigByIdRef.current[g.id] = g; });
        }
        if (gigRequestId.current !== reqId) return;
        const stack = ids.map((x) => gigByIdRef.current[x]).filter(Boolean);
        const chosen = stack.find((g) => g.id === id) ?? stack[0];
        if (chosen) { setSelected(chosen); setSelectedStack(stack.length > 1 ? stack : null); }
        else setGigError(true);
      } catch { if (gigRequestId.current === reqId) setGigError(true); }
      finally { if (gigRequestId.current === reqId) setLoadingGig(false); }
    };
    map.on("click", "g-pin", onGig);
    map.on("click", "g-count", onGig);
    const onVenue = (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) setSelectedVenue(venueByIdRef.current[id] ?? null);
    };
    map.on("click", "v-pin", onVenue);
    map.on("click", "v-label", onVenue);
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basemapFor(appSkin),
      center: [location.lng, location.lat],
      zoom: 10,
      attributionControl: false,
    });
    mapRef.current = map;
    prevBasemapRef.current = basemapFor(appSkin);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    const geo = new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true } as maplibregl.GeolocateControlOptions & { showUserHeading?: boolean });
    geolocateRef.current = geo;
    map.addControl(geo, "bottom-right");
    map.once("load", () => {
      readyRef.current = true;
      ensureSourcesAndLayers(map);
      wireInteractions(map);
      updateBbox(map);
      window.setTimeout(() => geo.trigger(), 250);
    });
    map.on("moveend", () => updateBbox(map));
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map || !readyRef.current) return;
    modeRef.current = mode;
    applyMode(map);
  }, [mode]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !readyRef.current) return;
    const src = map.getSource("gigs") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(gigGeo as GeoJSON.GeoJSON);
  }, [gigGeo]);
  useEffect(() => {
    const map = mapRef.current; if (!map || !readyRef.current) return;
    const src = map.getSource("vens") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(venGeo as GeoJSON.GeoJSON);
  }, [venGeo]);

  useEffect(() => {
    const m = mapRef.current; if (!m || !readyRef.current || !sq) return;
    if (mode === "events" && matchingEventIds && matchingEventIds.size === 1) {
      const id = [...matchingEventIds][0];
      const info = gigSearchIndex[id];
      if (info) m.flyTo({ center: [info.lng, info.lat], zoom: 14, duration: 800 });
    } else if (mode === "venues" && matchingVenueIds && matchingVenueIds.size === 1) {
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
    if (newUrl === prevBasemapRef.current) {
      const poll = () => {
        if (epochRef.current !== epoch) return;
        if (m.isStyleLoaded()) ensureSourcesAndLayers(m, epoch);
        else window.setTimeout(poll, 80);
      };
      poll();
      return;
    }
    prevBasemapRef.current = newUrl;
    let cancelled = false;
    const rebuild = () => {
      if (cancelled || epochRef.current !== epoch) return;
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
        <div className="flex rounded-2xl border border-line glass p-1 shadow-[var(--shadow)]">
          {(["events", "venues"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => changeMode(m)}
                className={cn(
                  "rounded-xl border px-3.5 py-2 text-[12.5px] font-black capitalize transition-[background-color,color,border-color,box-shadow,transform]",
                  active
                    ? "border-[var(--acc)] bg-acc text-on-acc shadow-[0_0_0_1px_var(--acc),0_4px_14px_color-mix(in_srgb,var(--acc)_30%,transparent)]"
                    : "border-transparent text-dim hover:bg-card2 hover:text-txt",
                )}
              >
                {m === "events" ? "Gigs" : "Venues"}
              </button>
            );
          })}
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

      {(loadingGig || gigError) && (
        <div role="status" className="pointer-events-none absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-line glass-hi px-4 py-2.5 text-[13px] font-extrabold shadow-lg">
          {gigError ? <span className="text-red-400">Could not open that gig. Tap it again.</span> : <><Loader2 size={15} className="animate-spin text-[var(--acc)]" /><span className="text-dim">Opening…</span></>}
        </div>
      )}

      <GigSheet gig={selected} stack={selectedStack} distance={selected ? distanceMiles(location, selected.location) : undefined} distanceOf={(g) => distanceMiles(location, g.location)} onClose={() => { setSelected(null); setSelectedStack(null); }} />
      <VenueSheet venue={selectedVenue} gigs={venueGigs} live={!!selectedVenue && venueIdsLive.has(selectedVenue.id)} onClose={() => setSelectedVenue(null)} onGigClick={(g) => { setSelectedVenue(null); setSelected(g); }} />
    </div>
  );
}
