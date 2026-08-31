"use client";

// A map over an EXPLICIT venue set, on the same engine as the main map.
//
// WHY THIS EXISTS. The first festival map built its own maplibre instance with
// hand-made DOM markers and no resize handling, and shipped blank. This file is
// the main map's venue mode - diamond pins, name pills, clusters, skin-aware
// basemap - with the data fetching removed: the caller hands over the venues
// and the gigs, nothing else is loaded.
//
// EDITIONS RIDES ON THIS. Feature 16 resolves a venue SET from rules (owner
// group, postcode areas, polygon, explicit list) and then needs exactly this
// component. Festivals are the explicit-list case arriving first. Keep the
// props dumb - Venue[] and Gig[] - so both callers stay trivial.
//
// TAP BEHAVIOUR: tapping a venue with gigs opens the GigSheet; more than one
// gig at that venue and the sheet gets the whole stack. A venue with no linked
// gigs yet opens the VenueSheet.

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import { useTheme } from "@/lib/theme";
import { GigSheet } from "@/features/gigs/GigSheet";
import { VenueSheet } from "@/features/venues/VenueSheet";
import type { Gig, Venue } from "@/domain/types";
import { basemapFor, registerDiamonds, registerPills, tokenSkin } from "./skinMap";
import { VEN_LAYERS, buildVenueLayers } from "./layers";

export function FilteredMapView({
  venues,
  gigs,
  badge,
  heightClass = "h-[56dvh] min-h-[390px] max-h-[650px] lg:h-[600px]",
}: {
  venues: Venue[];
  gigs: Gig[];
  badge?: string;
  heightClass?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const epochRef = useRef(0);
  const prevBasemapRef = useRef<string | null>(null);
  const { appSkin } = useTheme();

  const [selected, setSelected] = useState<Gig | null>(null);
  const [selectedStack, setSelectedStack] = useState<Gig[] | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const gigsByVenue = useMemo(() => {
    const m = new Map<string, Gig[]>();
    for (const g of gigs) {
      const arr = m.get(g.venueId) || [];
      arr.push(g);
      m.set(g.venueId, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => `${a.date}${a.startTime ?? ""}`.localeCompare(`${b.date}${b.startTime ?? ""}`));
    return m;
  }, [gigs]);

  const venGeo = useMemo<FeatureCollection<Point>>(() => ({
    type: "FeatureCollection",
    features: venues.map((v) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [v.location.lng, v.location.lat] },
      properties: { id: v.id, name: v.name, live: gigsByVenue.has(v.id) ? 1 : 0 },
    })),
  }), [venues, gigsByVenue]);
  const venGeoRef = useRef(venGeo); venGeoRef.current = venGeo;
  const venueByIdRef = useRef<Record<string, Venue>>({});
  venueByIdRef.current = Object.fromEntries(venues.map((v) => [v.id, v]));
  const gigsByVenueRef = useRef(gigsByVenue); gigsByVenueRef.current = gigsByVenue;

  function ensureSourcesAndLayers(map: maplibregl.Map, epoch?: number) {
    try {
      if (!map.getSource("vens")) map.addSource("vens", { type: "geojson", data: venGeoRef.current as GeoJSON.GeoJSON, cluster: true, clusterRadius: 40, clusterMaxZoom: 11, clusterProperties: { live: ["max", ["get", "live"]] } });
      VEN_LAYERS.forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
      const s = tokenSkin();
      registerDiamonds(map, s.colors);
      registerPills(map, s.colors);
      buildVenueLayers(s, true).forEach((spec) => map.addLayer(spec as unknown as maplibregl.AddLayerObject));
    } catch (err) {
      console.warn("[bndy-map] FilteredMapView ensure failed, retrying on idle:", err);
      const captured = epoch ?? epochRef.current;
      map.once("idle", () => { if (epochRef.current === captured) ensureSourcesAndLayers(map, captured); });
    }
  }

  function wireInteractions(map: maplibregl.Map) {
    map.on("click", "v-cl", (e) => {
      const f = e.features?.[0]; if (!f) return;
      (map.getSource("vens") as maplibregl.GeoJSONSource)
        .getClusterExpansionZoom((f.properties as { cluster_id: number }).cluster_id)
        .then((z) => map.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom: Math.min(z + 0.2, 15), duration: 600 }))
        .catch(() => {});
    });
    const venClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.properties?.point_count) return;
      const v = venueByIdRef.current[(f.properties as { id: string }).id];
      if (!v) return;
      map.easeTo({ center: [v.location.lng, v.location.lat], duration: 500, offset: [0, -120] });
      const stack = gigsByVenueRef.current.get(v.id) || [];
      if (stack.length) {
        setSelectedStack(stack.length > 1 ? stack : null);
        setSelected(stack[0]);
      } else {
        setSelectedVenue(v);
      }
    };
    ["v-hit", "v-pin", "v-label"].forEach((id) => map.on("click", id, venClick));
    ["v-cl", "v-hit", "v-pin", "v-label"].forEach((id) => {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
    });
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    const initialBasemap = basemapFor(appSkin);
    prevBasemapRef.current = initialBasemap;
    const map = new maplibregl.Map({ container: el, style: initialBasemap, center: [-2.1, 53.4], zoom: 6.2, minZoom: 4, maxZoom: 18, attributionControl: false });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    requestAnimationFrame(() => map.resize());
    map.on("load", () => {
      readyRef.current = true;
      map.resize();
      ensureSourcesAndLayers(map);
      wireInteractions(map);
      fitTo(map, venGeoRef.current, false);
    });
    map.on("error", (e) => { console.error("[bndy-map] maplibre error:", e?.error?.message || e); });
    return () => {
      epochRef.current += 1;
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = mapRef.current; if (!m || !readyRef.current) return;
    if (!m.getSource("vens")) { if (m.isStyleLoaded()) ensureSourcesAndLayers(m); return; }
    (m.getSource("vens") as maplibregl.GeoJSONSource).setData(venGeo as GeoJSON.GeoJSON);
    fitTo(m, venGeo, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venGeo]);

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

  const venueGigsForSheet = selectedVenue ? gigsByVenue.get(selectedVenue.id) || [] : [];

  return (
    <>
      <section className="overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card shadow-[var(--shadow)]">
        <div className={`relative ${heightClass}`}>
          {/* ⚠ The inline size is LOAD-BEARING. maplibre stamps .maplibregl-map
              on this div, and its stylesheet sets position:relative, which
              beats the Tailwind `absolute` and collapses the div to 0 height.
              The canvas then freezes at maplibre's 300px fallback and the map
              ships blank. MapView survives for exactly one reason: this same
              inline style. Found on production, 2026-08-20. */}
          <div ref={containerRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />
          {badge && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-xl border border-line glass px-3 py-2 shadow-[var(--shadow)]">
              <div className="font-meta text-[8px] font-black uppercase tracking-[1.4px] text-[var(--acc)]">{badge}</div>
              <div className="mt-0.5 text-[11px] font-black">{venues.length} venue{venues.length === 1 ? "" : "s"}</div>
            </div>
          )}
        </div>
      </section>
      <GigSheet gig={selected} stack={selectedStack} onClose={() => { setSelected(null); setSelectedStack(null); }} />
      <VenueSheet
        venue={selectedVenue}
        gigs={venueGigsForSheet}
        live={venueGigsForSheet.length > 0}
        onClose={() => setSelectedVenue(null)}
        onGigClick={(g) => { setSelectedVenue(null); setSelected(g); }}
      />
    </>
  );
}

function fitTo(map: maplibregl.Map, geo: FeatureCollection<Point>, animateSingle: boolean) {
  const coords = geo.features.map((f) => f.geometry.coordinates as [number, number]);
  if (!coords.length) return;
  if (coords.length === 1) {
    map.easeTo({ center: coords[0], zoom: 14, duration: animateSingle ? 450 : 0 });
    return;
  }
  const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
  map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: animateSingle ? 600 : 0 });
}
