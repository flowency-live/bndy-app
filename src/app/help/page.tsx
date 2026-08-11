// Help page (backlog S4): what bndy is, add a gig, flag a problem, claim a page.
// Static, public, plain words. No em-dashes in rendered copy.

import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Flag, Heart, MapPin, Music, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Help · bndy",
  description: "What bndy is, how to add a gig, how to flag a problem, and how to claim your page.",
};

const h2 = "mt-8 flex items-center gap-2 text-[17px] font-black tracking-tight";
const p = "mt-2 text-[14.5px] leading-relaxed text-dim";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+16px)] lg:pb-12 lg:pt-8">
      <h1 className="text-[26px] font-black tracking-tight lg:text-4xl">Help</h1>
      <p className={p}>
        bndy keeps live music alive. It is a free map of real gigs at real venues,
        built by people who go to them. No algorithm, no ads, no ticket mark-up.
      </p>

      <h2 className={h2}><Music size={18} className="text-[var(--acc)]" /> Add a gig</h2>
      <p className={p}>
        Tap <b>Add</b> in the menu, sign in, and the wizard takes under a minute.
        Pick the artist, pick the venue, set the date. If the artist or venue is
        not on bndy yet, the wizard creates it for you. Free to list, always.
      </p>
      <Link
        href="/add"
        className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-line bg-white/5 px-4 py-2.5 text-[13px] font-extrabold transition-transform active:scale-[.97]"
      >
        Add a gig
      </Link>

      <h2 className={h2}><Heart size={18} className="text-[var(--acc)]" /> Favourites</h2>
      <p className={p}>
        Sign in and tap the heart on any artist or venue. Then use the heart
        filter on the map and the gig list to see only the acts and places you follow.
      </p>

      <h2 className={h2}><CalendarPlus size={18} className="text-[var(--acc)]" /> Save a gig to your calendar</h2>
      <p className={p}>
        Open any gig and tap <b>Add to calendar</b>. Google Calendar opens
        prefilled, or download the file for Apple, Outlook and everything else.
        No account needed.
      </p>

      <h2 className={h2}><Flag size={18} className="text-[var(--acc2)]" /> Flag a problem</h2>
      <p className={p}>
        Wrong date? Venue closed? Duplicate listing? Tap the small flag on any
        artist, venue or gig and tell us what is wrong. No account needed.
        If you are signed in, we can come back to you about it.
      </p>

      <h2 className={h2}><ShieldCheck size={18} className="text-[var(--acc)]" /> Claim your page</h2>
      <p className={p}>
        Are you the artist, or do you run the venue? Claiming is coming soon.
        Until then, email <a href="mailto:hello@bndy.co.uk" className="font-bold text-[var(--acc)]">hello@bndy.co.uk</a> from
        an address we can verify and we will set it up by hand. Once claimed,
        automated imports never touch your page again.
      </p>

      <h2 className={h2}><MapPin size={18} className="text-[var(--acc)]" /> Before you travel</h2>
      <p className={p}>
        Listings can change. Always check with the venue or their socials before
        you set out.
      </p>
    </div>
  );
}
