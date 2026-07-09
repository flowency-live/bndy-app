"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useTheme } from "@/lib/theme";
import { BASEMAPS } from "@/features/map/skins";
import type { LatLng } from "@/domain/types";

export function MiniMap({ points, user, className }: { points: { id: string; lat: number; lng: number }[]; user?: LatLng | null; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { mode } = useTheme();

  useEffect(() => {
    if (!ref.current || mapRef.current || points.length === 0) return;
    const map = new maplibregl.Map({ container: ref.current, style: mode === "dark" ? BASEMAPS.dark : BASEMAPS.light, attributionControl: { compact: true }, dragRotate: false });
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(ref.current);
    map.on("load", () => {
      map.resize();
      for (const p of points) {
        const el = document.createElement("div");
        el.style.cssText = "width:16px;height:16px;border-radius:50%;background:#ff7a1a;border:2px solid #fff;box-shadow:0 0 10px rgba(255,122,26,.9)";
        new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
      }
      if (user) {
        const el = document.createElement("div");
        el.style.cssText = "width:14px;height:14px;border-radius:50%;background:#4f8df9;border:2px solid #fff;box-shadow:0 0 10px rgba(79,141,249,.9)";
        new maplibregl.Marker({ element: el }).setLngLat([user.lng, user.lat]).addTo(map);
      }
      const b = new maplibregl.LngLatBounds();
      points.forEach((p) => b.extend([p.lng, p.lat]));
      if (user) b.extend([user.lng, user.lat]);
      map.fitBounds(b, { padding: 48, maxZoom: 12, duration: 0 });
    });
    requestAnimationFrame(() => map.resize());
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { const m = mapRef.current; if (m) m.setStyle(mode === "dark" ? BASEMAPS.dark : BASEMAPS.light); }, [mode]);

  return <div ref={ref} className={className} />;
}
