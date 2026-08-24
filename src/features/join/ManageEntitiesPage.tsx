"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Building2, Check, Clipboard, ExternalLink, Loader2, MailPlus, Music2, RefreshCw, Shield, Trash2, UserCog } from "lucide-react";
import { AuthGate } from "@/features/auth/AuthGate";
import {
  createArtistInviteLink,
  createVenueDelegateInvite,
  getManagedArtists,
  getManagedVenues,
  getMyClaims,
  getVenueMembers,
  revokeVenueDelegate,
  type EntityMember,
  type ManagedArtist,
  type ManagedVenue,
} from "./manageApi";

export function ManageEntitiesPage() {
  const [artists, setArtists] = useState<ManagedArtist[]>([]);
  const [venues, setVenues] = useState<ManagedVenue[]>([]);
  const [claims, setClaims] = useState<Array<{ claim_id: string; entity_type: "artist" | "venue"; entity_id: string; entity_name: string; status: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [nextArtists, nextVenues, nextClaims] = await Promise.all([getManagedArtists(), getManagedVenues(), getMyClaims()]);
      setArtists(nextArtists); setVenues(nextVenues); setClaims(nextClaims);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load your bndy entities."); }
    finally { setLoading(false); }
  }, []);

  return (
    <AuthGate title="Sign in to manage bndy">
      <main className="mx-auto max-w-4xl px-4 pb-36 pt-7 sm:px-6 lg:pt-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">Your bndy</div><h1 className="font-disp mt-1 text-[38px] font-black leading-none tracking-tight">The things you run.</h1><p className="mt-3 max-w-xl text-[13px] font-semibold leading-relaxed text-dim">Artists, venues, pending claims and the people you trust to help. Nobody needs to share a password.</p></div>
          <button type="button" disabled={loading} onClick={load} className="bndy-btn flex min-h-10 items-center justify-center gap-2 px-4 text-[11px]"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>
        </header>

        <ManageLoadOnce onLoad={load} />

        {error && <div className="mt-5 rounded-2xl border border-red-500/30 px-4 py-3 text-[12px] font-bold text-red-500">{error}</div>}
        {loading && <div className="mt-10 flex justify-center"><Loader2 size={22} className="animate-spin text-dim" /></div>}

        {!loading && (
          <div className="mt-8 space-y-8">
            {claims.filter((claim) => claim.status === "pending").length > 0 && (
              <section><div className="flex items-center gap-2"><Shield size={16} className="text-[var(--acc-text)]" /><h2 className="font-disp text-[24px] font-black">Claims being checked</h2></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{claims.filter((claim) => claim.status === "pending").map((claim) => <div key={claim.claim_id} className="rounded-[20px] border border-line glass p-4"><div className="text-[14px] font-black">{claim.entity_name}</div><div className="mt-1 text-[10px] font-black uppercase tracking-wide text-[var(--acc-text)]">{claim.entity_type} · pending verification</div><p className="mt-2 text-[11px] font-semibold text-dim">Requested {new Date(claim.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. The public page stays untouched until approval.</p></div>)}</div></section>
            )}

            <section>
              <div className="flex items-center gap-2"><Music2 size={17} className="text-[var(--acc-text)]" /><h2 className="font-disp text-[24px] font-black">Artists</h2><span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-black text-dim">{artists.length}</span></div>
              {artists.length === 0 ? <EmptyState text="No artist relationships yet." href="/join/artist" label="Join as an artist" /> : <div className="mt-3 grid gap-3 md:grid-cols-2">{artists.map((artist) => <ArtistManageCard key={artist.membershipId || artist.id} artist={artist} />)}</div>}
            </section>

            <section>
              <div className="flex items-center gap-2"><Building2 size={17} className="text-[var(--acc-text)]" /><h2 className="font-disp text-[24px] font-black">Venues</h2><span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-black text-dim">{venues.length}</span></div>
              {venues.length === 0 ? <EmptyState text="No venue relationships yet." href="/join/venue" label="Join as a venue" /> : <div className="mt-3 space-y-3">{venues.map((venue) => <VenueManageCard key={venue.membershipId || venue.id} venue={venue} />)}</div>}
            </section>
          </div>
        )}
      </main>
    </AuthGate>
  );
}

function ManageLoadOnce({ onLoad }: { onLoad: () => Promise<void> }) {
  useEffect(() => { void onLoad(); }, [onLoad]);
  return null;
}

function EmptyState({ text, href, label }: { text: string; href: string; label: string }) {
  return <div className="mt-3 rounded-[22px] border border-dashed border-line px-5 py-8 text-center"><p className="text-[12px] font-semibold text-dim">{text}</p><Link href={href} className="mt-3 inline-flex text-[11px] font-black text-[var(--acc-text)]">{label}</Link></div>;
}

function ArtistManageCard({ artist }: { artist: ManagedArtist }) {
  const [creating, setCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeInvite = async () => {
    setCreating(true); setError(null);
    try { setInviteLink(await createArtistInviteLink(artist.id)); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not create invite."); }
    finally { setCreating(false); }
  };
  const copyInvite = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  };

  return <article className="rounded-[24px] border border-line glass p-5"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-card2">{artist.profileImageUrl ? <img src={artist.profileImageUrl} alt="" className="h-full w-full object-cover" /> : <Music2 size={19} />}</div><div className="min-w-0 flex-1"><div className="truncate text-[16px] font-black">{artist.name}</div><div className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-[var(--acc-text)]">{artist.role}</div>{artist.location && <div className="mt-1 truncate text-[11px] font-semibold text-dim">{artist.location}</div>}</div><Link href={`/artists/${artist.id}`} className="text-dim hover:text-txt" aria-label={`Open ${artist.name}`}><ExternalLink size={15} /></Link></div>{artist.role === "owner" || artist.role === "admin" ? <div className="mt-4 border-t border-line pt-4"><div className="flex items-center gap-2 text-[11.5px] font-black"><UserCog size={14} /> Invite a bandmate or manager</div><p className="mt-1 text-[10.5px] font-semibold text-dim">Create a normal bndy invite link. They use their own account, no shared login.</p>{inviteLink ? <div className="mt-3 flex gap-2"><div className="min-w-0 flex-1 truncate rounded-xl border border-line px-3 py-2 text-[10.5px] font-semibold text-dim">{inviteLink}</div><button type="button" onClick={copyInvite} className="bndy-btn flex min-h-9 items-center gap-1.5 px-3 text-[10px]">{copied ? <Check size={13} /> : <Clipboard size={13} />}{copied ? "Copied" : "Copy"}</button></div> : <button type="button" onClick={makeInvite} disabled={creating} className="bndy-btn mt-3 flex min-h-9 items-center gap-2 px-3 text-[10.5px]">{creating ? <Loader2 size={13} className="animate-spin" /> : <MailPlus size={13} />} Create invite link</button>}{error && <p className="mt-2 text-[10.5px] font-bold text-red-500">{error}</p>}</div> : null}</article>;
}

function VenueManageCard({ venue }: { venue: ManagedVenue }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<EntityMember[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadMembers = async () => {
    setLoading(true); setError(null);
    try { setMembers(await getVenueMembers(venue.id)); setOpen(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load delegates."); }
    finally { setLoading(false); }
  };
  const invite = async () => {
    if (!email.trim()) return;
    setLoading(true); setError(null); setInviteLink(null);
    try {
      const result = await createVenueDelegateInvite(venue.id, email.trim(), "admin");
      setInviteLink(result.inviteLink);
      setEmail("");
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the invitation.");
    } finally { setLoading(false); }
  };
  const copyInvite = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  };
  const revoke = async (member: EntityMember) => {
    setLoading(true); setError(null);
    try { await revokeVenueDelegate(member.membership_id); setMembers(await getVenueMembers(venue.id)); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not remove delegate."); }
    finally { setLoading(false); }
  };

  return <article className="rounded-[24px] border border-line glass p-5"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-card2">{venue.profileImageUrl ? <img src={venue.profileImageUrl} alt="" className="h-full w-full object-cover" /> : <Building2 size={19} />}</div><div className="min-w-0 flex-1"><div className="truncate text-[16px] font-black">{venue.name}</div><div className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-[var(--acc-text)]">{venue.role}</div><div className="mt-1 text-[11px] font-semibold text-dim">{venue.address || venue.city}</div></div><Link href={`/venues/${venue.id}`} className="text-dim hover:text-txt" aria-label={`Open ${venue.name}`}><ExternalLink size={15} /></Link></div>{venue.role === "owner" && <div className="mt-4 border-t border-line pt-4"><button type="button" disabled={loading} onClick={() => open ? setOpen(false) : void loadMembers()} className="flex items-center gap-2 text-[11.5px] font-black"><UserCog size={14} /> {open ? "Hide delegates" : "Manage delegates"}</button>{open && <div className="mt-4 space-y-3"><div><div className="flex gap-2"><input value={email} onChange={(event) => { setEmail(event.target.value); setInviteLink(null); }} type="email" placeholder="delegate@email.com" className="min-w-0 flex-1 rounded-xl border border-line bg-transparent px-3 py-2 text-[12px] font-semibold outline-none focus:border-[var(--acc)]" /><button type="button" disabled={loading || !email.trim()} onClick={invite} className="bndy-btn2 min-h-9 px-3 text-[10.5px]">Invite</button></div><p className="mt-1.5 text-[10px] font-semibold text-dim">The link is locked to that email address and expires after seven days.</p></div>{inviteLink && <div className="flex gap-2 rounded-xl border border-[var(--acc)] p-2"><div className="min-w-0 flex-1 truncate px-1 py-1.5 text-[10.5px] font-semibold text-dim">{inviteLink}</div><button type="button" onClick={copyInvite} className="bndy-btn flex min-h-8 shrink-0 items-center gap-1.5 px-2.5 text-[10px]">{copied ? <Check size={12} /> : <Clipboard size={12} />}{copied ? "Copied" : "Copy link"}</button></div>}<div className="divide-y divide-line rounded-xl border border-line">{members.filter((member) => member.status === "active").map((member) => <div key={member.membership_id} className="flex items-center gap-3 px-3 py-2.5"><BadgeCheck size={14} className={member.role === "owner" ? "text-[var(--acc-text)]" : "text-dim"} /><div className="min-w-0 flex-1"><div className="truncate text-[11.5px] font-black">{member.user?.displayName || member.user?.email || member.user_id}</div><div className="text-[9.5px] font-black uppercase tracking-wide text-dim">{member.role}</div></div>{member.role !== "owner" && <button type="button" disabled={loading} onClick={() => void revoke(member)} className="text-dim hover:text-red-500" aria-label="Remove delegate"><Trash2 size={14} /></button>}</div>)}</div></div>}{error && <p className="mt-3 text-[10.5px] font-bold text-red-500">{error}</p>}</div>}</article>;
}
