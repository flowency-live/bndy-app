import { Suspense } from "react";
import type { Metadata } from "next";
import { WizardShell } from "@/features/wizard/WizardShell";

export const metadata: Metadata = {
  title: "Add a gig · bndy",
  description: "List a live music gig on bndy in under a minute. Free to list, free to discover.",
};

export default function AddGigPage() {
  return (
    <Suspense>
      <WizardShell />
    </Suspense>
  );
}
