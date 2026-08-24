import type { Metadata } from "next";
import { JoinVenueFlow } from "@/features/join/JoinVenueFlow";

export const metadata: Metadata = {
  title: "Join bndy as a venue",
  description: "Find your venue on bndy or start a new venue page.",
};

export default function JoinVenuePage() {
  return <JoinVenueFlow />;
}
