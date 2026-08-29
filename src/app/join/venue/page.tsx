import type { Metadata } from "next";
import { JoinVenueFlow } from "@/features/join/JoinVenueFlow";

export const metadata: Metadata = {
  title: "Find or add a venue · bndy",
  description: "Find your venue on bndy or start a new venue page.",
};

export default function JoinVenuePage() {
  return <JoinVenueFlow />;
}
