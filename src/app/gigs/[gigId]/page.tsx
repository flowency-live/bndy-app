// A gig's own page: deep-link target for shares and rich preview metadata.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchArtist, fetchEventsBatch, fetchFestivals } from "@/lib/api";
import { prettyDate } from "@/domain/dates";
import { gigDisplayName } from "@/domain/gigName";
import { GigPageClient } from "./GigPageClient";
import type { Gig } from "@/domain/types";

export const revalidate = 300;

async function loadGig(gigId: string): Promise<Gig | null> {
  const gigs = await fetchEventsBatch([gigId]).catch(() => []);
  const gig = gigs[0] ?? null;
  if (!gig?.festivalId) return gig;
  const festivals = await fetchFestivals({ startDate: gig.date, endDate: gig.date }).catch(() => []);
  const festival = festivals.find((f) => f.id === gig.festivalId);
  return festival ? { ...gig, festivalName: gig.festivalName || festival.name, festivalSlug: festival.slug } : gig;
}

export async function generateMetadata({ params }: { params: Promise<{ gigId: string }> }): Promise<Metadata> {
  const { gigId } = await params;
  const gig = await loadGig(gigId);
  if (!gig) return { title: "Gig · bndy" };

  const title = `${gigDisplayName(gig)} at ${gig.venueName} · bndy`;
  const description = `${prettyDate(gig.date, gig.startTime)}${gig.venueCity ? ` · ${gig.venueCity}` : ""}${gig.festivalName ? ` · part of ${gig.festivalName}` : ""} · found on bndy. Keeping live music alive.`;
  const image = gig.artistId
    ? await fetchArtist(gig.artistId).then((a) => a.profileImageUrl || null).catch(() => null)
    : null;

  return {
    title,
    description,
    openGraph: { title, description, images: [image || "/og-card.png"] },
    twitter: { card: "summary_large_image", title, description, images: [image || "/og-card.png"] },
  };
}

export default async function GigPage({ params }: { params: Promise<{ gigId: string }> }) {
  const { gigId } = await params;
  const gig = await loadGig(gigId);
  if (!gig) notFound();

  const image = gig.artistId
    ? await fetchArtist(gig.artistId).then((a) => a.profileImageUrl || undefined).catch(() => undefined)
    : undefined;

  return <GigPageClient gig={gig} imageUrl={image} />;
}
