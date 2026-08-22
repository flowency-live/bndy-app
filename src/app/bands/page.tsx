import type { Metadata } from "next";
import { BandsBrowse } from "@/features/bands/BandsBrowse";
import { currentEditionId } from "@/editions";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Bands · bndy",
  description: "Discover brass bands and their upcoming concerts.",
};

export default function BandsPage() {
  if (currentEditionId() !== "brass") notFound();
  return <BandsBrowse />;
}
