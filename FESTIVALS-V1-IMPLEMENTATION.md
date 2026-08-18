# Festivals V1 — Implementation status

Date: 2026-08-18

## Implemented in `bndy-app`

- Festival domain model and gig parent membership fields
- Public festival API transforms and React Query hooks
- `/festivals` planning/discovery route
- Calendar and List discovery views
- `/festivals/[slug]` detail route with share/social metadata
- Poster-led festival hero
- Schedule / Map / Info views with obvious active states
- Chronological multi-day schedule using ordinary bndy gigs
- Actual-venue festival map with per-venue gig counts and no synthetic centre pin
- Skin-aware festival programme ribbon / GigSheet banner
- Festival context on normal gig list rows and standalone shared gig pages
- Festival names included in Gigs search
- Upcoming festival discovery strip on Gigs
- Desktop Festivals navigation without adding a sixth mobile bottom-nav item
- Multi-hundred-event batch support for large programmes
- Festival transform and schedule utility tests
- GitHub CI gate for typecheck, tests and production build

## Backend V1 patch

`bndy-serverless-api` contains a public festival V1 read contract that:

- normalises `location`/legacy `town`
- supplies `venueCount` and true detail-page `gigCount`
- prefers `bySlug` / `byFestival` GSIs
- safely falls back to paginated filtered scans if a retained production Dynamo table is missing either index
- chunks artist enrichment beyond DynamoDB BatchGet's 100-key limit
- has regression tests for index fallback and public response shape

The backend patch requires the normal SAM deploy before the hardened read contract is live.

## Deliberately not in V1

- public self-service festival creation
- a sixth mobile bottom-nav item
- fake festival-centre map pins
- destination-festival travel/camping/wristband product features
- long-running series over the existing 31-day festival limit

## Release verification

Frontend CI: typecheck + Vitest + Next production build.

Production smoke test after SAM deploy:

1. `GET /api/festivals/public`
2. `GET /api/festivals/slug/{known-slug}`
3. one single-venue festival
4. one multi-venue festival
5. a normal map/list gig linked to a festival
