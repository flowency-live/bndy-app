import type { Metadata } from "next";
import { FestivalPageClient } from "@/features/festivals/FestivalPageClient";
import { BrassFestivalDetail } from "@/features/brass-festivals/BrassFestivalDetail";
import { currentEditionId } from "@/editions";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk";
const IS_BRASS = currentEditionId() === "brass";

interface FestivalMetaDTO {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  town?: string;
  posterImageUrl?: string;
  heroImageUrl?: string;
  venueIds?: string[];
  lineup?: unknown[];
}

async function metaFestival(slug: string): Promise<FestivalMetaDTO | null> {
  if (IS_BRASS) return null;
  try {
    const res = await fetch(`${API}/api/festivals/slug/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json() as { festival?: FestivalMetaDTO };
    return data.festival || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (IS_BRASS) return { title: "Brass Festival | bndy", alternates: { canonical: `/festivals/${slug}` } };
  const festival = await metaFestival(slug);
  if (!festival?.name) return { title: "Festival | bndy" };
  const location = festival.location || festival.town;
  const dates = festival.startDate ? `${festival.startDate}${festival.endDate && festival.endDate !== festival.startDate ? ` – ${festival.endDate}` : ""}` : "";
  const count = festival.lineup?.length ? `${festival.lineup.length} acts` : "live music";
  const description = festival.description || `${count}${location ? ` in ${location}` : ""}${dates ? ` · ${dates}` : ""}. Explore the full grassroots festival programme on bndy.`;
  const image = festival.posterImageUrl || festival.heroImageUrl;
  return {
    title: `${festival.name} | bndy`,
    description,
    alternates: { canonical: `/festivals/${slug}` },
    openGraph: {
      title: festival.name,
      description,
      type: "website",
      url: `/festivals/${slug}`,
      ...(image ? { images: [{ url: image, alt: `${festival.name} poster` }] } : {}),
    },
  };
}

export default async function FestivalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return IS_BRASS ? <BrassFestivalDetail slug={slug} /> : <FestivalPageClient slug={slug} />;
}
