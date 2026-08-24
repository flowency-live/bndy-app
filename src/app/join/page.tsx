import type { Metadata } from "next";
import { JoinPageClient } from "@/features/join/JoinPageClient";

export const metadata: Metadata = {
  title: "Join bndy · Artists & venues",
  description: "Join bndy as an artist or venue. Find your existing page or create a new one and make it yours.",
};

export default function JoinPage() {
  return <JoinPageClient />;
}
