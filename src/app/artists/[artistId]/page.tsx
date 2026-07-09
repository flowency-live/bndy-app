import type { Metadata } from "next";
import { ArtistProfile } from "@/features/artists/ArtistProfile";
import { fetchArtist, fetchArtistGigs } from "@/lib/api";
import { todayISO } from "@/domain/dates";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ artistId: string }> }): Promise<Metadata> {
  const { artistId } = await params;
  try {
    const a = await fetchArtist(artistId);
    return { title: `${a.name} · bndy`, description: a.bio || `See ${a.name}'s upcoming gigs on bndy.` };
  } catch {
    return { title: "Artist · bndy" };
  }
}

export default async function ArtistPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = await params;
  const [artist, gigs] = await Promise.all([
    fetchArtist(artistId).catch(() => null),
    fetchArtistGigs(artistId, todayISO()).catch(() => [] as Awaited<ReturnType<typeof fetchArtistGigs>>),
  ]);
  return <ArtistProfile id={artistId} artist={artist} gigs={gigs} />;
}
