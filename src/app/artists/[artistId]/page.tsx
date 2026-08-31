import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArtistProfile } from "@/features/artists/ArtistProfile";
import { fetchArtist, fetchArtistGigs, fetchArtistAvailability } from "@/lib/api";
import { todayISO } from "@/domain/dates";
import { availabilityRangeEnd } from "@/domain/availability";
import { ARTIST_HISTORY_START_DATE, splitArtistGigs } from "@/features/artists/artistMapHistory";
import type { Artist } from "@/domain/types";

export const revalidate = 300;
const IS_BRASS = process.env.NEXT_PUBLIC_BNDY_EDITION === "brass";

function artistJsonLd(artist: Artist, artistId: string) {
  const sameAs = artist.socials?.map((s) => s.url).filter(Boolean) ?? [];
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "@id": `https://bndy.live/artists/${artistId}`,
    name: artist.name,
    ...(artist.bio && { description: artist.bio }),
    ...(artist.profileImageUrl && { image: artist.profileImageUrl }),
    ...(artist.genres?.length && { genre: artist.genres }),
    ...(artist.location && { foundingLocation: { "@type": "Place", name: artist.location } }),
    ...(sameAs.length && { sameAs }),
  };
}

export async function generateMetadata({ params }: { params: Promise<{ artistId: string }> }): Promise<Metadata> {
  if (IS_BRASS) return { title: "Band · bndy Brass", description: "Brass Band profile on bndy Brass." };
  const { artistId } = await params;
  try {
    const a = await fetchArtist(artistId);
    const title = `${a.name} · bndy`;
    const description = a.bio || `See ${a.name}'s upcoming gigs on bndy.`;
    const image = a.profileImageUrl || "/og-card.png";
    return {
      title,
      description,
      alternates: { canonical: `/artists/${artistId}` },
      openGraph: { title, description, images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    };
  } catch {
    return { title: "Artist · bndy" };
  }
}

export default async function ArtistPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params;
  if (IS_BRASS) redirect(`/bands/${encodeURIComponent(artistId)}`);
  const today = todayISO();
  const end = availabilityRangeEnd(today);

  const [artist, allGigs, availabilityCalendar] = await Promise.all([
    fetchArtist(artistId).catch(() => null),
    fetchArtistGigs(artistId, ARTIST_HISTORY_START_DATE).catch(() => [] as Awaited<ReturnType<typeof fetchArtistGigs>>),
    fetchArtistAvailability(artistId, today, end).catch(() => ({ availability: [], dateStatuses: [] }) as Awaited<ReturnType<typeof fetchArtistAvailability>>),
  ]);
  if (!artist) notFound();
  const { upcoming: gigs, past: pastGigs } = splitArtistGigs(allGigs, today);
  return (
    <>
      {artist && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(artistJsonLd(artist, artistId)) }}
        />
      )}
      <ArtistProfile id={artistId} artist={artist} gigs={gigs} pastGigs={pastGigs} availabilityCalendar={availabilityCalendar} />
    </>
  );
}
