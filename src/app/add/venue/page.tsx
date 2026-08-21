import type { Metadata } from "next";
import { AddVenuePageClient } from "@/features/venues/AddVenuePageClient";

export const metadata: Metadata = {
  title: "Add a venue · bndy",
  description: "Add a grassroots live-music venue to bndy. Paste its Facebook page, then confirm the physical place.",
};

export default function AddVenuePage() {
  return <AddVenuePageClient />;
}
