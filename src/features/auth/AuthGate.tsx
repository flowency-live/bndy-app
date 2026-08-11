"use client";

// Gate: renders children only for a signed-in user.
// Signed out, it shows the LoginPanel in place. The wizard behind it is untouched.

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { LoginPanel } from "./LoginPanel";
import type { ReactNode } from "react";

export function AuthGate({ children, title }: { children: ReactNode; title?: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const path = usePathname();

  if (isLoading) {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-dim" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="px-4 py-8">
        <LoginPanel nextPath={path || "/"} title={title ?? "Sign in to add a gig"} />
      </div>
    );
  }

  return <>{children}</>;
}
