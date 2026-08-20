import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthGate } from "@/features/auth/AuthGate";
import { FestivalCreateForm } from "@/features/festivals/curate/FestivalCreateForm";

export const metadata: Metadata = {
  title: "Create a festival · bndy",
  description: "Curator tool: build a grassroots festival programme on bndy.",
  robots: { index: false },
};

export default function NewFestivalPage() {
  return (
    <Suspense>
      <AuthGate title="Sign in to create a festival">
        <FestivalCreateForm />
      </AuthGate>
    </Suspense>
  );
}
