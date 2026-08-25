"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Renders children only when scrolled near the viewport. Off-screen sections
 *  cost zero React/DOM work  -  the placeholder holds estimated height
 *  so scrollbar stays stable. */
export function Deferred({ count, heightPerItem = 124, itemsPerRow = 3, children }: { count: number; heightPerItem?: number; itemsPerRow?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    const io = new IntersectionObserver(
      (es) => { if (es.some((e) => e.isIntersecting)) { setShow(true); io.disconnect(); } },
      { rootMargin: "900px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);
  const est = Math.ceil(count / itemsPerRow) * heightPerItem;
  return <div ref={ref} style={show ? undefined : { minHeight: est }}>{show ? children : null}</div>;
}
