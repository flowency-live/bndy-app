import type { Metadata } from "next";
import { AddArtistPageClient } from "@/features/artists/AddArtistPageClient";

export const metadata: Metadata = {
  title: "Add an artist · bndy",
  description: "Add a grassroots artist or band to bndy. Paste their Facebook page to get started quickly.",
};

export default function AddArtistPage() {
  return <AddArtistPageClient />;
}
