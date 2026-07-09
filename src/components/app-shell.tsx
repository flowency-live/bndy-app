"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Music, Map as MapIcon, Users, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { SkinControl } from "@/components/SkinPicker";
import { Splash } from "@/components/Splash";
import { LiveTicker } from "@/components/LiveTicker";
import { cn } from "@/lib/cn";
import { Disclaimer } from "@/components/Disclaimer";
import type { ReactNode } from "react";

const NAV = [
  { key: "gigs", label: "Gigs", href: "/", icon: Music },
  { key: "map", label: "Map", href: "/map", icon: MapIcon },
  { key: "artists", label: "Artists", href: "/artists", icon: Users },
] as const;

function activeKey(path: string): string {
  if (path.startsWith("/artists")) return "artists";
  if (path.startsWith("/map")) return "map";
  return "gigs";
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const active = activeKey(path);
  const { mode, toggle } = useTheme();

  return (
    <div className="min-h-[100dvh]">
      <Splash />
      <LiveTicker />
      {/* ---- desktop sidebar ---- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line glass px-4 py-5 lg:flex">
        <Link href="/" className="mb-8 px-2 text-2xl font-black tracking-tight">
          <span className="text-[var(--acc)] brand-glow">bndy</span>
          <span className="text-txt">.live</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ key, label, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-bold transition-colors",
                active === key ? "bg-white/10 text-txt" : "text-dim hover:text-txt hover:bg-white/5",
              )}
            >
              <Icon size={20} className={active === key ? "text-[var(--acc)]" : ""} />
              {label}
            </Link>
          ))}
        </nav>
        <SkinControl variant="sidebar" />
        <button
          onClick={toggle}
          className="mt-2 flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-[14px] font-bold text-dim transition-colors hover:text-txt"
        >
          {mode === "dark" ? <Moon size={18} /> : <Sun size={18} />}
          {mode === "dark" ? "Dark" : "Light"} mode
        </button>
      </aside>

      {/* ---- content ---- */}
      <main className="pt-6 lg:pl-60">{children}</main>

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

      <SkinControl variant="fab" />

      <Disclaimer />
    </div>
  );
}
