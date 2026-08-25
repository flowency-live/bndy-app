"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Building2, Music2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { trackJoin } from "./joinAnalytics";

const paths = [
  {
    href: "/join/artist",
    entityType: "artist" as const,
    eyebrow: "Artists & bands",
    title: "This is my artist",
    body: "Find the artist already in bndy  -  including known names and locations  -  or create a genuinely new one.",
    icon: Music2,
    accent: "from-[color-mix(in_srgb,var(--acc)_18%,transparent)] to-transparent",
  },
  {
    href: "/join/venue",
    entityType: "venue" as const,
    eyebrow: "Venues",
    title: "I run a venue",
    body: "Find your venue by name and place. If it isn't here yet, we'll get it on bndy without the admin slog.",
    icon: Building2,
    accent: "from-[color-mix(in_srgb,var(--secondary)_16%,transparent)] to-transparent",
  },
] as const;

export function JoinPageClient() {
  useEffect(() => { trackJoin("join_opened", { step: "entry" }); }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 pb-36 pt-7 sm:px-6 lg:pt-12">
      <section className="mx-auto max-w-2xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-line glass px-3 py-1.5 font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc-text)]">
          <Sparkles size={12} /> Join bndy
        </div>
        <h1 className="font-disp mt-5 text-[42px] font-black leading-[0.95] tracking-[-1.7px] sm:text-[58px]">
          Your music.<br />Your place on bndy.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[14px] font-semibold leading-relaxed text-dim sm:text-[15px]">
          Already listed? Brilliant  -  we&apos;ll find you. Brand new? We&apos;ll get you set up. Either way, we start by making sure we&apos;ve got the right artist or venue.
        </p>
      </section>

      <section className="mx-auto mt-9 grid max-w-3xl gap-3 md:grid-cols-2">
        {paths.map(({ href, entityType, eyebrow, title, body, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            onClick={() => trackJoin("entity_type_selected", { entityType, step: "entry" })}
            className="group relative min-h-[238px] overflow-hidden rounded-[28px] border border-line glass p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--acc)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)]"
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`} />
            <div className="relative flex h-full flex-col">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-acc text-on-acc shadow-sm"><Icon size={23} /></span>
              <div className="mt-7 font-meta text-[9px] font-black uppercase tracking-[1.4px] text-[var(--acc-text)]">{eyebrow}</div>
              <h2 className="font-disp mt-1 text-[27px] font-black tracking-tight">{title}</h2>
              <p className="mt-2 text-[12.5px] font-semibold leading-relaxed text-dim">{body}</p>
              <div className="mt-auto flex items-center gap-2 pt-5 text-[12px] font-black text-[var(--acc-text)]">
                Let&apos;s find you <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="mx-auto mt-6 grid max-w-3xl gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-[11.5px] font-bold text-dim"><Search size={16} className="shrink-0 text-[var(--acc-text)]" /> We check before creating</div>
        <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-[11.5px] font-bold text-dim"><ShieldCheck size={16} className="shrink-0 text-[var(--acc-text)]" /> Your page stays yours</div>
        <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-[11.5px] font-bold text-dim"><Sparkles size={16} className="shrink-0 text-[var(--acc-text)]" /> Free to join</div>
      </section>

      <p className="mx-auto mt-7 max-w-xl text-center text-[10.5px] font-semibold leading-relaxed text-dim2">
        If your page is already on bndy, we&apos;ll take you through claiming it rather than making a duplicate.
      </p>
    </main>
  );
}
