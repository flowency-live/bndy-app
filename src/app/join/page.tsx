import type { Metadata } from "next";
import { JoinPageClient } from "@/features/join/JoinPageClient";

export const metadata: Metadata = {
  title: "Find or add an artist or venue · bndy",
  description: "Find and claim an existing artist or venue page, or add a genuinely new one to bndy.",
};

export default function JoinPage() {
  return <JoinPageClient />;
}
