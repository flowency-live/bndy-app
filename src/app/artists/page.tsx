import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArtistsBrowse } from "@/features/artists/ArtistsBrowse";

export const metadata: Metadata = {
  title: "Artists · bndy",
  description: "Search live music artists gigging near you.",
};

export default function ArtistsPage() {
  if (process.env.NEXT_PUBLIC_BNDY_EDITION === "brass") redirect("/bands");
  // Suspense: ArtistsBrowse reads useSearchParams so filters survive in the URL.
  return (
    <Suspense>
      <ArtistsBrowse />
    </Suspense>
  );
}
