# Artist & Venue Claiming — Product Strategy and Remediation Spec

**Status:** product-owner remediation specification  
**Date:** 29 August 2026  
**Primary repo:** `flowency-live/bndy-app`  
**Backend:** `flowency-live/bndy-serverless-api`  
**Knowledge/provenance:** `flowency-live/bndy-enrichment` / Backline  
**Scope:** Artist and Venue ownership/admin claims only. No implementation changes are authorised by this document.

---

## 1. Executive summary

The current Claim journey is technically safe but product-incomplete.

Today, an authenticated bndy user can locate an existing Artist or Venue, press **Claim**, and create a pending Claim Request. That prevents duplicate entities and prevents unauthorised canonical mutation, but it does not establish *why bndy should believe the claimant has authority over that entity*.

That makes the present journey little more than:

> “I am logged in, and I say this is mine.”

For low-volume beta operation, a human bndy admin can manually investigate every request. That is not a scalable claiming system and it wastes the strongest opportunity created by the new Facebook authentication work.

The product must therefore separate three different concepts that are currently blurred together:

1. **Account identity** — who is this person inside bndy?
2. **Entity authority evidence** — what evidence shows this person is entitled to manage this Artist or Venue?
3. **Entity relationship** — once verified, what role does this person hold for the Artist/Venue?

A successful BNDY login proves #1 only. It does **not** prove #2.

The remediation is an evidence-led Claim journey where every claim carries one or more verification signals. Strong evidence can allow automatic approval; weaker evidence routes to human review. A single bndy user can hold relationships with multiple Artists and Venues and can make multiple claims. This is already directionally supported by the current membership model and should be preserved rather than replaced by persona-specific accounts.

---

## 2. Current-state audit

### 2.1 What is already good

The existing Join architecture gets several important fundamentals right:

- `/join` separates Artist and Venue onboarding.
- **Find before create** is enforced.
- Existing entities branch to Claim rather than duplicate creation.
- New entities can be created atomically with an ownership relationship.
- Join state survives authentication redirects.
- Existing claims are persisted to `bndy-entity-claims`.
- Claims are deduplicated per user + entity.
- Pending claims do not mutate the public entity.
- Claim approval creates a real Artist/Venue relationship.
- Approval will not silently replace a different existing owner.
- Pending claims are visible later in Manage.
- The membership APIs already return arrays of managed Artists/Venues, so one user can be related to many entities.
- Artist invites, Venue delegates and Venue ownership transfer already move toward a multi-human-per-entity model.

These are valuable foundations and should be retained.

### 2.2 The core product defect

The current Claim flow collects essentially no authority evidence.

For an existing Artist, the request currently carries only lightweight hints such as the searched Artist name/location. For Venues it carries address / Google Place identity. These describe the *entity being claimed*, not the *claimant’s authority to manage it*.

The UI then says words equivalent to:

> Claim this artist / venue. We’ll send this to the bndy team for review.

That is a safe holding pattern, not a verification journey.

### 2.3 Authentication is being mistaken for verification

`AuthGate` proves that the user has a valid BNDY session and, currently, that their general profile is complete.

That does not establish that the user is:

- a member of the band;
- the band manager;
- the venue owner/operator;
- an authorised booking agent;
- the controller of the entity’s official Facebook Page;
- an authorised person using an official-domain email address.

A user who signed in with Google, Apple, Facebook, email or phone should therefore reach the **same Claim evidence step**. The chosen BNDY login provider must not itself decide the Claim.

### 2.4 The current Facebook implementation is useful, but not yet Claim proof

The newly working Facebook Login proves a **person’s Facebook identity** and gets that person into BNDY.

It does **not** prove that the person controls a particular Artist or Venue Facebook Page.

This is an important correction to the earlier mental model of “login using the band’s Facebook page”. Facebook Login authenticates a person, not a Page as the BNDY account identity.

To use Facebook as strong Claim evidence, BNDY needs a separate **Connect/Verify Facebook Page** step that can establish that the authenticated person manages a specific Facebook Page and then reconcile that stable Page identity to the BNDY Artist/Venue being claimed.

The current `public_profile`-only Facebook Login is therefore a prerequisite, not the finished Claim mechanism.

### 2.5 Multi-entity relationships are already the correct direction

The current product plan explicitly says:

> One human identity, many entity relationships.

That is correct and should remain the core rule.

A drummer in three bands should use one BNDY account and hold three Artist relationships.

A manager or agent working with twelve artists should use one BNDY account and hold relationships to those twelve Artists.

A venue operator who also plays in a band should be able to hold Venue and Artist relationships simultaneously.

Do **not** create a special global “Artist account”, “Venue account” or “Agent account” authentication identity merely to solve this. Roles belong on relationships between people and entities.

An Agency/Management Company organisation model may become valuable later, but it is not required to fix Claiming.

---

## 3. Product doctrine

### 3.1 Account identity is not entity authority

Every Claim must answer two questions separately:

**Who are you?**  
Answered by BNDY authentication.

**Why should you be allowed to manage this?**  
Answered by Claim evidence.

### 3.2 Every existing-entity Claim must contain evidence

There should be no normal production path where a user simply presses **Claim** and creates an evidence-free pending request.

At minimum, the user must either:

- complete a supported verification method; or
- provide a short human explanation that makes the request reviewable.

### 3.3 Verification should be progressive, not bureaucratic

The Claim experience should start with the easiest high-confidence proof and offer alternatives.

A user should not be forced through every method.

### 3.4 Strong evidence should reduce HITL

The system should automatically approve clearly safe Claims where evidence is strong enough and there is no ownership conflict.

Human review should concentrate on ambiguous, disputed or low-evidence cases.

### 3.5 Backline should retain the evidence trail

Claim evidence is knowledge about an entity relationship and should be durable, attributable and inspectable.

Backline should retain the provenance and verification result without leaking private claimant data publicly.

### 3.6 Ownership is not the only useful role

A claimant may be:

- owner;
- admin/manager;
- member;
- agent/representative;
- contributor (future).

V1 can keep a smaller canonical role set (`owner`, `admin`, `member`) while allowing the claimant to describe their real-world relationship for review/audit.

---

## 4. Target Claim journey

### Step 1 — Find the existing entity

Unchanged in principle.

User chooses Artist or Venue, searches, recognises the correct canonical entity and selects **That’s us / That’s my venue**.

### Step 2 — Authenticate if required

If not signed in, authenticate using any normal BNDY method.

Important: authentication is a gate into the evidence journey, not evidence by itself.

### Step 3 — “How can we verify you?”

Replace the current immediate **Claim this artist** submit action with a verification-choice screen.

Recommended copy direction:

> **Prove you’re connected**
>
> Pick the easiest way for us to verify that you can manage this page.

Primary methods vary by entity and available known data.

#### Artist

1. **Verify with the Artist’s Facebook Page**
2. **Use an official website/email** where applicable
3. **Ask an existing verified owner/admin to invite me**
4. **Tell bndy why I should have access**

#### Venue

1. **Verify with the Venue’s Facebook Page**
2. **Verify using official venue contact/domain evidence**
3. **Ask an existing verified owner/admin to invite me**
4. **Tell bndy why I should have access**

Not every method needs to ship in the same release. The journey must nevertheless be designed around evidence methods rather than a single generic submit button.

### Step 4A — strong verification succeeds

If a high-confidence verification method succeeds, show the evidence result clearly:

> **Verified**
> We confirmed you manage the Facebook Page linked to The Torrists.

Then either:

- auto-approve the relationship if policy allows; or
- create a `verified_pending` Claim requiring only conflict/safety review.

The user should not see “we’ll investigate whether you are really connected” after BNDY has already obtained strong machine-verifiable evidence.

### Step 4B — manual evidence path

If the user cannot use an automatic method, let them submit a short explanation.

Example prompt:

> **Tell us how you’re connected**
>
> A sentence or two is enough. For example: “I’m the drummer and I run the band’s accounts”, “I manage bookings for this artist”, or “I own the venue”. Add anything that will help us verify it.

Optional supporting fields can include:

- official email;
- official website URL;
- relevant public social/profile URL;
- free-text explanation;
- optional attachment later if operationally worthwhile.

This becomes an explicit HITL review request rather than pretending it is already verified.

### Step 5 — choose relationship intent

Where useful, ask what the user is trying to do:

- **Manage this Artist/Venue** → normally `admin`
- **I’m responsible for this Artist/Venue** → candidate `owner`
- **I’m a band member** → `member` or appropriate Artist membership
- **I represent this Artist** → `admin` initially, with real-world relation = agent/manager

Do not force users to understand internal role semantics. Map human language to the internal role model.

### Step 6 — outcome

Possible outcomes:

- `approved` — relationship is active immediately;
- `verified_pending` — strong evidence passed, but a conflict/policy gate requires review;
- `pending_review` — manual/ambiguous evidence needs HITL;
- `more_evidence_required` — submitted evidence is insufficient;
- `rejected` — reviewed and refused;
- `cancelled` — claimant withdrew;
- `conflict` — another owner/authority relationship requires dispute/transfer handling.

---

## 5. Facebook Page-control verification

### 5.1 Correct model

The desired model is:

**BNDY user → Connect Facebook → prove control of Facebook Page → reconcile Page to BNDY entity → produce Claim evidence**

Not:

**Facebook Login → therefore user owns Artist**

### 5.2 User experience

From the Claim verification screen:

> **Verify with Facebook**
> Connect Facebook and choose the official Page you manage for this Artist/Venue.

After Meta authorisation, BNDY should receive the Pages the person is permitted to manage, subject to the Meta permissions approved for the app.

The user selects the relevant Page.

BNDY stores a durable verification fact such as:

- claimant BNDY user ID;
- Meta user identity reference where permitted/appropriate;
- Facebook Page stable ID;
- Page name and public URL at verification time;
- proof timestamp;
- permissions/capability used to establish management control;
- BNDY entity ID being claimed;
- reconciliation result;
- confidence/policy outcome.

Do not use transient Facebook URLs or names as the primary evidence identity when a stable Page ID is available.

### 5.3 Reconciliation rules

Strongest case:

- BNDY/Backline already knows the entity’s Facebook Page ID or a URL resolving to that stable Page;
- claimant proves management control of the same stable Page ID;
- entity has no conflicting verified owner;
- auto-approval policy allows the requested role.

This can be treated as strong evidence.

Intermediate case:

- claimant proves control of a Page;
- BNDY entity has a Facebook URL but the stable identity has not yet been resolved;
- resolve and compare before approval.

Ambiguous case:

- claimant proves control of a Facebook Page whose name resembles the BNDY entity but there is no strong identity link;
- store the evidence but route to resolution/HITL rather than auto-approve.

Conflict case:

- Page control verifies, but a different BNDY owner is already established;
- do not overwrite ownership;
- route to a transfer/dispute workflow.

### 5.4 Meta permission programme

The current Facebook Login implementation deliberately uses minimal identity access. That is correct for login.

Page-control verification is a **separate Meta capability/review phase**. It will require requesting only the permissions genuinely needed to enumerate/verify Pages managed by the user. `pages_show_list` is the obvious candidate already identified, but the exact permission set must be confirmed against the implementation Meta will approve before shipping.

Do not couple normal BNDY login availability to approval of Page-verification permissions.

---

## 6. Other evidence methods

### 6.1 Existing owner/admin invitation — very strong

If an Artist/Venue already has a verified owner/admin, that person can invite another user.

This should generally bypass a new public Claim review because authority is delegated by an existing trusted relationship.

The current invite/delegate infrastructure is already a useful foundation.

### 6.2 Official-domain email — strong where available

For venues, agencies, promoters and some artists, an email at a known official domain can be useful evidence.

Example:

- BNDY knows `thevenue.co.uk` as the official website;
- claimant verifies `person@thevenue.co.uk`;
- this can contribute strong evidence.

Do not assume generic Gmail/Outlook addresses are authoritative merely because they appear on a profile.

### 6.3 Website challenge / link — future strong method

Possible future method:

- provide a one-time code/link;
- claimant places it on the official website or a controlled metadata endpoint;
- BNDY verifies it.

Useful but probably unnecessary for first remediation release.

### 6.4 Venue phone verification — potentially useful

Where BNDY has a trusted public venue phone number, an OTP/voice verification can establish access to that contact point.

This should be treated carefully because access to a venue phone does not always mean ownership, but it can be strong admin evidence.

### 6.5 Manual explanation — always available fallback

The manual fallback is essential.

Required field:

`relationshipExplanation`

Example:

> “I’m the drummer and run this band, let me in you twats.”

Tone in production UI should be friendly, but the data model should accept exactly this kind of real human explanation rather than forcing fake structured certainty.

The reviewer sees:

- BNDY user identity;
- entity being claimed;
- requested relationship;
- explanation;
- links/contact hints supplied;
- existing Backline evidence;
- any automatic verification results;
- conflicts/current relationships.

---

## 7. Multi-Artist, multi-Band, Agent and Venue relationship model

### 7.1 One account, unlimited legitimate relationships

A BNDY person account must be able to hold multiple simultaneous relationships.

Examples:

- Jason → owner/admin/member of Artist A
- Jason → member/admin of Artist B
- Jason → member/admin of Artist C
- Jason → owner of Venue D

There should be no “you already claimed an artist” global block.

A user may also have multiple **pending** claims for different entities.

### 7.2 Do not create an “agent login type” yet

A booking agent should initially remain a normal BNDY user with `admin` relationships to multiple Artists.

Capture real-world relationship metadata such as:

- manager;
- booking agent;
- band member;
- social/admin;
- venue manager;
- venue owner.

But do not let these labels fragment authentication or canonical relationship rules.

### 7.3 Future agency organisations

Later, if agencies need team delegation, billing, roster management or organisational ownership, introduce an Organisation/Agency entity whose members can administer a roster.

That is a distinct product capability and should not be smuggled into Claim V2 prematurely.

### 7.4 Multiple verified people per Artist/Venue

The model should support many legitimate humans connected to the same entity.

For Artists especially, several band members may all be genuine users.

Therefore:

- do not equate “claimed” with “only one person may ever gain access”;
- ownership can remain singular if that is the chosen governance model;
- admins/members can be plural;
- a later owner can invite other members;
- strong evidence can potentially verify an additional admin/member without threatening the owner relationship.

---

## 8. Claim evidence model

The current `evidence_hints` free object is too weak to become the long-term verification model.

Introduce a first-class evidence collection.

Conceptual shape:

```ts
type ClaimEvidence = {
  evidenceId: string;
  claimId: string;
  method:
    | 'facebook_page_control'
    | 'existing_owner_invite'
    | 'official_domain_email'
    | 'venue_phone'
    | 'website_control'
    | 'manual_explanation'
    | 'curator_attestation'
    | 'admin_investigation';
  status: 'submitted' | 'verified' | 'failed' | 'inconclusive';
  strength: 'weak' | 'medium' | 'strong';
  sourceIdentity?: string;
  publicReference?: string;
  privatePayloadRef?: string;
  observedAt: string;
  verifiedAt?: string;
  verifier?: 'system' | 'bndy_admin' | 'curator' | 'existing_owner';
  metadata?: Record<string, unknown>;
};
```

Private evidence must not leak into public entity APIs.

---

## 9. Claim object remediation

Recommended Claim shape:

```ts
type EntityClaim = {
  claimId: string;
  claimantUserId: string;
  entityType: 'artist' | 'venue';
  entityId: string;
  requestedRole: 'owner' | 'admin' | 'member';
  relationshipType?: 'band_member' | 'manager' | 'agent' | 'venue_owner' | 'venue_manager' | 'other';
  relationshipExplanation?: string;
  status:
    | 'draft'
    | 'evidence_required'
    | 'verified_pending'
    | 'pending_review'
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'conflict';
  evidenceSummary: {
    strongestStrength?: 'weak' | 'medium' | 'strong';
    verifiedCount: number;
    methods: string[];
  };
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
};
```

Do not persist a Claim as `pending` before the user has either supplied evidence or explicitly chosen the manual review fallback.

---

## 10. Approval policy

Create a policy layer rather than embedding approval semantics in UI components.

### 10.1 Auto-approval candidate

Possible initial policy:

Auto-approve when all are true:

- entity has no conflicting verified owner for an ownership Claim;
- one strong machine-verifiable evidence item exists;
- the evidence identity strongly reconciles to the exact BNDY entity;
- no active dispute/security flag exists;
- requested role is permitted for that evidence method.

### 10.2 Human review required

Require HITL when:

- only manual explanation is supplied;
- evidence is medium/weak;
- Facebook Page identity cannot be strongly reconciled;
- entity has an existing different owner;
- several competing claims exist;
- source evidence conflicts materially;
- account/entity risk controls trigger.

### 10.3 Do not auto-transfer ownership

Even strong new evidence must not silently replace an established owner.

That is a separate transfer/dispute process.

---

## 11. Backline integration

Claims should become part of the Trust Loop rather than a side table with no knowledge model.

Backline should receive privacy-safe facts such as:

- BNDY user X asserted relationship Y to entity Z;
- assertion made at timestamp;
- verification method used;
- verification result/confidence;
- stable public identity used as evidence, e.g. Facebook Page ID;
- approval/rejection/dispute outcome;
- reviewer class where relevant;
- provenance chain.

This allows future reasoning such as:

- same Facebook Page control corroborates an Artist identity;
- owner-supplied facts gain higher authority;
- conflicting ownership evidence becomes visible rather than silently overwritten;
- Curator attestations can contribute without becoming unilateral authority.

Do not project private free-text or personal contact evidence into public canonical records.

---

## 12. UX remediation

### 12.1 Existing flow to remove

Avoid this sequence:

`Existing entity → AuthGate → Claim this artist → Claim sent`

It creates false confidence while collecting no meaningful proof.

### 12.2 Target flow

`Existing entity → Auth if needed → Verification choice → Evidence → Outcome`

### 12.3 Suggested screens

#### Screen: recognition

> **Yep, that looks like you.**
> Now let’s prove you’re connected so we can give you the right access.

#### Screen: evidence choice

> **How can we verify you?**
>
> **Verify with Facebook**  
> Connect the official Artist/Venue Page you manage.
>
> **I can prove it another way**  
> Use an official contact or tell us how you’re connected.
>
> **Someone already manages this on bndy**  
> Ask them to invite you.

#### Screen: manual explanation

> **Tell us how you’re connected**
> A sentence or two is enough. A human will review this one.

#### Strong verification success

> **Verified. Welcome in.**
> We confirmed your connection to [Entity].

#### Manual submission success

> **We’ve got your claim.**
> This one needs a human check because we couldn’t verify it automatically. You can track it in Manage.

The messaging must distinguish **verified automatically** from **submitted for review**.

---

## 13. General profile completion

The current shared `AuthGate` requires profile completion before the Claim action.

This should be reviewed as part of remediation.

Claiming an entity should not be made to feel like an unrelated account-registration wizard.

Recommended direction:

- authentication required before evidence can be bound to a user;
- minimal account identity is enough to begin Claim verification;
- general BNDY profile completion should be deferred unless a specific evidence method genuinely requires a field;
- ask for claimant display/contact details only when needed for review or communication.

A Facebook-created BNDY user should not encounter a confusing generic profile form between proving Facebook identity and proving Artist/Venue authority unless there is a clear reason.

---

## 14. Admin / Godmode remediation

The current admin Claim review must evolve from Approve/Reject against a bare assertion into an evidence review surface.

Reviewer should see:

- entity identity and existing ownership state;
- claimant BNDY identity;
- claimant’s other managed/member entities;
- requested role;
- real-world relationship type;
- manual explanation;
- evidence items with status and strength;
- Facebook Page identity/control result where present;
- relevant Backline corroboration/conflict signals;
- competing pending Claims;
- previous Claim history;
- approve as Owner/Admin/Member;
- request more evidence;
- reject with note;
- route to ownership dispute/transfer.

The reviewer should never have to reconstruct the entire case manually from unrelated systems for normal claims.

---

## 15. Security and abuse controls

- Rate-limit Claim creation and verification attempts.
- Prevent evidence reuse across unrelated entities unless explicitly valid.
- Never expose private Claim evidence publicly.
- Store stable external identity IDs rather than trusting names alone.
- Log verification and reviewer decisions.
- Require explicit transfer/dispute handling when ownership already exists.
- Do not let Curators independently seize ownership.
- Avoid auto-approval from a single weak signal.
- Reverify external control if a high-risk ownership action occurs much later and evidence is stale.

---

## 16. Analytics

Add/extend events for:

- claim_entity_selected;
- claim_auth_completed;
- claim_evidence_screen_viewed;
- claim_evidence_method_selected;
- facebook_page_verification_started;
- facebook_page_verification_succeeded;
- facebook_page_verification_failed;
- manual_claim_submitted;
- claim_auto_approved;
- claim_pending_review;
- claim_more_evidence_requested;
- claim_conflict_detected;
- claim_approved;
- claim_rejected;
- claim_cancelled.

Key product metrics:

- % Claims auto-verified;
- % requiring HITL;
- median Claim time-to-access;
- false/contested approval rate;
- abandonment by evidence method;
- number of users managing multiple entities;
- Claims per entity type;
- proportion of new admins gained by owner invite vs public Claim.

---

## 17. Recommended delivery slices

### CLAIM-01 — correct product semantics

- Replace evidence-free Claim submit with evidence selection.
- Add relationship type + manual explanation.
- Introduce Claim state machine beyond generic `pending`.
- Fix messaging to distinguish verification from review.
- Remove unnecessary general-profile interruption from Claiming, or make it context-specific.

### CLAIM-02 — evidence model + Godmode

- Add first-class Claim Evidence records.
- Expand admin review surface.
- Add request-more-evidence action.
- Surface ownership conflicts and competing Claims.
- Feed privacy-safe Claim evidence/outcomes into Backline.

### CLAIM-03 — Facebook Page-control verification

- Keep existing Facebook Login independent.
- Build Connect Facebook for Claim verification.
- Obtain the minimum Meta permissions required to enumerate/verify managed Pages.
- Store stable Page IDs.
- Reconcile Page identity against BNDY/Backline entity identity.
- Add policy-driven auto-approval where safe.

### CLAIM-04 — strong alternative proofs

- Existing-owner invite treated as strong authority delegation.
- Official-domain email verification where applicable.
- Venue contact verification if worthwhile.
- Optional website-control method later.

### CLAIM-05 — multi-relationship polish

- Make Manage clearly support users with many Artists/Venues.
- Add relationship labels such as member/manager/agent without fragmenting account identity.
- Permit multiple Claims across entities.
- Ensure additional legitimate people can join an already-claimed Artist/Venue without threatening ownership.

### CLAIM-06 — disputes / transfers

- Explicit ownership conflict journey.
- Transfer request/acceptance.
- Disputed Claim review.
- Evidence history retained.

---

## 18. Decisions made by this specification

1. **BNDY authentication alone is not Claim verification.**
2. **Facebook Login alone is not proof of Facebook Page control.**
3. **Facebook Page-control verification should become a separate evidence method.**
4. **Evidence-free Claim Requests should be removed as the normal journey.**
5. **Manual explanation remains a valid fallback and routes to HITL.**
6. **One BNDY user may legitimately manage or belong to many Artists and Venues.**
7. **Do not create separate Artist/Venue/Agent login identities.**
8. **Relationship roles belong between a user and an entity.**
9. **Multiple humans may legitimately relate to the same entity.**
10. **Strong evidence should enable automatic approval where policy and ownership state make it safe.**
11. **Established ownership is never silently replaced by a new Claim.**
12. **Claim evidence and outcomes should feed Backline provenance.**

---

## 19. Challenges to the original thinking

### “Use Facebook Login from the band Page and then we know it is them.”

Not quite. Facebook Login proves the human Facebook account. It does not by itself prove that human administers the Artist Page. The correct product is **login as the person, then separately prove Page control**.

### “An agent account should be associated with multiple Artists.”

The outcome is right, but a special Agent account type is probably unnecessary. One user account with multiple Artist relationships is simpler, already aligned with the current architecture and handles users who are simultaneously musicians, managers and venue operators.

### “A claimed Artist should belong to the claimant.”

Only partly. An Artist can have multiple band members/managers. The system needs a governance relationship model, not a one-user lock. Singular ownership can exist, but access must be plural.

### “Every non-Facebook Claim will need HITL.”

Initially many may, but that should not be accepted as the permanent design. Existing-owner invitation, verified official-domain email, venue contact verification and other strong methods can progressively reduce HITL.

### “Facebook should be the main verification mechanism.”

It is likely to be the best first automated method for grassroots music because it is widely used, but BNDY should not make Claiming structurally dependent on Facebook. The long-term canonical platform must support strong non-Facebook proofs so Facebook can genuinely become optional over time.

---

## 20. Definition of done for Claim V2

Claim V2 is not done until:

1. selecting an existing Artist/Venue leads to an evidence journey, not an evidence-free submit;
2. a signed-in user can explain or prove their real-world relationship;
3. Facebook Page control can be represented as Claim evidence once Meta capability is approved;
4. strong evidence can be policy-evaluated for automatic approval;
5. weak/manual evidence produces a clearly-labelled human-review case;
6. a reviewer can see evidence and make a reasoned decision in one place;
7. users can hold relationships with multiple Artists/Venues;
8. multiple legitimate humans can relate to one Artist/Venue;
9. existing ownership cannot be silently displaced;
10. Claim provenance/outcomes are available to Backline;
11. messaging clearly distinguishes **authenticated**, **verified**, **pending review**, **approved** and **conflicted** states.

---

## 21. Immediate recommendation

Do **not** patch the current UI with another “Facebook” button next to **Claim this artist** and call the problem solved.

First implement CLAIM-01 and CLAIM-02 so Claiming has a proper evidence model and state machine. Then add Facebook Page-control verification as the first strong automated evidence provider in CLAIM-03.

That order prevents Meta-specific mechanics from becoming the Claim domain model and gives BNDY a durable path toward being canonical even when Facebook is no longer important.
