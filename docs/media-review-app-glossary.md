# Vault — Glossary & Learning Companion

Companion to the spec and SRS. Every non-obvious term, tool, and service from those documents, explained in plain English with a note on *where you'll meet it in this project*. Read it once now, then return to each section as its build phase arrives.

---

## 1. Architecture & Web Concepts

**Client / Server.** The *client* is code running in the browser (what the user sees and clicks); the *server* is code running on a machine that the browser talks to. In Vault both run on your computer, but the separation still matters: the server is where secrets and the database live. *Meets you in: Phase 0, and forever after.*

**Local-first.** An architecture philosophy where your data lives on your machine in files you own (here: `data/vault.db`), rather than on someone else's server. The web is used to *enrich* your data, not to *hold* it. Opposite of cloud-first apps like Goodreads, where deleting your account deletes your history.

**REST API.** A convention for how programs talk over HTTP: URLs name *resources* (`/api/media/123`), and HTTP verbs say what to do with them (GET = read, POST = create, PATCH = update, DELETE = remove). TMDB and Google Books are REST APIs; Vault's own `/api/` routes follow the same convention.

**Route handler (API route).** A server-side function in Next.js that answers an HTTP request — e.g., `app/api/search/route.ts` receives `GET /api/search?q=heat`, calls the providers, and returns JSON. This is Vault's "backend" even though it lives in the same repo as the UI.

**Server Components vs. Client Components.** The big idea of modern React/Next.js. *Server Components* render on the server, can read the database directly, and ship no JavaScript to the browser — ideal for pages that display data (the library grid). *Client Components* (marked `"use client"`) run in the browser and handle interactivity — the rating stars, the search box. Rule of thumb in Vault: server by default, client only where there's a click or keystroke to handle.

**Server Action.** A Next.js function that runs on the server but can be called directly from a form or button, like a remote procedure call without writing an API route. Vault uses them for all *writes*: rate, set status, create log. *Meets you in: Phase 2.*

**Hydration.** After the server sends pre-rendered HTML, the browser "wakes it up" by attaching React's JavaScript to it so it becomes interactive. You mostly don't think about it — until a hydration *mismatch* error teaches you that server and client rendered different things (commonly: dates and timezones).

**Environment variables / secrets.** Configuration values (like API keys) supplied to a program from outside its source code, here via the `.env.local` file. Keeping them out of committed code means you can publish the repo without publishing your keys (NFR-011).

**CORS (Cross-Origin Resource Sharing).** Browser security rules about which websites may call which APIs. Vault sidesteps CORS entirely by making all provider calls from the server — one of the reasons the server layer exists. You'd have met CORS constantly with a separate Python backend.

**Adapter pattern.** A design pattern: wrap each external system in a class/module that exposes one common interface, so the rest of your code never knows which system it's talking to. Vault's `MetadataProvider` interface is a textbook example — TMDB speaks REST+JSON, IGDB speaks APICalypse, but everything outside `server/providers/` sees identical shapes. *Meets you in: Phase 1, and it's the most transferable lesson in the project.*

**Normalization (of API data).** Converting each provider's differently-shaped response into your one standard shape (`MediaItemInput`). The normalizers are where most Phase 1 bugs live, which is why they get unit tests first.

**Caching.** Storing a copy of remote data locally so you don't re-fetch it. Vault caches aggressively: metadata into SQLite, images into `data/images/`. **Staleness** is the cost — the cached copy drifts from reality — handled by the `fetched_at` timestamp and a manual refresh (LIB-014).

**Debounce.** Waiting until input *stops* before acting. Searching on every keystroke of "disco elysium" would fire 13 API requests; debouncing at 300 ms fires one (SRCH-005).

**Race condition / request cancellation.** When two async operations finish in an unexpected order. Classic search bug: you type "hea", then "heat"; the "hea" response arrives *last* and overwrites the better results. Fix: cancel or discard superseded requests (SRCH-006). TanStack Query handles this for you — but know *why*.

**Optimistic update.** Updating the UI immediately on user action, assuming the server write will succeed, and rolling back if it fails. Makes rating an item feel instant instead of laggy. *Meets you in: Phase 2.*

**Rate limiting / throttling.** Capping how many requests you send per second so a provider doesn't block you (SRCH-011). Matters most during CSV imports, where naive code would fire hundreds of requests in seconds.

**Virtualization (UI).** Rendering only the list items currently visible in the viewport instead of all 2,000. The browser can't smoothly render thousands of poster cards; virtualization fakes it (NFR-001). *Meets you in: Phase 6, only if needed.*

---

## 2. The Stack — Languages, Frameworks, Tools

**Node.js.** The runtime that lets JavaScript run outside a browser — it powers the server half of Vault. **LTS** = Long-Term Support, the stable version line you should always pick.

**TypeScript.** JavaScript plus a type system: you declare what shape data has, and the compiler catches mismatches before runtime. **Strict mode** (NFR-009) turns on all the checks; starting strict is far easier than retrofitting it.

**React.** The UI library: you describe interfaces as *components* (functions returning markup) driven by *state*, and React re-renders what changed. The single most transferable skill in this stack.

**Next.js.** The dominant React framework. Adds what React alone lacks: file-based routing (a file in `app/` = a page), server rendering, API routes, image optimization. **App Router** is its current architecture (vs. the legacy Pages Router — when googling, check which one a tutorial uses; mixing advice from both is the #1 beginner confusion).

**pnpm.** A package manager (installs libraries), interchangeable in concept with npm/yarn but faster and disk-efficient. `pnpm add zod` downloads a library; `package.json` records what you depend on.

**SQLite.** A complete SQL database engine that lives in a single file — no server process to install or run. Used in production by more software than any other database on Earth (every phone, every browser). Perfect for local-first; outgrown only when multiple machines need simultaneous access (→ Postgres, Phase 8).

**WAL mode (Write-Ahead Logging).** A SQLite journal setting where writes go to a separate log file first, letting reads and writes happen concurrently without blocking each other (DATA-005). One line of config; meaningful robustness gain.

**ORM (Object-Relational Mapper).** A library that lets you query the database in your programming language instead of raw SQL strings, and maps rows to typed objects. **Drizzle** is Vault's ORM — chosen because it stays close to SQL (you can read a Drizzle query and see the SQL it becomes), so you learn the real thing while getting TypeScript safety.

**Migration (database).** A versioned script that changes the database schema ("add column `qualifier`"). **drizzle-kit** generates these by diffing your `schema.ts` against the database. Committing migrations (the `drizzle/` folder) means any machine can rebuild the exact schema — schema history is code.

**Zod.** A validation library: you define a schema (`z.object({ title: z.string() })`), and it both *checks data at runtime* and *generates the TypeScript type*. One definition guards three boundaries in Vault: provider responses, form inputs, and JSON columns. The pattern to internalize: **validate at every boundary where data enters your system.**

**Tailwind CSS.** Styling via small utility classes in your markup (`flex gap-2 text-sm`) instead of separate CSS files. Polarizing at first sight; near-universal in current industry. **v4** configures design tokens directly in CSS.

**shadcn/ui.** Not a component library you install — a collection of accessible components you *copy into your repo* and own. Built on **Radix** (headless primitives that handle the hard accessibility: focus traps, keyboard navigation, ARIA). You style; Radix handles correctness.

**TanStack Query.** Manages *server state* in the client: caching, deduplication, retries, the race-condition handling described above. Vault uses it narrowly — search and optimistic mutations — because Server Components cover the rest.

**react-hook-form.** Form state management (values, validation, errors) with minimal re-rendering. Pairs with Zod via a *resolver* so the same schema validates the log dialog.

**Markdown.** The lightweight text format your reviews are written in (`**bold**`, `# heading`). **remark-gfm** adds GitHub-flavored extras (tables, strikethrough). **Sanitization** strips dangerous HTML from rendered output — see XSS below.

**XSS (Cross-Site Scripting).** The attack where user-entered text containing `<script>` tags executes as code when displayed. Even single-user apps should sanitize (LOG-006) — partly hygiene, partly because Phase 8 makes reviews multi-user.

**sharp.** A fast Node.js image-processing library. Vault uses it to convert downloaded covers to **WebP** — a modern image format ~30% smaller than JPEG at equal quality (LIB-003).

**Recharts.** A React charting library (composable `<BarChart>`, `<Tooltip>` components) for the stats page. *visx* is the lower-level, more flexible alternative.

**Vitest.** The test runner: you write small programs that assert your code behaves ("rating 7 renders as 3.5 stars"), and it runs them on every change. **Unit test** = tests one function in isolation. **Fixture** = saved sample data (e.g., a real TMDB JSON response) that tests run against, so tests don't hit the network. **Testing Library** = utilities for testing components the way a user interacts with them. **Playwright** = end-to-end testing that drives a real browser (later, if ever).

**ESLint / Prettier.** Code quality tools: ESLint catches likely bugs and bad patterns; Prettier formats code automatically so you never argue with yourself about commas.

**Git / .gitignore.** Version control: snapshots (commits) of your code over time. `.gitignore` lists what's *excluded* from snapshots — in Vault, that's `data/` (your personal library) and `.env.local` (your keys). The boundary between committed and ignored is the boundary between *code* and *yours*.

**WSL2.** Windows Subsystem for Linux — a real Linux environment inside Windows. The standard way to do this kind of development on a Windows machine; the whole stack runs natively in it.

---

## 3. Database Concepts

**Primary key (pk).** The column that uniquely identifies a row. Vault uses **UUIDs** (long random identifiers like `f47ac10b-...`) rather than auto-incrementing integers — slightly less compact, but IDs can be generated anywhere and never collide when data is merged or synced later.

**Foreign key (fk).** A column holding another table's primary key, linking the rows — `log_entries.media_item_id` points at the media item the log is about. The database can *enforce* the link (you can't log against a nonexistent item).

**Unique constraint.** A rule that no two rows may share a value (or combination). `library_entries` is unique on `(user_id, media_item_id)` — that single constraint *is* requirement LIB-004; the database enforces it even if application code has a bug.

**CHECK constraint.** A row-level validity rule the database enforces — used to guarantee a `qualifier` only exists on `completed`/`dropped` entries (LIB-006). The theme: push invariants into the database where they can't be bypassed.

**Join table.** A table whose only job is connecting two others, modeling many-to-many relationships: one entry has many tags, one tag covers many entries → `entry_tags` holds pairs of IDs.

**JSON column.** A column storing structured JSON rather than a single value. Vault's escape valve for type-specific fields (`type_meta`: runtime for movies, pages for books) without four parallel table sets. The discipline that keeps this from rotting: every JSON column has a Zod schema, validated on read and write.

**Aggregation query.** SQL that computes summaries — `COUNT`, `AVG`, `GROUP BY` — inside the database. The stats page is built on these (STAT-005) because the database summarizing 5,000 rows is fast; shipping 5,000 rows to JavaScript to loop over is not.

**Index.** A lookup structure that makes queries on a column fast (at a small cost on writes). You'll add them when a filter feels slow — likely candidates: `media_type`, `status`, `logged_date`.

---

## 4. External Services & APIs

**TMDB (The Movie Database).** Community-built movie/TV metadata API. Free key, generous limits, excellent artwork. Powers most hobby projects in this space (and many commercial ones). *Vault's source for movies and shows.*

**IGDB (Internet Game Database).** The best structured video-game database, owned by Twitch. Free, but authentication runs through a **Twitch developer app** — see OAuth below. Queries use **APICalypse**, IGDB's own query language sent via POST (`fields name,cover; search "disco elysium";`) — unusual, but well-documented. *Vault's source for games.*

**OAuth (client-credentials flow).** A standard way for *your app* (not a user) to prove its identity to an API: you send a client ID + secret, receive a short-lived **access token**, and attach that token to requests. IGDB tokens expire after ~60 days, hence the auto-refresh logic in `igdb.ts`. This is the simplest OAuth flow — a gentle introduction to a pattern you'll meet everywhere.

**RAWG.** Alternative games API with a plain REST key (no OAuth). Weaker data freshness than IGDB, but a drop-in fallback behind the adapter interface if Twitch setup fights you.

**Open Library.** The Internet Archive's free, keyless book database. Great breadth and ISBN coverage; patchy descriptions and page counts. *Vault's book search.*

**Google Books API.** Google's book metadata API (free key). Better descriptions and page counts, weaker search. Vault *merges* it with Open Library — two imperfect sources beat either alone. (Historical note: Goodreads once had a public API and killed it in 2020 — the cautionary tale behind the adapter pattern.)

**ISBN.** International Standard Book Number — the unique ID for a specific edition of a book. The key used to match a book across Open Library, Google Books, and Goodreads CSV imports.

---

## 5. Requirements & Process Vocabulary

**SRS (Software Requirements Specification).** The document listing what a system must do as numbered, testable statements. The "contract" half of Vault's doc pair.

**Shall statement.** The formal convention for a requirement: "The system shall…" — *shall* signals a binding, verifiable obligation (vs. *should* = recommended, *may* = optional). Each must be **atomic** (one obligation, testable in isolation).

**MoSCoW.** Prioritization scheme: **M**ust / **S**hould / **C**ould / **W**on't. Vault's MVP is exactly the M set.

**Verification methods (T/D/I).** How you prove a requirement is met. **Test** = run a defined case with pass/fail output; **Demonstration** = show it working by hand; **Inspection** = examine code or artifacts (e.g., "credentials only in env vars" is verified by reading, not running).

**Traceability.** Being able to follow a thread from requirement → design section → code → test. Why the spec cites requirement IDs and the build plan lists which IDs each phase satisfies.

**MVP (Minimum Viable Product).** The smallest version that's genuinely usable, built first so reality can correct the plan early.

**Dogfooding.** Using your own product daily ("eating your own dog food"). Vault's explicit anti-abandonment strategy from Phase 2 onward — bugs you personally suffer get fixed.

**CRUD.** Create, Read, Update, Delete — the four basic operations on data. "Lists CRUD" = all four for lists.

**Scope creep.** The slow accumulation of "just one more feature" that kills projects. Countered here by the C-priority quarantine: nothing optional until the MVP has been *used* for two weeks.

---

## 6. Design & UX Vocabulary

**Design tokens.** Named design decisions (`--accent: #E0B458`) defined once and referenced everywhere, instead of hex values scattered through code. Change the token, the whole app follows. Vault's rule: no inline hex values, ever.

**WCAG / AA contrast.** Web Content Accessibility Guidelines; AA is the standard compliance level. For text, it means a minimum contrast ratio (4.5:1 for body text) between text and background — genuinely easy to fail on dark themes with dimmed text, hence NFR-004's "verify with a checker."

**`prefers-reduced-motion`.** A CSS media query exposing the user's OS-level setting to minimize animation (vestibular disorders, distraction, preference). Respecting it (NFR-006) = non-essential animation off.

**Focus indicator.** The visible outline showing which element receives keyboard input. Often deleted by developers for looking "ugly"; doing so makes keyboard navigation impossible (NFR-005).

**Command palette.** The Ctrl+K omnibox pattern (VS Code, Slack, Linear) — type to search and act from anywhere. Vault's primary search entry point (SRCH-004).

**CLS (Cumulative Layout Shift).** Content jumping as things load — the page shifts under your cursor. Caused by images without declared dimensions; cured by always declaring them (NFR-008).

**Empty state.** What a page shows with no data. A blank library on first launch is a dead end; a designed empty state ("Your library is empty — press Ctrl+K to add something") is an invitation (NAV-003).

**Skeleton loader.** Grey placeholder shapes shown while real content loads, signaling layout before data arrives. Less jarring than spinners or blankness.

**Letterboxing.** Padding an image to fit a frame of a different aspect ratio without cropping or stretching — how variable-ratio book covers sit in Vault's 2:3 poster cards.

**Breakpoint / responsive design.** Viewport widths at which layout changes (sidebar collapses, grid drops columns). Vault's floor is 390 px — a phone — per NFR-007.

---

## 7. Security Vocabulary

**Threat model.** The structured question "who could attack this, through what, to get what?" — answered *before* picking defenses. Vault's v1 threat model is tiny (a malicious URL, a hostile API response); Phase 8's is the whole internet. **STRIDE** is a common checklist for it: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.

**OWASP Top 10.** The industry's standard list of the most critical web-app vulnerability categories (broken access control, injection, etc.), updated every few years. The design-against checklist for Phase 8 (SEC-014). **ASVS** (Application Security Verification Standard) is OWASP's deeper companion: hundreds of testable security requirements — the same shall-statement style as Vault's SRS.

**Authentication vs. authorization.** *Authentication* = proving who you are (login). *Authorization* = what you're allowed to touch. Libraries solve the first; the second is always your code — which is why most real-world breaches in small apps are authorization bugs.

**IDOR (Insecure Direct Object Reference).** The authorization bug: user A requests `/media/123`, which belongs to user B, and the server forgets to check. The fix is structural, not clever: identity comes only from the session (SEC-007), and a test per resource type proves cross-user access fails (SEC-008).

**Session / cookies (HttpOnly, Secure, SameSite).** A *session* is the server's memory that you're logged in, referenced by a token in a cookie. The three attributes (SEC-009): HttpOnly = JavaScript can't read the cookie (blunts XSS), Secure = HTTPS only, SameSite = other websites can't send it (blunts CSRF).

**CSRF (Cross-Site Request Forgery).** A malicious site tricks your logged-in browser into submitting a state-changing request to Vault ("delete my library") with your cookie attached. Defended by SameSite cookies + anti-CSRF tokens (SEC-010) — handled by the auth library and framework, but verify it's on.

**SQL injection.** User input spliced into a SQL string becomes SQL ("`'; DROP TABLE library_entries;--`"). Dead by construction with parameterized queries, which is all an ORM like Drizzle emits (SEC-003). The entry exists so you recognize the one way to reintroduce it: hand-concatenated raw SQL.

**Path traversal.** Crafting a file path like `../../.env.local` to escape the directory a file-serving route intends to expose. Vault's image route is exactly this shape, hence SEC-001: resolve the path, verify it's still inside `data/images`, else 404.

**Password hashing.** Storing a one-way transformation of a password (argon2, bcrypt) instead of the password, so a stolen database doesn't yield logins. You never write this — it's the core of "use an auth library" (SEC-006).

**SAST / DAST.** *Static* analysis reads source code for vulnerable patterns (Semgrep, CodeQL); *dynamic* analysis attacks the running app (OWASP ZAP). Vault uses SAST from Phase 8 prep; DAST only if it ever matters.

**Dependency scanning.** Checking your `package.json` tree against databases of known-vulnerable versions (Dependabot, `pnpm audit`, Snyk). Most real-world compromise of small apps arrives through a dependency, not your code (SEC-004).

**Secret scanning.** Tools (gitleaks, GitHub secret scanning) that detect API keys committed to a repo — including in old history, where deleted keys live forever unless scrubbed (SEC-005).

**AI-assisted security review.** Using a frontier coding model agentically over the whole repo to threat-model and hunt cross-file bugs — e.g., "find every query not scoped to the session user." Strong complement, bad sole authority: probabilistic findings are leads to verify, layered on top of the deterministic scanners above (SEC-014). *Meets you in: Phase 8 prep — see spec §3.5 for the toolchain.*

**Security headers / CSP.** HTTP response headers instructing browsers to enforce protections: HSTS (HTTPS always), Content-Security-Policy (which scripts may run — strong XSS backstop), X-Content-Type-Options, frame-ancestors (no clickjacking via iframes) (SEC-012).

**WAF (Web Application Firewall).** A filter in front of your server blocking known-malicious traffic patterns and absorbing DDoS. Not something you build — something your host provides (Cloudflare, Vercel).

**Penetration test.** Paying a professional to attack your deployed app and report what broke. The final verification tier; relevant only once strangers' data is at stake.

---

## Suggested learning order

You don't need all of this before starting. Per phase, the concepts that matter:

- **Phase 0:** Git, pnpm, TypeScript basics, Tailwind, design tokens, SQLite, ORM/migrations.
- **Phase 1:** REST, JSON, the adapter pattern, normalization, Zod, OAuth client-credentials, debounce, race conditions, unit tests + fixtures.
- **Phase 2:** Server vs. Client Components, server actions, optimistic updates, foreign keys/constraints, caching, WebP/sharp.
- **Phase 3:** Forms (react-hook-form), Markdown + sanitization/XSS, date handling.
- **Phase 4–5:** join tables, drag-and-drop, aggregation queries, charting.
- **Phase 6–7:** virtualization, accessibility (WCAG, focus, reduced motion), CSV parsing, rate limiting in practice.
- **Phase 8:** all of §7 — threat modeling, authn vs. authz, IDOR, sessions/CSRF, headers, the audit toolchain.

Two habits worth more than any single entry above: when a term confuses you, find it here first, then read one primary source (the tool's own docs — they're uniformly good in this stack); and keep a running `NOTES.md` of things that surprised you. Future-you is the audience.
