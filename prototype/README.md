# Prototype — Archival Reference Only

> **This folder is reference material, not the codebase.** Nothing here is wired into the real application, and none of it should be imported, extended, or treated as a starting point. It exists to show *what we are aiming for* and *roughly how the pieces behave*. The real build follows `docs/media-review-app-spec.md` and `docs/media-review-app-requirements.md` — when this folder and those documents disagree, **the documents win.**

## What's here

### `vault-prototype.jsx` — UI reference (recommended starting point for design)
A single-file, interactive React prototype of the full Vault UI (movies, shows, books, games). It runs on **mock, in-memory data only** and includes a "Spec IDs" toggle that overlays requirement annotations (`LIB-`, `LOG-`, `SRCH-`, etc.) onto the relevant interface elements — so you can see which requirement each piece of UI is meant to satisfy.

Known divergences from the real build (documented in the file's own header): no persistence, generated CSS placeholders instead of real cover art, markdown reviews rendered as plain text, and search backed by a mock in-memory provider rather than real APIs.

Use it for: layout, visual language, interaction patterns, and tracing UI back to requirements.

### `vault-server-prototype/` — full-stack behavior sketch
A rough end-to-end prototype: a backend (`server.py`), a database schema (`schema.sql`), and a web frontend (`web/`). Useful for seeing the rough data shape and how a request might flow front-to-back.

**Important architecture mismatch — read before referencing:** this prototype's backend is written in **Python**, and Patina's actual stack is **TypeScript / Next.js end to end** (see spec §3.1 and §5). Likewise, `schema.sql` is *not* the real schema — the authoritative data model is the Drizzle/SQLite schema described in spec §3.2. Treat `server.py` and `schema.sql` as *illustrations of intent*, never as code to build on.

## How to use this folder

- **Do** browse it to understand the target design and behavior.
- **Do** cross-reference it against the spec and requirements (those are authoritative).
- **Don't** import from it, copy its backend, or use `schema.sql` as the real schema.
- **Don't** update it to match new decisions — it's frozen. Decisions live in `docs/`.

If anything here is genuinely worth carrying into the real build, lift the *idea*, reimplement it in the real stack, and let the spec be the record.
