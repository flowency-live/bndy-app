"use client";

import dynamic from "next/dynamic";

// map is client-only (MapLibre touches window); keep it out of SSR.
const MapView = dynamic(() => import("@/features/map/MapView").then((m) => m.MapView), { ssr: false });

export default function MapPage() {
  return <MapView />;
}
