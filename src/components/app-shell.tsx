"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, Music, Map as MapIcon, MapPin, Plus, Users } from "lucide-react";
import { SkinControl } from "@/components/SkinPicker";
import { Splash } from "@/components/Splash";
import { LiveTicker } from "@/components/LiveTicker";
import { UserButton } from "@/features/auth/UserButton";
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

function activeKey(path: string): string {
  if (path.startsWith("/artists")) return "artists";
  if (path.startsWith("/gigs")) return "gigs";
  if (path.startsWith("/add")) return "add";
  return "map";
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const active = activeKey(path);
  const isMapPage = path === "/map";

  // Standalone branded webform — no app chrome, shareable straight into FB groups etc.
  if (path.startsWith("/list-a-gig")) {
    return (
      <div className="min-h-[100dvh]">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-4 pb-1 lg:px-8" style={{ paddingTop: `calc(1.25rem + env(safe-area-inset-top, 0px))` }}>
          <span className="text-2xl font-black tracking-tight">
            <span className="text-[var(--acc)] brand-glow">bndy</span>
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
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <Splash />
      <LiveTicker />
      {/* ---- mobile account control. Keep it out of the map filter row; the map
           gets a bottom-left utility button beside the skin selector instead. ---- */}
      {!isMapPage && (
        <div
          className="fixed right-3 z-30 lg:hidden"
          style={{ top: `calc(1.5rem + env(safe-area-inset-top, 0px))` }}
        >
          <span className="block rounded-xl glass">
            <UserButton variant="top" />
          </span>
        </div>
      )}
      {/* ---- desktop sidebar ---- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line glass px-4 py-5 lg:flex">
        <Link href="/" className="mb-6 shrink-0 px-2 text-2xl font-black tracking-tight">
          <span className="text-[var(--acc)] brand-glow">bndy</span>
          <span className="text-txt">.live</span>
        </Link>
        <div className="mb-6 shrink-0">
          <UserButton variant="sidebar" />
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {NAV.map(({ key, label, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold transition-colors",
                active === key ? "bg-white/10 text-txt" : "text-dim hover:text-txt hover:bg-white/5",
              )}
            >
              <Icon size={20} className={active === key ? "text-[var(--acc)]" : ""} />
              {label}
            </Link>
          ))}
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

      {/* ---- content ---- */}
      <main className="lg:pl-60" style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top, 0px))` }}>{children}</main>

      {/* ---- mobile bottom nav ---- */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-line glass-hi pb-safe lg:hidden">
        {NAV.map(({ key, label, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-extrabold tracking-wide",
              active === key ? "text-txt" : "text-dim",
            )}
          >
            {active === key && (
              <span className="absolute top-0 h-[3px] w-7 rounded-b bg-acc shadow-[0_0_12px_var(--acc)]" />
            )}
            <Icon size={22} className={active === key ? "text-[var(--acc)] drop-shadow-[0_0_8px_var(--acc)]" : ""} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Map mobile utilities: skin + account stay together bottom-left, leaving
          bottom-right exclusively for MapLibre location/zoom controls. */}
      {isMapPage && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-[4.75rem] z-40 flex h-12 w-12 items-center justify-center rounded-full border border-line glass-hi shadow-[var(--shadow)] lg:hidden">
          <UserButton variant="map" />
        </div>
      )}

      {/* map page: fab moves bottom-left — bottom-right is maplibre zoom + locate */}
      <SkinControl variant="fab" side={active === "map" ? "left" : "right"} />

      <Disclaimer />
    </div>
  );
}
