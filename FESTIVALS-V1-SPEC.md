# bndy Festivals & Music Series — V1 Full-Stack Specification

**Status:** implementation-ready  
**Date:** 2026-08-18  
**Primary frontend:** `flowency-live/bndy-app`  
**Primary backend:** `flowency-live/bndy-serverless-api`  
**Scope:** public grassroots festivals and short live-music series, with ordinary bndy gigs as child events

---

## 1. Product decision

Festivals are a **parent grouping over ordinary bndy gigs**.

A gig does not become a separate event type because it belongs to a festival. It remains:

- an artist / bill
- at a venue
- on a date
- at a time
- with normal bndy ticketing, cancellation, sharing, calendar, curator and map behaviour

A gig may additionally belong to one festival using `festivalId` and related metadata.

This model must support without special-case architecture:

1. **Single-venue short series** — one pub running a five-day Bank Holiday programme with eight bands.
2. **Town / city multi-venue festival** — Congleton Jazz Festival spread over multiple venues and several days.
3. **Large distributed grassroots programme** — a coordinated event spanning many grassroots music venues.

### 1.1 V1 definition of “festival”

For V1, a festival is a **named, public, short-duration programme of live-music gigs**.

The current backend caps festival duration at 31 days. Keep this rule for V1.

Public UI should use the word **Festival** even where the underlying programme might also be described as a short music series.

### 1.2 V1 positioning

The core bndy gig experience answers:

> **What live music is happening around me?**

Festivals answer a different planning question:

> **What grassroots music programme is worth planning around or travelling to?**

This distinction is important. Festival discovery must not depend entirely on the user's current map viewport or local radius.

### 1.3 Out of scope

Do not turn bndy into a generic destination-festival or ticketing platform.

Out of scope for V1:

- Glastonbury / Reading-style destination-festival product features
- camping / accommodation / travel packages
- wristbands or festival wallets
- complex festival commerce
- attendee chat/social graph
- ratings/reviews
- long-running seasons over 31 days
- public self-service festival creation by every user
- separate `festivals.bndy.co.uk` product

The intended domain is **grassroots live music**.

---

## 2. Architectural rule

The relationship is:

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

`festivalId` is canonical membership.

This choice allows the same architecture to support a pub weekend, Congleton Jazz Festival and a large distributed grassroots programme without breaking the existing map, gigs list, sharing, ticketing or curator systems.

---

## 3. Information architecture

### 3.1 Routes

Use the existing bndy app/domain:

```text
/festivals
/festivals/[slug]
```

Do **not** create a festival subdomain.

### 3.2 Festivals are a first-class discovery surface

`/festivals` is not merely a contextual list of festivals near the current map location.

It exists specifically so a user can discover something such as Congleton Jazz Festival **before** they are in Congleton and decide to travel for it.

Therefore:

- festival discovery is not constrained by the normal gig radius by default
- the page should make scanning future months easy
- location/region filtering is optional refinement, not a prerequisite to seeing festivals
- direct/shared festival URLs remain first-class entry points

### 3.3 Primary navigation

Do **not** add a fifth permanent mobile bottom-nav item for V1.

Instead make Festivals very easy to reach from the existing Gigs experience:

- a prominent `Festivals` entry/action in the Gigs header/discovery area
- a `See all festivals` action from relevant festival modules
- festival ribbons on member gigs
- clickable festival banner in GigSheet
- direct/share links

Desktop navigation may expose Festivals as a secondary navigation item if layout allows without crowding the core mobile navigation model.

If later usage shows Festivals is a top-level destination comparable with Gigs, revisit primary navigation after V1 rather than forcing another bottom-nav item now.

---

## 4. Festival visual language across bndy

Festival membership must be immediately recognisable in every skin.

Do **not** rely on muted copy alone.

Do **not** hard-code one universal festival colour such as purple/orange/green across every skin.

### 4.1 Semantic festival token

Introduce skin-aware festival semantic tokens, for example:

```css
--fest
--on-fest
--fest-soft
--fest-line
```

Each skin may resolve these differently, but the structural treatment must remain consistent.

Default derivation may use existing accent tokens where appropriate, but it must meet contrast requirements.

Examples:

- Vibe: bright neon programme accent
- Roadcase: equipment-label / pass treatment
- Flyer: overprinted poster strip
- bndy Dark/Light: clean high-contrast festival ribbon

### 4.2 Recognition comes from shape + label + colour

Festival identity should be recognisable through a repeated visual pattern:

- small `FESTIVAL` kicker
- festival name
- full-width or edge-to-edge ribbon treatment where space allows
- semantic festival token

V1 does **not** require a new bespoke “F” logo or festival sub-brand mark.

A custom festival mark can be designed later as part of a deliberate bndy icon/brand system. Do not invent a weak pseudo-logo just to fill space.

---

## 5. Festival membership on ordinary gig surfaces

Every ordinary gig that belongs to a festival must expose its parent context.

### 5.1 Gig list card / stub

Add a compact festival ribbon above the normal gig identity.

Example:

```text
FESTIVAL · CONGLETON JAZZ FESTIVAL
The Example Trio
Swiftys · 21:00
```

Rules:

- festival ribbon is visually distinct from ticket/open-mic/cancelled badges
- do not make the whole gig card look like a different object
- tapping the ribbon/name opens `/festivals/[slug]`
- tapping the rest of the card keeps existing GigSheet behaviour
- non-festival gigs remain visually unchanged

### 5.2 GigSheet

This is a required V1 treatment.

For a festival-member gig, render a **full-width festival banner at the very top of the sheet**, before the hero/image and gig controls.

Example:

```text
FESTIVAL
Congleton Jazz Festival            ›
```

The whole banner is clickable/tappable and opens the parent festival page.

It should feel like a programme header attached to the gig, not a tiny metadata chip buried in the body.

The existing gig content below remains unchanged.

### 5.3 Standalone gig route

Where `/g/[id]` renders a standalone/shareable gig page, use the same festival parent treatment near the top.

### 5.4 Global map markers

Festival-member gigs remain normal gig markers at their actual venue coordinates.

V1 may add a **subtle festival halo/keyline/edge treatment** to member-gig markers if this can be done without making the global map noisy.

Do not create a separate festival-centre marker.

The definitive festival identification after tapping a gig is the GigSheet festival banner.

---

## 6. Festival index — `/festivals`

### 6.1 Purpose

A dedicated planning and discovery page for upcoming grassroots festivals and short programmes.

This is where a user can discover a festival somewhere they are willing to travel to.

The experience should work even when the user has no location permission and even when no festival is inside their current gig radius.

### 6.2 Views

V1 should provide two complementary views:

```text
Calendar | List
```

Active state must be unmistakable using the same strong active-state principles as the map Gigs/Venues toggle.

Recommended default: **Calendar** if the implementation remains clean on mobile; otherwise default List while retaining the calendar prominently.

### 6.3 Calendar view

The calendar is a **festival planning calendar**, not a gig-by-gig calendar.

It highlights festival date ranges across the year so users can see when programmes are happening.

Desktop:

- annual or multi-month overview
- months clearly separated
- festival date spans highlighted
- clicking a highlighted festival/date opens/selects the festival card/detail

Mobile:

- do not render twelve tiny unreadable month grids
- use a horizontal month selector or stacked month sections
- show highlighted festival date ranges plus festival cards/list immediately below the selected month
- preserve easy one-handed scrolling

If several festivals overlap on the same dates, show a count/stack affordance rather than squeezing unreadable labels into calendar cells.

### 6.4 List view

List all active/upcoming public festivals, grouped by month.

Ordering:

1. currently active festivals
2. upcoming by start date

Past festivals are excluded by default.

### 6.5 Discovery filters

Keep V1 filters lightweight:

- search by festival name/location
- optional location/region filter
- optional `Near me` refinement
- month/year navigation

Do not impose the standard gig radius as the festival page's default filter.

The point of this page is travel/planning discovery.

### 6.6 Festival card content

Required:

- name
- start/end date
- town/location
- gig count where available
- participating venue count
- poster/hero artwork if available
- status cue: `On now`, `This weekend`, or date

Optional:

- whole-festival price/free indicator only when reliable

Cards should feel poster/programme-led, not like oversized normal gig cards.

---

## 7. Gigs page integration

Festivals also appear inside the existing Gigs experience, but this is **contextual discovery**, not the only discovery mechanism.

### 7.1 Festival entry point

Near the Gigs page heading/filter area, include a clear route to `/festivals`.

Examples:

```text
Gigs near you                     Festivals →
```

or a compact secondary segmented/action treatment that does not overload mobile filters.

### 7.2 Relevant festival module

When festivals overlap the user's selected gig date/location context, show a compact module such as:

```text
HAPPENING NEARBY
Congleton Jazz Festival
12–16 Sep · 31 gigs · 10 venues
```

Follow with `See all festivals →`.

If none are relevant, reserve no empty vertical space.

### 7.3 Gig search

Once festival fields are present on gigs, text search should match `festivalName` in addition to artist/venue/title.

### 7.4 No Festival-only filter initially

Do not add another permanent filter into the already-dense mobile Gigs filter row for first V1 implementation.

The festival ribbon plus `/festivals` discovery page provides the necessary differentiation.

---

## 8. Festival detail — `/festivals/[slug]`

### 8.1 Hero

Festival detail should read as a **programme/poster object**, not a generic profile card.

Required hero content:

- poster/hero image if available
- `FESTIVAL` context
- festival name
- dates
- town/area
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

### 8.2 Main view switcher

V1 detail page:

```text
Schedule | Map | Info
```

Default: **Schedule**.

Selected state must be obvious through filled/outlined active treatment, not muted-text differences.

---

## 9. Schedule view

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

Within each day order by:

1. start time
2. billing order when supplied
3. stable title fallback

A schedule row is still a normal gig.

Tap → existing GigSheet/gig detail behaviour.

Do not duplicate ticketing, share, calendar, flag, cancellation or curator logic inside festival components where existing gig primitives already own it.

### 9.1 Stages

Where `stageId` resolves to a stage name, show it as secondary programme metadata.

For distributed town festivals, venue usually matters more than stage.

For single-site/multi-stage festivals, stage may be visually promoted.

Stages are never required.

### 9.2 Cancelled gigs

Use existing cancellation styling.

Do not silently remove cancelled gigs from a published festival schedule; the programme should explain what changed.

---

## 10. Festival map view

### 10.1 Rule

**Never create a fake festival pin at the geographic centre.**

The festival map displays the actual participating venues.

### 10.2 Single venue

Render one venue marker.

Opening it shows only that festival's gigs at the venue.

### 10.3 Multiple venues

Render one marker per participating venue with a programme count cue, for example:

```text
Swiftys · 5
Lion & Swan · 3
```

Tap → festival-filtered stack/list of child gigs at that venue.

### 10.4 Viewport

Fit bounds to participating venue coordinates.

For one venue use a sensible local zoom, not an extreme maximum zoom.

### 10.5 Styling/reuse

Use current skin/map infrastructure.

Do not create festival-specific basemap families.

Reuse/extract existing venue/gig stack primitives rather than implementing a second map engine.

---

## 11. Info view

Render only populated fields:

- description
- website
- social links
- ticket URL/price/information
- participating venues
- poster/hero artwork where useful

Venue names link to existing venue pages.

Do not render empty headings.

---

## 12. Sharing & social metadata

Festival pages are first-class public share targets.

Required:

- stable festival URL
- native share where supported
- existing bndy ShareSheet channels
- proper social icons
- Open Graph/social preview metadata

Recommended preview:

- festival poster/hero
- festival name
- date range
- location
- `X gigs · Y venues`
- bndy identity

Example:

```text
Congleton Jazz Festival — 12–16 September
31 live gigs across 10 Congleton venues. Explore the full programme on bndy.
```

---

## 13. Existing backend capability — confirmed

The serverless backend already provides the essential festival model and routes.

### 13.1 Festival record

Existing fields include:

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

### 13.2 Lineup/stages

Stages have generated IDs.

Festival lineup slots support fields such as:

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

Valid billing values currently include:

```text
headline
special_guest
support
general
opener
```

### 13.3 Existing routes

```http
GET   /api/festivals/public
GET   /api/festivals/slug/{slug}
GET   /api/festivals/by-external-id
GET   /festivals
POST  /festivals
PATCH /festivals/{id}
```

`GET /api/festivals/slug/{slug}` already returns the festival plus child events associated through `festivalId`.

### 13.4 Existing event membership

Ordinary events already support:

```text
festivalId
festivalName
stageId
billing
billingOrder
```

Community event creation and MCP/edit paths already understand these fields.

Keep this relationship; do not embed copies of full gig objects into festival records.

---

## 14. Backend verification before frontend dependency

Smoke-test deployed/local routes before relying on them:

1. `GET /api/festivals/public`
2. `GET /api/festivals/slug/{known-slug}`
3. festival creation in safe/local environment
4. event attachment using `festivalId`
5. child-event retrieval using `festivalId`

### 14.1 Dynamo indexes

The handlers assume:

- `bySlug` on festival `slug`
- `byFestival` on event `festivalId`

Verify both exist on the deployed `bndy-events` table before UI release.

If absent, add through the proper infrastructure/SAM path.

Do not silently rely on production full-table scans as the normal festival-detail path.

---

## 15. Required backend deltas

Keep backend changes minimal.

### B1 — preserve festival membership on public event DTOs

Ensure public gig read paths expose when present:

```text
festivalId
festivalName
stageId
billing
billingOrder
```

Apply to:

- `/api/events/public`
- `/api/events/batch`
- artist public events
- venue events
- standalone gig read used by `/g/[id]`

This allows GigCard/GigSheet to display parent festival context without per-card lookup calls.

### B2 — festival slug for member-gig navigation

Normal gig UI needs a direct route to `/festivals/[slug]`.

Preferred options, in order:

1. expose `festivalSlug` alongside `festivalId/festivalName` in public joined event DTOs
2. maintain a cached festivalId→slug map from `GET /api/festivals/public`

Avoid N+1 festival detail lookups from gig cards.

### B3 — lightweight global map projection

Optionally expose:

```ts
festivalId?: string
festivalName?: string
festivalSlug?: string
```

from `/api/events/public/geo` if the GSI projection permits it.

If not, keep the lightweight endpoint small and join against the full upcoming-gig cache using the existing fallback pattern.

Do not block festival-detail Map on this; festival detail already owns a known child-event set.

### B4 — reliable summary counts

`GET /api/festivals/public` currently exposes `actCount` and venue IDs.

Prefer adding:

```text
gigCount
venueCount
```

`venueCount` = unique participating venue IDs.

`gigCount` must count linked child events, not lineup slots.

If this is expensive initially, label `actCount` accurately rather than pretending it is gig count.

### B5 — location consistency

Current handlers mix `town` and generic `location` expectations.

Normalize the new app contract to:

```ts
location?: string
```

Optionally retain legacy `town` internally/backwards-compatibly.

Do not require one festival latitude/longitude; multi-venue map geography comes from venues.

### B6 — creation authorization

Current festival create/update handlers require authentication.

For V1 creation/editing should be **staff/curator/ingestion controlled**, not open to every signed-in user.

Verify/add the appropriate authorization before exposing any festival management UI.

No public festival creation UI is required for V1 launch.

---

## 16. Frontend domain model

Add to `src/domain/types.ts`:

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

Extend `Gig`:

```ts
festivalId?: string;
festivalName?: string;
festivalSlug?: string;
stageId?: string;
billing?: FestivalBilling;
billingOrder?: number;
```

Festival membership remains optional.

---

## 17. Frontend API layer

Add to `src/lib/api.ts`:

```ts
fetchFestivals(params?)
fetchFestival(slug)
```

Contracts:

```ts
fetchFestivals({ startDate?, endDate? }): Promise<FestivalSummary[]>

fetchFestival(slug): Promise<{
  festival: Festival;
  childEvents: Gig[];
}>
```

### 17.1 Child event transform

Reuse the normal `toGig()` transform.

If festival child events are too raw to become `Gig` objects directly, preferred fix is to improve the backend festival detail response to return the standard public joined event shape.

Fallback: batch-enrich child event IDs through `/api/events/batch` once per festival page.

Do not make per-event artist/venue requests.

---

## 18. React Query hooks

Add:

```ts
useFestivals()
useFestival(slug)
```

Suggested caching:

- festival index: stale 5–10 minutes
- detail: stale 1–5 minutes
- public API may retain `Cache-Control: public, max-age=60`

---

## 19. Frontend components

Suggested structure:

```text
src/features/festivals/
  FestivalCard.tsx
  FestivalHero.tsx
  FestivalCalendar.tsx
  FestivalList.tsx
  FestivalSchedule.tsx
  FestivalMap.tsx
  FestivalInfo.tsx
  FestivalViewToggle.tsx
  FestivalRibbon.tsx
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
src/features/map/* (only where reuse/projection requires it)
```

---

## 20. Skin requirements

Festival UI must work in every current skin.

Festival semantics are skin-aware, not one hard-coded brand colour.

Required:

- festival token meets contrast requirements
- ribbon/banner remains recognisable across skins
- structural hierarchy is consistent
- Schedule/Map/Info and Calendar/List active states are obvious

Skin art direction can vary:

- Roadcase: laminated pass / equipment label
- Flyer: pasted poster strip / overprint
- Vibe: neon programme banner
- bndy Light/Dark: clean editorial ribbon

Do not sacrifice legibility to theme personality.

---

## 21. Mobile/accessibility requirements

Mobile-first.

Required:

- practical 44px tap targets
- no horizontal schedule overflow
- no unreadable 12-month calendar grid on phones
- strong active states without relying only on colour
- readable muted text in every skin
- map controls clear of bottom navigation/safe areas
- poster images have useful alt text
- tab/view controls use appropriate ARIA semantics
- cancelled state conveyed textually as well as visually

Switching Schedule/Map/Info should preserve page context where practical.

---

## 22. Empty/loading/error states

### Festival index

Loading:

- festival-card/calendar skeletons

Empty:

```text
No upcoming grassroots festivals listed yet.
```

Include route back to Gigs.

### Festival detail

404:

```text
We couldn't find that festival.
```

Festival exists but programme unresolved:

- hero/info still render
- Schedule: `Programme coming soon.`
- Map: show known participating venues if possible

Do not crash because lineup slots are only partially resolved.

---

## 23. Curation/creation workflow

V1 public app is primarily a **reader** of festivals.

Festival records are created through staff/curation/import tooling.

Curated workflow must support:

- create festival
- attach existing/new event to festival
- optional stage
- optional billing/order
- remove event from festival
- update festival metadata/artwork

### 23.1 Add Gig wizard

Do not force every community Add Gig through a festival question.

Possible later contextual suggestion:

```text
This venue/date overlaps Congleton Jazz Festival.
Is this gig part of it?
[Yes] [No]
```

Do not ship this until authorization/data-quality rules for community attachment to curated festivals are agreed.

---

## 24. Data integrity

1. A gig belongs to zero or one festival in V1.
2. `festivalId` is canonical membership.
3. `festivalName`/`festivalSlug` are denormalized convenience fields only.
4. Festival dates should encompass child gig dates; curation/import should flag mismatches.
5. `venueIds` should reflect participating child-event venues plus announced unresolved venues.
6. Removing festival membership clears festival-specific fields from the event.
7. Unpublishing/deleting a festival does not delete ordinary gig records by default.
8. Slug remains immutable under the current backend contract.
9. External/provenance IDs remain additive/idempotent under import tooling.

---

## 25. Import / large-programme support

For large distributed programmes:

1. create/find festival using external ID
2. resolve/create venues through normal venue pipeline
3. resolve/create artists through normal artist pipeline
4. create/find ordinary events
5. attach `festivalId` / `festivalName`
6. resolve lineup slots to artists/events where used
7. publish only when minimum data quality is met

Bulk import must be idempotent.

A rerun updates/resolves existing records rather than creating duplicate festival/event trees.

---

## 26. Analytics

Instrument at minimum:

```text
festivals_open
festivals_view_calendar
festivals_view_list
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
sourceSurface // gigs_home, gig_card, gig_sheet, festivals_calendar, festivals_list, direct, share
view
```

---

## 27. SEO

Festival detail pages are indexable public content.

Use server metadata where practical:

- title
- description
- canonical URL
- Open Graph image
- date/location text

Festival index should also be crawlable with useful upcoming-festival content.

Structured Event/Festival data may follow after V1.

---

## 28. Implementation phases

### Phase 0 — backend smoke test

- verify public festival routes
- verify `bySlug`
- verify `byFestival`
- inspect real child-event response shape
- use one safe test festival + attached gig

### Phase 1 — backend compatibility patch

As required:

- preserve festival fields on public event reads
- expose/resolve festival slug efficiently
- normalize location
- add correct summary counts if cheap
- ensure festival detail child gigs transform into normal `Gig`
- update Dynamo projection/index only where necessary

**Deployment:** commit backend changes to `bndy-serverless-api`; user can pull and perform the normal local SAM build/deploy.

### Phase 2 — frontend data foundation

- festival domain types
- Gig festival fields
- API transforms
- hooks
- tests
- semantic festival skin tokens

### Phase 3 — festival discovery

- `/festivals`
- Calendar/List switcher
- mobile month navigation
- cards/search/location refinement

### Phase 4 — festival detail

- `/festivals/[slug]`
- hero
- Schedule / Map / Info
- sharing/social metadata

### Phase 5 — ordinary gig integration

- festival ribbon on GigCard
- full-width festival banner on GigSheet
- standalone gig treatment
- festival-name search matching
- GigsHome festival entry/discovery module
- subtle global-map member treatment only if clean

### Phase 6 — release QA

Test:

- every skin
- mobile Chrome
- iPhone Safari/PWA
- desktop
- one-venue festival
- multi-venue town festival
- large distributed programme
- incomplete lineup
- cancelled child gig
- festival calendar overlaps
- shared festival URL/unfurl

---

## 29. V1 acceptance criteria

### Festival discovery

- [ ] `/festivals` exists as a dedicated first-class discovery page.
- [ ] Users can discover festivals outside their current map radius/location.
- [ ] Calendar and List views are available and have obvious active states.
- [ ] Calendar makes future festival date ranges easy to scan.
- [ ] Mobile calendar remains readable and scrollable.
- [ ] Festival cards show date, location, poster where available and useful counts.
- [ ] Gigs page has a clear route to all Festivals.

### Ordinary gig differentiation

- [ ] Festival-member gig cards have a recognisable festival ribbon.
- [ ] Ribbon uses skin-aware festival semantics, not a fixed universal colour.
- [ ] Festival ribbon/name links to parent festival.
- [ ] GigSheet has a full-width clickable festival banner at its top.
- [ ] Non-festival gigs remain visually unchanged.
- [ ] Existing share/calendar/ticket/cancel/flag behaviour remains intact.

### Festival detail

- [ ] `/festivals/[slug]` renders hero, Schedule, Map and Info.
- [ ] Schedule groups ordinary gigs by day/time.
- [ ] Tapping a schedule gig opens the normal gig experience.
- [ ] Map displays actual participating venues, never a fake centre pin.
- [ ] Multi-venue markers expose only that festival's gigs.
- [ ] Single-venue programmes work without special-case UI breakage.

### Backend

- [ ] Public festival list works in deployed environment.
- [ ] Festival slug lookup works.
- [ ] `bySlug` and `byFestival` indexes exist where handlers expect them.
- [ ] Child gigs are retrievable via `festivalId`.
- [ ] Public event DTOs preserve festival membership.
- [ ] Gig surfaces can resolve parent slug without N+1 lookups.
- [ ] Festival detail does not produce N+1 artist/venue requests.

### Visual/mobile

- [ ] Works in every skin.
- [ ] Festival identity is obvious in both light and dark skins.
- [ ] Calendar/List and Schedule/Map/Info selected states are unmistakable.
- [ ] Festival map clears mobile bottom nav and safe areas.
- [ ] Text contrast remains clear.

### Sharing

- [ ] Festival has stable shareable URL.
- [ ] ShareSheet uses proper social icons.
- [ ] Social unfurl includes festival identity/date/location/artwork.

---

## 30. Test fixtures

### Fixture A — single venue

**The Cygnet Bank Holiday Live**

- 5 days
- 1 venue
- 8 gigs
- no stages
- mixture of free/ticketed events

Validates that festival does not imply multiple venues.

### Fixture B — town-wide

**Congleton Jazz Festival**

- several days
- ~10 venues
- many artists/events
- little/no stage data

Validates planning discovery, venue grouping, chronological schedule and map bounds.

### Fixture C — distributed programme

A large grassroots venue network programme.

- many venues
- potentially multiple towns/cities
- large child-event count

Validates performance and the absence of a fake geographic centre assumption.

### Fixture D — incomplete programme

- festival public
- poster/description present
- lineup announced
- only some slots resolved to bndy gigs

Validates graceful partial-programme behaviour.

### Fixture E — calendar overlap

Two or more festivals sharing dates in different locations.

Validates calendar density/stack affordance and reinforces that discovery is not radius-constrained.

---

## 31. Product language

Use **Festival** publicly for V1.

Recommended explanatory line where needed:

> **A festival on bndy is a collection of live gigs happening as part of the same programme.**

Avoid generic “series” language unless the named programme itself uses that wording.

If long-running series become a real requirement later, evolve the parent entity deliberately rather than broadening V1 prematurely.

---

## 32. Final UX principle

Festival context should be visible at three levels:

1. **Plan it** — `/festivals` calendar/list helps users discover programmes worth travelling to.
2. **Explore it** — `/festivals/[slug]` provides Schedule / Map / Info.
3. **Recognise it** — ordinary GigCards, GigSheet and relevant map interactions clearly identify when a gig is part of a festival.

That is the V1 festival experience.

---

## 33. Immediate next action

1. Smoke-test live/local festival endpoints and Dynamo indexes.
2. Patch only the backend gaps in §15.
3. Commit backend changes ready for SAM deploy.
4. Build the frontend data layer and festival semantic tokens.
5. Deliver `/festivals` Calendar/List discovery first.
6. Deliver one real/test `/festivals/[slug]` vertical slice with Schedule → Map → GigSheet.
7. Add festival ribbons/banner to the existing Gigs experience.
