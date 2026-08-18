# bndy Festivals & Music Series — V1 Full-Stack Specification

**Status:** implementation-ready  
**Date:** 2026-08-18  
**Primary frontend:** `flowency-live/bndy-app`  
**Primary backend:** `flowency-live/bndy-serverless-api`  
**Scope:** public grassroots festivals and short live-music series, with existing gigs as child events

---

## 1. Product decision

Festivals are a **parent grouping over ordinary bndy gigs**.

A gig does not become a different kind of object because it belongs to a festival. It remains:

- an artist / bill
- at a venue
- on a date
- at a time
- with normal bndy ticketing, cancellation, sharing, curator and map behaviour

A gig may additionally belong to one festival using `festivalId` and related metadata.

This model must handle, without special cases:

1. **Single-venue short series** — e.g. one pub running a five-day Bank Holiday programme with eight bands.
2. **Town / city multi-venue festival** — e.g. Congleton Jazz Festival spread over ~10 venues across several days.
3. **Large distributed grassroots programme** — e.g. a coordinated event spanning many grassroots music venues.

### 1.1 V1 definition of “festival”

For V1, a festival is a **named, public, short-duration programme of live-music gigs**.

The existing backend caps festival duration at 31 days. Keep that rule for V1. It is useful as a typo guard and intentionally excludes long-running seasons/programmes for now.

### 1.2 Out of scope for V1

Do **not** broaden this into a general festival/ticketing platform.

Out of scope:

- Glastonbury / Reading-style destination-festival product features
- camping / travel / accommodation
- wristbands
- festival-specific ticket wallets
- complex festival commerce
- attendee chat / social graph
- ratings / reviews
- long-running quarterly or annual series over 31 days
- public self-service festival creation by every user
- separate `festivals.bndy.co.uk` product

The intended domain is **grassroots live music**.

---

## 2. Core UX principle

> **Festivals must enrich the existing map and gig-list experience, not compete with it.**

Do not create a second event system.

A festival should answer:

- What is this programme?
- When is it?
- Which gigs are part of it?
- Which venues are involved?
- What is happening now / next?
- Where are those venues on the map?

A normal gig should answer all its existing questions **plus**:

- Is this part of a festival?
- Which festival?
- Can I jump to the full programme?

---

## 3. Navigation & information architecture

### 3.1 URLs

Use the existing bndy app/domain.

```text
/festivals
/festivals/[slug]
```

Do **not** create a festival subdomain.

### 3.2 Primary navigation

Do **not** add another permanent mobile bottom-nav item for V1.

The current primary navigation remains focused on the core map/gig/venue experience.

Festivals are surfaced contextually through:

- the Gigs screen
- festival labels on participating gigs
- festival cards in nearby/upcoming discovery
- direct/shared festival URLs

### 3.3 Festivals index entry point

On the Gigs screen, when at least one relevant festival exists, render a festival discovery module near the top:

**Happening nearby**

Example card:

```text
CONGLETON JAZZ FESTIVAL
12–16 Sep · Congleton
31 gigs · 10 venues
[poster / artwork]
```

Follow with a compact link/button:

```text
See all festivals →
```

If no festival matches the current place/date context, do not reserve empty vertical space.

### 3.4 Festival membership on ordinary gig UI

Every gig that belongs to a festival should display a compact parent label, e.g.

```text
CONGLETON JAZZ FESTIVAL
The Example Trio
Swiftys · 21:00
```

The festival label must be visually distinct from:

- artist name
- venue name
- date/time
- ticket/open-mic badges

It should feel like a **programme ribbon / parent context**, not another status pill.

Tap/click the festival label → `/festivals/[slug]`.

This treatment applies to:

- gig list cards
- GigSheet
- standalone `/g/[id]` presentation where applicable
- relevant search/results cards

---

## 4. Festival index — `/festivals`

### 4.1 Purpose

A lightweight discovery page for upcoming grassroots festivals and short programmes.

This is **not** a giant directory.

### 4.2 Default ordering

1. currently active festivals
2. upcoming festivals by start date
3. within the user's/local selected geography where practical

Past festivals are excluded from the default V1 view.

### 4.3 Card content

Required:

- name
- start/end date
- town/location if available
- number of gigs/acts where available
- number of participating venues
- poster/hero artwork if available
- status cue: `On now`, `This weekend`, or date

Optional:

- ticket price / free indicator if it describes the whole festival reliably

### 4.4 Responsive layout

Mobile:

- single-column poster-led cards
- strong image edge
- dates/counts compact

Desktop:

- responsive 2–3 column card grid

All skins must preserve semantic hierarchy while still being allowed their own surface/border/type treatment.

---

## 5. Festival detail — `/festivals/[slug]`

### 5.1 Page structure

Top-level hero should read as a **programme / poster**, not a generic profile card.

Required hero content:

- poster/hero image if available
- festival name
- dates
- town / area
- gig count
- venue count
- share action
- external website action if available

Example:

```text
CONGLETON JAZZ FESTIVAL
12–16 September
Congleton
31 gigs · 10 venues
```

### 5.2 Main view switcher

V1 detail page has three views:

```text
Schedule | Map | Info
```

Default: **Schedule**.

The selected view must have the same obvious active-state treatment recently introduced for Map Gigs/Venues and the mobile navigation. No subtle muted-text-only active states.

---

## 6. Schedule view

### 6.1 Primary presentation

Group child gigs chronologically by day.

Example:

```text
FRIDAY 12 SEPTEMBER

19:00  The Example Trio
       Swiftys

20:30  Blue Note Quartet
       Lion & Swan

21:00  Another Act
       The Cygnet
```

### 6.2 Ordering

Within each day:

1. start time ascending
2. billing order if timestamps collide and festival metadata supplies it
3. stable title fallback

### 6.3 Event behaviour

A schedule item is still a normal gig.

Tap → existing GigSheet / gig detail behaviour.

Do not duplicate ticketing, calendar, share, flag or curator logic inside festival components where an existing gig primitive already owns it.

### 6.4 Stage display

Where `stageId` resolves to a named stage, display stage as secondary metadata.

For distributed town festivals, `venue` usually matters more than `stage`.

For single-site/multi-stage festivals, stage may be promoted visually.

Never require stages.

### 6.5 Cancelled gigs

Use existing cancellation styling. Do not remove cancelled festival gigs from the programme; a programme must still explain what changed.

---

## 7. Festival map view

### 7.1 Fundamental rule

**Do not create a fake festival pin at the geographic centre.**

The map displays the actual participating **venues**.

### 7.2 Single-venue festival

Render one venue marker.

Opening it shows the festival gigs at that venue.

### 7.3 Multi-venue festival

Render one marker per participating venue with a festival-specific count cue, e.g.

```text
Swiftys · 5
Lion & Swan · 3
```

Tap venue marker → festival-filtered stack/list of child gigs at that venue.

### 7.4 Initial viewport

Fit bounds to participating venue coordinates.

For one venue, use the existing sensible local venue zoom rather than extreme maximum zoom.

### 7.5 Map styling

Use the current skin/map infrastructure. Do not create festival-specific basemap families.

Festival overlays may use the skin accent, but venue/event semantics must remain readable in every skin.

### 7.6 Reuse

Prefer extracting/reusing the existing map/gig stack primitives instead of creating a separate map implementation.

The festival page can provide a known set of child events/venues and let the map render only those.

---

## 8. Info view

Display only fields that actually exist.

Possible content:

- description
- festival website
- social links
- ticket URL / price / information
- participating venues
- poster/hero artwork
- source/provenance where appropriate internally, not necessarily user-facing

Venue names link to existing venue pages.

Do not render empty headings.

---

## 9. Share & social metadata

Festival pages are public share targets.

Required:

- direct festival URL
- native share on supported devices
- existing bndy share sheet channels
- Open Graph / social preview metadata

Recommended social preview content:

- festival poster/hero
- festival name
- date range
- town
- `X gigs · Y venues` where practical
- bndy identity

Example title:

```text
Congleton Jazz Festival — 12–16 September
```

Example description:

```text
31 live gigs across 10 Congleton venues. Explore the full programme on bndy.
```

---

## 10. Existing backend capability — confirmed

The serverless backend already provides the essential model and routes.

### 10.1 Festival record

Current festival fields include:

```text
id
entityType = "festival"
slug
name
description
startDate
endDate
primaryVenueId
venueIds[]
location
stages[]
lineup[]
ticketed
price
ticketUrl
lineupUrl
websiteUrl
socialMediaUrls
heroImageUrl
posterImageUrl
theme
isPublic
source
externalIds[]
createdAt
updatedAt
```

### 10.2 Stages

Stages are embedded records with generated IDs.

V1 UI treats stages as optional.

### 10.3 Festival lineup slots

Existing lineup supports slot IDs plus fields such as:

```text
displayName
artistId
eventId
day
stageId
billing
billingOrder
resolved
```

Valid backend billing tiers currently include:

```text
headline
special_guest
support
general
opener
```

### 10.4 Existing festival routes

```http
GET   /api/festivals/public
GET   /api/festivals/slug/{slug}
GET   /api/festivals/by-external-id
GET   /festivals
POST  /festivals
PATCH /festivals/{id}
```

`GET /api/festivals/slug/{slug}` already returns the festival plus child events associated through `festivalId`.

### 10.5 Existing gig membership fields

Ordinary events already support:

```text
festivalId
festivalName
stageId
billing
billingOrder
```

Community event creation and MCP/edit paths already understand these fields.

This is the desired relationship. Do not replace it with embedded event copies inside festivals.

---

## 11. Backend verification required before frontend dependency

Before relying on production data, smoke-test:

1. `GET /api/festivals/public`
2. `GET /api/festivals/slug/{known-slug}`
3. festival creation in a non-production/local stack if needed
4. event attachment via `festivalId`
5. child-event retrieval by `festivalId`

### 11.1 Dynamo indexes

The festival detail handler assumes:

- `bySlug` on festival `slug`
- `byFestival` on event `festivalId`

The code clearly depends on these indexes.

Because the production `bndy-events` table has historical/retained infrastructure complexity, **verify the live table actually has both indexes before UI launch**.

If either index is absent, add it via the appropriate infrastructure path before deploying the frontend dependency.

Do not silently fall back to full-table scans in the public detail endpoint unless used as a temporary migration guard.

---

## 12. Required backend deltas for V1

The backend is largely complete. Keep changes minimal.

### B1 — expose festival membership on public event DTOs

Ensure normal public gig payloads include, when present:

```text
festivalId
festivalName
stageId
billing
billingOrder
```

This must apply to the event read paths used by `bndy-app`, especially:

- `/api/events/public`
- `/api/events/batch`
- artist public events
- venue events
- any standalone gig endpoint used by `/g/[id]`

Reason: ordinary GigCard/GigSheet must be able to display parent festival context without a second lookup per event.

### B2 — lightweight map projection

Add optional festival context to `/api/events/public/geo`:

```ts
festivalId?: string
festivalName?: string
```

If the current geospatial GSI projection does not include these attributes, either:

- update its projection in infrastructure, or
- omit these from the lightweight result and join against the full upcoming gig cache, using the existing cancellation/ticketing fallback pattern.

**Do not block V1 festival-detail map on this.** Festival detail already receives child events directly.

This delta mainly enables global-map festival styling/filtering later.

### B3 — public festival summary counts

`GET /api/festivals/public` currently has `actCount` and venue IDs.

For a polished index, prefer adding:

```text
gigCount
venueCount
```

`venueCount` can be computed from unique `primaryVenueId + venueIds`.

`gigCount` should reflect linked child events, not lineup-slot count, because unresolved lineup slots and actual gigs are not guaranteed to be 1:1.

If computing `gigCount` makes the list endpoint expensive for V1, use `actCount` temporarily and label it accurately in the UI. Do not call lineup-slot count “gigs”.

### B4 — town/location consistency

Festival search/list handlers currently reference `town`, while create persists a general `location` field and does not obviously persist a dedicated `town` field.

Normalize this for V1.

Preferred festival location fields:

```ts
location?: string   // human-readable town/area, e.g. "Congleton"
```

Optionally retain `town` for backwards compatibility but return one normalized field to the new app.

Do not require a single latitude/longitude for multi-venue festivals; map bounds come from venues.

### B5 — creation authorization

`POST /festivals` and `PATCH /festivals/{id}` currently require authentication in the handler.

For V1, festival creation/editing should be **curated/staff/ingestion**, not open public self-service.

Before exposing creation UI in `bndy-app`, add/verify staff or curator authorization rather than treating any signed-in user as a festival editor.

No creation UI is required for first public festival release.

---

## 13. Frontend domain model

Add to `src/domain/types.ts`.

Suggested V1 model:

```ts
export type FestivalBilling =
  | "headline"
  | "special_guest"
  | "support"
  | "general"
  | "opener";

export interface FestivalStage {
  id: string;
  name: string;
}

export interface FestivalLineupSlot {
  id: string;
  displayName: string;
  artistId?: string;
  artistName?: string;
  eventId?: string;
  day?: string;
  stageId?: string;
  billing?: FestivalBilling;
  billingOrder?: number;
  resolved?: boolean;
}

export interface FestivalSummary {
  id: string;
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  location?: string;
  venueIds: string[];
  posterImageUrl?: string;
  heroImageUrl?: string;
  actCount?: number;
  gigCount?: number;
  venueCount?: number;
  price?: string;
}

export interface Festival extends FestivalSummary {
  description?: string;
  primaryVenueId?: string;
  stages: FestivalStage[];
  lineup: FestivalLineupSlot[];
  ticketed?: boolean;
  ticketUrl?: string;
  lineupUrl?: string;
  websiteUrl?: string;
  socialMediaUrls?: string[];
  theme?: unknown;
}
```

Extend `Gig` with:

```ts
festivalId?: string;
festivalName?: string;
festivalSlug?: string; // derived client-side if supplied by parent lookup; not required in DB
stageId?: string;
billing?: FestivalBilling;
billingOrder?: number;
```

Do not make `festivalId` required.

---

## 14. Frontend API layer

Add to `src/lib/api.ts`:

```ts
fetchFestivals(params?)
fetchFestival(slug)
```

Suggested contracts:

```ts
fetchFestivals({ startDate?, endDate? }): Promise<FestivalSummary[]>

fetchFestival(slug): Promise<{
  festival: Festival;
  childEvents: Gig[];
}>
```

### 14.1 Festival child-event transform

Festival detail returns raw child events. Reuse `toGig()` rather than create a second event transform.

If festival child events lack joined venue/artist/geolocation fields required by `toGig`, either:

1. improve the festival backend response to return the standard public joined event shape, **preferred**, or
2. batch-enrich child event IDs via `/api/events/batch` in the frontend.

Preferred final contract: festival detail child events are directly consumable as normal `Gig` domain objects.

This is worth verifying before implementation.

---

## 15. React Query hooks

Add to `src/lib/hooks.ts`:

```ts
useFestivals()
useFestival(slug)
```

Recommended cache behaviour:

- festival index stale time: 5–10 minutes
- festival detail stale time: 1–5 minutes while active/upcoming
- public API can continue returning `Cache-Control: public, max-age=60`

Festival detail must not independently refetch artists/venues one-by-one.

---

## 16. Frontend components

Suggested structure:

```text
src/features/festivals/
  FestivalCard.tsx
  FestivalHero.tsx
  FestivalSchedule.tsx
  FestivalMap.tsx
  FestivalInfo.tsx
  FestivalViewToggle.tsx
  FestivalBadge.tsx
  festivalUtils.ts
```

Routes:

```text
src/app/festivals/page.tsx
src/app/festivals/[slug]/page.tsx
```

Modify existing:

```text
src/features/gigs/GigsHome.tsx
src/features/gigs/GigCard.tsx
src/features/gigs/GigSheet.tsx
src/domain/types.ts
src/lib/api.ts
src/lib/hooks.ts
```

Potential map primitive extraction may touch existing `src/features/map/*`.

---

## 17. Gigs screen integration

### 17.1 Festival discovery module

Show festivals relevant to the user's current gig search context.

V1 relevance rules, in order of simplicity:

1. active/upcoming festival date overlaps the current date/filter window
2. at least one participating festival venue has a gig inside the user's selected radius

If implementing geographic relevance is expensive initially, show a small set of active/upcoming festivals and rely on festival location text. Improve after V1.

### 17.2 Filtering

Do **not** add a permanent Festival-only filter to the already-dense mobile filter row in first implementation.

After usage feedback, a Festival facet can be added if needed.

### 17.3 Search

Gig-list text search should match `festivalName` as well as artist/venue/title once festival fields are in the gig domain.

---

## 18. Global map integration

V1 global map remains primarily **Gigs / Venues**.

Do not add a third permanent `Festivals` mode immediately.

Festival-member gigs continue appearing exactly where their actual gigs occur.

Optional V1 enhancement:

- a subtle festival ribbon/icon in GigSheet when opening a festival-member gig

Possible post-V1 enhancement:

- `Festivals` map filter/facet
- festival-aware marker aggregation

The dedicated festival detail Map view provides the strong festival map experience without destabilising the core map navigation.

---

## 19. Skin requirements

Festival UI must work in all current skins.

Do not hard-code a single festival colour palette.

Use skin tokens for:

- surfaces
- borders
- text
- active controls
- shadows

But festival components should have **structural personality**, not merely recolouring:

- poster-like hero perimeter
- programme ribbons
- date blocks
- venue-count badges
- schedule dividers

Roadcase may feel like a laminated tour schedule / equipment label.

Flyer may feel like a pasted bill/poster.

Vibe may use neon programme accents.

The semantic hierarchy must remain identical.

---

## 20. Accessibility & mobile requirements

This is mobile-first.

Required:

- minimum 44px practical tap targets
- active Schedule/Map/Info state obvious without relying only on colour
- readable muted text contrast in every skin
- no horizontal schedule overflow
- map controls clear of bottom mobile navigation and browser safe areas
- poster images have useful alt text
- tabs use appropriate ARIA semantics
- venue/gig controls keyboard reachable on desktop
- cancelled status conveyed in text, not only styling

On mobile, switching Schedule → Map must not lose the user's page context unnecessarily.

---

## 21. Empty/loading/error states

### Festival index

Loading:
- poster/card skeletons

Empty:
- `No upcoming grassroots festivals listed here yet.`
- optional return-to-gigs action

Error:
- concise retry state

### Festival detail

404:
- `We couldn't find that festival.`

Festival exists but no child gigs:
- still show hero/info
- schedule: `Programme coming soon.`
- map: show known participating venues if `venueIds` are available; otherwise friendly empty state

Do not crash when lineup exists but event resolution is incomplete.

---

## 22. Curation / creation workflow

V1 public app is primarily a **reader** of festivals.

Festival records are created through staff/curation/import tooling.

### 22.1 Attaching gigs

A curated workflow needs to support:

- create festival
- select existing festival when creating/editing an event
- set optional stage
- set billing/order
- remove an event from festival

The existing event backend fields already support this.

### 22.2 Community Add Gig wizard

Do not force a festival question into the normal Add Gig flow.

Most gigs are not in festivals.

Possible later contextual UX:

If event date/venue matches an active known festival, suggest:

```text
Is this part of Congleton Jazz Festival?
[Yes] [No]
```

Do not ship this until authorization/data-quality rules for attaching community-created gigs to curated festivals are decided.

---

## 23. Data integrity rules

1. A gig may belong to **zero or one** festival in V1.
2. The same event must never be copied into a festival-specific event store.
3. `festivalId` is canonical membership.
4. `festivalName` on the event is denormalized display/cache convenience only.
5. Festival date range should encompass child event dates; flag mismatches during curation/import.
6. `venueIds` should be the union of venues participating in festival child events, plus any known announced venues without resolved gigs.
7. Removing a gig from a festival clears festival-specific fields from that event.
8. Deleting/unpublishing a festival must not delete ordinary gig records by default.
9. Festival slug is immutable under the current backend contract.
10. External/provenance IDs merge additively unless explicitly replaced by privileged tooling.

---

## 24. Import / large festival support

The existing backend has external IDs, festival lookup by external ID and event external IDs. Preserve these for ingestion.

For a distributed programme with many venues:

1. create/find festival by external ID
2. resolve/create venues through normal venue pipeline
3. resolve/create artists through normal artist pipeline
4. create/find ordinary events
5. attach `festivalId` / `festivalName`
6. resolve festival lineup slots to artist/event IDs where lineup slots are used
7. publish festival only when minimum data quality is met

Bulk import must be idempotent.

A source re-run should update/resolve records, not create a duplicate festival/event tree.

---

## 25. Analytics

Instrument at minimum:

```text
festival_card_view
festival_open
festival_view_schedule
festival_view_map
festival_view_info
festival_gig_open
festival_venue_open
festival_share
festival_website_click
```

Useful dimensions:

```text
festivalId
festivalSlug
sourceSurface   // gigs_home, gig_card, gig_sheet, direct, share
view
```

Do not block V1 release if the current analytics stack is not yet ready; keep event names documented for implementation.

---

## 26. SEO

Festival detail pages are indexable public content.

Use server metadata where feasible:

- title
- description
- canonical URL
- Open Graph image
- date/location text

Potential structured data can be added later, but the page should at minimum have clean crawlable text and stable slug URLs.

---

## 27. Implementation phases

### Phase 0 — backend smoke test

- verify production festival routes
- verify `bySlug`
- verify `byFestival`
- create/use one test festival and attached event in safe environment
- inspect actual child-event response shape

### Phase 1 — backend compatibility patch

Only as required by smoke test:

- expose festival fields on public event reads
- normalize festival location/town
- add summary counts if cheap
- ensure festival child events can become normal `Gig` objects
- add/update Dynamo index projection only if necessary

**User deploy action:** pull `bndy-serverless-api` and perform normal local SAM build/deploy after backend commits are ready.

### Phase 2 — frontend data model

- Festival types
- Gig festival fields
- API transforms
- hooks
- tests

### Phase 3 — festival routes

- `/festivals`
- `/festivals/[slug]`
- Schedule / Map / Info
- sharing and metadata

### Phase 4 — existing-gig integration

- FestivalBadge/ribbon
- GigCard
- GigSheet
- gig search festival-name matching
- GigsHome discovery module

### Phase 5 — polish / release QA

- all skins
- mobile Chrome
- iPhone Safari/PWA
- desktop
- one-venue festival test
- multi-venue festival test
- partial/unresolved lineup test
- cancelled child event test
- shared festival link/unfurl

---

## 28. V1 acceptance criteria

A festival feature is release-ready when all of the following are true.

### Discovery

- [ ] Upcoming public festivals can be discovered from Gigs.
- [ ] `/festivals` lists upcoming festivals.
- [ ] Festival cards show clear dates/location/counts.

### Detail

- [ ] `/festivals/[slug]` renders hero, Schedule, Map and Info.
- [ ] Schedule groups ordinary gigs by day/time.
- [ ] Tapping a schedule gig opens the normal gig experience.
- [ ] Map displays actual participating venues, never a fake centre festival pin.
- [ ] Multi-venue markers expose only that festival's gigs.
- [ ] One-venue festivals work without special-case UI breakage.

### Gig integration

- [ ] Festival-member gigs visibly name their parent festival.
- [ ] Parent label links to festival page.
- [ ] Non-festival gigs are visually unchanged.
- [ ] Existing ticketing/share/calendar/cancel/flag behaviours still work.

### Backend

- [ ] Public festival list route works in deployed environment.
- [ ] Festival slug lookup works.
- [ ] Child gigs are retrievable through `festivalId`.
- [ ] Required indexes exist in deployed Dynamo table.
- [ ] Public gig DTOs preserve festival membership.
- [ ] No N+1 artist/venue API explosion on festival detail.

### Visual/mobile

- [ ] Works in every current skin.
- [ ] Schedule/Map/Info active state is unmistakable.
- [ ] Mobile page does not require awkward horizontal scrolling.
- [ ] Festival map does not collide with mobile bottom nav.
- [ ] Text contrast remains clear in light/dark/art-direction skins.

### Sharing

- [ ] Festival has a stable shareable URL.
- [ ] Share sheet uses current proper social icons.
- [ ] Social unfurl includes useful festival identity/date/artwork.

---

## 29. Test fixtures / scenarios

Use at least these fixtures during implementation.

### Fixture A — single venue

**The Cygnet Bank Holiday Live**

- 5 days
- 1 venue
- 8 gigs
- no stages
- mixture of free/ticketed events

Validates that “festival” does not require multiple venues.

### Fixture B — town-wide

**Congleton Jazz Festival**

- several days
- ~10 venues
- many artists/events
- optional stage data absent for most events

Validates map bounds, venue grouping and chronological schedule.

### Fixture C — distributed programme

A large grassroots venue network programme.

- many venues
- potentially multiple towns/cities
- large child-event count

Validates performance and avoids assumptions that a festival has one centre.

### Fixture D — incomplete programme

- festival public
- poster/description present
- lineup announced
- only some lineup slots resolved to bndy events

Validates graceful “programme coming together” behaviour.

---

## 30. Product language

Use **Festival** publicly for V1.

Avoid over-explaining “series” in the UI unless the specific programme uses that language.

Backend/entity naming can remain `festival` for now.

If long-running music series become a real requirement later, evolve the parent entity deliberately rather than prematurely broadening V1.

Recommended explanatory line where needed:

> **A festival on bndy is a collection of live gigs happening as part of the same programme.**

---

## 31. Final architectural rule

The feature should remain understandable as this relationship:

```text
Festival
  ├── Gig → Artist(s) + Venue + Date/Time
  ├── Gig → Artist(s) + Venue + Date/Time
  ├── Gig → Artist(s) + Venue + Date/Time
  └── ...
```

Not:

```text
Festival
  └── a second special event model duplicating gigs
```

That single choice is what lets bndy support a pub weekend, Congleton Jazz Festival and a national grassroots programme without breaking the existing map, gig list, sharing, ticketing or curator systems.

---

## 32. Immediate next action

1. Smoke-test the live festival endpoints and Dynamo indexes.
2. Patch only the backend response gaps identified in §12.
3. Commit backend changes for later SAM deployment.
4. Begin `bndy-app` Phase 2/3 implementation immediately; do not wait for admin creation UI.
5. Use a small real/test festival fixture to drive the complete frontend vertically from list → festival → schedule → map → gig.
