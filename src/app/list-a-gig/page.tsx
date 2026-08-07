import { Suspense } from "react";
import type { Metadata } from "next";
import { WizardShell } from "@/features/wizard/WizardShell";

export const metadata: Metadata = {
  title: "List a gig on bndy: free, one minute",
  description: "Put your gig on the bndy map in under a minute. Free to list, free to discover. Keeping LIVE music ALIVE.",
};

/** Standalone branded webform — same wizard, zero app chrome. Share this URL anywhere. */
export default function ListAGigPage() {
  return (
    <Suspense>
      <WizardShell />
    </Suspense>
  );
}
