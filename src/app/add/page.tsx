import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { MapPin, Music2 } from "lucide-react";
import { WizardShell } from "@/features/wizard/WizardShell";
import { AuthGate } from "@/features/auth/AuthGate";

export const metadata: Metadata = {
  title: "Add a gig · bndy",
  description: "List a live music gig on bndy in under a minute. Free to list, free to discover.",
};

export default function AddGigPage() {
  return (
    <Suspense>
      <div className="mx-auto max-w-5xl px-4 pt-2 lg:px-8">
        <div className="mb-3 flex justify-end gap-2">
          <Link href="/add/artist" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-card2 px-3 text-[11.5px] font-black text-dim transition-colors hover:text-txt">
            <Music2 size={13} className="text-[var(--acc)]" /> Add artist
          </Link>
          <Link href="/add/venue" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-card2 px-3 text-[11.5px] font-black text-dim transition-colors hover:text-txt">
            <MapPin size={13} className="text-[var(--acc2)]" /> Add venue
          </Link>
        </div>
      </div>
      {/* Adding a gig stays behind sign-in. The standalone community artist and
          venue routes above remain public and use the existing review/gate rules. */}
      <AuthGate title="Sign in to add a gig">
        <WizardShell />
      </AuthGate>
    </Suspense>
  );
}
