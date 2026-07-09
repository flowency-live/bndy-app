# bndy-app

Greenfield rebuild of the bndy live-music frontend. Next 15 (App Router) · React 18 · Tailwind · MapLibre. Re-shell of the old frontstage: same backend (`api.bndy.co.uk`), fresh design language, mobile-first **and** desktop-first.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run test
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` (defaults to the live API).

## Architecture

- `src/domain/*` — pure domain types + logic (Gig, Artist, Venue). No React, no fetch.
- `src/lib/*` — api client, react-query hooks, formatting, theme.
- `src/components/*` — shared UI + the app shell (responsive nav).
- `src/components/map/*` — the MapLibre map module (self-contained).
- `src/features/*` — per-surface UI (gigs, artists, venue).
- `src/app/*` — routes.

See `../bndy/GREENFIELD-REBUILD-PLAN.md` and `BUILD-OPERATING-MODEL.md` for the plan and conventions.
