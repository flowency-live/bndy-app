"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, UserCog } from "lucide-react";
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
      <Link
        href="/join"
        className="group mx-auto mt-4 flex min-h-12 w-full max-w-sm items-center gap-3 rounded-2xl border border-line px-4 py-3 text-left transition-colors hover:border-[var(--acc)] hover:bg-white/5"
      >
        <UserCog size={17} className="shrink-0 text-[var(--acc-text)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-black text-txt">Manage an artist or venue?</span>
          <span className="mt-0.5 block text-[10.5px] font-semibold text-dim">Find or claim its bndy page.</span>
        </span>
        <ArrowRight size={15} className="shrink-0 text-dim transition-transform group-hover:translate-x-1 group-hover:text-[var(--acc-text)]" />
      </Link>
    </div>
  );
}
