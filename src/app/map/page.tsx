"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const IS_BRASS = process.env.NEXT_PUBLIC_BNDY_EDITION === "brass";

// MapLibre touches window, so both edition maps remain client-only.
const MapView = dynamic(() => import("@/features/map/MapView").then((m) => m.MapView), { ssr: false });
const BrassMapView = dynamic(() => import("@/features/brass-map/BrassMapView").then((m) => m.BrassMapView), { ssr: false });

export default function MapPage() {
  return (
    <Suspense>
      <div className="bndy-map-page contents">
        {IS_BRASS ? <BrassMapView /> : <MapView />}
      </div>
    </Suspense>
  );
}
