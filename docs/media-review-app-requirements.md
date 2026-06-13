# Vault — Software Requirements Specification
Companion to `media-review-app-spec.md`. Requirements are numbered, atomic, and testable. Verification method per requirement: **T** = test (automated or manual test case), **D** = demonstration, **I** = inspection (of code/artifacts).

Priority: **M** must (MVP) / **S** should / **C** could.

Definitions: *media item* = a cached record from an external provider; *library entry* = the user's relationship to one media item; *log entry* = a dated diary record; *the four media types* = movie, show, book, game.

---

## 1. Search & Metadata (SRCH)

| ID | Requirement | Pri | Ver |
|---|---|---|---|
| SRCH-001 | The system shall provide a search function that queries external metadata providers for all four media types. | M | T |
| SRCH-002 | The system shall return search results grouped by media type, where each result displays title, release year, cover thumbnail, and primary creator (director, author, or developer). | M | D |
| SRCH-003 | The system shall allow the user to restrict a search to a single media type. | M | T |
| SRCH-004 | The system shall open the search input from any page via the Ctrl+K (Cmd+K on macOS) keyboard shortcut. | M | T |
| SRCH-005 | The system shall debounce search input such that no provider request is issued until 300 ms after the last keystroke. | S | T |
| SRCH-006 | The system shall discard responses to superseded search requests so that results always correspond to the latest query. | S | T |
| SRCH-007 | The system shall retrieve movie and show metadata from TMDB, game metadata from IGDB, and book metadata from Open Library and/or Google Books. | M | I |
| SRCH-008 | All provider responses shall be validated against a schema before use; responses failing validation shall be rejected with a logged error and shall not be persisted. | M | T |
| SRCH-009 | All provider integrations shall implement a common adapter interface returning normalized result shapes, such that no provider-specific data shape is referenced outside the provider layer. | M | I |
| SRCH-010 | The system shall not transmit provider API credentials to the browser. | M | T |
| SRCH-011 | The system shall limit outbound requests to each provider to a configurable rate, not exceeding 4 requests/second by default. | S | T |
| SRCH-012 | The system shall allow the user to create a media item manually when no provider result exists. | C | D |

## 2. Library Management (LIB)

| ID | Requirement | Pri | Ver |
|---|---|---|---|
| LIB-001 | The system shall allow the user to add any search result to the library in no more than 2 interactions from the result list. | M | D |
| LIB-002 | Upon adding a media item, the system shall persist its full normalized metadata to the local database. | M | T |
| LIB-003 | Upon adding a media item, the system shall download and store its cover image (and backdrop, where available) in local storage, converted to WebP. | M | T |
| LIB-004 | The library shall enforce at most one library entry per media item per user. | M | T |
| LIB-005 | Every library entry shall have exactly one primary status from: wishlist, backlog, in_progress, completed, dropped. | M | T |
| LIB-006 | A library entry whose status is completed or dropped may carry exactly one qualifier from: finished, hundred_percent, replayed, abandoned_late; entries in other statuses shall not carry a qualifier. | M | T |
| LIB-007 | The default status of a newly added library entry shall be backlog. | M | T |
| LIB-008 | The system shall allow the user to change a library entry's status from the library grid, the media detail page, and the log dialog. | M | D |
| LIB-009 | The system shall display the library as a poster grid view and as a table view, selectable by the user. | M | D |
| LIB-010 | The system shall allow filtering the library by media type, status, rating range, genre, release year, and tag, with filters combinable. | M | T |
| LIB-011 | The system shall allow sorting the library by date added, release date, rating, title, and last activity, in ascending or descending order. | M | T |
| LIB-012 | Library filter and sort state shall be encoded in the URL such that a reloaded or shared URL reproduces the same view. | S | T |
| LIB-013 | The system shall support selecting multiple library entries and applying a status change to all selected entries in one operation. | S | D |
| LIB-014 | The system shall allow the user to re-fetch (refresh) a media item's metadata from its source provider on demand. | S | T |
| LIB-015 | The system shall record progress on a library entry in type-appropriate units: pages read (book), episodes watched (show), hours played (game). | M | T |
| LIB-016 | The system shall allow the user to mark up to 4 library entries per media type as favorites. | S | T |

## 3. Logging, Ratings & Reviews (LOG)

| ID | Requirement | Pri | Ver |
|---|---|---|---|
| LOG-001 | The system shall allow the user to create a log entry against any library item, consisting of a date, and optionally: a rating, a review, a redo flag (rewatch/reread/replay), a progress note, and (for games) session minutes. | M | T |
| LOG-002 | A media item shall support an unbounded number of log entries. | M | T |
| LOG-003 | Ratings shall be restricted to the values 0.5 through 5.0 in increments of 0.5, stored internally as integers 1–10. | M | T |
| LOG-004 | When a new log entry containing a rating is saved, the system shall set the parent library entry's rating to that value, unless the user has manually overridden the library entry rating after that log's date. | M | T |
| LOG-005 | A log entry shall support an optional end date, such that the entry represents a date range. | S | T |
| LOG-006 | Review text shall be stored as Markdown and rendered with sanitized HTML output. | M | T |
| LOG-007 | A review marked as containing spoilers shall render obscured by default and shall become readable only after explicit user action. | M | D |
| LOG-008 | The system shall display all log entries for a media item on its detail page in reverse chronological order. | M | D |
| LOG-009 | The system shall provide a diary view listing all log entries across all media types in reverse chronological order, grouped by month, filterable by media type and year. | M | D |
| LOG-010 | Completing the log dialog for an item already in the library shall require no more than 10 seconds for a rating-only log, measured from dialog open to confirmed save. | S | D |
| LOG-011 | The system shall sum session minutes across a game's log entries and display total playtime on its detail page. | S | T |

## 4. Lists & Tags (LST)

| ID | Requirement | Pri | Ver |
|---|---|---|---|
| LST-001 | The system shall allow the user to create, rename, describe, and delete lists. | M | T |
| LST-002 | A list shall accept entries of mixed media types. | M | T |
| LST-003 | A list shall be designated ordered or unordered; ordered lists shall support user-controlled reordering of entries. | M | D |
| LST-004 | Each list entry shall support an optional user note. | M | T |
| LST-005 | The system shall allow assigning freeform text tags to library entries and removing them. | M | T |
| LST-006 | The system shall provide a tag browser listing all tags with entry counts, where selecting a tag filters the library to matching entries. | M | D |

## 5. Statistics (STAT)

| ID | Requirement | Pri | Ver |
|---|---|---|---|
| STAT-001 | The system shall display, for a user-selected year, the count of completed items per media type. | M | T |
| STAT-002 | The system shall display a histogram of the user's ratings in 0.5-star buckets for the selected year and for all time. | M | T |
| STAT-003 | The system shall display a calendar heatmap of log-entry activity by day for the selected year. | M | D |
| STAT-004 | The system shall display the user's most frequent genres and creators per media type for the selected year. | S | T |
| STAT-005 | Statistics shall be computed by database aggregation queries, not by client-side iteration over full datasets. | S | I |

## 6. Home & Navigation (NAV)

| ID | Requirement | Pri | Ver |
|---|---|---|---|
| NAV-001 | The home page shall display all library entries with status in_progress, the user's most recent log entries, and a search affordance. | M | D |
| NAV-002 | Every core flow (search, add, set status, rate, log, navigate between pages) shall be operable using only the keyboard. | M | D |
| NAV-003 | Every page shall present a designed empty state with a call to action when it has no data to display. | S | I |

## 7. Data Ownership (DATA)

| ID | Requirement | Pri | Ver |
|---|---|---|---|
| DATA-001 | All user data shall be stored in a single SQLite database file, and all cached images in a single directory, both within a project-local `data/` directory. | M | I |
| DATA-002 | The system shall export the complete library, logs, lists, and tags as a single valid JSON file on demand. | M | T |
| DATA-003 | The system shall export library entries as CSV, per media type. | M | T |
| DATA-004 | The system shall import Letterboxd CSV and Goodreads CSV exports, matching rows to provider metadata and reporting unmatched rows to the user. | S | T |
| DATA-005 | The database shall operate in WAL journal mode. | M | I |

## 8. Non-Functional Requirements (NFR)

| ID | Requirement | Pri | Ver |
|---|---|---|---|
| NFR-001 | Library grid views shall virtualize rendering such that grids of 2,000 entries scroll without dropped frames on a mid-range desktop. | S | D |
| NFR-002 | After a media item is added, its detail page and the library shall render fully (including images) with no network connectivity. | M | T |
| NFR-003 | A failed provider request shall produce a user-visible, non-blocking error with a retry affordance, and shall never render a blank page. | M | T |
| NFR-004 | All text shall meet WCAG 2.1 AA contrast ratios against its background. | M | I |
| NFR-005 | All interactive elements shall display a visible keyboard focus indicator. | M | I |
| NFR-006 | The system shall honor the prefers-reduced-motion media query by disabling non-essential animation. | S | T |
| NFR-007 | All pages shall remain functional at viewport widths down to 390 px. | S | D |
| NFR-008 | Images shall be rendered with explicit dimensions such that loading causes no layout shift (CLS contribution of 0). | S | T |
| NFR-009 | All code shall compile under TypeScript strict mode with zero errors. | M | I |
| NFR-010 | Every database table containing user-generated data shall include a user_id column, populated with the constant 'local' in single-user operation. | M | I |
| NFR-011 | API credentials shall be read exclusively from environment variables and shall not appear in committed source code. | M | I |

## 9. Security (SEC)

Phase column: **v1** = applies to the single-user MVP; **P8** = becomes binding when Phase 8 (multi-user deployment) begins. P8 requirements are deferred, not optional — Phase 8 shall not deploy publicly until all its M-priority SEC requirements verify.

| ID | Requirement | Phase | Pri | Ver |
|---|---|---|---|---|
| SEC-001 | The image-serving route shall resolve each requested path and reject, with a 404 response, any path that resolves outside the `data/images` directory. | v1 | M | T |
| SEC-002 | Every mutation (server action or route handler) shall validate its input against a schema before any database write; invalid input shall be rejected without side effects. | v1 | M | T |
| SEC-003 | All database access shall use parameterized queries via the ORM; no SQL shall be constructed by string concatenation with user input. | v1 | M | I |
| SEC-004 | Automated dependency vulnerability scanning shall run on every push to the repository, and critical-severity findings shall be resolved before the next release. | v1 | S | I |
| SEC-005 | Automated secret scanning shall run on the repository history and on every push. | v1 | S | I |
| SEC-006 | Authentication shall be implemented with a maintained authentication library; the system shall not implement its own password storage, session token generation, or password reset logic. | P8 | M | I |
| SEC-007 | Every query and mutation against user-owned data shall derive the user identity exclusively from the server-side session, never from a client-supplied identifier. | P8 | M | T |
| SEC-008 | For each user-owned resource type, an automated test shall verify that an authenticated user cannot read or modify another user's resource (direct object reference test). | P8 | M | T |
| SEC-009 | Session cookies shall be set with the HttpOnly, Secure, and SameSite attributes. | P8 | M | T |
| SEC-010 | All state-changing endpoints shall be protected against cross-site request forgery. | P8 | M | T |
| SEC-011 | Authentication endpoints shall rate-limit by account and source address, with limits configurable. | P8 | M | T |
| SEC-012 | Public deployments shall serve exclusively over HTTPS and shall send HSTS, Content-Security-Policy, X-Content-Type-Options, and frame-ancestors headers. | P8 | M | T |
| SEC-013 | Authentication events (login success/failure, password change, session revocation) shall be recorded in an audit log. | P8 | S | T |
| SEC-014 | Prior to first public deployment, the codebase shall undergo a security review comprising static analysis and an AI-assisted review against the OWASP Top 10, with all critical and high findings resolved; the review and resolutions shall be documented. | P8 | M | I |

---

## Traceability
Each requirement ID maps to the feature sections of `media-review-app-spec.md` (§3, §5) by prefix: SRCH→§3.1, LIB→§3.2–3.3, LOG→§3.4, LST→§3.5, STAT→§3.6, NAV→§3.7, DATA→§3.8, NFR→§5, SEC→§3.5 (Security). The MVP acceptance checklist (spec §11) is satisfied when all priority-M requirements with phase v1 verify; Phase 8 additionally requires all priority-M SEC requirements with phase P8.
