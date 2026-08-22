import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentEditionId } from "@/editions";
import { ConcertsHome } from "@/features/concerts/ConcertsHome";

export const metadata: Metadata = {
  title: "Concerts · bndy",
  description: "Find brass band concerts near you.",
};

export default function ConcertsPage() {
  if (currentEditionId() !== "brass") notFound();
  return <ConcertsHome />;
}
