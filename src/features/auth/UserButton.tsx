"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { BadgePlus, CircleHelp, History, LogOut, Settings, SlidersHorizontal, UserCog, UserRound, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { openGigFilterPreferences } from "@/features/gigs/MyGigTools";
import { ProfileSetup } from "./ProfileSetup";

function displayName(name?: string | null, email?: string | null, username?: string | null): string {
  return name || username || email || "Account";
}

export function UserButton({ variant = "sidebar" }: { variant?: "sidebar" | "top" | "map" }) {
  const { user, isAuthenticated, isLoading, signOut, role, isCurator } = useAuth();
  const [open, setOpen] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <Link href="/login" aria-label="Login or Register" className={cn("flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[13.5px] font-extrabold text-txt transition-colors hover:bg-white/5", (variant === "top" || variant === "map") && "border-0 px-2")}>
        <UserRound size={18} className="text-[var(--acc)]" />
        <span className={cn(variant === "top" && "hidden sm:inline", variant === "map" && "hidden")}>Login or Register</span>
      </Link>
    );
  }

  const name = displayName(user?.displayName, user?.email, user?.username);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${name} account menu`}
        className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13.5px] font-extrabold text-txt transition-colors hover:bg-white/5", (variant === "top" || variant === "map") && "px-2")}
      >
        <UserRound size={18} className="text-[var(--acc)]" />
        <span className={cn("truncate", variant === "top" && "hidden sm:inline", variant === "map" && "hidden")}>{name}</span>
      </button>
      {open && (
        <div role="menu" aria-label="Account options" className={cn("absolute z-40 w-52 rounded-xl border border-line glass-hi p-2 shadow-xl", variant === "top" ? "right-0 top-full mt-2" : variant === "map" ? "bottom-full left-0 mb-2" : "left-0 top-full mt-2")}>
          <p className="truncate px-2 pb-1 pt-0.5 text-[12.5px] font-extrabold text-txt">{name}</p>
          {role && role !== "user" && <p className="px-2 pb-2 text-[11px] font-extrabold uppercase tracking-wide text-dim">{role}</p>}
          <button role="menuitem" type="button" onClick={() => { setOpen(false); setShowProfileEdit(true); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13.5px] font-bold text-dim transition-colors hover:bg-white/5 hover:text-txt"><Settings size={16} />Edit Profile</button>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); openGigFilterPreferences(); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13.5px] font-bold text-dim transition-colors hover:bg-white/5 hover:text-txt"><SlidersHorizontal size={16} className="text-[#e93d94]" />My Filters</button>
          <Link role="menuitem" href="/manage" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13.5px] font-bold text-dim transition-colors hover:bg-white/5 hover:text-txt"><UserCog size={16} />Manage artists & venues</Link>
          <Link role="menuitem" href="/join" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13.5px] font-bold text-[var(--acc-text)] transition-colors hover:bg-white/5"><BadgePlus size={16} />Join as artist or venue</Link>
          {isCurator && <Link role="menuitem" href="/activity" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13.5px] font-bold text-dim transition-colors hover:bg-white/5 hover:text-txt"><History size={16} />My activity</Link>}
          <Link role="menuitem" href="/help" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13.5px] font-bold text-dim transition-colors hover:bg-white/5 hover:text-txt lg:hidden"><CircleHelp size={16} />Help</Link>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); signOut(); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13.5px] font-bold text-dim transition-colors hover:bg-white/5 hover:text-txt"><LogOut size={16} />Sign out</button>
        </div>
      )}

      {showProfileEdit && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 py-[max(1rem,env(safe-area-inset-top))]" role="dialog" aria-modal="true" aria-label="Edit profile">
          <div className="relative w-full max-w-sm">
            <button type="button" onClick={() => setShowProfileEdit(false)} aria-label="Close edit profile" className="absolute -right-2 -top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card text-dim shadow-[var(--shadow)] hover:text-txt"><X size={18} /></button>
            <ProfileSetup mode="edit" initialData={{ displayName: user?.displayName, firstName: user?.firstName, lastName: user?.lastName, hometown: user?.hometown }} onComplete={() => setShowProfileEdit(false)} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
