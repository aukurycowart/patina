# Vault — Full-stack Prototype v0.2

A runnable reference build for the Vault spec: the same dark-UI prototype as the
single-file artifact, now backed by a real server, a real SQLite database with
the spec's constraints, and provider adapters behind the real interface.

## Run it

```
python3 server.py          # default port 8377
# then open http://localhost:8377
```

Python 3.10+ standard library only — nothing to install. On first run the
server creates `data/vault.db` from `schema.sql`, seeds the mock library
(17 items, 19 logs, 3 lists), and generates SVG cover art into `data/images/`.
Delete the `data/` folder to reset to a fresh seed.

## What's in here

```
server.py     stdlib HTTP server: routes, validation, domain rules, mock providers
schema.sql    the §3.2 schema — translate table-for-table into Drizzle
web/app.jsx   the React UI source (same components as the artifact, API-driven)
web/app.js    prebuilt bundle (React + icons included; no CDN, works offline)
web/index.html
data/         created at runtime: vault.db (WAL) + images/   ← the whole universe (DATA-001)
```

Rebuild the bundle after editing `web/app.jsx`:

```
npx esbuild web/app.jsx --bundle --jsx=automatic --format=iife --minify --outfile=web/app.js
```

## What this version demonstrates beyond the UI artifact

- **Real schema with database-enforced rules** — `UNIQUE(user_id, media_item_id)`
  (LIB-004), `CHECK` constraints for status/qualifier coupling (LIB-005/006),
  rating stored as int 1–10 (LOG-003), proper `tags` + `entry_tags` join tables,
  `list_items.position`, WAL mode (DATA-005), `user_id` on every table (NFR-010).
- **Provider adapters (SRCH-009)** — `MockTMDB`, `MockIGDB`, `MockOpenLibrary`
  each hold raw responses in their own wire format and normalize to one shape.
  Nothing outside the adapters ever sees a provider field name. Search fans out
  across providers with per-provider simulated latency; the client debounces
  300 ms (SRCH-005) and aborts superseded requests (SRCH-006).
- **Server-side domain rules** — status-transition side effects, the LOG-004
  manual-override rule, the 4-favorites-per-type cap (LIB-016), duplicate-add
  rejection. The UI just renders whatever the server decides; rejections come
  back as 4xx JSON and surface as toasts.
- **SQL-aggregated stats (STAT-005)** — counts, histogram, heatmap, and top
  genres/creators (via `json_each`) are computed in SQL; the Stats page fetches
  `/api/stats` and renders the payload.
- **Validation on every mutation (SEC-002)** — a small `expect()` helper stands
  in for Zod; bad enum values, types, and ranges get a 400 before any write.
  All queries are parameterized (SEC-003).
- **Image pipeline (LIB-003 / SEC-001)** — covers are generated locally into
  `data/images/` and served from `/api/images/<path>` with a resolved-path
  containment check. `curl localhost:8377/api/images/../server.py` → 404.
- **Exports** — `/api/export/json` (DATA-002) and
  `/api/export/csv?type=movie|show|book|game` (DATA-003), linked from the
  sidebar footer.

## API surface

```
GET    /api/state                                  everything the client renders
GET    /api/search?q=&type=                        normalized results + inLibrary flags
POST   /api/library            {source, sourceId}  add from search (LIB-001/002/007)
PATCH  /api/entries/:id        {status|qualifier|rating|favorite|progress}
POST   /api/entries/:id/tags   {tag}        DELETE /api/entries/:id/tags/:name
POST   /api/logs               {mediaId, date, …}  applies LOG-004 sync, returns {synced}
POST   /api/media/:id/refresh                      LIB-014, persists fetched_at
POST   /api/lists              {name}
PATCH  /api/lists/:id          {name|note|ranked}  DELETE /api/lists/:id
POST   /api/lists/:id/items    {mediaId}
POST   /api/lists/:id/items/:mediaId/move {dir}
PATCH  /api/lists/:id/items/:mediaId      {note}   DELETE same path
GET    /api/stats?year=&hist=
GET    /api/export/json        GET /api/export/csv?type=
GET    /api/images/<path>                          SEC-001 containment check
```

## Known divergences from the real build

The production target is **Next.js + TypeScript + Drizzle** per the spec; this
Python server is prototype scaffolding. What translates one-to-one: the schema,
the route/payload shapes, the adapter contract, and the domain rules. What
doesn't: Python itself, the threading model, and the refetch-everything client
(real app: TanStack Query with optimistic updates).

Other deliberate simplifications: generated SVG covers instead of downloaded
WebP art; `release_year` int instead of `release_date`; reviews render as plain
text, not sanitized markdown; `rating_manual_at` is a prototype addition that
the real schema should adopt to implement LOG-004; the activity heatmap mixes a
small deterministic cosmetic sprinkle into empty days so the sparse seed year
still reads as a heatmap (real data renders honestly); list reordering uses
up/down arrows where the real app will use dnd-kit; no auth, single hardcoded
`user_id='local'` (NFR-010 keeps the column everywhere so multi-user is a
migration, not a rewrite); importers (DATA-004) and rate limiting (SRCH-011)
have no prototype surface.
