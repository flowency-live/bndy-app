# bndy Facebook-assisted Artist & Venue Creation Plan

Status: IN PROGRESS
Created: 2026-08-21
Primary repos:
- `flowency-live/bndy-app` (`main`)
- `flowency-live/bndy-serverless-api` (`master`)
Reference only:
- `flowency-live/bndy-capture` (`main`)

Starting points:
- bndy-app main: `66c341fb3a9223ee4a5094fb37d7c12cac649846`
- bndy-serverless-api master: `1d5a842a87f356a0ee41effbc375d6a33c975689`

## Product goal

A public user can paste a Facebook URL to help add an artist or venue.

The same Facebook-assisted artist path must work inside the existing Add Gig wizard.

The Facebook URL is a source/hint, never an authority. We only keep data that was actually observed or explicitly confirmed by the user. Existing bndy identity/deduplication rules remain authoritative.

## Product principles

1. Paste first, forms second.
2. Never invent missing source data.
3. Inspection never creates a record.
4. Existing bndy record wins when identity already exists.
5. Artist Facebook identity remains the strongest identity signal already supported by the artist uniqueness gate.
6. Venue identity remains Google Place ID. Facebook may suggest the business, but cannot create a placeless venue.
7. Failure to inspect Facebook is graceful: retain the URL and continue with the existing manual flow.
8. Public endpoints are tightly constrained and rate-limit friendly. No generic server-side URL fetcher.
9. `bndy-capture` is a later consumer, not a dependency of the public web flow.

## Phase 0 — Reconnaissance and contracts

- [x] Confirm current repo heads.
- [x] Confirm existing public artist creation accepts `facebookUrl`.
- [x] Confirm artist identity layer canonicalises Facebook URLs and uses Facebook as a uniqueness key.
- [x] Confirm existing artist creation can attempt a Facebook profile image.
- [x] Confirm public venue find-or-create exists and requires/derives Google Place identity.
- [x] Confirm bndy-capture captures URLs but is not a Facebook metadata parser.
- [ ] Pin exact frontend wizard interfaces and current response contracts before editing.
- [ ] Pin exact SAM/API Gateway route definitions before backend route changes.

## Phase 1 — Backend source inspector

Add a small, public, read-only Facebook inspection capability.

Proposed route: `POST /api/community/source/inspect`

Input:
```json
{
  "input": "anything pasted by the user",
  "expectedType": "artist"
}
```

`expectedType`: `artist | venue | null`

Output shape:
```json
{
  "source": "facebook",
  "input": "...",
  "facebookUrl": "https://www.facebook.com/...",
  "facebookKey": "facebook.com/...",
  "valid": true,
  "existing": {
    "entityType": "artist",
    "id": "...",
    "name": "..."
  },
  "observed": {
    "name": "...",
    "imageUrl": "...",
    "location": "...",
    "address": "...",
    "websiteUrl": "..."
  },
  "evidence": {
    "name": "html_meta",
    "imageUrl": "graph_picture"
  },
  "warnings": []
}
```

Implementation rules:
- [ ] Extract Facebook URL from pasted text, not just pristine URLs.
- [ ] Canonicalise using existing shared `facebookKey()`.
- [ ] Reject non-Facebook URLs for V1.
- [ ] Look for existing artist by Facebook uniqueness sentinel before scraping.
- [ ] Where practical, look for an existing venue whose social links match the canonical Facebook URL.
- [ ] Best-effort server-side fetch with Facebook hostname allowlist, HTTPS-only, short timeout, redirect cap/revalidation, response-size cap and HTML checks.
- [ ] Parse only defensible metadata: Open Graph title/image/description/canonical and explicit page hints.
- [ ] Preserve existing Graph-picture fallback for artist images where usable.
- [ ] Never use an LLM to guess missing fields.
- [ ] Return partial success rather than making Facebook parsing a hard dependency.
- [ ] Add unit tests for URL extraction/canonicalisation, hostile URLs, redirects, metadata parsing and no-data fallback.
- [ ] Add route-policy/WAF inventory entries if required.

Acceptance:
- Inspection performs zero entity writes.
- Existing artist can be returned immediately by exact Facebook identity.
- Invalid/non-Facebook input gives a clear controlled response.
- No SSRF-shaped generic URL fetch endpoint exists.

## Phase 2 — Frontend inspector client + reusable paste component

- [ ] Add typed inspector API client.
- [ ] Add reusable Facebook paste/assist component.
- [ ] Copy: “Do you know their Facebook page?”
- [ ] Accept pasted URL or Facebook share text.
- [ ] Handle idle / inspecting / existing match / partial / no-details / invalid / temporary failure.
- [ ] Preserve the supplied URL when enrichment returns nothing.
- [ ] Accessible labels and status announcements.

## Phase 3 — Add Gig artist integration

- [ ] Insert Facebook assistance only when creating a new artist.
- [ ] Existing bndy match → one-tap select existing artist.
- [ ] Observed details → prefill existing New Artist form.
- [ ] No useful details → continue existing manual form with URL retained.
- [ ] Submit through existing resolver/find-or-create and uniqueness gate.
- [ ] Fix any copy that over-promises Facebook extraction.
- [ ] Add regression tests.

## Phase 4 — Standalone public Add Artist

Route target: `/add/artist`

- [ ] Paste Facebook URL/share text.
- [ ] Inspect.
- [ ] Existing artist → “Already on bndy”.
- [ ] New artist → compact prefilled confirmation form.
- [ ] Require existing minimum identity fields, especially resolvable performing location.
- [ ] Create through existing public artist path.
- [ ] Preserve `needs_review`.
- [ ] Success → “Add another artist” without full navigation.

## Phase 5 — Standalone public Add Venue

Route target: `/add/venue`

- [ ] Paste Facebook URL/share text.
- [ ] Inspect for observed business hints.
- [ ] Feed hints into existing Places search.
- [ ] User selects/confirms Google Place.
- [ ] Existing match or existing community venue find-or-create.
- [ ] Store Facebook social link when supported.
- [ ] Never relax Google Place ID invariant.
- [ ] Success → “Add another venue”.

## Phase 6 — Discovery / entry points

- [ ] Add lightweight entry points from existing Add surface.
- [ ] Do not add bottom-nav items.
- [ ] Keep mobile-first and skin-aware.

## Phase 7 — Capture reuse

- [ ] After web flow is proven, let `bndy-capture` consume the same inspector.
- [ ] Do not make bndy-app depend on capture.

## Phase 8 — Verification and deployment

Backend:
- [ ] Unit/security tests.
- [ ] SAM validate/build if available.
- [ ] Inspect changeset for unrelated resources.
- [ ] Deploy intended Lambda/API only.
- [ ] Smoke-test known existing artist, unknown artist, noisy Facebook share URL, non-Facebook input, malformed input, unreachable Facebook and venue input.

Frontend:
- [ ] Typecheck.
- [ ] Tests.
- [ ] Production build.
- [ ] 360–430px mobile review.
- [ ] Keyboard/accessibility review.
- [ ] Existing Add Gig manual-flow regression.

## Deployment responsibility

Preferred:
- ChatGPT commits backend/frontend code and runs every check available in the environment.
- If AWS credentials/SAM CLI are unavailable, the user performs SAM deployment.
- Before deploy, provide exact backend SHA, exact resources/routes changed, safe changeset procedure and smoke-test commands.
- Never claim backend is live until deployed and smoke-tested.

## Build log

### 2026-08-21
- Reconnaissance complete.
- Existing artist Facebook identity/community creation confirmed.
- Existing venue Google Place invariant confirmed.
- bndy-capture confirmed as capture/backlog, not live parser.
- Starting Phase 1: backend source inspector.
