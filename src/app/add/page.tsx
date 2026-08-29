import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, MapPin, Music2 } from "lucide-react";
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
        <Link
          href="/join"
          className="mb-3 flex items-center gap-3 rounded-2xl border border-[var(--acc)]/35 bg-[color-mix(in_srgb,var(--acc)_7%,transparent)] px-4 py-3 transition hover:border-[var(--acc)] hover:bg-[color-mix(in_srgb,var(--acc)_11%,transparent)]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-acc text-on-acc"><BadgeCheck size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-[1.1px] text-[var(--acc-text)]">Do you manage an artist or venue?</span>
            <span className="mt-0.5 block text-[13px] font-black text-txt">Find, claim or add your artist or venue page</span>
            <span className="mt-0.5 block text-[10.5px] font-semibold text-dim">You&apos;ll use the same bndy account as favourites and personal features.</span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-[var(--acc-text)]" />
        </Link>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[10.5px] font-semibold text-dim">Just helping bndy list something you don&apos;t manage?</p>
          <div className="flex shrink-0 gap-2">
            <Link href="/add/artist" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-card2 px-3 text-[11.5px] font-black text-dim transition-colors hover:text-txt">
              <Music2 size={13} className="text-[var(--acc)]" /> List artist
            </Link>
            <Link href="/add/venue" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-card2 px-3 text-[11.5px] font-black text-dim transition-colors hover:text-txt">
              <MapPin size={13} className="text-[var(--acc2)]" /> List venue
            </Link>
          </div>
        </div>
      </div>
      {/* Adding a gig stays behind sign-in. Standalone community listing routes are
          deliberately separate from /join, where owners find/create/claim entities. */}
      <AuthGate title="Sign in to add a gig">
        <WizardShell />
      </AuthGate>
    </Suspense>
  );
}
