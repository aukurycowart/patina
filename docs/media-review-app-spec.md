# Vault — Unified Media Review App
## Design Specification & Build Plan

*Companion to `media-review-app-requirements.md` (the SRS). Division of labor: the SRS defines **what** the system must do (numbered, testable shall statements); this document defines **why and how** — product rationale, architecture, design language, technology choices, and build sequence. Behavior is stated here only by reference to requirement IDs; if the two documents ever disagree on behavior, the SRS wins.*

---

## 1. Vision

A single, beautiful, dark-themed place to log, rate, review, and organize everything you consume: movies, TV shows, books, and video games. Think Letterboxd's diary-and-poster-grid elegance, Backloggd's play-status granularity, and Goodreads' shelf/progress model — unified under one data model and one design language instead of four separate accounts.

**Core principles:**

1. **One mental model, four media types.** Searching, adding, rating, and reviewing feel identical whether it's a film or a novel. Type differences (page progress vs. playtime) are handled as extensions, not separate systems.
2. **Poster-first, dark UI.** The artwork is the interface. Metadata recedes; covers glow.
3. **Local-first, web-informed.** Data lives in a local SQLite file the user owns. Metadata is pulled from authoritative web APIs and cached locally (DATA-001, NFR-002).
4. **Social-ready, not social-now.** Single user today, but designed so accounts, following, and shared reviews later are additive changes, not rewrites (NFR-010).

**Scope of v1** is exactly the priority-M requirements in the SRS. Explicitly out of scope for v1: accounts/login, social features, comments, recommendations, native mobile apps, and additional media types (music/podcasts) — though the data model deliberately leaves room for a fifth `media_type` as a migration rather than a redesign.

---

## 2. Benchmark Analysis

What each reference app does best, and what Vault borrows. Where a borrowed pattern became a requirement, the ID is noted.

### 2.1 Letterboxd (movies/TV)
- **The diary is the killer pattern.** A *watch event* (date, rating, review, rewatch flag) is a separate object from the film. Watch a film five times, get five entries. This is Vault's atomic unit for all media types (LOG-001, LOG-002).
- **Half-star ratings (0.5–5)** — low-friction, expressive, maps cleanly to integers (LOG-003).
- **Poster grid** as the primary library view; metadata appears on hover (LIB-009).
- **Lists** with ordering and per-entry notes (LST-001…004), **yearly stats** (STAT-001…004), and the **four profile favorites** (LIB-016) all carry over.

### 2.2 Backloggd (games)
- **Rich play statuses** (`Playing/Played/Backlog/Wishlist` + qualifiers like `Completed/Mastered/Retired/Abandoned`) capture that games are *ongoing endeavors*, not single sittings. Vault generalizes this into the two-axis status model in §3.3 (LIB-005, LIB-006).
- **The journal** (dated play sessions) maps onto log entries with session minutes (LOG-011).

### 2.3 Goodreads (books)
- **Shelves** (`Want to Read/Currently Reading/Read`) are the original status model — subsumed by the unified statuses.
- **Progress updates** ("page 142 of 380") generalize to type-appropriate progress units (LIB-015).
- **Anti-patterns to avoid:** cluttered 2010-era UI, ads, weak search ranking. Also a planning constraint: Goodreads' public API is dead — book metadata must come from elsewhere (SRCH-007).

### 2.4 Synthesis
Vault is a **diary-centric tracker** built on three objects: a cached `MediaItem` (external metadata), your `LibraryEntry` (status/rating/progress — exactly one per item), and dated `LogEntry` records (the diary — unbounded). Lists, tags, and stats sit on top.

---

## 3. System Design

### 3.1 Architecture
A single **Next.js** application serving both the UI and a server-side API layer.

```
Browser (React UI)
   │  server components / server actions / route handlers
   ▼
Next.js server (localhost:3000)
   ├── Metadata service  ──►  TMDB (movies, TV)
   │     (per-provider    ──►  IGDB via Twitch OAuth (games)
   │      adapters)       ──►  Open Library + Google Books (books)
   ├── Image cache (downloads covers to /data/images)
   └── Drizzle ORM ──► SQLite (/data/vault.db)
```

Why a server layer at all for a local app: it keeps API credentials out of the browser (SRCH-010, NFR-011), gives one place to normalize and cache provider data, and means the browser-facing surface is already shaped like a future multi-user deployment — swap SQLite for Postgres, add auth middleware, deploy; the UI doesn't change.

### 3.2 Data Model
One core schema plus a JSON column for type-specific fields, with JSON shapes enforced by Zod at the application layer — rather than four parallel table sets.

```
media_items            ← cached external metadata (shared shape)
  id            (uuid, pk)
  media_type    ('movie' | 'show' | 'book' | 'game')
  source        ('tmdb' | 'igdb' | 'openlibrary' | 'googlebooks' | 'manual')
  source_id     (provider's id; unique with source)
  title, original_title, release_date
  cover_path    (local cached image), backdrop_path
  synopsis, genres (json array), creators (json: role→names)
  type_meta     (json: runtime / seasons+episodes / pages+isbn / platforms+ttb)
  fetched_at    (cache staleness; supports LIB-014)

library_entries        ← LIB-004: unique (user_id, media_item_id)
  id, user_id (default 'local' — NFR-010), media_item_id (fk)
  status        (LIB-005 enum)
  qualifier     (LIB-006 enum, nullable; CHECK constraint ties it to status)
  rating        (nullable int 1–10 — LOG-003 encoding)
  is_favorite   (bool — LIB-016)
  progress      (json — LIB-015)
  added_at, started_at, finished_at, updated_at

log_entries            ← the diary
  id, user_id, media_item_id (fk)
  logged_date, end_date (nullable — LOG-005)
  rating (nullable), is_redo (bool)
  review_text (markdown, nullable), has_spoilers (bool)
  session_minutes (nullable — LOG-011), note
  created_at

lists / list_items     ← user_id, name, description, is_ranked; fk + position + note
tags / entry_tags      ← user_id-scoped names; join table to library_entries
```

Design decisions worth defending:
- **JSON columns (`type_meta`, `progress`, `creators`) instead of per-type tables.** Four media types with 3–5 unique fields each don't justify the join complexity of subtype tables. The risk — JSON becoming a junk drawer — is mitigated by giving every JSON column a Zod schema validated on read and write (SRCH-008 applies the same discipline at the provider boundary).
- **Rating stored as int 1–10, never float.** Avoids floating-point comparison bugs in filters and histograms; the UI converts to half-stars at the edge.
- **Rating lives in two places deliberately.** Log entries record what you felt *that time*; the library entry holds your *current* verdict, auto-synced from the latest rated log unless manually overridden (LOG-004). This is the Letterboxd model and it's what makes rewatches work.
- **Social-ready primitives:** `user_id` on every user-owned table (NFR-010), no global singletons, reviews separate from library state. Multi-user later = users table + auth middleware + scoping queries.

### 3.3 The Two-Axis Status Model
The primary status answers *"where is this in my life?"* and is identical across all four types. The qualifier answers *"how did it end?"* and applies only to terminal statuses. This generalizes Backloggd's expressive game states without burdening movies (a film is usually just `completed`), and Goodreads' shelves fall out for free (`backlog` = Want to Read, `in_progress` = Currently Reading).

### 3.4 External Providers

| Type | Primary API | Auth | Notes |
|---|---|---|---|
| Movies & TV | **TMDB** | Free API key, instant signup | Excellent images; one multi-search endpoint covers both movies and TV; generous limits. |
| Games | **IGDB** | Free via **Twitch developer app** (client-credentials OAuth; tokens expire ~60 days, so build auto-refresh) | Best games database; POST-based APICalypse query syntax. Fallback: RAWG (plain REST key, weaker freshness). |
| Books | **Open Library** + **Google Books** | None / free key | Open Library for search and ISBNs; Google Books to fill descriptions and page counts. Merging two imperfect sources beats either alone. |

**Adapter pattern (SRCH-009):** every provider implements one interface —

```ts
interface MetadataProvider {
  mediaType: MediaType;
  search(query: string): Promise<SearchResult[]>;        // normalized
  getDetails(sourceId: string): Promise<MediaItemInput>; // normalized
}
```

— so nothing outside `server/providers/` ever sees a provider-specific shape. Swapping RAWG↔IGDB, or adding a music provider in v2, touches exactly one folder.

**Caching strategy:** search results are ephemeral (never persisted); adding an item persists the full normalized record and downloads cover/backdrop to `data/images/` as WebP (LIB-002, LIB-003), after which the app never hotlinks remote images (NFR-002). Staleness is handled by `fetched_at` plus a manual refresh (LIB-014) — no background sync in v1. A small per-provider throttle (SRCH-011) protects against bans during CSV imports.

### 3.5 Security

Security posture in two stages, matching SRS §9's phase column.

**v1 (localhost):** the threat model is small but not empty. Three real risks exist even single-user: path traversal through the image-serving route (SEC-001 — `/api/images/../../.env.local` must 404), unvalidated input reaching the database (SEC-002 — every server action parses its input through the same Zod schemas used everywhere else), and injection (SEC-003 — satisfied by construction with Drizzle's parameterized queries, but stated so it survives refactors). Sanitized review rendering (LOG-006) and server-side-only credentials (SRCH-010/NFR-011) were already in place. Two free automations round it out from day one: Dependabot or `pnpm audit` for vulnerable dependencies (SEC-004) and gitleaks or GitHub secret scanning (SEC-005) — cheap insurance that a key never lands in git history.

**Phase 8 (public, multi-user):** the dominant new risk class is *authorization*, not authentication. Auth libraries (SEC-006) make login itself hard to get wrong; what no library can do is scope every query to the session user. The classic bug — IDOR — is user A loading `/media/123` that belongs to user B because one query trusted a client-supplied ID. Hence SEC-007 (identity comes only from the session) and SEC-008 (a cross-user test per resource type, which is the cheapest high-value security testing a small app can do). The `db/queries/` and `server/actions/` chokepoints in §6 exist partly for this: scoping rules are enforced in two folders, not scattered across the codebase. Sessions, CSRF, rate limiting, and transport headers (SEC-009…012) are table stakes handled mostly by the auth library and the hosting platform; pick a host with a WAF in front (Vercel, Cloudflare) rather than building that layer.

**Audit toolchain (SEC-014).** Layered, in order of value:

1. *Don't build the dangerous parts* — Better Auth/Auth.js for all credential handling (SEC-006).
2. *Deterministic scanners on every push* — Semgrep or GitHub CodeQL (static analysis; both free for a project like this; Snyk Code and GitHub Copilot Autofix are commercial equivalents), Dependabot (dependencies), gitleaks (secrets). These are repeatable and don't tire.
3. *AI-assisted review* — frontier coding models used agentically with whole-repo access: Claude via **Claude Code** (which ships a dedicated `/security-review` command and a GitHub Action for PR-time review — see https://docs.claude.com/en/docs/claude-code/overview), or the equivalent passes via OpenAI's Codex CLI or Google's Gemini CLI. The harness matters more than the model brand: the highest-risk bug class here (unscoped queries) is a cross-file consistency problem a chat window can't see. Two passes to run at Phase 8: (a) threat modeling — "here are my schema and routes; walk STRIDE categories against them"; (b) adversarial hunt — "find every query or mutation that doesn't derive user identity from the server-side session." Treat AI findings as leads to verify, not verdicts — probabilistic tools complement the deterministic layer, they don't replace it.
4. *Structure* — design against the OWASP Top 10; pull testable statements from OWASP ASVS if SEC §9 ever needs extending.
5. *If real users arrive* — a paid penetration test; premature before then.

---

## 4. Design System — "Dark Vault" Aesthetic

The artwork is colorful; the chrome is a quiet, warm-dark gallery wall around it. Deliberately avoid the stock "pure black + acid-green accent" look — aim for cinematic warm-dark with one restrained accent.

### 4.1 Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#101014` | App background (warm near-black) |
| `--surface` | `#17171D` | Cards, panels |
| `--surface-2` | `#1F1F27` | Hover states, inputs |
| `--border` | `#2A2A33` | Hairline borders |
| `--text` | `#E8E6E3` | Primary text (soft off-white) |
| `--text-dim` | `#8E8C95` | Secondary text |
| `--accent` | `#E0B458` | Brass/amber — ratings, primary actions, active states |
| `--accent-soft` | `#E0B45822` | Accent washes |
| Status hues | muted: backlog slate, in-progress blue, completed green, dropped red, wishlist violet | Status pills only — never large fills |

Rating stars render in brass: "gold = your verdict" ties the UI together. All token pairs are chosen to clear WCAG AA contrast (NFR-004) — verify with a contrast checker before locking them.

### 4.2 Typography
- **Display** (page and media titles): a characterful serif — *Fraunces* or *Newsreader* — for the "film journal" personality.
- **Body/UI:** *Inter* or *Geist*; invisible and excellent at small sizes.
- **Data/mono** (dates, runtimes, page counts): *JetBrains Mono* / *Geist Mono* at ~85% size, dimmed.
- Scale 13/14/16/20/28/40 px; weights 400/500/650.

### 4.3 Layout & Signature Elements
- **Shell:** slim left sidebar (Home, Library, Diary, Lists, Stats, Search); content max-width ~1280 px; functional to 390 px (NFR-007).
- **Poster grid:** 2:3 cards, cover-only, title and quick actions on hover overlay; 6–8 columns desktop. Book covers vary in ratio — letterbox onto `--surface`.
- **Signature element — the Diary:** a vertical timeline with date markers down the left edge, cover thumbnails, brass stars, review excerpts. The one page that should feel unmistakably *yours*; spend the design effort here.
- **Motion:** one orchestrated moment (detail-page hero fade, backdrop bleeding into `--bg` through a gradient); elsewhere only 150 ms micro-interactions; all gated by `prefers-reduced-motion` (NFR-006).
- Spoiler reviews render under `blur(8px)` with a reveal chip (LOG-007).

---

## 5. Tech Stack (with rationale)

**Recommendation: full TypeScript.** The UI will be React regardless (no serious rival for this app shape, and the most transferable skill in the stack); a Python backend (FastAPI is the good version of that idea) would mean two languages, two toolchains, and a CORS boundary for zero benefit at this scale.

| Layer | Choice | Why this over alternatives |
|---|---|---|
| Framework | **Next.js 15+ (App Router), React 19, TypeScript strict** (NFR-009) | Industry-standard React framework; server components and route handlers provide the backend in the same repo. Alternative: Vite + React + Fastify — more explicit, more wiring, slower shipping. |
| Database | **SQLite** in WAL mode (DATA-001, DATA-005) | Zero-config, single-file, ideal local-first. Postgres is the social-phase migration target. |
| ORM | **Drizzle ORM** + drizzle-kit | Lightweight, SQL-transparent (you learn real SQL), first-class SQLite+TS types, retargets to Postgres trivially. Alternative: Prisma — friendlier docs, heavier runtime. |
| Validation | **Zod** | One schema definition validates provider responses (SRCH-008), form input, and JSON columns, and infers the TS types. |
| Styling | **Tailwind CSS v4 + shadcn/ui** (Radix primitives) | Current default; shadcn gives accessible dialogs/popovers you style yourself — fits a custom dark theme far better than a themed kit like MUI. |
| Client data | **TanStack Query v5** | Only where truly dynamic: debounced search (SRCH-005/006), optimistic rating/status updates. Server components carry the rest. |
| Forms | react-hook-form + Zod resolver | The log dialog (LOG-001, LOG-010). |
| Markdown | react-markdown + remark-gfm, sanitized | LOG-006. |
| Charts | **Recharts** (or visx) | Histogram, heatmap, top-creators (STAT-002…004). |
| Images | next/image + **sharp** | Cover download → WebP → sized variants (LIB-003, NFR-008). |
| Virtualization | @tanstack/react-virtual | NFR-001, when the grid grows. |
| Testing | **Vitest** + Testing Library; Playwright later | Adapters and normalizers first — that's where the bugs live. |
| Lint/format | ESLint (typescript-eslint) + Prettier | Standard. |
| Runtime | Node 22 LTS + **pnpm** | Current ecosystem favorite; fine in WSL2. |
| Secrets | `.env.local`, gitignored (NFR-011) | TMDB, Twitch client id/secret, Google Books. |
| Auth (Phase 8 only) | Better Auth or Auth.js | Schema is ready; don't install until then. |

---

## 6. Project Folder Structure

```
vault/
├── .env.local                  # API keys (gitignored)
├── .env.example                # documented blank keys (committed)
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── docs/                       # this spec + the SRS
├── data/                       # ← your entire universe (gitignored)
│   ├── vault.db
│   └── images/
├── drizzle/                    # generated SQL migrations (committed)
├── public/
└── src/
    ├── app/                            # routes only — thin
    │   ├── layout.tsx                  # shell: sidebar, theme, fonts
    │   ├── page.tsx                    # home
    │   ├── globals.css                 # §4.1 tokens as CSS vars
    │   ├── library/page.tsx
    │   ├── media/[id]/page.tsx
    │   ├── diary/page.tsx
    │   ├── lists/page.tsx
    │   ├── lists/[id]/page.tsx
    │   ├── stats/page.tsx
    │   ├── search/page.tsx
    │   └── api/
    │       ├── search/route.ts
    │       ├── media/route.ts          # add-to-library
    │       ├── media/[id]/refresh/route.ts
    │       └── images/[...path]/route.ts
    ├── components/
    │   ├── ui/                         # shadcn primitives
    │   ├── media/                      # PosterCard, PosterGrid, StatusPill,
    │   │                               #   RatingStars, MediaHero, QuickActions
    │   ├── diary/                      # LogModal, DiaryTimeline, ReviewCard
    │   ├── lists/
    │   ├── stats/
    │   └── layout/                     # Sidebar, CommandPalette
    ├── db/
    │   ├── index.ts                    # drizzle client (better-sqlite3, WAL)
    │   ├── schema.ts                   # §3.2 tables
    │   └── queries/                    # library.ts, logs.ts, lists.ts, stats.ts
    ├── server/
    │   ├── providers/                  # §3.4 adapter layer
    │   │   ├── types.ts                # the interface + normalized shapes
    │   │   ├── tmdb.ts
    │   │   ├── igdb.ts                 # incl. Twitch token auto-refresh
    │   │   ├── books.ts                # Open Library + Google Books merge
    │   │   └── index.ts                # registry: mediaType → provider
    │   ├── images.ts                   # download → webp → data/images
    │   └── actions/                    # server actions: rate, setStatus,
    │                                   #   createLog, lists, tags
    ├── lib/
    │   ├── schemas.ts                  # Zod: type_meta, progress, forms
    │   ├── ratings.ts                  # int(1–10) ↔ half-star helpers
    │   └── utils.ts
    └── types/index.ts
```

### 6.1 Rationale

The structure is **layered by responsibility, not by feature**, with dependencies flowing one direction: `app → components → server/db → lib`. Each folder exists to answer one question:

- **`app/` is thin on purpose.** In the App Router, files in `app/` are the routing table — URL structure, data loading, composition. Business logic in page files is unrefactorable (you can't unit-test a route file sensibly) and unfindable later. Pages should read like tables of contents: fetch via `db/queries`, render components. This is the single most common Next.js codebase failure mode, so the rule is structural.
- **`server/providers/` is the quarantine zone for the outside world.** External APIs are the most volatile part of this system — formats change, providers die (Goodreads), you may swap IGDB for RAWG. SRCH-009 demands that volatility be contained behind one interface in one folder. The `index.ts` registry means "add a fifth media type" = add one file + one registry line.
- **`db/queries/` keeps SQL in one findable place.** Scattering Drizzle calls through components makes the Postgres migration (Phase 8) a grep-driven nightmare; concentrating them makes it a single-folder review. It also naturally enforces STAT-005 — aggregation lives next to the schema, not in React.
- **`db/schema.ts` as a single file** rather than per-table files: at ~6 tables, one file shows you the whole data model at a glance, and Drizzle relations are easier to define in one scope. Split it only if it grows past a few hundred lines.
- **`server/actions/` separates mutations from reads.** Reads happen in server components via `db/queries`; writes go through server actions. This mirrors how the framework wants you to work, and gives one chokepoint for the validation + auth that Phase 8 will need.
- **`components/` grouped by domain, not by kind.** `media/`, `diary/`, `stats/` rather than `buttons/`, `cards/`, `modals/` — when you're working on the diary you want its pieces side by side. The exception is `ui/`, which is shadcn convention and is effectively vendored code you own.
- **`lib/` is for pure functions only.** No I/O, no framework imports — which is exactly what makes `ratings.ts` and the Zod schemas trivially unit-testable. If a file in `lib/` needs `fetch` or the DB, it belongs in `server/`.
- **`data/` at the project root, gitignored.** The entire user-owned state is one folder (DATA-001): backup = copy, reset = delete, inspect = open `vault.db` in any SQLite browser. Keeping it out of `src/` makes "code is committed, data is yours" a visible physical boundary.
- **`drizzle/` migrations committed, `data/` not.** Schema history is code; the database is not. Anyone (including future-you on a new machine) reproduces the schema with one migrate command.
- **Server/client boundary is folder-visible.** Anything under `server/` and `db/` must never be imported by a client component (enforceable with the `server-only` package). This is also the credential boundary that satisfies SRCH-010/NFR-011 — keys can only ever be touched in folders that never ship to the browser.

The deliberate trade-off: this is more structure than the smallest possible app needs on day one. It's chosen because each boundary maps to a requirement (provider isolation, credential isolation, data ownership, Postgres-migration readiness) rather than to convention for its own sake.

---

## 7. Build Plan — Phased Milestones

Each phase ends with something usable and a set of SRS requirements that now verify. Don't start a phase until the previous one is genuinely done.

**Phase 0 — Foundations** *(a weekend)*: scaffold Next.js (TS strict, Tailwind, src dir); Drizzle + better-sqlite3; write `db/schema.ts` from §3.2 and run first migration; tokens into `globals.css`; fonts; static shell with empty routes; git + `.env.example` + README; enable Dependabot + gitleaks (SEC-004, SEC-005); commit `docs/`.
*Done when the dark shell boots and `data/vault.db` exists with tables.* → DATA-001, DATA-005, NFR-009…011 (I-verify).

**Phase 1 — Metadata providers** *(the hard 20%)*: get TMDB key, Twitch dev app, Google Books key. Write `providers/types.ts` first — the normalized shapes are the contract. Implement TMDB (easiest, momentum), then books (two-source merge is fiddly), then IGDB (OAuth caching + APICalypse — budget extra time). Zod-validate every response; Vitest the normalizers against saved JSON fixtures. Build `/api/search` + the Ctrl+K palette with debounce/cancellation.
*Done when "Blood Meridian", "Disco Elysium", "Severance", and "Heat" all return correct, normalized, cover-bearing results.* → SRCH-001…011.

**Phase 2 — Library core**: add-to-library flow (fetch → cache images via sharp → insert); library page with grid, URL-driven filters and sorts; media detail page with hero + status/rating as optimistic server actions.
*Done when search → add → library → detail → rate works end to end. **Start dogfooding daily from here.*** → LIB-001…011, LIB-015, NFR-002, NFR-008, SEC-001…003.

**Phase 3 — Diary**: log modal (date, rating, redo, Markdown review, spoiler toggle); per-item log history; diary timeline page with month grouping and filters; the LOG-004 rating-sync rule (write the Vitest case first — it's the subtlest logic in the app).
*Done when a rating-only log takes under 10 seconds.* → LOG-001…010.

**Phase 4 — Lists & tags**: lists CRUD, dnd-kit reordering for ranked lists, mixed-type entries with notes; tag input + tag browser; "add to list" in quick actions. → LST-001…006.

**Phase 5 — Stats**: aggregation queries in `db/queries/stats.ts` (SQL, not JS loops — STAT-005); year selector; completed-by-type, histogram, heatmap, top creators/genres. → STAT-001…004.

**Phase 6 — Home & polish**: home dashboard (in-progress shelf, recent logs, search affordance); full keyboard pass; designed empty states; loading skeletons; virtualization if the grid needs it; a real design-critique pass against §4. → NAV-001…003, NFR-001, NFR-004…007.

**Phase 7 — Data in/out**: JSON full export, per-type CSV export; Letterboxd + Goodreads importers (rows matched via provider search — throttle per SRCH-011, report unmatched rows); backup story in README. → DATA-002…004.

**Phase 8 — Social-ready** *(future, optional)*: users table + Better Auth; scope queries by real `user_id`; cross-user authorization tests; SQLite → Postgres via Drizzle; security review per §3.5's toolchain; deploy behind a WAF; then following/feeds. If §3.2 was followed, nothing before this phase reworks. → SEC-006…014 (all M-priority must verify before public deployment).

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| IGDB/Twitch OAuth friction stalls Phase 1 | TMDB first for momentum; RAWG as a drop-in fallback adapter behind the same interface. |
| Book metadata quality (Open Library is patchy) | Two-source merge; allow manual edit of cached metadata. |
| Scope creep | Everything priority-C in the SRS waits until the MVP has been used for 2+ weeks. |
| Design drifts generic | Tokens land in Phase 0; no inline hex values; critique pass in Phase 6. |
| JSON columns become a junk drawer | Every JSON column has a Zod schema in `lib/schemas.ts`; parse failures are loud. |
| Solo-project abandonment | Phase 2 makes it personally useful early; daily dogfooding is the retention mechanism. |
| Phase 8 ships with authorization bugs (IDOR) | Identity only from session (SEC-007); per-resource cross-user tests (SEC-008); queries confined to `db/queries/` + `server/actions/` so scoping is reviewable in two folders; AI-assisted whole-repo review before deploy (SEC-014). |

---

## 9. Document Map

- **`media-review-app-requirements.md`** — the contract: numbered shall statements, priorities, verification methods. Definition of done = all priority-M requirements verify.
- **This document** — the rationale: why these features (§1–2), how the system is shaped (§3), what it looks like (§4), what it's built with and why (§5–6), and in what order (§7).
