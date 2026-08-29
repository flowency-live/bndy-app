const fs = require('fs');
const p = 'src/features/join/ManageEntitiesPage.tsx';
let s = fs.readFileSync(p, 'utf8');
const replace = (from, to, label) => { if (!s.includes(from)) throw new Error(`Missing ${label}`); s = s.replace(from, to); };

replace(
'  type ManagedVenue,\n} from "./manageApi";',
'  type ManagedVenue,\n  type MyClaim,\n} from "./manageApi";\nimport { ClaimEvidenceStep } from "./ClaimEvidenceStep";',
'imports');

replace(
'  const [claims, setClaims] = useState<Array<{ claim_id: string; entity_type: "artist" | "venue"; entity_id: string; entity_name: string; status: string; created_at: string }>>([]);',
'  const [claims, setClaims] = useState<MyClaim[]>([]);',
'claim state type');

const oldCard = '{claims.filter((claim) => ["pending", "pending_review", "verified_pending", "more_evidence_required", "conflict"].includes(claim.status)).map((claim) => <div key={claim.claim_id} className="rounded-[20px] border border-line glass p-4"><div className="text-[14px] font-black">{claim.entity_name}</div><div className="mt-1 text-[10px] font-black uppercase tracking-wide text-[var(--acc-text)]">{claim.entity_type} · {claim.status === "verified_pending" ? "verification captured" : "evidence being checked"}</div><p className="mt-2 text-[11px] font-semibold text-dim">Requested {new Date(claim.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. The public page stays untouched until approval.</p></div>)}';
const newCard = '{claims.filter((claim) => ["pending", "pending_review", "verified_pending", "more_evidence_required", "conflict"].includes(claim.status)).map((claim) => <ClaimStatusCard key={claim.claim_id} claim={claim} />)}';
replace(oldCard, newCard, 'claim card map');

const marker = 'function ManageLoadOnce({ onLoad }: { onLoad: () => Promise<void> }) {';
if (!s.includes(marker)) throw new Error('Missing ManageLoadOnce marker');
const component = [
'function ClaimStatusCard({ claim }: { claim: MyClaim }) {',
'  const [addingEvidence, setAddingEvidence] = useState(false);',
'  const needsMore = claim.status === "more_evidence_required";',
'  const conflict = claim.status === "conflict";',
'  const statusText = claim.status === "verified_pending" ? "verification captured" : needsMore ? "more evidence needed" : conflict ? "ownership conflict" : "evidence being checked";',
'  const noteClass = needsMore ? "border-[var(--acc)]" : "border-line";',
'  return <div className="rounded-[20px] border border-line glass p-4">',
'    <div className="text-[14px] font-black">{claim.entity_name}</div>',
'    <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-[var(--acc-text)]">{claim.entity_type} · {statusText}</div>',
'    <p className="mt-2 text-[11px] font-semibold text-dim">Requested {new Date(claim.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. The public page stays untouched until approval.</p>',
'    {claim.review_note && <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] font-semibold ${noteClass}`}><div className="text-[9px] font-black uppercase tracking-wide text-dim">bndy review note</div><p className="mt-1">{claim.review_note}</p></div>}',
'    {needsMore && !addingEvidence && <button type="button" onClick={() => setAddingEvidence(true)} className="bndy-btn2 mt-3 min-h-10 w-full px-3 text-[11px]">Add more evidence</button>}',
'    {needsMore && addingEvidence && <div className="mt-4 border-t border-line pt-4"><ClaimEvidenceStep entityType={claim.entity_type} entityId={claim.entity_id} entityName={claim.entity_name} evidenceHints={claim.evidence_hints} /></div>}',
'    {conflict && <p className="mt-3 rounded-xl border border-amber-500/30 px-3 py-2 text-[10.5px] font-semibold text-amber-600">This request conflicts with an existing owner. bndy will not replace ownership automatically.</p>}',
'  </div>;',
'}',
'',
].join('\n');
s = s.replace(marker, component + marker);
fs.writeFileSync(p, s);
console.log('Claim V2 Manage evidence follow-up applied');
