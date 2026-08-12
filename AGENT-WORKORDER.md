# AGENT WORK ORDER — bndy status verification + next batch
**From:** Claude (Cowork/CTO session) · **Date:** 2026-07-14
**Repos:** `C:\VSProjects\bndy-app` + `C:\VSProjects\bndy-serverless-api`
**Rules:** You hold the pen in the repos and you deploy. Follow bndy-serverless-api CLAUDE.md guardrails for anything backend. Commit early and often — uncommitted work has been destroyed twice by tooling sync issues. **Update the STATUS LOG at the bottom of THIS file as you complete each task** (that's how the results flow back).

---

## TASK 0 — Verify & report actual current state (do first, read-only + commits)

0.1 `git status` + `git log --oneline -5` in BOTH repos. Commit any uncommitted work (yours or Claude's) as logically separated commits. Record commit hashes in the status log.

0.2 Confirm whether the **"filled markers + reconcile-on-idle"** change (previous prompt) was implemented and deployed:
   - `git log --all --oneline -- src/features/map/` in bndy-app
   - Code check: `layers.ts` g-core should FILL with `c.gigGlow` (accent) and stroke `c.gigStroke`; MapView should have an epoch guard + a permanent `map.on('idle', ...)` self-heal. `skinMap.ts` diamond should be solid (it is, in the working tree).
   - Record: implemented? committed? deployed to gigmap?

0.3 Geo infra (full CLI available — check directly, do not assume):
   ```bash
   aws dynamodb describe-table --table-name bndy-events --region eu-west-2 \
     --query "Table.GlobalSecondaryIndexes[].{name:IndexName,status:IndexStatus,items:ItemCount}"
   ```
   - Is `geohash4-date-index` present and ACTIVE? Item count sane (should be ≈ total public events, NOT ~80% of it)?
   - Was `backfill-geohash.js --execute` run? If unsure: `node backfill-geohash.js` (dry-run) — candidates should be ≈0. If hundreds, review then `--execute`.
   - Locate `geo-backfill-report.json`; copy the `missingCoords` array into the status log (feeds venue geocoding cleanup).

0.4 Live smoke (curl or browser):
   - City: `https://api.bndy.co.uk/api/events/public/geo?bbox=-2.4,52.9,-2.0,53.15&startDate=<today>&endDate=<today+14d>` → expect 200, `truncated:false`, events array
   - UK: `...?bbox=-8,50,2,59&...` → expect 200, `truncated:true`
   - Confirm `NEXT_PUBLIC_GEO_EVENTS` is set in the Amplify/production env for bndy-app and pins render on gigmap.

## TASK 1 — (only if 0.2 shows it's missing) Filled markers + skin-switch resilience
Full spec was in the previous prompt; essentials:
- `layers.ts` g-core: `circle-color: c.gigGlow`, `circle-stroke-color: c.gigStroke`, stroke-width 2.5, radius interp zoom 8:6 / 13:9 / 16:12. Bloom radius +20%.
- `MapView.tsx`: epoch ref invalidating stale rebuild closures; try/catch in `ensureSourcesAndLayers` rescheduling via `map.once('idle')`; permanent `map.on('idle')` self-heal: if `isStyleLoaded() && (!getSource('gigs') || !getLayer('g-core'))` → `ensureSourcesAndLayers`.
- Verify: cycle all 9 skins twice incl. rapid double-switches — pins present after EVERY switch, console clean. Two commits (style / resilience).

## TASK 2 — Gig list performance (audit A2)
The artists browse got `Deferred` render-on-approach + memoized tiles; the gigs list at `/gigs` needs the same:
- Extract `Deferred` from `src/features/artists/ArtistsBrowse.tsx` into `src/components/DeferredSection.tsx` (same behaviour: IntersectionObserver, rootMargin 900px, estimated-height placeholder). ArtistsBrowse imports it (no behaviour change).
- In GigsHome, wrap each day-band's card container in `Deferred` (estimate ~92px/card). **Do NOT restyle day headers — visual change is parked pending a design decision.** Structure/perf only.
- `memo(GigCard)` (same pattern as ArtistTile).
- Verify: `npx tsc --noEmit` (3 known pre-existing errors excepted) + type in gig search with 100+ results — no long input tasks in Performance tab.

## TASK 3 — Quick wins (one small commit each)
3.1 **Ticker iOS notch:** `.bndy-ticker` in `src/app/skins.css` needs `padding-top: env(safe-area-inset-top, 0px)`; bump `<main>`'s top padding compensation in `app-shell.tsx` accordingly (currently `pt-6`; make the map's `-mt-6` reclaim match). Test in responsive mode with a notched device preset.
3.2 **robots + sitemap:** add `src/app/robots.ts` (allow all, point at sitemap) and `src/app/sitemap.ts` generating entries for `/`, `/map`, `/gigs`, `/artists`, and all artist + venue profile URLs from `fetchArtists`/`fetchVenues` (revalidate 3600). Public discovery product — this matters.

## EXPLICITLY OUT OF SCOPE (do not touch)
- ~~Gig-list day-header styling~~ → now IN scope, see TASK 4 (decision made 2026-07-27)
- Radix Dialog refactor of Sheet (next batch, has its own spec coming)
- S3 image pipeline / next-image (needs infra decisions)
- Landing page (bndy.co.uk) — separate design track

## Definition of done
Tasks 0–3 complete, each verified as specified, all committed + deployed to gigmap, STATUS LOG below filled in. If anything is blocked, say what and why in the log rather than working around it.

---

## TASK 4 — Gig-list day headers → full-width bars (Option B, approved 2026-07-27)

> **UPDATE 2026-07-27 (Claude): 4.1 and 4.2 are ALREADY IMPLEMENTED in the working tree (uncommitted).** `skins.css` has the 4 `--dayhead-*` tokens in all 9 blocks (inserted after each `--tick-*` line); `GigsHome.tsx` day heading is now the bar (radius uses `var(--rad)` for family coherence, not fixed 6px). `npx tsc --noEmit` = clean, 0 errors. **Your job: review the diff, run the 4.3 contrast script, do the 9-skin visual pass, then commit (tokens + component, one commit each) and deploy. Commit FIRST — uncommitted work has been destroyed before.** Sections 4.1/4.2 below are kept as the reference spec for review.

**Decision:** Jason picked the prototype "full-width tinted bar" day headers over the current small text labels. **Hard gate: every bar must pass WCAG 2 AA contrast (≥4.5:1 — header text is 12px bold, i.e. "normal" size).** Raw `--acc`/`--on-acc` FAILS AA on 6 of 9 skins (e.g. #F97316/#fff = 2.80) — do NOT use them for the bar. Use the dedicated tokens below; every pair is pre-computed to pass.

### 4.1 skins.css — add 4 tokens to EVERY skin block

| skin | `--dayhead-bg` | `--dayhead-fg` | ratio | `--dayhead-hot-bg` (tonight) | `--dayhead-hot-fg` | ratio |
|---|---|---|---|---|---|---|
| print | `#181309` | `#F5EFE2` | 16.1 | `#C42A12` | `#FDFBF5` | 5.50 |
| bndy-light | `#0F172A` | `#CBD5E1` | 12.0 | `#F97316` | `#0F172A` | 6.37 |
| bndy-dark | `#1C2637` | `#94A3B8` | 5.93 | `#F97316` | `#0F172A` | 6.37 |
| openair | `#113B33` | `#A9CFC3` | 7.31 | `#0B7A67` | `#FFFFFF` | 5.26 |
| goldenhour | `#42291C` | `#D9B99B` | 7.26 | `#B93F20` | `#FFFFFF` | 5.53 |
| solar | `#073642` | `#93A1A1` | 4.86 | `#CB4B16` | `#FFFFFF` | 4.61 |
| synthwave | `#2A2139` | `#AF9BD3` | 6.15 | `#FF7EDB` | `#2B0A22` | 7.92 |
| blackout | `#FFFFFF` | `#000000` | 21.0 | `#4D7CFE` | `#000000` | 5.63 |
| hyper | `#10131C` | `#FFFFFF` | 17.9 | `linear-gradient(90deg,#4B2EFF,#B5108A)` | `#FFFFFF` | ≥6.17 both stops |

Notes:
- Most normal-day values mirror `--tick-bg/--tick-fg`, but keep SEPARATE tokens — hyper's `--tick-bg` gradient fails AA at the cyan stop (#22E4FF/#fff = 1.54), so ticker and day headers must be free to diverge. Never point dayhead tokens at tick tokens.
- Hot bars are darkened/inverted accent variants that keep each skin's accent identity: print = deepened riso red; bndy pair = EXACT brand orange but navy text; blackout = exact brand blue + black text; hyper gradient's magenta end darkened #FF2ED2→#B5108A so both stops clear 4.5 with white.
- Use `background:` (not `background-color:`) wherever `--dayhead-hot-bg` is applied, so the hyper gradient works.

### 4.2 GigsHome.tsx — restyle the per-day heading only

Current per-day heading (~line 137): `<div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-dim">{dayHeading(...)} · {count}</div>`. Replace with a bar:

```tsx
{(() => { const hot = day.date === today; return (
  <div
    className="mb-2 flex items-baseline justify-between rounded-md px-3 py-[7px]"
    style={{
      background: hot ? "var(--dayhead-hot-bg)" : "var(--dayhead-bg)",
      color: hot ? "var(--dayhead-hot-fg)" : "var(--dayhead-fg)",
    }}
  >
    <span className="text-[12px] font-extrabold uppercase tracking-[1.5px]">{dayHeading(day.date, today)}</span>
    <span className="text-[11px] font-bold tnum opacity-75">{day.gigs.length} gig{day.gigs.length === 1 ? "" : "s"}</span>
  </div>
); })()}
```

- Extract as a small `DayHeaderBar` component if you prefer — behaviourally identical.
- The BUCKET collapse button above it (`b.label`, ~line 129, accent text) is a control, not a date divider — leave it exactly as is.
- The gig-count moves INTO the bar (right side); remove the old `text-dim2` count span from the heading only if it was in the per-day heading (the bucket button count stays).
- Do not add sticky positioning in this pass (Deferred placeholders + sticky need their own look; parked).

### 4.3 Verify (gate — do not deploy without all three)

1. **Contrast:** run this against the FINAL committed hex values; all pairs must print PASS:
```python
def lum(h):
    h=h.lstrip('#')
    r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b):
    la,lb=lum(a),lum(b); return (max(la,lb)+0.05)/(min(la,lb)+0.05)
# assert cr(bg,fg) >= 4.5 for every dayhead + dayhead-hot pair in every skin
```
2. `npx tsc --noEmit` (3 known pre-existing errors excepted).
3. Cycle all 9 skins on /gigs with a date window that includes today — TONIGHT bar renders in the hot colour, other days in the neutral bar, text legible on every skin (eyeball hyper's gradient especially).

One commit for tokens, one for the component. Deploy to gigmap, log below.

---

## TASK 5 — Artist delete + event cascade (pre-launch cleanup tool, 2026-07-28)

**Already implemented by Claude (uncommitted, both repos). tsc clean; cascade lib has 5 passing jest tests. Your job: review, validate, commit, deploy both, smoke test.**

What was built:
- **bndy-serverless-api / artists-lambda:** NEW `lib/cascade-delete-events.js` (+ `.test.js`) — queries `bndy-events` via `artistId-date-index` GSI (paginated, no date bound), BatchWrite-deletes in chunks of 25 with UnprocessedItems retry/backoff, returns an audit list. Wired into `handleMCPDeleteArtist` (the existing no-auth `DELETE /api/artists/{id}/mcp` route — NO new route, no template change): cascade runs after memberships, audit is console.logged BEFORE the artist record is deleted (capture-before-prune), response now includes `cascadedEvents`.
- **bndy-app:** `api.ts` `deleteArtist()`; `hooks.ts` `useDeleteArtist()` (removes artist from ["artists"] cache, invalidates ["gigs"] prefix — covers upcoming list + map geo cache — and ["artist-gigs", id]); `ArtistTile.tsx` trash button (top-left) → in-tile confirm overlay ("Delete NAME + ALL its events?") → busy spinner → error state on failure; `ArtistsBrowse.tsx` wires `onDelete`.

Steps:
1. Review diffs in both repos. `npx jest lib/cascade-delete-events.test.js` in artists-lambda must pass 5/5.
2. Guardrails: `node scripts/validate-deployment.js` + `node scripts/verify-routes.js` (route count unchanged — reused existing MCP route).
3. Commit both repos (backend: lib+test one commit, handler wiring second; frontend: one commit). Deploy artists-lambda; push bndy-app for Amplify.
4. **Smoke test with a disposable record:** create a throwaway artist + 2 events for it (MCP tools or curl), then `curl -X DELETE https://api.bndy.co.uk/api/artists/{throwawayId}/mcp` → expect 200 with `cascadedEvents: 2`; verify events 404/gone; check CloudWatch for the audit log line.
5. Log results below.

⚠️ **LAUNCH BLOCKER (add to pre-launch checklist):** this is intentionally unauthenticated per Jason (pre-launch manual cleanup). Before go-live: remove the `onDelete` wiring in ArtistsBrowse + auth-gate or remove the MCP delete routes.

---

## TASK 6 — Venue name pills on the map (implemented 2026-07-29, needs tsc + visual gate)

**Implemented by Claude in the working tree (uncommitted). ⚠️ Claude could NOT run `npx tsc --noEmit` this time (sandbox down) — you MUST run it before committing.** Jason approved the mock (`Projects/bndy/venue-labels-mock.html`) incl. next-door-venue behaviour; requirement: WCAG 2 AA on every skin.

What was built:
- `skins.ts` — `SkinColors` gains optional `pillBg`/`pillTxt`.
- `skinMap.ts` — `pillImage()` nine-patch (64×32 @2x, stretchX [[24,40]], stretchY [[14,18]], content [10,7,54,25]) + `registerPills()` (PILL_LIVE/PILL_IDLE, fill `--card`, border venLive/venIdle, same try/catch pattern as diamonds). `readSkinColors` now also reads `--txt` → `pillTxt`, `pillBg` = card.
- `layers.ts` — new `v-label` symbol layer (added to VEN_LAYERS): singles only (never clusters), `minzoom: VENUE_LABEL_MINZOOM = 11`, icon-text-fit pill, text-font "Open Sans Bold" (same glyph stack as existing count layers), text-size 10.5→12.5 across z11–14, `text-variable-anchor` top/bottom/left/right + radial-offset 1.05 (pills fan around the diamond before dropping), `symbol-sort-key` live-first. Diamonds keep icon-allow-overlap — they never vanish, only pills drop.
- `MapView.tsx` — venue features carry `name`; `registerPills` called beside `registerDiamonds`; `v-label` wired to venClick + pointer cursor.

**Contrast (Jason's hard gate):** pill = `--txt` on `--card` per skin. Verified ratios: solar 10.6 (worst), synthwave 13.1, bndy-dark 13.9, all light skins >13 — AA needs 4.5. Re-run the TASK 4 contrast script over (card,txt) pairs to confirm independently.

Steps:
1. `npx tsc --noEmit` — MUST be clean (Claude verified greps only). Watch `PILL_OPTS`/addImage typing in skinMap.ts if anything trips.
2. Visual pass: /map → Venues, all 9 skins: pills from z11, none on clusters, next-door venues fan/drop correctly (only pills drop, diamonds stay), pill click opens the venue sheet, skin-switch keeps pills (idle self-heal re-registers images).
3. Commit (one commit), deploy to gigmap, log below.

---

## TASK 7 — Ticketed-gig UX: ticket stub + £ map glyph (implemented 2026-07-29, needs tsc/jest + GSI change)

**Implemented by Claude in the working tree (uncommitted — sandbox down again, so NO tsc/jest run: you MUST run both).** Jason approved the stub mock (`Projects/bndy/ticketed-ux-mock.html`, option A). Principle: free = clean default, NEVER badged (no "£ree" anywhere — can't prove free); ticketed gets marked.

Frontend (bndy-app):
- `skins.css` — per-skin `--stub-bg`/`--stub-fg` (appended after each dayhead token line) + `.bndy-stub` component (perforated notches via `--stub-notch`, defaults `--surface`, `.bndy-stub-oncard` → `--card`). AA-verified pairs incl. bndy-light→navy-on-cyan 4.87, blackout→black-on-blue 5.63, solar→darkened `#1F7A73` (raw acc2 can't pass). **Worst margins: openair 4.62, solar 4.76 — hand-computed; re-verify with the TASK 4 script and if openair lands <4.5, darken `--stub-bg` to `#F85E92` and recheck.**
- NEW `src/components/TicketStub.tsx` — plain stub in rows/cards (they're `<button>`s; no nested `<a>`), link variant used nowhere yet (GigSheet CTA covers tap-through). Optional `price` prop awaits a backend `ticketPrice` field (NOT plumbed yet — do not invent it).
- `ArtistEvents.tsx` + `VenueEvents.tsx` rows and `GigCard.tsx` — `{g.ticketed && <TicketStub/>}` (card variant on GigCard; its old `tik` Pill tone removed). `GigSheet.tsx` — stub in chip row + "Get tickets" CTA (`bndy-btn`, above Directions) when `ticketUrl` present.
- Map: `layers.ts` new `g-tik` symbol layer (£ glyph, filter ticketed==1, minzoom 12, sizes 9.5→13 across z12–16, allow-overlap) added to GIG_LAYERS; glyph colour = `SkinColors.gigCore`, now runtime-picked in `skinMap.ts` via new WCAG `bestOn()` helper (on-acc fails 6/9 skins against the accent fill). `MapView.tsx` gig features carry `ticketed` (geo value, falls back to a join from the whole-window gigs cache — remove the join when that path retires). `api.ts` LightEvent + `ticketed?`.

Backend (bndy-serverless-api / events-lambda):
- `handlers/public.js` geo lightweight shape now includes `ticketed: !!e.ticketed`; `public.geo.test.js` ITEM + shape assertion updated.
- **GSI change needed:** `geohash4-date-index` INCLUDE projection lacks `ticketed`, so GSI-path responses return `false` until fixed. DynamoDB projections are immutable → **delete + recreate the GSI with `ticketed` added to the INCLUDE list** (same spec as DEPLOYMENT.md geo section otherwise). Pre-launch + 4633 items = minutes of rebuild; do it in a quiet window, wait ACTIVE, then smoke `?bbox=` city query → events carry `ticketed`. Check whether `geohash6-date-index` needs the same treatment (it's the walking-scale path in the same handler).

Steps: 1) `npx tsc --noEmit` clean + `npx jest` in events-lambda (geo suite must pass with the new field). 2) Contrast script over all `--stub-*` pairs. 3) Commit both repos, deploy events-lambda (guardrails: validate + verify-routes), push bndy-app. 4) GSI recreate per above. 5) Visual pass: artist page (that OTO artist has ticketed gigs), venue page, gigs list, gig sheet CTA, map £ glyphs at z≥12 across a few skins. Log below.

---

## TASK 8 — Stacked same-venue gig pins → swipeable card deck (implemented 2026-07-29, needs tsc gate)

**Bug (Jason repro):** "This weekend" filter, Macclesfield: Queen's Hotel has 2 gigs in the window → both gig pins sit at IDENTICAL coordinates, click only ever reached `features[0]` (top of stack). The other gig was unreachable from the gig map.

**Fix implemented by Claude (uncommitted; sandbox down again — NO tsc run, you MUST run it):**
- `MapView.tsx` — `stackForRef` (ref-pattern like gigByIdRef, click closures are built once per style): on gig-pin click, collects ALL lightEvents sharing the clicked event's `venueId` within the ACTIVE date filter + search, sorted date+startTime, batch-fetches the lot (batch endpoint preserves id order). >1 → `selectedStack`; sheet close clears both. Events with null venueId degrade to single-gig behaviour.
- `GigSheet.tsx` — new optional `stack` + `distanceOf` props (single-gig callers untouched). When stack >1: header "N gigs at {venue}" + "i / N" counter, horizontal snap carousel (`snap-x snap-mandatory`, slides `w-[86%]` so the next card physically peeks — that's the stacked-deck affordance), per-card full gig body (avatar/chips/stub/tickets CTA/directions/artist/venue), accent dot indicators synced on scroll, deck rewinds to soonest gig on open. Inner body extracted to a `Body` component — zero visual change for single gigs.

**Addendum (Jason feedback):** desktop mouse users can't horizontal-scroll → added lg-only prev/next chevron buttons overlaying the carousel edges (glass-hi round, disabled at ends), ArrowLeft/ArrowRight key paging while the deck is open, clickable dots, and a venueName fallback in the header ("at this venue") — Jason's repro event has an empty venueName (leading "·" in the meta line confirms; that's a data-quality itch, not a UI bug).

Verify:
1. `npx tsc --noEmit` clean.
2. Repro Jason's case: This weekend → Macclesfield → tap Queen's Hotel gig pin → sheet shows "2 gigs at Queen's Hotel", House of Ska first (Fri), swipe right → The Select Committee (Sat); dots + counter track; Artist/Venue/Directions work per card; single-gig pins unchanged; venue-mode pins unchanged. **Desktop: chevrons page the deck, arrow keys work, dots clickable, left chevron disabled on card 1 / right on last.**
3. Check a couple of skins (print + bndy-dark) — carousel cards use --card2 mix + --line, dots use --acc/--dim2.
4. Commit + deploy with the rest.

---

## TASK 9 — THREE new skins: Lemonrock (light) + On The Case (dark) + Poole Position (dark) (implemented 2026-08-01, needs tsc + contrast gate)

> ⚠️ RESTORED 2026-08-06 — an agent log-write overwrote tasks 9–11. **Do not truncate this file when logging; APPEND to the STATUS LOG only.**

**Homage skins to three real bndy sources/people, per Jason. Implemented by Claude (uncommitted at time of writing — check git first, may already be committed).** Adding a skin = token block + registry entry, and that contract held: `skins.css` (lemonrock after solar, onthecase after blackout, poole after onthecase — all blocks carry the FULL current contract incl. `--dayhead-*` + `--stub-*`), `appSkins.ts` (AppSkinId union, 3 entries, SKIN_ORDER: …solar, lemonrock, synthwave, blackout, onthecase, poole, hyper), `skinMap.ts` BASEMAP_BY_SKIN (lemonrock→voyager, onthecase→dark, poole→dark).

Skin identities:
- **lemonrock** (soft, light): surface #F7FAF0, acc dark green #2F7A1F/white, acc2 raspberry #C2185B/white (= stub), hl lemon #F7E017 (= TONIGHT day bar + ticker text on dark green).
- **onthecase** (print family, dark — the FIRST dark print skin): green-tinged near-black, acc stencil green #8DC63F with BLACK on-acc (white fails ~2:1), acc2 white, 2.5px green borders + hard #3E5C14 offset shadows, Archivo Black uppercase, black ticker w/ green text, white stub.
- **poole "Poole Position"** (soft, dark — KLMA Stoke homage for Dave Poole; name = Jason's pick): warm black, KLMA red acc #D9201A/white (banner red #E3221C darkened one notch — 4.66→5.0), gold acc2 #F5D327/#2B2300 (10.7 — gold diamonds + stub + ticker text), red TONIGHT bar, red/gold pin glows.

Verify (gates): 1) `npx tsc --noEmit` clean. 2) Contrast script (TASK 4) over ALL THREE new blocks — every pair ≥4.5 (txt/card, dim/card, dayhead ×2, stub, tick, acc/on-acc, acc2/on-acc2, hl/on-hl). Hand-computed worst: lemonrock acc/white 5.35; onthecase acc/black 9.2; poole acc/white 5.0. Scrapes under → darken bg one notch, re-run. 3) Visual pass all 3: picker order/dots, splash+ticker, day bars + TONIGHT, stubs, map (basemap/pins/diamonds/pills/£glyph — bestOn auto-picks glyph colours), print-family tilt+shadows on onthecase. 4) **NO_FLASH check (bug found 2026-08-06, fixed in layout.tsx): select poole → hard refresh → NO print flash, family=soft, .dark set.** 5) Commit "feat: lemonrock + onthecase + poole skins" + deploy.

---

## TASK 10 — Gig popup (GigSheet) redesign: hero image, artist name, slab date/time, share (implemented 2026-08-01, needs tsc gate)

> ⚠️ RESTORED 2026-08-06 (same overwrite).

**Jason feedback on the map popup:** artist name wasn't displayed (avatar only), image too small, date/time flat, share missing (all in OLD frontstage — concepts recreated, no code copied). Implemented in `GigSheet.tsx` `Body`:
- **Hero:** full-width h-44 rounded image (imgMap; fallback avatarGradient + big initials). TONIGHT chip top-left; ticket stub top-right when ticketed.
- **Name resolution:** events sometimes lack `artistName` (Six Card Trick example) → `nameOf()` falls back to cached artists list via `artistId`, then title.
- **Hierarchy:** 22px black name → "at **Venue** · City" ("Venue TBC" when blank).
- **Slabs:** date/time/distance framed blocks (accent keyline top via inset box-shadow — token-driven): [SAT / 1 Aug] [TIME / 8pm–12am] [AWAY / 138 mi]; tonight → date slab solid accent "TONIGHT".
- **Share:** square bndy-btn2 beside Artist/Venue — `navigator.share` on mobile, clipboard + ✓ flash on desktop; shares artist-page URL (venue fallback) + human text line.
- Carousel/deck (TASK 8) untouched — every deck card gets the new body.

Verify: tsc clean; single popup shows Six Card Trick's NAME; deck cards, tonight state, ticketed overlay, share both platforms; 3–4 skins incl. print (slab keyline) + poole. Commit + deploy.

---

## TASK 11 — GIG WIZARD: backend enablers + frontend verification (2026-08-06)

> ⚠️ RESTORED 2026-08-06 (same overwrite). **Spec: `Projects/bndy/GIG-WIZARD-SPEC.md` v1.0 — READ IT FIRST.**

Frontend is IMPLEMENTED by Claude (uncommitted; sandbox down — NO tsc run). Public "Add a gig": `/add` route (+ `?artistId=`/`?venueId=` prefills that lock their step), nav `+` item, Add-a-gig buttons on artist/venue profiles, 4-step wizard (venue → artist → when → publish) with live-assembling preview card. Files: `src/features/wizard/{lib,wizardApi,PreviewCard,StepVenue,StepArtist,StepWhen,WizardCalendar,WizardShell}` + `src/app/add/page.tsx` + `src/app/list-a-gig/page.tsx`; edits: app-shell, ArtistProfile, VenueProfile, layout.tsx (NO_FLASH).

### Backend (spec §6 — B1–B7, bndy-serverless-api, guardrails apply)
- **B1 Places proxy** (venues-lambda, key already wired): `GET /api/places/suggest?q=` → `{ suggestions: [{ placeId, name, address }] }` (UK-biased, session tokens, 60s cache); `GET /api/places/details?placeId=` → `{ place: { placeId, name, address, city, lat, lng } }`. **These shapes are the contract — `wizardApi.ts` is already coded against them.** Check the 25-route cap.
- **B2 CORS**: `getCommunityHeaders()` (artists-lambda handler.js ~:3719) hard-codes live.bndy.co.uk on `/api/artists/search`, `/community`, `/find-or-create` → switch to the dynamic allowlist + add gigmap.bndy.co.uk. **Wizard is DOA without this.**
- **B3 `dryRun: true`** on `POST /api/artists/find-or-create`: full verdict (matched/review/clear + candidates **with `location`**), ZERO writes.
- **B4 `needsReview: true`** stamped on community-wizard-created artist + event + newly created venue (`source: 'community_wizard'` is passed by the frontend on all three calls).
- **B5** Remove dead `POST /api/venues/community` from template.yaml (~:458 — no handler, 404s).
- **B6** Genres: frontend hard-codes the enum in `wizard/lib.ts` mirroring `artists-lambda/lib/genres.js` — verify EXACT match (33 entries incl. era tags + Other) and add sync comments both ends.
- **B7 WAF** (Jason-approved): rate-based rule ~100 req/5min/IP on the four community POSTs + both `/api/places/*` GETs, block action. Record WebACL ARN in DEPLOYMENT.md.

### Addendum A — When-step upgrades (Jason review)
- Native date input REPLACED by `WizardCalendar.tsx` — inline branded single-tap calendar (GigDatePicker visual language: 12-month range, today ring, accent selection). **acc2 dots mark nights the chosen venue already has gigs** + legend line.
- **Proactive conflict warnings** from the cached gig list on date pick: artist-already-at-this-venue-that-night (hard warning — publish will likely 409), artist-gigging-elsewhere-that-night, venue-has-another-act-that-night (soft, non-blocking; server gate final).
- Smart default start time (§5.6: Fri/Sat 21:00, Sun 19:00, weekday 20:00) FOLLOWS date changes until the user touches the time (`timeTouched`); hint names the weekday. Button = "Review & publish".

### Addendum B — standalone webform + "add another" flows (Jason)
- NEW route `/list-a-gig` — same WizardShell, ZERO app chrome (AppShell short-circuits on the path: bndy logo + "Keeping live music alive" + "Browse gigs →" + skin fab only). Shareable webform for FB groups/venues.
- Success/duplicate screens (BOTH routes): Share · See it on the map · **Add another: {artist} at {venue} — another date (→ When) / another for {artist} (→ Where) / another at {venue} (→ Who) / start fresh.** Anchor kept in draft, title re-inferred.
- **layout.tsx NO_FLASH fix** (TASK 9 gap): map now carries all 12 skins.
- URL-prefill effects apply once (refs) so "add another" resets aren't overwritten by background refetches.

### Addendum C — polish pass (Jason 2026-08-06)
- **Em-dashes removed from ALL UI-rendered strings** (errors, hints, buttons, placeholders, share text, metadata). Comments untouched. Grep gate: `—` must appear in NO string that renders (comments/CSS comments are fine).
- **Artist ranking is venue-aware**: when the venue is chosen, `rankArtists` gets a proximity context: +12 if artist's location text contains the venue's town, else footprint tiers (+8 <30mi, +4 <60mi) from `distById` = artistId → miles to their NEAREST gig, built in ONE memoised pass over cached gigs per venue change (artists have no coordinates; footprint is the honest signal). Ties sort nearest-first. No per-keystroke geometry.
- **Venue search is user-proximity-sorted**: matches ranked name-startsWith > name-contains > town-contains, then nearest-first via `useGeolocation` + `distanceMiles` on the MATCHED subset only; rows show "Town · 3 mi" when located. Degrades cleanly with no geo permission.
- Verify: three same-name artists rank nearest-the-venue first (Not Guilty test with a Stoke venue selected); venue search with geolocation granted orders by distance and shows miles; with permission denied, alphabetical within score bands; no perf regression typing fast in either search (no long tasks).

### Addendum D — new-artist form upgrades (Jason 2026-08-06)
- **Location = Google Places town autocomplete** via the existing `usePlaces` hook (same NEXT_PUBLIC_GOOGLE_MAPS_API_KEY loader as the gigs-list LocationField; UK cities, session tokens, ", UK" suffix stripped for storage). Free-typed text still accepted when no prediction is picked (server resolves the region); no key → plain input, degrades cleanly.
- **Town / Region segmented control** (NOT godmode's radio UI): Town default with autocomplete; Region shows the 13 canonical bndy-region chips (runbook §1A.1 list, `REGIONS` in wizard/lib.ts). Helper copy switches per mode.
- **Artist type chips** ("They are": Band / Solo Act / Duo / Trio / Group / DJ / Collective, single-select, skippable, `ARTIST_TYPES` in lib.ts — mirrors the godmode edit screen enum). Passed as `artistType`; `actType` array now also passed on create. **Agent: verify `POST /api/artists/find-or-create` / community create accept + persist `artistType` and `actType` pass-through — if community create drops them, add them (both are standard artist fields), or follow the create with the standard edit call. Also verify the enum casing matches stored data ("Band" vs "band" — check a few real artist records) and adjust `ARTIST_TYPES` values to match.**
- Verify: town autocomplete suggests + ✓ tick on pick; region chips write the canonical string; new artist lands in bndy with location, artistType, actType intact; no-key env still usable.

### Addendum F — stale-draft fix (Jason repro 2026-08-07)
Bug: entering the wizard from a venue page skipped straight to Review. Cause: sessionStorage resume-draft from an earlier half-finished run already held artist+date; the venue prefill completed the set. Fix: (1) a prefilled entry (`?venueId=`/`?artistId=`) that does NOT match the stored draft resets to a clean draft (only the anchor applies) — refresh mid-wizard still resumes because the anchor matches; (2) drafts expire after 6h (`savedAt` in storage). Verify: half-complete a run on /add, abandon, enter from a venue page → starts at WHO with venue locked; refresh mid-wizard → state kept; same flow from an artist page → starts at WHERE.

### Addendum E — CTO ruling on SEC-04 vs public wizard (2026-08-07)
Decisions (relayed to Jason, approved):
1. **`/api/community/*` namespace APPROVED** as the single explicit unauthenticated mutation surface: `POST /api/community/artists/find-or-create`, `POST /api/community/venues/find-or-create`, `POST /api/community/events`. MUST alias the existing handlers (no logic duplication); check 25-route caps. `wizardApi.ts` is ALREADY updated to these paths — they are the contract. CORS on this namespace = dynamic allowlist incl. gigmap + live + localhost (CORS is plumbing, not security — understood and accepted).
2. **Tags: `source: 'community_wizard'` + `needsReview: true` (camelCase)** — NOT 'public-wizard'/'needs_review'. Prod data + dedup ranking already use community_wizard; don't fork vocabulary.
3. **Rate limits (WAF, per IP): mutations 5/min AND 50/day on the three community POSTs; Places proxy GETs 60/min** (autocomplete must not be throttled to death); blanket 100 req/5min WebACL stays as outer wall. Replaces the older B7 single-number rule.
4. **No CAPTCHA day one.** Bot traps instead, frontend half ALREADY WIRED: the community event POST now carries `hp` (honeypot, always empty from the real wizard) and `startedAt` (wizard-mount epoch ms). Server-side: reject when `hp` is non-empty OR `Date.now() - startedAt < 3000` — reject SILENTLY (return a plausible 200-shaped response, don't teach the bot). **Cloudflare Turnstile (invisible) pre-approved as escalation** if the review queue shows real abuse — no further sign-off needed.
5. **Public-before-review stands** (live + flagged, Jason's standing decision 1a).
6. Old public routes (`/api/artists/community`, `/api/artists/find-or-create`, `/api/venues/find-or-create`, `/api/events/community`) — after the namespace ships, either remove from the template or leave behind requireAuth; do NOT leave a second unauth surface.

### Addendum G — venue-type filtering on the Places proxy (Jason 2026-08-07)
The old frontstage wizard restricted venue lookups to entertainment-ish places; the new proxy (`venues-lambda/handlers/places.js`) currently filters only `types: 'establishment'` (any business). Restore the constraint as **denylist + soft warn** — NOT an allowlist (bndy's real venues are social clubs / memorial halls / village halls / yacht clubs that Google types as bare `establishment`/`point_of_interest`; an allowlist would reject them):
1. **Suggest**: autocomplete predictions carry a `types` array — post-filter OUT predictions whose types intersect a HARD_DENY list: `doctor, dentist, hospital, physiotherapist, pharmacy, drugstore, veterinary_care, car_dealer, car_rental, car_repair, car_wash, gas_station, bank, atm, accounting, insurance_agency, lawyer, real_estate_agency, supermarket, grocery_or_supermarket, convenience_store, hardware_store, home_goods_store, furniture_store, electronics_store, clothing_store, shoe_store, jewelry_store, laundry, moving_company, storage, plumber, electrician, locksmith, roofing_contractor, funeral_home, cemetery, courthouse, police, fire_station, embassy, post_office, airport, train_station, bus_station, transit_station, subway_station, taxi_stand, parking, travel_agency`. Keep the list as a module constant with a comment.
2. **Details**: add `'types'` to the requested fields. If types intersect HARD_DENY → 404-style `{ error: 'not a venue' }` (belt + braces — a denied suggestion shouldn't reach details, but direct placeId calls exist). If types intersect a SOFT_WARN list (`school, primary_school, secondary_school, university, local_government_office`) → include `typeWarning: "<human label>"` (e.g. "a school") in the place payload. **Frontend already renders `typeWarning`** on the confirm card (StepVenue) — the field name is the contract.
3. Do NOT warn/deny on `church`, `library`, `museum`, `gym`, `stadium`, community/point_of_interest types — all host gigs in the real estate.
4. Verify: "smiths dental stoke" surfaces no dentist; a school search reaches the confirm card WITH the caution line; "New Hartley Memorial Hall"-style venues still come through clean.

**UPDATE: 1–3 are ALREADY IMPLEMENTED by Claude in `places.js`** (HARD_DENY/SOFT_WARN constants + suggest prediction filter + details 404 on denied types + `typeWarning` in the payload; `'types'` added to the details fields). Sandbox down: NOT syntax-checked or run — `node -e "require('./handlers/places.js')"` + a live suggest/details smoke are your gate, then deploy venues-lambda and run the three verification searches above.

### Addendum H — LIVE BUG (Jason repro 2026-08-07): new venue + new artist → event creation fails
**Repro:** wizard with brand-new venue AND brand-new artist. Venue + artist records WERE created in bndy, but publish died on `POST /api/community/artists/find-or-create` → **422**, so the event step never ran. Known venue + known artist works fine.

**Investigate in CloudWatch (artists-lambda) for that 422 — the answer is one of these:**
1. **Is `dryRun` actually implemented (B3) on the community alias?** If the form's pre-check ("Looks good") did a REAL create, the artist exists by publish time, and the publish-time second call bounces. A bounce should be **409 with `existingArtistId`** (frontend maps that to matched and continues) — if the alias returns **422** for a duplicate/gate outcome, that's the bug: return the 409 + ids contract.
2. Which 422 `code` was it (DATA_QUALITY / LOCATION_UNRESOLVABLE / other)? If LOCATION_UNRESOLVABLE fired on the SECOND call after a create succeeded on the first, the alias is validating in a different order than the original handler — align it.
3. Confirm the create-then-error sequence in the logs: if the handler creates the artist and THEN errors (non-atomic), fix the order — validate fully before any write.

**Frontend hardening ALREADY shipped by Claude (deploy with next push):** publish-time artist failure now self-heals — after a non-review error it re-checks via `dryRun`; if the artist exists it proceeds to the event instead of stranding the user. Error copy now includes the backend `code`. This masks the symptom for users; the backend contract still needs the real fix.

**Acceptance:** brand-new venue + brand-new artist + publish in one run = event created, no 422 in the network tab; second identical run = "Already listed!".

### Addendum I — town autocomplete root cause + form corrections (Jason repro 2026-08-07)
1. **Town autocomplete was dead because `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is baked at BUILD time and was never added to the greenfield Amplify env** (old frontstage had it; rebuild never got it). No key → `usePlaces` silently does nothing → no console errors. **Fix shipped by Claude: towns now go through OUR Places proxy** — `places.js` suggest accepts `kind=town` (`types: '(cities)'`, denylist skipped, cache keyed per kind); `wizardApi.placesSuggest(q, "town")`; StepArtist no longer uses `usePlaces` at all. Deploy venues-lambda. **Side flag: the gigs-list LocationField still uses the client-side key and is therefore also silently dead in prod** — either add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to the Amplify env, or (better, later) port LocationField to the proxy too; log which you did.
2. **Act types corrected to match godmode**: multi-select all-that-apply — Originals / Covers / Tribute act / Acoustic (`ACT_TYPES` now `{label, value}` singles; draft sends `actType: string[]`). **Verify stored vocabulary on real artist records** ("tribute"? "Tribute Act"? casing) and align the `value` strings.
3. **Artist type now REQUIRED** (matches godmode's *): moved out of the accordion into the core form as a dropdown; submit blocked without it. Verify backend persists it on community create.
4. **Desktop pixel-jump between steps fixed**: back-button slot always rendered (opacity-0 when unavailable) + global `scrollbar-gutter: stable` in skins.css. Verify no layout shift stepping 1→4 on desktop, and that stable gutter causes no visual regression on map/gigs/artists pages.
5. Accordion renamed "Genres & style" (genres + they-play only) with live summary when collapsed.

### Frontend verification (after B1–B3 deployed)
1. `npx tsc --noEmit` clean — Claude could not run it; `wizardApi.ts` response parsing is defensive but align it with the real lambda responses you deploy (most likely drift point).
2. Spec §8 acceptance: 3 entry points prefill + lock; refresh keeps state (sessionStorage `bndy-gig-wizard`); **Ant Hill test** (all 3 candidates with locations, same-region create impossible, cross-region `confirmNew` works); venue via cache + via Places confirm + garbage name → friendly dead-end; dupe gig → "Already listed!"; fresh gig live ≤60s with `needsReview:true`; 390px + desktop; 3 skins (print, bndy-dark, poole).
3. Addendum checks: calendar on 3 skins; busy dots for Queen's Hotel; clash warnings fire for a known artist+date; default time updates hopping Fri→Sun with untouched time; `/list-a-gig` chromeless end-to-end; each "add another" path lands on the right step with anchor retained.
4. Known deliberate cuts (don't "fix"): no map-pin venue picker in step 1; success share links /gigs (no per-event pages yet); genres hard-coded per B6.
5. Commit backend + frontend separately, deploy lambdas (validate + verify-routes first), push bndy-app.

---

# STATUS LOG (agent: append entries here)

| Date | Task | Status | Notes / evidence (hashes, counts, URLs) |
|---|---|---|---|
| 2026-07-27 | 0.1 | ✅ DONE | **bndy-app:** clean (workorder file untracked). **bndy-serverless-api:** 7 commits: 7e58e8d (geo-query), efcd06b (event counts), ea15615 (formatting), 3243503 (tests), e39e77e (utils), 50adca2 (pkg locks), abd5886 (docs) |
| 2026-07-27 | 0.2 | ✅ DONE | Filled markers **implemented & committed** in b474a9f + 6185149. Verified: layers.ts:30 (gigGlow fill, gigStroke border), MapView.tsx:32+181-185 (epochRef + idle self-heal), skinMap.ts:103-106 (solid diamond) |
| 2026-07-27 | 0.3 | ✅ DONE | **GSI:** geohash4-date-index ACTIVE, 4633 items. **Backfill:** executed (12 events updated with geohash fields, 184 events have null venueId - data quality issue). **missingCoords:** empty array (no venues need geocoding) |
| 2026-07-27 | 0.4 | ✅ DONE | **City bbox:** 200 OK, events returned. **UK bbox:** 200 OK, truncated field present. **Geo flag:** geo endpoint live at api.bndy.co.uk (verified by curl tests) |
| 2026-07-27 | 1 | ⏭️ SKIPPED | Filled markers already implemented (see 0.2) |
| 2026-07-27 | 2 | ✅ DONE | **Deferred extraction:** DeferredSection.tsx created, ArtistsBrowse refactored. **GigsHome:** Deferred wrapper added to day-band card containers (92px/card estimate, 1 col mobile). **GigCard:** memoized. **Type check:** passed. **Commit:** 4ac983f |
| 2026-07-27 | 3.1 | ✅ DONE | **Ticker:** skins.css updated with `padding-top:env(safe-area-inset-top,5px)`. **Main:** app-shell.tsx padding updated to `calc(1.5rem + env(safe-area-inset-top, 0px))`. **Map:** MapView.tsx negative margin updated to match. **Commit:** f63b3db |
| 2026-07-27 | 3.2 | ✅ DONE | **robots.ts:** Allow all, sitemap at gigmap.bndy.co.uk/sitemap.xml. **sitemap.ts:** Static routes (/, /map, /gigs, /artists) + dynamic artist/venue profiles from fetchArtists/fetchVenues, revalidate 3600. **Commit:** ce7a6e9 |
| 2026-07-27 | 4 | ✅ DONE | **Day header bars (Option B):** All 9 skins have 4 `--dayhead-*` tokens (inserted after tick tokens). GigsHome.tsx day heading now full-width bar with `var(--rad)` radius, tonight uses hot colors. **WCAG verification:** ALL 8 skins + hyper gradient stops PASS AA (≥4.5:1). **Type check:** 0 errors. **Commits:** 0911126 (tokens), 408de34 (component) |
| 2026-07-28 | 5 | ✅ DONE | **Artist delete + event cascade:** Backend: cascade-delete-events.js lib (5/5 jest tests), wired into MCP delete route. Frontend: deleteArtist API, useDeleteArtist hook, ArtistTile trash button with confirm overlay. **Commits:** 1083e9f (lib+test), bf7cc38 (handler), b452b69 (frontend). **Deploy:** artists-lambda deployed via SAM. **Smoke test:** Created test artist + 2 events → DELETE /mcp returned `cascadedEvents: 2` → all records gone from DynamoDB. ⚠️ Pre-launch: remove onDelete wiring before public launch. |

**missingCoords venues (from geo-backfill-report.json):**
[] (empty - no venues missing coordinates)

**Blockers / questions for Claude:**
_(none yet)_
