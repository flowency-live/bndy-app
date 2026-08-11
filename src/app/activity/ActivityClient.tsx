"use client";

// My activity (backlog feature 4): the signed-in user's edits, hides and
// restores, newest first. This record is the heart of the bndy builder story.

import Link from "next/link";
import { Loader2, Pencil, EyeOff, RotateCcw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMyActivity, type ActivityEntry } from "@/lib/curator";
import { LoginPanel } from "@/features/auth/LoginPanel";

const ICONS: Record<string, React.ReactNode> = {
  edit: <Pencil size={14} className="text-[var(--acc)]" />,
  hide: <EyeOff size={14} className="text-red-400" />,
  restore: <RotateCcw size={14} className="text-emerald-400" />,
  "set-role": <ShieldCheck size={14} className="text-[var(--acc2)]" />,
};

const VERBS: Record<string, string> = {
  edit: "Edited",
  hide: "Hid",
  restore: "Restored",
  "set-role": "Role changed for",
};

function entityHref(e: ActivityEntry): string | null {
  if (e.entityType === "artist") return `/artists/${e.entityId}`;
  if (e.entityType === "venue") return `/venues/${e.entityId}`;
  return null;
}

export function ActivityClient() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { data, isLoading: entriesLoading } = useMyActivity();

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
        <LoginPanel nextPath="/activity" title="Sign in to see your activity" />
      </div>
    );
  }

  const entries = data?.entries ?? [];

  return (
    <div className="mx-auto max-w-content px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+16px)] lg:px-8 lg:pb-10 lg:pt-8">
      <header className="mb-5">
        <h1 className="text-[26px] font-black tracking-tight lg:text-4xl">My activity</h1>
        <p className="mt-1 text-[13px] font-semibold text-dim lg:text-[15px]">
          {user?.displayName ? `${user.displayName} · ` : ""}
          {entries.length} action{entries.length === 1 ? "" : "s"} recorded
        </p>
      </header>

      {entriesLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[52px] animate-pulse rounded-2xl border border-line bg-card" />
          ))}
        </div>
      ) : entries.length ? (
        <ul className="space-y-2">
          {entries.map((e, i) => {
            const href = entityHref(e);
            const inner = (
              <div className="flex items-center gap-3 rounded-2xl border border-line glass px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  {ICONS[e.action] ?? <Pencil size={14} className="text-dim" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-txt">
                    {VERBS[e.action] ?? e.action} {e.entityName || e.entityType}
                  </span>
                  <span className="block truncate text-[12px] font-semibold text-dim">
                    {e.entityType}
                    {e.detail ? ` · ${e.detail}` : ""}
                  </span>
                </span>
                <time className="shrink-0 text-[11.5px] font-bold text-dim2">
                  {new Date(e.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            );
            return <li key={`${e.at}-${i}`}>{href ? <Link href={href}>{inner}</Link> : inner}</li>;
          })}
        </ul>
      ) : (
        <p className="py-16 text-center font-semibold text-dim">
          Nothing yet. Edits you make as a bndy builder show here.
        </p>
      )}
    </div>
  );
}
