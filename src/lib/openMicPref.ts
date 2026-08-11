"use client";

// Show/hide open mics (item 13): one preference, remembered per device,
// shared by the gig list and the map. Default = shown.

import { useCallback, useEffect, useState } from "react";

const KEY = "bndy-open-mics";

export function useOpenMicPref(): { showOpenMics: boolean; toggleOpenMics: () => void } {
  const [showOpenMics, setShow] = useState(true);
  useEffect(() => {
    try { if (localStorage.getItem(KEY) === "hide") setShow(false); } catch { /* private mode */ }
  }, []);
  const toggleOpenMics = useCallback(() => {
    setShow((v) => {
      const next = !v;
      try { localStorage.setItem(KEY, next ? "show" : "hide"); } catch { /* private mode */ }
      return next;
    });
  }, []);
  return { showOpenMics, toggleOpenMics };
}
