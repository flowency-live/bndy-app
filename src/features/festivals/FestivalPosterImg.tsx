"use client";

import Image from "next/image";
import { useState } from "react";
import { canUseNextImage } from "@/lib/nextImage";
import { FestivalPosterFallback } from "./FestivalPosterFallback";

/**
 * Poster image that survives a dead hotlink. Organiser posters are hotlinked
 * URLs we do not control; when one 404s or blocks the referer, the browser
 * leaves alt text over an empty card (Lichfield, 2026-08-20). On error this
 * swaps to the generated fallback instead, so a dead link can never make a
 * card look broken.
 *
 * Images on our trusted host families go through Next's optimiser so small
 * discovery cards do not download the original full-size poster. Arbitrary
 * organiser URLs deliberately stay as plain images rather than opening the
 * bndy image optimiser to every host on the internet.
 */
export function FestivalPosterImg({
  src,
  name,
  slug,
  startDate,
  eager = false,
  sizes = "100vw",
  imgClassName,
}: {
  src: string;
  name: string;
  slug?: string;
  startDate?: string;
  eager?: boolean;
  sizes?: string;
  imgClassName: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return <FestivalPosterFallback name={name} slug={slug} startDate={startDate} />;

  if (canUseNextImage(src)) {
    return (
      <Image
        src={src}
        alt={`${name} poster`}
        fill
        sizes={sizes}
        priority={eager}
        onError={() => setBroken(true)}
        className={imgClassName}
      />
    );
  }

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
