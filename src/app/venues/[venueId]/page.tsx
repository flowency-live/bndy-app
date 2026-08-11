import type { Metadata } from "next";
import { VenueProfile } from "@/features/venues/VenueProfile";
import { fetchVenue, fetchVenueGigs } from "@/lib/api";
import { todayISO } from "@/domain/dates";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ venueId: string }> }): Promise<Metadata> {
  const { venueId } = await params;
  try {
    const v = await fetchVenue(venueId);
    const title = `${v?.name ?? "Venue"} · bndy`;
    const description = v ? `What's on at ${v.name}: upcoming gigs on bndy.` : undefined;
    const image = v?.profileImageUrl || "/og-card.png";
    // 3b: rich preview card for chat and social shares
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
  const { venueId } = await params;
  const [venue, gigs] = await Promise.all([
    fetchVenue(venueId).catch(() => null),
    fetchVenueGigs(venueId, todayISO()).catch(() => [] as Awaited<ReturnType<typeof fetchVenueGigs>>),
  ]);
  return <VenueProfile id={venueId} venue={venue} gigs={gigs} />;
}
