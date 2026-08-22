import type { Metadata } from "next";
import { FestivalIndex } from "@/features/festivals/FestivalIndex";
import { BrassFestivalIndex } from "@/features/brass-festivals/BrassFestivalIndex";

const IS_BRASS = process.env.NEXT_PUBLIC_BNDY_EDITION === "brass";

export const metadata: Metadata = IS_BRASS ? {
  title: "Brass Festivals | bndy Brass",
  description: "Discover brass band festivals on bndy Brass.",
} : {
  title: "Grassroots Festivals | bndy",
  description: "Discover upcoming grassroots music festivals and live-music series, then explore every gig and venue on bndy.",
};

export default function FestivalsPage() {
  return IS_BRASS ? <BrassFestivalIndex /> : <FestivalIndex />;
}
