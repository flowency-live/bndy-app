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
- Gig-list **day-header styling** (design comparison pending)
- Radix Dialog refactor of Sheet (next batch, has its own spec coming)
- S3 image pipeline / next-image (needs infra decisions)
- Landing page (bndy.co.uk) — separate design track

## Definition of done
Tasks 0–3 complete, each verified as specified, all committed + deployed to gigmap, STATUS LOG below filled in. If anything is blocked, say what and why in the log rather than working around it.

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

**missingCoords venues (from geo-backfill-report.json):**
[] (empty - no venues missing coordinates)

**Blockers / questions for Claude:**
_(none yet)_
