"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, Building2, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { AuthGate } from "@/features/auth/AuthGate";
import { acceptEntityInvite, getEntityInvite, type EntityInvite } from "@/features/join/manageApi";
import { trackJoin } from "@/features/join/joinAnalytics";

export default function JoinEntityInvitePage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const [invite, setInvite] = useState<EntityInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    setLoading(true);
    getEntityInvite(token)
      .then((next) => { if (!cancelled) setInvite(next); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "This invite could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const accept = async () => {
    if (!token) return;
    setAccepting(true); setError(null);
    try {
      await acceptEntityInvite(token);
      trackJoin("delegate_invitation_accepted", { entityType: "venue", step: "delegate_invite" });
      setAccepted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This invite could not be accepted.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <main className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center px-4"><Loader2 size={24} className="animate-spin text-dim" /></main>;
  }

  if (!invite) {
    return <main className="mx-auto max-w-xl px-4 pb-32 pt-12 text-center"><div className="font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">Invite</div><h1 className="font-disp mt-2 text-[34px] font-black">This link is not available.</h1><p className="mt-3 text-[13px] font-semibold text-dim">{error || "It may have expired, been revoked, or already been used."}</p><Link href="/" className="bndy-btn mt-6 inline-flex min-h-11 items-center px-4 text-[12px]">Back to bndy</Link></main>;
  }

  if (accepted) {
    return <main className="mx-auto max-w-xl px-4 pb-32 pt-12 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-acc text-on-acc"><CheckCircle2 size={30} /></span><div className="mt-5 font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">Access added</div><h1 className="font-disp mt-2 text-[36px] font-black">You can now help manage {invite.entityName}.</h1><p className="mt-3 text-[13px] font-semibold text-dim">You joined with your own bndy account. No shared passwords, and the owner can change or remove your access later.</p><Link href="/manage" className="bndy-btn2 mt-7 inline-flex min-h-11 items-center px-5 text-[12px]">Open your managed entities</Link></main>;
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-32 pt-8 lg:pt-12">
      <header className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-acc text-on-acc"><Building2 size={25} /></span>
        <div className="mt-5 font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">Venue invitation</div>
        <h1 className="font-disp mt-2 text-[36px] font-black leading-none">Help manage {invite.entityName}</h1>
        <p className="mx-auto mt-4 max-w-md text-[13px] font-semibold leading-relaxed text-dim">You&apos;ve been invited as <b>{invite.role}</b>. This invitation is tied to {invite.emailHint || "the invited email address"} and expires {new Date(invite.expiresAt * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.</p>
      </header>

      <AuthGate title="Sign in with the invited account">
        <section className="mt-7 rounded-[24px] border border-[var(--acc)] glass p-5">
          <div className="flex items-start gap-3"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-[var(--acc-text)]" /><div><div className="text-[15px] font-black">Your own account, their venue.</div><p className="mt-1 text-[12px] font-semibold leading-relaxed text-dim">We&apos;ll verify that your signed-in email matches the invitation before access is added.</p></div></div>
          {error && <p className="mt-4 rounded-xl border border-red-500/30 px-3 py-2 text-[11.5px] font-bold text-red-500">{error}</p>}
          <button type="button" onClick={accept} disabled={accepting} className="bndy-btn2 mt-5 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-[12px] disabled:opacity-50">{accepting ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />} Accept invitation</button>
        </section>
      </AuthGate>
    </main>
  );
}
