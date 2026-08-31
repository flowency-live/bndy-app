"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, Map as MapIcon, Music, Users } from "lucide-react";
import type { ReactNode } from "react";
import { BrandWordmark } from "@/components/BrandWordmark";
import { SkinControl } from "@/components/SkinPicker";
import { UserButton } from "@/features/auth/UserButton";
import { cn } from "@/lib/cn";

const NAV = [
  { key: "concerts", label: "Concerts", href: "/concerts", icon: Music },
  { key: "bands", label: "Bands", href: "/bands", icon: Users },
  { key: "festivals", label: "Festivals", href: "/festivals", icon: CalendarRange },
  { key: "map", label: "Map", href: "/map", icon: MapIcon },
] as const;

function activeKey(path: string): string {
  if (path.startsWith("/concerts")) return "concerts";
  if (path.startsWith("/bands")) return "bands";
  if (path.startsWith("/festivals")) return "festivals";
  if (path.startsWith("/map") || path === "/") return "map";
  return "none";
}

export function BrassAppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const active = activeKey(path);

  return (
    <div className="min-h-[100dvh]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line glass px-4 py-5 lg:flex">
        <Link href="/map" className="mb-6 flex shrink-0 items-center gap-2 px-2 text-2xl font-black tracking-tight">
          <BrandWordmark className="h-6 w-auto text-[var(--acc)] brand-glow" />
          <span className="border border-line px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[1.6px] text-dim">Brass</span>
        </Link>
        <div className="mb-5 shrink-0"><UserButton variant="sidebar" /></div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {NAV.map(({ key, label, href, icon: Icon }) => (
            <Link key={key} href={href} className={cn("flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-[15px] font-bold transition-colors", active === key ? "border-[var(--acc)] bg-acc text-on-acc" : "border-transparent text-dim hover:bg-card2 hover:text-txt")}>
              <Icon size={20} />{label}
            </Link>
          ))}
        </nav>
        <SkinControl display="sidebar" />
      </aside>

      <main className="lg:pl-60" style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}>{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-line glass-hi pb-safe lg:hidden">
        {NAV.map(({ key, label, href, icon: Icon }) => {
          const isActive = active === key;
          return (
            <Link key={key} href={href} aria-current={isActive ? "page" : undefined} className={cn("relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-extrabold tracking-wide transition-colors", isActive ? "text-[var(--acc)]" : "text-dim")}>
              {isActive && <span className="absolute inset-x-2 bottom-1 top-1 rounded-xl bg-[color-mix(in_srgb,var(--acc)_12%,transparent)]" />}
              <span className={cn("relative z-10 flex h-7 w-9 items-center justify-center rounded-lg", isActive && "bg-acc text-on-acc")}><Icon size={20} /></span>
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>
      <SkinControl display="fab" side="left" />
    </div>
  );
}
