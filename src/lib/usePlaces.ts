"use client";

// Google Places autocomplete (UK towns & cities). Degrades gracefully with no key.

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window { google?: unknown; __bndyPlaces?: Promise<void> }
}

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogle(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__bndyPlaces) return window.__bndyPlaces;
  if (!KEY) return Promise.reject(new Error("no-key"));
  window.__bndyPlaces = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places&v=weekly&loading=async`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load-failed"));
    document.head.appendChild(s);
  });
  return window.__bndyPlaces;
}

export interface PlacePrediction { id: string; label: string }
export interface ResolvedPlace { lat: number; lng: number; label: string }

export function usePlaces() {
  const available = !!KEY;
  const [ready, setReady] = useState(false);
  const svc = useRef<any>(null);
  const details = useRef<any>(null);
  const token = useRef<any>(null);

  useEffect(() => {
    if (!KEY) return;
    let alive = true;
    loadGoogle()
      .then(() => {
        if (!alive) return;
        const g = window.google;
        svc.current = new g.maps.places.AutocompleteService();
        details.current = new g.maps.places.PlacesService(document.createElement("div"));
        token.current = new g.maps.places.AutocompleteSessionToken();
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => { alive = false; };
  }, []);

  const search = useCallback((input: string): Promise<PlacePrediction[]> => {
    return new Promise((resolve) => {
      if (!svc.current || !input.trim()) return resolve([]);
      svc.current.getPlacePredictions(
        { input, componentRestrictions: { country: "gb" }, types: ["(cities)"], sessionToken: token.current },
        (preds: any[] | null, status: string) => resolve(status === "OK" && preds ? preds.map((p) => ({ id: p.place_id as string, label: p.description as string })) : []),
      );
    });
  }, []);

  const resolvePlace = useCallback((placeId: string): Promise<ResolvedPlace | null> => {
    return new Promise((resolve) => {
      if (!details.current) return resolve(null);
      details.current.getDetails(
        { placeId, fields: ["geometry", "name", "formatted_address"], sessionToken: token.current },
        (place: any, status: string) => {
          if (status === "OK" && place?.geometry?.location) {
            resolve({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), label: place.name || place.formatted_address || "Location" });
            token.current = new window.google.maps.places.AutocompleteSessionToken();
          } else resolve(null);
        },
      );
    });
  }, []);

  return { available, ready, search, resolvePlace };
}
