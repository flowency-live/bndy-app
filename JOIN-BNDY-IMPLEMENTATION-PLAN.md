# Join bndy — implementation plan

**Status:** active delivery plan  
**Owner:** bndy product + engineering  
**Primary product repo:** `flowency-live/bndy-app`  
**Backend:** `flowency-live/bndy-serverless-api`  
**Knowledge/provenance:** `flowency-live/bndy-enrichment` (BNDY Backline)  
**Public policy:** `flowency-live/bndy-website`

## 1. Goal

Create the simplest, fastest and best-looking route for an artist or venue operator to join bndy, while preventing duplicate entities and establishing a durable ownership/admin relationship from the first successful onboarding.

The first release must support creation of genuinely new Artists and Venues. When bndy detects that the entity already exists, onboarding must branch into a Claim journey rather than creating a duplicate.

The experience should feel like claiming a place in the local music scene, not completing an admin database form.

## 2. Product principles

1. **Find before create.** Every Join journey performs identity lookup before entity creation.
2. **Location disambiguates identity.** Existing-record results show canonical name, location and useful identity context.
3. **Name variants are first-class discovery evidence.** Known aliases/name variants must be surfaced in existing-record results so the user can recognise the correct artist or venue even when they searched a variant.
4. **One human identity, many entity relationships.** A bndy user can own/administer multiple artists and venues. Do not make `owner` a mutually exclusive global persona.
5. **Ownership and delegation are different.** Owners control ownership/transfer. Delegates/admins can operate an entity without owning the account-level relationship.
6. **Atomic onboarding.** A new entity and its initial ownership/admin relationship are created together server-side. Never leave a successfully-created entity orphaned because a second client call failed.
7. **Canonical APIs remain the write authority.** Join does not write directly to DynamoDB from the client.
8. **Backline records provenance.** User-supplied facts become durable evidence/Observations/Claims and owner-protected projections.
9. **Claim verification is deliberate.** Existing entities branch into Claim. We may ship detection/handoff before the full verification workflow, but we must never silently let a claimant overwrite an existing entity.
10. **Progress over paperwork.** Ask only what is needed to establish identity and make the profile useful; defer optional profile completion.

## 3. Personas and relationships

### 3.1 Account identity
A person has one bndy account/session and may have relationships with multiple entities.

### 3.2 Entity relationship roles

- **Owner** — ultimate administrator for the artist/venue; can invite/remove delegates, transfer/relinquish ownership and perform ownership-level destructive actions.
- **Admin / Delegate** — can manage operational data but cannot transfer/relinquish ownership or perform restricted account-level actions.
- **Member / Contributor** — narrower artist/venue access for future use.

The data model should permit multiple active administrators and preserve relationship history. A later policy decision can constrain whether more than one simultaneous `owner` is allowed.

### 3.3 Lifecycle actions

The domain must support:

- invite delegate/admin;
- accept/revoke delegate access;
- leave an entity relationship;
- transfer ownership;
- relinquish/disown an entity;
- remove stale delegates;
- audit relationship changes.

These actions do not all need UI in V1, but the model/API must not make them impossible.

## 4. Core Join journey

### Step 1 — `/join`
Present two high-confidence choices:

- **I’m an artist / I manage an artist**
- **I run / manage a venue**

Keep the page exceptionally light, mobile-first and visually distinct from current Add utility forms.

### Step 2 — identify the entity
Ask for the minimum identity input.

#### Artist
- artist/band name;
- location / performing base;
- optional Facebook URL as an accelerator.

#### Venue
- venue name;
- town/city/postcode or Google Places selection.

### Step 3 — existing-record detection
Resolve against canonical bndy entities before creation.

A result card must show, where available:

- canonical name;
- **matched name variant / aliases**;
- location (town/city/region);
- profile image;
- artist/venue type;
- useful public identity links;
- clear distinction between several same/similar names in different locations.

Example concept:

> **The Torrists** — Liverpool  
> Also known as: The Torrists Band  
> Rock · Covers

Do not collapse multiple same-name entities in different locations.

### Step 4A — existing entity
Display a warm recognition state such as **“Looks like you’re already on bndy 👋”** with the matched identity card(s).

Actions:

- **That’s us / That’s my venue** → Claim handoff;
- **Not us** → return to search/refine;
- **None of these** → create-new path only after explicit confirmation.

Full claim verification is a separate implementation slice, but this branch must exist from the start.

### Step 4B — genuinely new entity
Confirm the proposed identity, then authenticate if required.

### Step 5 — auth interruption and resume
Reuse `bndy-app` auth. Preserve the Join state and `returnTo` so successful authentication returns directly to the same onboarding step.

Do not make users restart identity search after login.

### Step 6 — atomic creation + ownership
Server-side application operation:

1. authenticate current user;
2. rerun canonical duplicate/identity gate;
3. create canonical Artist/Venue;
4. create initial entity relationship with role `owner` (or agreed owner/admin representation);
5. publish Backline evidence/claims;
6. return entity + relationship + onboarding status.

If duplicate identity is detected between search and commit, return a structured `existing_entity` result and branch to Claim rather than failing generically.

### Step 7 — tiny profile completion
Ask only high-value information.

#### Artist first-pass fields
- canonical name;
- location;
- artist type;
- act type (Covers / Originals / Tribute / Acoustic etc; use canonical dry/configured types, never hardcode divergent enums);
- genres from canonical genre types;
- Facebook / Instagram / website;
- profile image;
- short bio.

Reuse Facebook-assisted prefill where it is trustworthy.

#### Venue first-pass fields
- Google Place identity/address/coordinates;
- website;
- phone;
- image;
- social links;
- live-music status / useful bndy-specific fields.

### Step 8 — success
Deliver a clear emotional payoff:

- **You’re on bndy.**
- open profile;
- continue editing;
- invite a bandmate/delegate (when available);
- add first gig / manage dates.

## 5. Existing-record / identity requirements

### 5.1 Artists
Use backend canonical identity rules. Current artist uniqueness already recognises name + regional location and Facebook identity. Join must not create a separate client-only identity algorithm.

Lookup should support:

- canonical name;
- `name_variants`;
- normalised punctuation/case;
- performing location/region;
- Facebook identity where present.

The API should return `matchedOn` metadata so the UI can explain whether a result matched canonical name, alias, Facebook or another supported identity signal.

### 5.2 Venues
Use Google Place ID where present as the strongest physical identity signal, plus canonical name/address/location rules. Surface same-name venues separately by location.

### 5.3 Search response contract
Target shape:

```ts
type JoinCandidate = {
  id: string;
  entityType: 'artist' | 'venue';
  canonicalName: string;
  nameVariants?: string[];
  matchedVariant?: string;
  locationLabel?: string;
  imageUrl?: string;
  typeLabel?: string;
  socialUrls?: string[];
  matchedOn: Array<'canonical_name' | 'name_variant' | 'location' | 'facebook' | 'google_place'>;
  claimStatus?: 'unclaimed' | 'claimed' | 'verified';
};
```

## 6. Ownership / membership backend

### 6.1 Artist
The existing `bndy-artist-memberships` infrastructure is the starting point. Audit and evolve it so the initial Join operation can create the user's relationship atomically with the artist.

Current code often treats `admin` as the privileged artist role. Introduce/normalise owner semantics without breaking existing members.

### 6.2 Venue
Create equivalent venue relationship infrastructure rather than storing a single irreversible `claimedBy` string as the entire access model.

Preferred direction is a common entity-membership model or deliberately parallel artist/venue membership APIs with identical role semantics. Decide after table/index audit; do not force a migration merely for aesthetic symmetry.

### 6.3 Required operations

- `POST /join/artist` — authenticated atomic new Artist + initial relationship;
- `POST /join/venue` — authenticated atomic new Venue + initial relationship;
- candidate lookup endpoints or existing resolver extension;
- list current user's managed entities;
- invite delegate/admin;
- update/revoke relationship;
- transfer/relinquish ownership;
- claim request create/read/approve/reject in later slice.

Exact route naming may adapt to current API Gateway conventions.

## 7. Claim journey boundary

V1 creation work must detect existing entities but does not need to complete every verification mechanism.

Initial Claim handoff should persist:

- claimant user ID;
- entity type + entity ID;
- requested role/relationship;
- timestamp;
- evidence hints supplied during Join;
- status (`pending`, `approved`, `rejected`, `cancelled`);
- audit history.

Verification mechanisms to design/ship next include established-public-email/site evidence, Facebook Page control, venue phone/public-record checks and manual curator/admin review, aligned with the public Claim Policy.

## 8. Delegates / account management

Build toward an entity-management surface inspired by the useful part of Lemonrock's delegate concept, but without Lemonrock's account limitations.

Owner can:

- view current owners/admins/members;
- invite a delegate by email/account;
- assign a role;
- revoke a delegate;
- transfer/relinquish ownership.

Delegates/admins can manage normal operational content but cannot transfer ownership or perform explicitly owner-only destructive actions.

Support multiple devices through normal bndy account sessions; do not create shared special passwords.

## 9. Backline integration

User-created/owner-supplied information is high-authority evidence but must still retain provenance.

- Artist Join should extend the existing `frontstage-user-created-artist` Observation/Claim path rather than remove it.
- Add equivalent Venue Join evidence.
- Include user/entity relationship provenance where privacy-appropriate (internal identifiers, not leaked publicly).
- Projection policy must strongly protect owner-entered facts from lower-authority automated source overwrites.
- External source evidence may still add non-conflicting facts and raise conflicts for review.

## 10. Frontend architecture

Create a dedicated `src/features/join` feature rather than reshaping the existing Add forms into onboarding UI.

Expected components/state:

- `JoinPageClient` / entry choice;
- `JoinArtistFlow`;
- `JoinVenueFlow`;
- `EntityIdentitySearch`;
- `JoinCandidateCard`;
- `ExistingEntityDecision`;
- `JoinAuthStep`;
- `JoinProfileStep`;
- `JoinSuccess`;
- a small serialisable journey state stored across auth redirects.

Reuse existing API services/resolvers and field components underneath where appropriate. Do **not** reuse current Add page presentation wholesale.

## 11. UX requirements

- mobile-first;
- one primary decision per screen;
- no admin-style dense forms;
- sensible progress indication without a long wizard feeling;
- excellent loading/skeleton states;
- keyboard accessible;
- clear retry/recovery from network/auth failure;
- no lost entered data after auth;
- candidate cards make location and aliases obvious;
- copy should be human and confident, not technical;
- optional profile fields can be skipped.

## 12. Analytics / observability

Instrument at minimum:

- join opened;
- persona/entity type selected;
- identity search submitted;
- existing candidate shown;
- candidate accepted/rejected;
- claim branch entered;
- create-new confirmed;
- auth started/completed/failed;
- entity creation completed/duplicate-gated/failed;
- profile step completed/skipped;
- join completed;
- delegate invitation later.

Track funnel abandonment by step without logging sensitive free-text unnecessarily.

## 13. Delivery slices

### JOIN-01 — foundation + shell
- [ ] Add `/join` route and dedicated feature directory.
- [ ] Build polished Artist/Venue entry screen.
- [ ] Define serialisable journey state and entity candidate types.
- [ ] Add basic accessibility/responsive behaviour.

### JOIN-02 — identity search
- [ ] Add/extend backend candidate resolver for Artists.
- [ ] Include canonical name, `name_variants`, location and matched-on metadata.
- [ ] Add Venue candidate resolver using place/address identity.
- [ ] Render multiple location-disambiguated results.
- [ ] Add explicit Claim vs Not-us/New branch.

### JOIN-03 — auth + resume
- [ ] Reuse bndy-app auth gate/login.
- [ ] Preserve journey through OAuth/login using `returnTo` and local serialised state.
- [ ] Verify refresh/direct-return behaviour.

### JOIN-04 — new Artist atomic onboarding
- [ ] Backend authenticated Join Artist operation.
- [ ] Transaction/compensation strategy for Artist + initial owner relationship.
- [ ] Recheck duplicate gate at commit.
- [ ] Reuse canonical Artist validation and Facebook assist.
- [ ] Persist Backline Observation/Claims.
- [ ] Success UI and profile link.

### JOIN-05 — new Venue atomic onboarding
- [ ] Finalise venue relationship model.
- [ ] Backend authenticated Join Venue operation.
- [ ] Google Place identity/dedupe at commit.
- [ ] Backline Venue user evidence.
- [ ] Success UI and profile link.

### JOIN-06 — profile completion polish
- [ ] Artist genres use canonical/dry configured types.
- [ ] Artist act types use canonical multi-select values.
- [ ] Image/social/bio polish.
- [ ] Venue live-music-specific fields.
- [ ] Skip/resume profile completion.

### JOIN-07 — Claim persistence + verification journey
- [ ] Persist claim request from existing-record branch.
- [ ] Claim status surfaces.
- [ ] Verification evidence workflow.
- [ ] Admin/curator review.
- [ ] Approval creates owner/admin relationship without duplicating entity.

### JOIN-08 — delegates / relationship management
- [ ] Managed-entities screen.
- [ ] Invite delegate/admin.
- [ ] Accept/revoke relationship.
- [ ] Owner-only transfer/relinquish actions.
- [ ] Audit history.

### JOIN-09 — Backline authority + conflict behaviour
- [ ] Venue user-created source/claims.
- [ ] Explicit owner-protection policy tests.
- [ ] Conflict/review representation when external evidence disagrees.
- [ ] Provenance inspection in Godmode/Backline Explorer.

### JOIN-10 — funnel hardening
- [ ] analytics events;
- [ ] end-to-end tests;
- [ ] duplicate race tests;
- [ ] auth-resume tests;
- [ ] accessibility audit;
- [ ] mobile performance check;
- [ ] production smoke test.

## 14. Acceptance criteria for first usable release

A user can:

1. open `/join` on mobile;
2. choose Artist or Venue;
3. search for their entity;
4. see matching canonical entities including location and known name variants;
5. select an existing entity and enter a safe Claim handoff **without creating a duplicate**; or
6. explicitly confirm a genuinely new entity;
7. authenticate and return to the same journey;
8. create the new entity through the canonical API;
9. receive an initial owner/admin relationship in the same logical operation;
10. see a success screen and public profile;
11. have user-submitted facts represented with durable provenance in Backline.

No normal failure may leave a newly-created entity with no corresponding initial management relationship.

## 15. Immediate execution order

1. Land this plan and workboard lane.
2. Build `/join` shell + Artist/Venue choice in `bndy-app`.
3. Implement Artist identity candidate lookup with aliases + location.
4. Wire existing-entity branch and placeholder Claim handoff.
5. Wire auth resume.
6. Implement authenticated atomic Join Artist backend path using existing artist membership + uniqueness infrastructure.
7. Complete Artist happy path end-to-end.
8. Generalise ownership for Venue and implement Venue happy path.
9. Build persisted Claim workflow.
10. Build delegates/ownership management.

## 16. Decisions intentionally deferred

- whether multiple simultaneous `owner` relationships are allowed or exactly one primary owner is required;
- whether Artist and Venue relationships share one physical DynamoDB table;
- exact automated claim-verification methods;
- whether delegates receive granular permissions in V1 or role bundles only;
- final terminology shown to users (`owner`, `manager`, `admin`, `delegate`) — backend semantics should remain explicit even if UX labels become friendlier.

These decisions must not block JOIN-01 through the identity-search portion of JOIN-02.