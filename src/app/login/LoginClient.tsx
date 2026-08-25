"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginPanel } from "@/features/auth/LoginPanel";
import { useAuth } from "@/lib/auth/AuthProvider";

const ERRORS: Record<string, string> = {
  token_expired: "That sign-in link expired. Request a new one.",
  invalid_token: "That sign-in link is not valid. Request a new one.",
  invalid_state: "Sign-in failed. Try again.",
  no_code: "Sign-in failed. Try again.",
  token_exchange_failed: "Sign-in failed. Try again.",
  authentication_failed: "Sign-in failed. Try again.",
};

export function LoginClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // SEC-AUD-005: Only allow relative paths, not protocol-relative URLs (//evil.com)
  const rawNext = params.get("next") || "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const errorKey = params.get("error");
  const error = errorKey ? (ERRORS[errorKey] ?? "Sign-in failed. Try again.") : null;

  // Already signed in  -  go where the user was headed.
  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  return (
    <div className="px-4 py-8">
      {error && (
        <p className="mx-auto mb-4 w-full max-w-sm rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-400">
          {error}
        </p>
      )}
      <LoginPanel nextPath={next} />
      <div className="mx-auto mt-5 w-full max-w-sm rounded-2xl border border-[var(--acc)]/35 bg-[color-mix(in_srgb,var(--acc)_7%,transparent)] p-4">
        <div className="text-[12px] font-black text-txt">Are you an artist or venue?</div>
        <p className="mt-1 text-[11px] font-semibold leading-relaxed text-dim">This sign-in is your normal bndy account for favourites, filters and personal features. To add, find or claim an artist or venue, use the separate Join journey. It uses this same account.</p>
        <Link href="/join" className="mt-3 inline-flex min-h-9 items-center rounded-xl bg-acc px-3 text-[11px] font-black text-on-acc">Join bndy as an artist or venue →</Link>
      </div>
    </div>
  );
}
