# AGENT WORKORDER — Agent Work dashboard

**Raised:** CTO, 2026-08-07. **Status:** code written and committed to working trees. Nothing pushed, nothing deployed.

**Context in one line:** godmode already had a source-runs dashboard fed from S3, and the Cowork scheduled tasks have never written to it — they write markdown into the Obsidian vault, which nothing reads. These tasks close that gap.

Do them in order. **T1 and T2 must both land before the page has any data.**

---

## T1 — MCP: add a `record_run` tool ✅ COMPLETE
**Repo:** `bndy-MCPServer` · **Agent:** VSCode MCP agent

Add `src/tools/record-run.ts` and register it in `src/index.ts` alongside the other tools.

```ts
record_run({
  sourceId: string,        // canonical slug, RUNBOOK §6D table
  runId: string,           // unique per run, e.g. "2026-08-07T04-30-00Z"
  runDate: string,         // YYYY-MM-DD
  status: 'started' | 'completed' | 'failed',
  counts: SourceRunCounts, // see below
  note?: string,           // <=200 chars, the line a human reads first
  reportPath?: string,     // vault path to the full RUN-REPORT.md
  errors?: { message: string; code?: string }[]
})
```

Calls `PUT {API_BASE}/api/source-runs/{sourceId}/{runId}` with that body.

**`counts` fields the run must populate** (all numbers, omit what does not apply — the API zero-fills):

| field | value |
|---|---|
| `rawRows` | rows captured from the source this run |
| `validEvents` | rows surviving the §0 filters |
| `parkedRows` | rows skipped, with reason in the report |
| `eventsCreated` / `venuesCreated` / `artistsCreated` | **verified** creates only — read back per §0.10 |
| `venuesMatched` / `artistsMatched` | reused existing records |
| `eventsDeleted` / `eventsHidden` / `cancelled` / `pastDropped` | §0.17 outcomes |
| `reviewItems` | items raised |

⚠ **`rawRows` is load-bearing and is currently reported by nothing.** It is what separates "the source published nothing today" from "the source published and we wrote none of it". Without it the dashboard cannot tell a healthy quiet day from a silent parse break. **Do not ship this tool without it.**

**Auth:** follow the existing `captures.ts` pattern — a shared bearer token from a Lambda env var, not a JWT cookie. `captures.ts` already does exactly this (`CAPTURE_TOKEN`), so use the same shape rather than inventing a second model. ⚠ That file **hardcodes the token in source**; do not copy that part — read it from `process.env`.

**Done when:** calling `record_run` against a throwaway `sourceId` writes `source-runs/<sourceId>/<date>/run.json` to the bucket, and it appears at `/api/source-runs/timeseries`.

**Completed 2026-08-07:**
- Created `src/tools/record-run.ts` with all required fields
- Token read from `process.env.SOURCE_RUNS_TOKEN` (not hardcoded)
- Registered in `src/index.ts` with full schema
- MCP rebuilt successfully

---

## T2 — Backend: deploy `source-runs-lambda`
**Repo:** `bndy-serverless-api` · **Agent:** backend

Already written in `source-runs-lambda/handler.js` (passes `node --check`):

- `GET /api/source-runs/timeseries?days=N` — daily aggregate per source, one point per day per source, each with a `state` of `ok` / `quiet` / `empty` / `failed` / `nofire`. Multiple runs in a day are **summed, not overwritten** (the enrichment task fires hourly).
- `PUT /api/source-runs/{sourceId}/{runId}` — a run records itself.

**Two jobs:**

1. **Add token auth to the PUT route.** It currently uses `requirePlatformAdmin`, which needs a JWT cookie an unattended MCP server does not have. Accept a bearer token from env on **this route only**; leave every GET on `requirePlatformAdmin`.
2. **Check API Gateway route config in `template.yaml`.** Both new routes sit under the existing `/api/source-runs` prefix, so if the integration is a proxy, no change is needed. ⚠ **If routes are enumerated rather than proxied, add them explicitly** — otherwise the deploy succeeds and both routes 404.

Then `sam build && sam deploy`.

**Done when:** `curl` of `/api/source-runs/timeseries?days=7` with an admin cookie returns `{ days, from, to, sources: [] }` rather than a 404.

---

## T3 — Frontend: build and deploy backstage
**Repo:** `bndy-backstage` · **Agent:** frontend

Already written:

- `client/src/pages/godmode/sources/activity.tsx` — **new page**
- `client/src/lib/services/source-runs-service.ts` — `ActivityPoint` / `SourceActivity` / `ActivityResponse` + `getSourceActivity(days)`
- `client/src/pages/godmode/GodmodeLayout.tsx` — nav item *Agent Work*
- `client/src/App.tsx` — route `/godmode/sources/activity`

No new dependencies; charts are hand-rolled SVG using the existing shadcn `Card`/`Button`, `cn`, wouter and lucide.

**Jobs:** `npm run build`, fix any TS strictness the repo enforces that I could not check from here, deploy via Amplify.

⚠ **Do not "simplify" the five-state model into a number.** A flat line and a broken line must never render the same way — quiet is drawn as part of the line, a fault is drawn on it. In August a stuck lock cost two days of enrichment while every chart read as a quiet week. That is the entire reason this page exists.

**Done when:** `/godmode/sources/activity` renders. Before T1 lands it will correctly show *"No runs recorded yet"* — that empty state is honest, not a bug.

---

## T4 — Before pushing to remote `main`

1. **Verify `.env` and tokens are not committed.** T1 and T2 both introduce a shared secret. `captures.ts` has a hardcoded token in source today — **do not add a second one**, and raise the existing one as a separate cleanup item.
2. **`node --check source-runs-lambda/handler.js`** and the backstage typecheck both pass.
3. **Three repos, three commits, one message shape** — `feat(godmode): agent work activity dashboard`. Do not squash the API and UI into one commit across repos.
4. **Confirm no unrelated working-tree changes are swept in.** The CTO session edited only the five files listed in T2/T3; anything else in the diff came from somewhere else and needs an owner before it ships.
5. **Smoke test on deployed backstage before closing:** the page loads, the day selector switches 7/30/90, and the empty state renders when there is no data.

---

## Not in scope

Product KPIs — future gigs held, corpus health, region saturation, the animated map — are a separate page, specced in `bndy-population/MI-DASHBOARD-SPEC.md`. This page is only ever about what the agents did.

Full background: `bndy-population/AGENT-WORK-HANDOVER.md`.
