import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArtistProfile } from "@/features/artists/ArtistProfile";
import { fetchArtist, fetchArtistGigs, fetchArtistAvailability } from "@/lib/api";
import { todayISO } from "@/domain/dates";
import { availabilityRangeEnd } from "@/domain/availability";

export const revalidate = 300;
const IS_BRASS = process.env.NEXT_PUBLIC_BNDY_EDITION === "brass";

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

  const [artist, gigs, availability] = await Promise.all([
    fetchArtist(artistId).catch(() => null),
    fetchArtistGigs(artistId, today).catch(() => [] as Awaited<ReturnType<typeof fetchArtistGigs>>),
    fetchArtistAvailability(artistId, today, end).catch(() => [] as Awaited<ReturnType<typeof fetchArtistAvailability>>),
  ]);
  return <ArtistProfile id={artistId} artist={artist} gigs={gigs} availability={availability} />;
}
