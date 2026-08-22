import { notFound } from "next/navigation";
import { currentEditionId } from "@/editions";
import { BandDetail } from "@/features/bands/BandDetail";

export default async function BandPage({ params }: { params: Promise<{ id: string }> }) {
  if (currentEditionId() !== "brass") notFound();
  const { id } = await params;
  return <BandDetail id={id} />;
}
