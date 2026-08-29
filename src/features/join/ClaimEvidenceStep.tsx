"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CheckCircle2, Facebook, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import { requestJoinClaim } from "./joinApi";
import { trackJoin } from "./joinAnalytics";

type Props={entityType:"artist"|"venue";entityId:string;entityName:string;evidenceHints?:Record<string,string>};

export function ClaimEvidenceStep({entityType,entityId,entityName,evidenceHints={}}:Props){
 const [relationshipKind,setRelationshipKind]=useState(entityType==="artist"?"band_member":"venue_manager");
 const [requestedRole,setRequestedRole]=useState<"owner"|"admin"|"member">(entityType==="artist"?"member":"admin");
 const [explanation,setExplanation]=useState("");
 const [supportingUrl,setSupportingUrl]=useState("");
 const [officialEmail,setOfficialEmail]=useState("");
 const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(null); const [submitted,setSubmitted]=useState(false);
 const relationshipOptions=useMemo(()=>entityType==="artist"?[
  ["band_member","I’m in the band","member"],["manager","I manage this artist","admin"],["agent","I represent / book this artist","admin"],["artist_owner","I’m responsible for this artist","owner"]
 ]:[ ["venue_owner","I own / run this venue","owner"],["venue_manager","I manage this venue","admin"] ],[entityType]);
 const choose=(kind:string,role:string)=>{setRelationshipKind(kind);setRequestedRole(role as any)};
 const submit=async()=>{if(!explanation.trim()){setError("Tell us briefly how you’re connected so the claim can actually be verified.");return;} setLoading(true);setError(null);
  try{const result=await requestJoinClaim({entityType,entityId,requestedRole,relationshipKind,verificationMethod:"manual",relationshipExplanation:explanation.trim(),supportingUrl:supportingUrl.trim()||undefined,officialEmail:officialEmail.trim()||undefined,evidenceHints});
   if(!result.ok){setError(result.message);return;} trackJoin("claim_requested",{entityType,step:"claim",result:"manual_evidence"});setSubmitted(true);
  }catch{setError("Network hiccup. Your claim was not sent. Try again.");}finally{setLoading(false)}};
 if(submitted)return <div className="rounded-[22px] bg-[var(--surface-2)] p-5"><div className="flex items-center gap-2 text-[15px] font-black"><CheckCircle2 size={18} className="text-[var(--acc-text)]"/>Evidence sent</div><p className="mt-2 text-[12px] font-semibold leading-relaxed text-dim">We’ve got your relationship and evidence. If it needs a human check, it will appear in bndy review. You can track it in Manage.</p><Link href="/manage" className="bndy-btn2 mt-4 flex min-h-11 w-full items-center justify-center px-4 text-[12px]">Go to Manage</Link></div>;
 return <section className="mt-5 space-y-5">
  <div><div className="flex items-center gap-2 text-[16px] font-black"><ShieldCheck size={18} className="text-[var(--acc-text)]"/>Prove you’re connected</div><p className="mt-1 text-[12px] font-semibold leading-relaxed text-dim">Being signed in proves who you are. We also need something that shows why you should manage <b>{entityName}</b>.</p></div>
  <div><div className="text-[10px] font-black uppercase tracking-[1.2px] text-dim">How are you connected?</div><div className="mt-2 grid gap-2">{relationshipOptions.map(([kind,label,role])=><button key={kind} type="button" onClick={()=>choose(kind,role)} className={`rounded-xl border px-3 py-2.5 text-left text-[12px] font-black ${relationshipKind===kind?"border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_10%,transparent)]":"border-line text-dim"}`}>{label}</button>)}</div></div>
  <div className="rounded-2xl border border-line p-4"><div className="flex items-center gap-2 text-[13px] font-black"><Facebook size={16}/>Verify with the official Facebook Page</div><p className="mt-1 text-[11px] font-semibold text-dim">This will become the fastest route: connect Facebook, choose a Page you manage, and bndy will reconcile that Page to this record.</p><button type="button" disabled className="bndy-btn mt-3 min-h-10 w-full px-3 text-[11px] opacity-50">Facebook Page verification awaiting Meta Page access</button></div>
  <div className="rounded-2xl border border-[var(--acc)] p-4"><div className="flex items-center gap-2 text-[13px] font-black"><MessageSquareText size={16}/>Tell bndy how we can verify you</div><p className="mt-1 text-[11px] font-semibold text-dim">A sentence or two is enough. Give us something useful to check rather than just “this is mine”.</p><textarea value={explanation} onChange={e=>setExplanation(e.target.value)} placeholder={entityType==="artist"?"e.g. I’m the drummer and I run the band’s accounts.":"e.g. I manage the venue and handle the live music programme."} className="mt-3 min-h-24 w-full resize-y rounded-xl border border-line bg-transparent px-3 py-2.5 text-[12px] font-semibold outline-none focus:border-[var(--acc)]"/><div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={officialEmail} onChange={e=>setOfficialEmail(e.target.value)} placeholder="Official email (optional)" type="email" className="rounded-xl border border-line bg-transparent px-3 py-2.5 text-[12px] font-semibold outline-none focus:border-[var(--acc)]"/><input value={supportingUrl} onChange={e=>setSupportingUrl(e.target.value)} placeholder="Useful public link (optional)" inputMode="url" className="rounded-xl border border-line bg-transparent px-3 py-2.5 text-[12px] font-semibold outline-none focus:border-[var(--acc)]"/></div></div>
  {error&&<p className="rounded-xl border border-red-500/30 px-3 py-2 text-[11.5px] font-bold text-red-500">{error}</p>}
  <button type="button" disabled={loading||!explanation.trim()} onClick={submit} className="bndy-btn2 flex min-h-12 w-full items-center justify-center gap-2 px-4 text-[12px] disabled:opacity-50">{loading?<Loader2 size={14} className="animate-spin"/>:<BadgeCheck size={15}/>}Send evidence for review</button>
 </section>;
}
