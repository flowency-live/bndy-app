import type { Metadata } from "next";
import { FestivalIndex } from "@/features/festivals/FestivalIndex";

export const metadata: Metadata = {
  title: "Grassroots Festivals | bndy",
  description: "Discover upcoming grassroots music festivals and live-music series, then explore every gig and venue on bndy.",
};

export default function FestivalsPage() {
  return <FestivalIndex />;
}
