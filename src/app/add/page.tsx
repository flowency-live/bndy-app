import { Suspense } from "react";
import type { Metadata } from "next";
import { WizardShell } from "@/features/wizard/WizardShell";
import { AuthGate } from "@/features/auth/AuthGate";

export const metadata: Metadata = {
  title: "Add a gig · bndy",
  description: "List a live music gig on bndy in under a minute. Free to list, free to discover.",
};

export default function AddGigPage() {
  return (
    <Suspense>
      {/* Backlog item 2: the wizard sits behind sign-in. The wizard itself is unchanged. */}
      <AuthGate title="Sign in to add a gig">
        <WizardShell />
      </AuthGate>
    </Suspense>
  );
}
