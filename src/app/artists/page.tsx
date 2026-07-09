import type { Metadata } from "next";
import { ArtistsBrowse } from "@/features/artists/ArtistsBrowse";

export const metadata: Metadata = {
  title: "Artists · bndy",
  description: "Search live music artists gigging near you.",
};

export default function ArtistsPage() {
  return <ArtistsBrowse />;
}
