# bndy Facebook-assisted Artist & Venue Creation

Status: IMPLEMENTED — Capture reuse intentionally deferred
Created: 2026-08-21
Updated: 2026-08-22

Primary repos:
- `flowency-live/bndy-app` (`main`)
- `flowency-live/bndy-serverless-api` (`master`)

Reference/later consumer:
- `flowency-live/bndy-capture` (`main`)

## Product goal

A public user can paste a Facebook URL or Facebook share text to help add an artist or venue. The same Facebook-assisted artist path is available inside Add Gig.

Facebook is a source/hint, never an authority. bndy's existing identity, review and deduplication rules remain authoritative.

## Product rules now enforced

1. Paste first, forms second.
2. Inspection itself performs no entity writes.
3. Only a resolved stable Facebook page may become entity identity; transient `/share`, post, reel, event and group URLs never do.
4. Raw pasted/share text remains local to the UI until the backend resolves a stable Facebook identity.
5. Existing bndy artist identity wins when an exact Facebook uniqueness key already exists.
6. Venue identity remains Google Place ID. Facebook may suggest a business name, but cannot create a placeless venue.
7. Facebook inspection failure is graceful: the user can continue manually without persisting unverified Facebook input.
8. The backend fetcher is Facebook-only, HTTPS-only and redirect-revalidated; it is not a generic URL fetch endpoint.
9. Missing source fields are never guessed.
10. `bndy-capture` is a later consumer, not a dependency of the public web flow.

## Phase 0 — Contracts and reconnaissance

- [x] Confirm current artist/community creation path accepts Facebook identity.
- [x] Confirm shared artist identity canonicalises Facebook URLs and backs the uniqueness gate.
- [x] Confirm venue creation remains Google Place ID based.
- [x] Pin frontend wizard interfaces and API response contracts.
- [x] Pin backend route/security/deployment shape.
- [x] Keep `bndy-capture` out of the public web dependency chain.

## Phase 1 — Read-only backend source inspector

Route:

`POST /api/community/source/inspect`

Input:

```json
{
  "input": "anything pasted by the user",
  "expectedType": "artist"
}
```

`expectedType`: `artist | venue | null`

Implemented:

- [x] Extract Facebook URLs from pristine URLs and noisy pasted share text.
- [x] Canonicalise stable Facebook identity using the existing shared `facebookKey()` logic.
- [x] Preserve transient share token case/query long enough to resolve it.
- [x] Reject Facebook lookalike/embedded hostile hosts.
- [x] Treat `/share`, posts, reels, events, groups and similar content URLs as transient rather than entity identity.
- [x] Check exact existing artist Facebook identity before doing network work.
- [x] Re-check exact artist identity after redirect/canonical resolution.
- [x] Use an exact Facebook/fb host allowlist, HTTPS-only fetch, redirect revalidation, timeout, response-size cap and HTML content checks.
- [x] Parse only observed Open Graph/canonical metadata.
- [x] Return partial/graceful success when Facebook does not expose metadata.
- [x] Never return an unresolved share token as `facebookUrl` or `facebookKey`.
- [x] Add source-inspector unit/security regression tests.
- [x] Classify the public route in the backend route/security inventory.
- [x] Deploy as an isolated companion SAM stack rather than requiring a full-stack deploy for inspector-only changes.

Deliberate venue behaviour:

- [x] `expectedType: "venue"` does not query artist identity.
- [x] Facebook supplies observed venue hints only; the web flow then requires Google Places confirmation.
- [ ] Exact existing-venue lookup by stored Facebook social URL is not implemented. This is optional because Google Place ID remains the authoritative venue identity and the current flow resolves against bndy/Google Places before creation.

Backend hardening/deploy landmarks:

- PR #12 merged as `097d8acd9ba57c6ccc5b117e60487e1b8897be2d`.
- Source-inspector deployment workflow PR #13 merged as `34ddaa2cf938e113e580b36dc97349a4865718a9`.
- Isolated deployment status reported `source-inspector/deploy: success`.
- Live deployment smoke tests cover controlled missing-input and hostile-host rejection paths.

## Phase 2 — Frontend inspector client + reusable assist

- [x] Typed source-inspector API client.
- [x] Reusable `FacebookSourceAssist` component.
- [x] Accept pristine URLs or Facebook share text.
- [x] Idle/checking/existing/partial/no-details/error/unresolved states.
- [x] Accessible label and live status region.
- [x] Stable identity replaces transient input after resolution.
- [x] Unverified raw input is never handed to artist/venue persistence state.
- [x] Inspection/API failure leaves the manual form usable without persisting raw Facebook input.

## Phase 3 — Add Gig artist integration

- [x] Facebook assist appears only in the new-artist path.
- [x] Exact existing bndy artist can be selected directly.
- [x] Observed name/image evidence can prefill the existing new-artist form.
- [x] Resolver/find-or-create and uniqueness gates remain authoritative.
- [x] Inspected evidence is carried through publish for new artists.
- [x] Existing single-act and multi-act Add Gig regression coverage remains in place.
- [x] Facebook identity-state regression tests cover the transient-share failure mode.

## Phase 4 — Standalone public Add Artist

Route: `/add/artist`

- [x] Public Facebook-assisted artist creator.
- [x] Exact existing artist → “Already on bndy”.
- [x] New artist → compact confirmation form.
- [x] Requires artist name, resolvable town/region and artist type.
- [x] Uses the existing artist resolver/review path.
- [x] Carries observed image/source evidence only when actually supplied.
- [x] Success state includes “Add another artist”.

## Phase 5 — Standalone public Add Venue

Route: `/add/venue`

- [x] Public Facebook-assisted venue creator.
- [x] Facebook-observed name can seed venue search.
- [x] Existing bndy venues are surfaced before creation.
- [x] Google Places search/confirmation remains mandatory for a new physical venue.
- [x] Venue find-or-create receives Google Place ID, address and coordinates.
- [x] Verified Facebook page can be retained as a social link.
- [x] Google Place ID invariant is unchanged.
- [x] Success state includes “Add another venue”.

## Phase 6 — Discovery / entry points

- [x] `/add` exposes lightweight “Add artist” and “Add venue” shortcuts.
- [x] No extra bottom-nav item was added.
- [x] Existing signed-in Add Gig flow remains the primary `/add` experience.
- [x] Entry-point touch targets use the mobile 44px minimum.

## Phase 7 — Capture reuse

Deferred by design until the public flow has accumulated enough real-world evidence.

- [ ] Decide whether `bndy-capture` should consume the same inspector contract.
- [ ] If adopted, keep Capture as a consumer rather than making bndy-app depend on it.

## Phase 8 — Verification

Backend:

- [x] Source-inspector unit/security tests.
- [x] Shared artist-domain/identity drift guards green before merge.
- [x] Isolated SAM build/deploy completed through GitHub Actions.
- [x] Live API smoke: missing input returns controlled `INPUT_REQUIRED` response.
- [x] Live API smoke: hostile embedded Facebook lookalike returns controlled `NOT_FACEBOOK_URL` response.
- [x] Unit coverage includes known existing artist, unknown artist, direct stable-page fetch failure, noisy share resolution, unresolved share identity and venue-mode behaviour.
- [ ] A broad live matrix against real third-party Facebook pages is intentionally not treated as a deterministic release gate because anonymous Facebook responses change independently of bndy.

Frontend:

- [x] Typecheck green on Facebook identity-state hardening PR.
- [x] Vitest suite green.
- [x] Next production build green.
- [x] Focused `FacebookSourceAssist` regression tests cover raw-input isolation, stable resolution, unresolved share links, backend failure and exact existing-artist reuse.
- [x] Core controls use mobile-first sizing; Add surface entry shortcuts meet the 44px target.
- [ ] Pixel-level 360–430px browser review on the deployed production build remains a visual QA task rather than a code gate.

## Current release boundary

The public Facebook-assisted artist/venue feature is implemented across backend and frontend. The inspector is deployed and live-smoke-tested. Frontend code is CI-verified before merge. The only planned product extension left in this document is optional Capture reuse; it is not required for the public feature to be considered complete.
