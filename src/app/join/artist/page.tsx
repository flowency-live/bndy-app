import type { Metadata } from "next";
import { JoinArtistFlow } from "@/features/join/JoinArtistFlow";

export const metadata: Metadata = {
  title: "Find or add an artist · bndy",
  description: "Find your artist on bndy or start a new artist page.",
};

export default function JoinArtistPage() {
  return <JoinArtistFlow />;
}
