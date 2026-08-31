import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { VenueProfile } from "@/features/venues/VenueProfile";
import { fetchVenue, fetchVenueGigs } from "@/lib/api";
import { todayISO } from "@/domain/dates";
import type { Venue } from "@/domain/types";

export const revalidate = 300;
const IS_BRASS = process.env.NEXT_PUBLIC_BNDY_EDITION === "brass";

function venueJsonLd(venue: Venue, venueId: string) {
  const sameAs = venue.socials?.map((s) => s.url).filter(Boolean) ?? [];
  const address = [venue.address, venue.city, venue.postcode].filter(Boolean).join(", ");
  return {
    "@context": "https://schema.org",
    "@type": ["MusicVenue", "LocalBusiness"],
    "@id": `https://bndy.live/venues/${venueId}`,
    name: venue.name,
    ...(address && {
      address: {
        "@type": "PostalAddress",
        ...(venue.address && { streetAddress: venue.address }),
        ...(venue.city && { addressLocality: venue.city }),
        ...(venue.postcode && { postalCode: venue.postcode }),
        addressCountry: "GB",
      },
    }),
    geo: {
      "@type": "GeoCoordinates",
      latitude: venue.location.lat,
      longitude: venue.location.lng,
    },
    ...(venue.profileImageUrl && { image: venue.profileImageUrl }),
    ...(venue.website && { url: venue.website }),
    ...(sameAs.length && { sameAs }),
  };
}

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
      alternates: { canonical: `/venues/${venueId}` },
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
  if (!venue) notFound();
  return (
    <>
      {venue && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(venueJsonLd(venue, venueId)) }}
        />
      )}
      <VenueProfile id={venueId} venue={venue} gigs={gigs} />
    </>
  );
}
