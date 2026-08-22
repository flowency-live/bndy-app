import type { Metadata } from "next";
import { FestivalIndex } from "@/features/festivals/FestivalIndex";
import { BrassFestivalIndex } from "@/features/brass-festivals/BrassFestivalIndex";
import { currentEditionId } from "@/editions";

const IS_BRASS = currentEditionId() === "brass";

export const metadata: Metadata = IS_BRASS ? {
  title: "Brass Festivals | bndy",
  description: "Discover brass band festivals and multi-concert programmes.",
} : {
  title: "Grassroots Festivals | bndy",
  description: "Discover upcoming grassroots music festivals and live-music series, then explore every gig and venue on bndy.",
};

export default function FestivalsPage() {
  return IS_BRASS ? <BrassFestivalIndex /> : <FestivalIndex />;
}
