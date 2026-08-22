import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VenueProfile } from "@/features/venues/VenueProfile";
import { fetchVenue, fetchVenueGigs } from "@/lib/api";
import { todayISO } from "@/domain/dates";

export const revalidate = 300;
const IS_BRASS = process.env.NEXT_PUBLIC_BNDY_EDITION === "brass";

export async function generateMetadata({ params }: { params: Promise<{ venueId: string }> }): Promise<Metadata> {
  if (IS_BRASS) return { title: "Map · bndy Brass", description: "Brass concert locations are discovered through the bndy Brass map." };
  const { venueId } = await params;
  try {
    const v = await fetchVenue(venueId);
    const title = `${v?.name ?? "Venue"} · bndy`;
    const description = v ? `What's on at ${v.name}: upcoming gigs on bndy.` : undefined;
    const image = v?.profileImageUrl || "/og-card.png";
    return {
      title,
      description,
      openGraph: { title, description, images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    };
  } catch {
    return { title: "Venue · bndy" };
  }
}

export default async function VenuePage({ params }: { params: Promise<{ venueId: string }> }) {
  if (IS_BRASS) redirect("/map");
  const { venueId } = await params;
  const [venue, gigs] = await Promise.all([
    fetchVenue(venueId).catch(() => null),
    fetchVenueGigs(venueId, todayISO()).catch(() => [] as Awaited<ReturnType<typeof fetchVenueGigs>>),
  ]);
  return <VenueProfile id={venueId} venue={venue} gigs={gigs} />;
}
