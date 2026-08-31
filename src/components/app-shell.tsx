"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowRight, BadgePlus, CalendarRange, CircleHelp, Music, Map as MapIcon, MapPin, Plus, Users } from "lucide-react";
import { SkinControl } from "@/components/SkinPicker";
import { Splash } from "@/components/Splash";
import { LiveTicker } from "@/components/LiveTicker";
import { BrandWordmark } from "@/components/BrandWordmark";
import { UserButton } from "@/features/auth/UserButton";
import { MyGigFilterHost, MyGigsInlineControl, MyGigsQuickControl } from "@/features/gigs/MyGigTools";
import { cn } from "@/lib/cn";
import { Disclaimer } from "@/components/Disclaimer";
import type { ReactNode } from "react";

const NAV = [
  { key: "map", label: "Map", href: "/map", icon: MapIcon },
  { key: "venues", label: "Venues", href: "/map?mode=venues", icon: MapPin },
  { key: "gigs", label: "Gigs", href: "/gigs", icon: Music },
  { key: "artists", label: "Artists", href: "/artists", icon: Users },
  { key: "add", label: "Add", href: "/add", icon: Plus },
] as const;

function activeKey(path: string, mapMode: string | null): string {
  if (path.startsWith("/festivals")) return "festivals";
  if (path.startsWith("/artists")) return "artists";
  if (path.startsWith("/gigs")) return "gigs";
  if (path.startsWith("/add")) return "add";
  if (path.startsWith("/map") && mapMode === "venues") return "venues";
  if (path.startsWith("/map") || path === "/") return "map";
  return "none";
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const searchParams = useSearchParams();
  const active = activeKey(path, searchParams.get("mode"));
  const gigDiscoveryView = path.startsWith("/map") || path.startsWith("/gigs");

  if (path.startsWith("/list-a-gig")) {
    return (
      <div className="min-h-[100dvh]">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pb-1 lg:px-8" style={{ paddingTop: `calc(1.25rem + env(safe-area-inset-top, 0px))` }}>
          <span className="flex items-center gap-1 text-2xl font-black tracking-tight">
            <BrandWordmark className="h-6 w-auto text-[var(--acc)] brand-glow" />
            <span className="text-txt">.live</span>
          </span>
          <div className="flex items-center gap-3">
            <UserButton variant="top" />
            <Link href="/gigs" className="text-[12.5px] font-extrabold text-dim transition-colors hover:text-txt">Browse gigs →</Link>
          </div>
        </header>
        <p className="mx-auto max-w-5xl px-4 pb-4 text-[12px] font-bold uppercase tracking-[1.5px] text-dim2 lg:px-8">Keeping live music alive</p>
        <main>{children}</main>
        <SkinControl variant="fab" />
        <MyGigFilterHost />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <Splash />
      <LiveTicker />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line glass px-4 py-5 lg:flex">
        <Link href="/" className="mb-6 flex shrink-0 items-center gap-1 px-2 text-2xl font-black tracking-tight">
          <BrandWordmark className="h-6 w-auto text-[var(--acc)] brand-glow" />
          <span className="text-txt">.live</span>
        </Link>
        <div className="mb-3 shrink-0">
          <UserButton variant="sidebar" />
        </div>
        <Link href="/join" className="group mb-4 flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 transition hover:border-[var(--acc)] hover:bg-white/5">
          <BadgePlus size={16} className="shrink-0 text-[var(--acc-text)]" />
          <span className="min-w-0 flex-1 text-[11px] font-black leading-tight text-txt">Manage an artist or venue?</span>
          <ArrowRight size={14} className="shrink-0 text-dim transition-transform group-hover:translate-x-1 group-hover:text-[var(--acc-text)]" />
        </Link>
        {gigDiscoveryView && (
          <div className="mb-5 shrink-0 px-1">
            <MyGigsInlineControl className="w-full" />
          </div>
        )}
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {NAV.map(({ key, label, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-[15px] font-bold transition-colors",
                active === key
                  ? "border-[var(--acc)] bg-acc text-on-acc"
                  : "border-transparent text-dim hover:bg-card2 hover:text-txt",
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
          <div className="my-1.5 h-px shrink-0 bg-line" />
          <Link
            href="/festivals"
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-[15px] font-bold transition-colors",
              active === "festivals"
                ? "border-[var(--acc)] bg-acc text-on-acc"
                : "border-transparent text-dim hover:bg-card2 hover:text-txt",
            )}
          >
            <CalendarRange size={20} />
            Festivals
          </Link>
        </nav>
        <Link
          href="/help"
          className={cn(
            "mt-2 flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-bold transition-colors",
            path.startsWith("/help") ? "bg-white/10 text-txt" : "text-dim hover:bg-white/5 hover:text-txt",
          )}
        >
          <CircleHelp size={19} className={path.startsWith("/help") ? "text-[var(--acc)]" : ""} />
          Help
        </Link>
        <SkinControl variant="sidebar" />
      </aside>

      <main className="lg:pl-60" style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top, 0px))` }}>{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-line glass-hi pb-safe lg:hidden">
        {NAV.map(({ key, label, href, icon: Icon }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-extrabold tracking-wide transition-colors",
                isActive ? "text-[var(--acc)]" : "text-dim",
              )}
            >
              {isActive && <span className="absolute inset-x-2 bottom-1 top-1 rounded-xl bg-[color-mix(in_srgb,var(--acc)_12%,transparent)]" />}
              {isActive && <span className="absolute top-0 h-[3px] w-8 rounded-b bg-acc shadow-[0_0_12px_var(--acc)]" />}
              <span className={cn(
                "relative z-10 flex h-7 w-9 items-center justify-center rounded-lg transition-all",
                isActive && "bg-acc text-on-acc shadow-[0_0_14px_color-mix(in_srgb,var(--acc)_35%,transparent)]",
              )}>
                <Icon size={20} />
              </span>
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-[4.75rem] z-40 flex h-12 w-12 items-center justify-center rounded-full border border-line glass-hi shadow-[var(--shadow)] lg:hidden">
        <UserButton variant="map" />
      </div>
      <SkinControl variant="fab" side="left" />
      {gigDiscoveryView && <MyGigsQuickControl />}
      <MyGigFilterHost />

      <Disclaimer />
    </div>
  );
}
