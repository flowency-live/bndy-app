"use client";

import { useEffect, useState } from "react";
import type { LatLng } from "@/domain/types";
import { DEFAULT_LOCATION } from "@/domain/geo";

/** User location with graceful fallback. `located` is false until the browser resolves it. */
export function useGeolocation(): { location: LatLng; located: boolean } {
  const [location, setLocation] = useState<LatLng>(DEFAULT_LOCATION);
  const [located, setLocated] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocated(true);
      },
      () => setLocated(false),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  return { location, located };
}
