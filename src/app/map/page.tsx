"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { currentEditionId } from "@/editions";

// MapLibre touches window; keep both edition map implementations out of SSR.
const MapView = dynamic(() => import("@/features/map/MapView").then((module) => module.MapView), { ssr: false });
const BrassMapView = dynamic(() => import("@/features/brass-map/BrassMapView").then((module) => module.BrassMapView), { ssr: false });

export default function MapPage() {
  const EditionMap = currentEditionId() === "brass" ? BrassMapView : MapView;
  return (
    <Suspense>
      <div className="bndy-map-page contents">
        <EditionMap />
      </div>
    </Suspense>
  );
}
