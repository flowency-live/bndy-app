import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthGate } from "@/features/auth/AuthGate";
import { FestivalManage } from "@/features/festivals/curate/FestivalManage";

export const metadata: Metadata = {
  title: "Manage festival · bndy",
  robots: { index: false },
};

export default async function ManageFestivalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense>
      <AuthGate title="Sign in to manage this festival">
        <FestivalManage idOrSlug={slug} />
      </AuthGate>
    </Suspense>
  );
}
