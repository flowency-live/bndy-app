import type { Metadata } from "next";
import { ArtistProfile } from "@/features/artists/ArtistProfile";
import { fetchArtist, fetchArtistGigs, fetchArtistAvailability } from "@/lib/api";
import { todayISO } from "@/domain/dates";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ artistId: string }> }): Promise<Metadata> {
  const { artistId } = await params;
  try {
    const a = await fetchArtist(artistId);
    const title = `${a.name} · bndy`;
    const description = a.bio || `See ${a.name}'s upcoming gigs on bndy.`;
    const image = a.profileImageUrl || "/og-card.png";
    // 3b: rich preview card for chat and social shares
    return {
      title,
      description,
      openGraph: { title, description, images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    };
  } catch {
    return { title: "Artist · bndy" };
  }
}

export default async function ArtistPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params;
  const today = todayISO();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 90);
  const end = endDate.toISOString().split('T')[0];

  const [artist, gigs, availability] = await Promise.all([
    fetchArtist(artistId).catch(() => null),
    fetchArtistGigs(artistId, today).catch(() => [] as Awaited<ReturnType<typeof fetchArtistGigs>>),
    fetchArtistAvailability(artistId, today, end).catch(() => [] as Awaited<ReturnType<typeof fetchArtistAvailability>>),
  ]);
  return <ArtistProfile id={artistId} artist={artist} gigs={gigs} availability={availability} />;
}
