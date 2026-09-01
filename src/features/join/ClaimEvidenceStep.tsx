"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, CheckCircle2, ExternalLink, Facebook, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import {
  facebookPageVerificationStartUrl,
  facebookPageVerificationStatus,
  requestJoinClaim,
  type ManagedFacebookPage,
} from "./joinApi";
import { trackJoin } from "./joinAnalytics";

type Props = {
  entityType: "artist" | "venue";
  entityId: string;
  entityName: string;
  evidenceHints?: Record<string, string>;
};

type FacebookMessage = {
  type?: string;
  ok?: boolean;
  pages?: ManagedFacebookPage[];
  receipt?: string;
  error?: string;
};

export function ClaimEvidenceStep({ entityType, entityId, entityName, evidenceHints = {} }: Props) {
  const [relationshipKind, setRelationshipKind] = useState(entityType === "artist" ? "band_member" : "venue_manager");
  const [requestedRole, setRequestedRole] = useState<"owner" | "admin" | "member">(entityType === "artist" ? "member" : "admin");
  const [verificationMethod, setVerificationMethod] = useState<"manual" | "facebook_page">("manual");
  const [explanation, setExplanation] = useState("");
  const [supportingUrl, setSupportingUrl] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [facebookAvailable, setFacebookAvailable] = useState(false);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [facebookPages, setFacebookPages] = useState<ManagedFacebookPage[]>([]);
  const [facebookReceipt, setFacebookReceipt] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const verificationMethodTouched = useRef(false);

  const relationshipOptions = useMemo(() => entityType === "artist" ? [
    ["band_member", "I’m in the band", "member"],
    ["manager", "I manage this artist", "admin"],
    ["agent", "I represent / book this artist", "admin"],
    ["artist_owner", "I’m responsible for this artist", "owner"],
  ] : [
    ["venue_owner", "I own / run this venue", "owner"],
    ["venue_manager", "I manage this venue", "admin"],
  ], [entityType]);

  useEffect(() => {
    let active = true;
    facebookPageVerificationStatus()
      .then((available) => {
        if (!active) return;
        setFacebookAvailable(available);
        if (available && !verificationMethodTouched.current) setVerificationMethod("facebook_page");
      })
      .catch(() => { if (active) setFacebookAvailable(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const receiveFacebookPages = (event: MessageEvent<FacebookMessage>) => {
      if (popupRef.current && event.source !== popupRef.current) return;
      if (event.origin !== window.location.origin && event.origin !== "https://bndy.live") return;
      if (event.data?.type !== "bndy:facebook-page-verification") return;
      popupRef.current?.close();
      popupRef.current = null;
      setFacebookConnecting(false);
      if (!event.data.ok || !event.data.receipt) {
        setError(event.data.error || "Facebook Page verification did not complete. You can use manual evidence instead.");
        return;
      }
      const pages = Array.isArray(event.data.pages) ? event.data.pages : [];
      setFacebookPages(pages);
      setFacebookReceipt(event.data.receipt);
      setSelectedPageId(pages.length === 1 ? pages[0].id : "");
      if (pages.length === 0) {
        setError("Facebook did not return any Pages managed by this account. You can use manual evidence instead.");
      } else {
        setError(null);
      }
    };
    window.addEventListener("message", receiveFacebookPages);
    return () => window.removeEventListener("message", receiveFacebookPages);
  }, []);

  const chooseRelationship = (kind: string, role: string) => {
    setRelationshipKind(kind);
    setRequestedRole(role as "owner" | "admin" | "member");
  };

  const connectFacebook = () => {
    setError(null);
    setFacebookConnecting(true);
    const popup = window.open(
      facebookPageVerificationStartUrl(entityType, entityId),
      "bndy-facebook-page-verification",
      "popup,width=620,height=760,resizable=yes,scrollbars=yes",
    );
    if (!popup) {
      setFacebookConnecting(false);
      setError("Your browser blocked the Facebook window. Allow popups for bndy and try again.");
      return;
    }
    popupRef.current = popup;
  };

  const submit = async () => {
    if (verificationMethod === "manual" && !explanation.trim()) {
      setError("Tell us briefly how you’re connected so the claim can actually be verified.");
      return;
    }
    if (verificationMethod === "facebook_page" && (!facebookReceipt || !selectedPageId)) {
      setError("Connect Facebook and choose the official Page first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await requestJoinClaim({
        entityType,
        entityId,
        requestedRole,
        relationshipKind,
        verificationMethod,
        relationshipExplanation: verificationMethod === "manual" ? explanation.trim() : undefined,
        supportingUrl: verificationMethod === "manual" ? supportingUrl.trim() || undefined : undefined,
        officialEmail: verificationMethod === "manual" ? officialEmail.trim() || undefined : undefined,
        facebookVerificationReceipt: verificationMethod === "facebook_page" ? facebookReceipt : undefined,
        facebookEvidence: verificationMethod === "facebook_page" ? { verifiedPageId: selectedPageId } : undefined,
        evidenceHints,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      trackJoin("claim_requested", { entityType, step: "claim", result: verificationMethod });
      setSubmitted(true);
    } catch {
      setError("Network hiccup. Your claim was not sent. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-[22px] bg-[var(--surface-2)] p-5">
        <div className="flex items-center gap-2 text-[15px] font-black"><CheckCircle2 size={18} className="text-[var(--acc-text)]" />Evidence sent</div>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-dim">We’ve got your relationship and evidence. If it needs a human check, it will appear in bndy review. You can track it in Manage.</p>
        <Link href="/manage" className="bndy-btn2 mt-4 flex min-h-11 w-full items-center justify-center px-4 text-[12px]">Go to Manage</Link>
      </div>
    );
  }

  const canSubmit = verificationMethod === "manual" ? Boolean(explanation.trim()) : Boolean(facebookReceipt && selectedPageId);

  return (
    <section className="mt-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 text-[16px] font-black"><ShieldCheck size={18} className="text-[var(--acc-text)]" />Prove you’re connected</div>
        <p className="mt-1 text-[12px] font-semibold leading-relaxed text-dim">Being signed in proves who you are. We also need something that shows why you should manage <b>{entityName}</b>.</p>
      </div>

      <div>
        <div className="text-[10px] font-black uppercase tracking-[1.2px] text-dim">How are you connected?</div>
        <div className="mt-2 grid gap-2">
          {relationshipOptions.map(([kind, label, role]) => (
            <button key={kind} type="button" onClick={() => chooseRelationship(kind, role)} className={`rounded-xl border px-3 py-2.5 text-left text-[12px] font-black ${relationshipKind === kind ? "border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_10%,transparent)]" : "border-line text-dim"}`}>{label}</button>
          ))}
        </div>
      </div>

      {facebookAvailable && (
        <div>
          <div className="text-[10px] font-black uppercase tracking-[1.2px] text-dim">How would you like to verify?</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { verificationMethodTouched.current = true; setVerificationMethod("facebook_page"); setError(null); }} className={`rounded-xl border px-3 py-2.5 text-[12px] font-black ${verificationMethod === "facebook_page" ? "border-[#1877F2] bg-[#1877F2]/10" : "border-line text-dim"}`}>Facebook Page</button>
            <button type="button" onClick={() => { verificationMethodTouched.current = true; setVerificationMethod("manual"); setError(null); }} className={`rounded-xl border px-3 py-2.5 text-[12px] font-black ${verificationMethod === "manual" ? "border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_10%,transparent)]" : "border-line text-dim"}`}>Manual evidence</button>
          </div>
        </div>
      )}

      {verificationMethod === "facebook_page" && facebookAvailable ? (
        <div className="rounded-2xl border border-[#1877F2]/60 p-4">
          <div className="flex items-center gap-2 text-[13px] font-black"><Facebook size={16} />Verify with an official Facebook Page</div>
          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-dim">Even if you signed in with Facebook, connect once more so bndy can show the Pages you manage. bndy cannot post, edit or advertise.</p>
          {facebookPages.length === 0 ? (
            <button type="button" onClick={connectFacebook} disabled={facebookConnecting} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 text-[12px] font-black text-white disabled:opacity-50">
              {facebookConnecting ? <Loader2 size={15} className="animate-spin" /> : <Facebook size={15} />}
              {facebookConnecting ? "Waiting for Facebook" : "Connect Facebook to see your Pages"}
            </button>
          ) : (
            <div className="mt-4 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-[1.2px] text-dim">Choose the matching Page</div>
              {facebookPages.map((page) => (
                <label key={page.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 ${selectedPageId === page.id ? "border-[#1877F2] bg-[#1877F2]/10" : "border-line"}`}>
                  <input type="radio" name="facebook-page" value={page.id} checked={selectedPageId === page.id} onChange={() => setSelectedPageId(page.id)} />
                  <span className="min-w-0 flex-1 text-[12px] font-black">{page.name}</span>
                  <a href={page.pageUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${page.name} on Facebook`} className="text-dim hover:text-txt"><ExternalLink size={14} /></a>
                </label>
              ))}
              <button type="button" onClick={connectFacebook} disabled={facebookConnecting} className="min-h-10 text-[11px] font-black text-dim underline underline-offset-4 disabled:opacity-50">Use a different Facebook account</button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--acc)] p-4">
          <div className="flex items-center gap-2 text-[13px] font-black"><MessageSquareText size={16} />Tell bndy how we can verify you</div>
          <p className="mt-1 text-[11px] font-semibold text-dim">A sentence or two is enough. Give us something useful to check rather than just “this is mine”.</p>
          <label className="sr-only" htmlFor="claim-relationship-explanation">How bndy can verify your relationship</label>
          <textarea id="claim-relationship-explanation" value={explanation} onChange={(event) => { verificationMethodTouched.current = true; setExplanation(event.target.value); }} placeholder={entityType === "artist" ? "e.g. I’m the drummer and I run the band’s accounts." : "e.g. I manage the venue and handle the live music programme."} className="mt-3 min-h-24 w-full resize-y rounded-xl border border-line bg-transparent px-3 py-2.5 text-[12px] font-semibold outline-none focus:border-[var(--acc)]" />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="sr-only" htmlFor="claim-official-email">Official email</label>
            <input id="claim-official-email" value={officialEmail} onChange={(event) => { verificationMethodTouched.current = true; setOfficialEmail(event.target.value); }} placeholder="Official email (optional)" type="email" className="rounded-xl border border-line bg-transparent px-3 py-2.5 text-[12px] font-semibold outline-none focus:border-[var(--acc)]" />
            <label className="sr-only" htmlFor="claim-supporting-url">Useful public link</label>
            <input id="claim-supporting-url" value={supportingUrl} onChange={(event) => { verificationMethodTouched.current = true; setSupportingUrl(event.target.value); }} placeholder="Useful public link (optional)" inputMode="url" className="rounded-xl border border-line bg-transparent px-3 py-2.5 text-[12px] font-semibold outline-none focus:border-[var(--acc)]" />
          </div>
        </div>
      )}

      {error && <p className="rounded-xl border border-red-500/30 px-3 py-2 text-[11.5px] font-bold text-red-500">{error}</p>}
      <button type="button" disabled={loading || !canSubmit} onClick={submit} className="bndy-btn2 flex min-h-12 w-full items-center justify-center gap-2 px-4 text-[12px] disabled:opacity-50">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={15} />}
        {verificationMethod === "facebook_page" ? "Send verified Page for review" : "Send evidence for review"}
      </button>
    </section>
  );
}
