import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "bndy · live music near you",
    short_name: "bndy",
    description: "Find live music, gigs, artists and venues near you.",
    start_url: "/map?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#0F1729",
    theme_color: "#0F1729",
    categories: ["music", "entertainment", "lifestyle"],
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
