import type { MetadataRoute } from "next";
import { fetchArtists, fetchVenues } from "@/lib/api";

export const revalidate = 3600; // 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://bndy.live";

  const [artists, venues] = await Promise.all([
    fetchArtists(),
    fetchVenues(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/gigs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/artists`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const artistRoutes: MetadataRoute.Sitemap = artists.map((artist) => ({
    url: `${baseUrl}/artists/${artist.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const venueRoutes: MetadataRoute.Sitemap = venues.map((venue) => ({
    url: `${baseUrl}/venues/${venue.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...artistRoutes, ...venueRoutes];
}
