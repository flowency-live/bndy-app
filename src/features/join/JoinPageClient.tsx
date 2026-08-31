"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Layers3, Music2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { trackJoin } from "./joinAnalytics";

const paths = [
  {
    href: "/join/artist",
    entityType: "artist" as const,
    eyebrow: "Artists & bands",
    title: "Find or add an artist",
    body: "Search artists already on bndy. Claim the right page, or add a genuinely new artist after we check for duplicates.",
    icon: Music2,
    accent: "from-[color-mix(in_srgb,var(--acc)_18%,transparent)] to-transparent",
  },
  {
    href: "/join/venue",
    entityType: "venue" as const,
    eyebrow: "Venues",
    title: "Find or add a venue",
    body: "Search by venue name and place. Claim the right page, or add the physical venue if it is not on bndy yet.",
    icon: Building2,
    accent: "from-[color-mix(in_srgb,var(--secondary)_16%,transparent)] to-transparent",
  },
] as const;

export function JoinPageClient() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => { trackJoin("join_opened", { step: "entry" }); }, []);

  const goBack = () => {
    try {
      if (document.referrer) {
        const previous = new URL(document.referrer);
        if (previous.origin === window.location.origin && window.history.length > 1) {
          window.history.back();
          return;
        }
      }
    } catch {}
    router.push(isAuthenticated ? "/manage" : "/");
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pb-36 pt-7 sm:px-6 lg:pt-12">
      <button type="button" onClick={goBack} className="inline-flex items-center gap-1.5 text-[11px] font-black text-dim hover:text-[var(--acc-text)]">
        <ArrowLeft size={14} /> Back
      </button>
      <section className="mx-auto max-w-2xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-line glass px-3 py-1.5 font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc-text)]">
          <Sparkles size={12} /> Artists &amp; venues
        </div>
        <h1 className="font-disp mt-5 text-[42px] font-black leading-[0.95] tracking-[-1.7px] sm:text-[58px]">
          Find an artist<br />or venue.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[14px] font-semibold leading-relaxed text-dim sm:text-[15px]">
          {isAuthenticated
            ? "Add another artist or venue to your account. Search bndy first, then claim an existing page or add a genuinely new one."
            : "Search for your artist or venue page first. Then use a normal bndy account to claim it, or add a genuinely new one if it is not here yet."}
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
                Start searching <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="mx-auto mt-6 grid max-w-3xl gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-[11.5px] font-bold text-dim"><Search size={16} className="shrink-0 text-[var(--acc-text)]" /> We check before creating</div>
        <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-[11.5px] font-bold text-dim"><ShieldCheck size={16} className="shrink-0 text-[var(--acc-text)]" /> Ownership stays protected</div>
        <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-[11.5px] font-bold text-dim"><Layers3 size={16} className="shrink-0 text-[var(--acc-text)]" /> Manage multiple pages</div>
      </section>

      <p className="mx-auto mt-7 max-w-xl text-center text-[10.5px] font-semibold leading-relaxed text-dim2">
        If your page is already on bndy, we&apos;ll take you through claiming it rather than making a duplicate.
      </p>
    </main>
  );
}
