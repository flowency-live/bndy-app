"use client";

import { useState } from "react";
import { FestivalPosterFallback } from "./FestivalPosterFallback";

/**
 * Poster image that survives a dead hotlink. Organiser posters are hotlinked
 * URLs we do not control; when one 404s or blocks the referer, the browser
 * leaves alt text over an empty card (Lichfield, 2026-08-20). On error this
 * swaps to the generated fallback instead, so a dead link can never make a
 * card look broken.
 */
export function FestivalPosterImg({
  src,
  name,
  slug,
  startDate,
  eager = false,
  imgClassName,
}: {
  src: string;
  name: string;
  slug?: string;
  startDate?: string;
  eager?: boolean;
  imgClassName: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return <FestivalPosterFallback name={name} slug={slug} startDate={startDate} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name} poster`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      {...(eager ? { fetchPriority: "high" as const } : {})}
      onError={() => setBroken(true)}
      className={imgClassName}
    />
  );
}
