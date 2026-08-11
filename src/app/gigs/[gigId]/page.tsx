// A gig's own page (backlog 3b): the deep-link target for shares and the
// carrier of the rich preview card. Data comes from the existing batch
// endpoint — no new backend routes.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchArtist, fetchEventsBatch } from "@/lib/api";
import { prettyDate } from "@/domain/dates";
import { GigPageClient } from "./GigPageClient";

export const revalidate = 300;

async function loadGig(gigId: string) {
  const gigs = await fetchEventsBatch([gigId]).catch(() => []);
  return gigs[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ gigId: string }> }): Promise<Metadata> {
  const { gigId } = await params;
  const gig = await loadGig(gigId);
  if (!gig) return { title: "Gig · bndy" };

  const title = `${gig.artistName || gig.title} at ${gig.venueName} · bndy`;
  const description = `${prettyDate(gig.date, gig.startTime)}${gig.venueCity ? ` · ${gig.venueCity}` : ""} · found on bndy. Keeping live music alive.`;
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
