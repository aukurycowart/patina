# Contributing to Patina

Welcome! This guide covers how we work on Patina so everyone moves the same way. If anything here is unclear, ask before guessing.

## Project documents

Before picking up work, know where the source of truth lives — all in `docs/`:

- **`media-review-app-requirements.md`** — the SRS: numbered, testable requirements (e.g. `SRCH-007`). This is the contract for *what* the system must do.
- **`media-review-app-spec.md`** — the design spec: architecture, data model, tech stack, folder structure, and the phased build plan.
- **`media-review-app-glossary.md`** — plain-English explanations of every tool, service, and term used in the project.

Tasks reference requirement IDs. "Build the TMDB provider" means "satisfy `SRCH-007`/`008`/`009` as described in spec §3.4."

## Prerequisites

- **Node 22 LTS** (use `nvm` to manage versions)
- **pnpm** (the version is pinned in `package.json` under `packageManager`; run `corepack enable pnpm`)
- A working **WSL2/Ubuntu** or Linux/macOS environment

## Getting started

```bash
git clone git@github.com:aukurycowart/patina.git
cd patina
pnpm install
pnpm dev          # starts the dev server at http://localhost:3000
```

Before opening a pull request, make sure these all pass locally — they are exactly what CI runs:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## The workflow

We never commit directly to `main`. `main` is protected: every change arrives through a pull request that passes CI and has one approval.

1. **Branch off the latest `main`.**
   ```bash
   git switch main
   git pull
   git switch -c <type>/<short-description>
   ```
   Branch names follow the same prefixes as commits, e.g. `feat/diary-timeline`, `fix/rating-sync`, `chore/update-deps`.

2. **Do the work in small, focused commits.** One branch = one logical unit of work. If you find yourself doing something unrelated, that's a signal to finish this branch and start a new one.

3. **Push and open a pull request.**
   ```bash
   git push -u origin <your-branch>
   gh pr create --fill
   ```
   Reference the requirement ID(s) the PR addresses in its description (e.g. "Closes the TMDB half of SRCH-007").

4. **CI runs automatically.** The `quality` check (lint + typecheck + test) must be green before merge.

5. **Get one approval.** Another contributor reviews and approves. Address feedback by pushing more commits to the same branch — the PR updates in place.

6. **Merge once green and approved**, then delete the branch:
   ```bash
   gh pr merge --squash --delete-branch
   ```
   We squash-merge so `main` history reads as one clean commit per PR.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/). Every commit message starts with a type:

- `feat:` — a new feature
- `fix:` — a bug fix
- `chore:` — maintenance, tooling, dependencies (no user-facing change)
- `docs:` — documentation only
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or fixing tests

Format: `type: short summary in present tense`, e.g. `feat: add log entry modal`. Keep the summary under ~70 characters; add a blank line and more detail below if needed.

## Code conventions

- **TypeScript strict mode** — code must compile with zero type errors (`pnpm typecheck`).
- **No secrets in the repo.** API keys live only in `.env.local`, which is gitignored. Never commit a key.
- **Follow the folder structure** in spec §6 — external API code in `server/providers/`, database queries in `db/queries/`, pure functions in `lib/`, etc. The structure is intentional; ask before adding a new top-level folder.
- **Validate at boundaries** — provider responses, form inputs, and JSON columns all go through Zod schemas (see spec §3.2).

## Questions

Open an issue, or ask in our team channel. Better to ask early than to build the wrong thing.
