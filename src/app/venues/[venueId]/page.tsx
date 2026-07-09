import type { Metadata } from "next";
import { VenueProfile } from "@/features/venues/VenueProfile";
import { fetchVenue, fetchVenueGigs } from "@/lib/api";
import { todayISO } from "@/domain/dates";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ venueId: string }> }): Promise<Metadata> {
  const { venueId } = await params;
  try {
    const v = await fetchVenue(venueId);
    return { title: `${v?.name ?? "Venue"} · bndy`, description: v ? `What's on at ${v.name} — upcoming gigs on bndy.` : undefined };
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
