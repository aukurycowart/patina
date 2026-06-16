/**
 * ============================================================================
 *  SHARED DOMAIN TYPES — the "type contract" for Patina
 * ============================================================================
 *
 *  WHAT THIS FILE IS
 *  -----------------
 *  A "type" describes the *shape* of a piece of data — what fields it has and
 *  what kind of value each holds. It's a blueprint, not the data itself.
 *  TypeScript checks real data against these blueprints and reports mismatches
 *  *before the code runs* (e.g. a typo'd field name, or a number where a string
 *  belongs).
 *
 *  WHY IT'S CALLED A "CONTRACT"
 *  ----------------------------
 *  This file is the agreement between the two halves of the app:
 *
 *    • The DATA layer (providers, db queries, server actions — Kendon's area)
 *      promises: "Whatever I produce will come out in exactly these shapes."
 *
 *    • The UI layer (components — Kian's area)
 *      promises: "I will build components expecting exactly these shapes."
 *
 *  Neither side needs to know HOW the other works. The UI doesn't care whether
 *  data came from TMDB or the database; it only trusts the data arrives looking
 *  like `MediaItem`. The data layer doesn't care how a poster card looks; it
 *  only delivers the agreed shape.
 *
 *  WHY THIS LETS US WORK IN PARALLEL
 *  ---------------------------------
 *  Because both sides agree on the shapes up front, they can build at the same
 *  time without constant coordination. The UI can be built today against mock
 *  data that matches these types, while the real data layer is built separately.
 *  When both are done, they connect and "just work" — because both were built
 *  against the same blueprint. No name mismatches, no rework.
 *
 *  (Analogy: two crews building a bridge from opposite banks. This file is the
 *  agreed survey — meeting point, height, width — that guarantees the halves
 *  line up in the middle.)
 *
 *  SOURCE OF TRUTH
 *  ---------------
 *  These shapes mirror the data model in docs/media-review-app-spec.md §3.2,
 *  and the enums come from the requirements (LIB-005, LIB-006, etc.).
 *
 *  NOTE: these are the application-facing TS types. The database schema
 *  (Drizzle) and runtime validation (Zod) live elsewhere and must stay in sync
 *  with these; later we may infer these types from the Zod schemas so there's a
 *  single source of truth. For now they are hand-written from the spec — which
 *  is fine: it establishes the contract so parallel work can begin, and we
 *  reconcile to Zod when the data layer lands.
 * ============================================================================
 */

/* ─── Enumerations (from requirements LIB-005, LIB-006, and spec §3.2) ─── */

export type MediaType = "movie" | "show" | "book" | "game";

export type MediaSource =
  | "tmdb"
  | "igdb"
  | "openlibrary"
  | "googlebooks"
  | "manual";

/** Primary status — "where is this in my life?" (LIB-005) */
export type Status =
  | "wishlist"
  | "backlog"
  | "in_progress"
  | "completed"
  | "dropped";

/** Completion qualifier — "how did it end?" Only valid on completed/dropped (LIB-006) */
export type Qualifier =
  | "finished"
  | "hundred_percent"
  | "replayed"
  | "abandoned_late";

/* ─── Type-specific metadata (the `type_meta` JSON column, spec §3.2) ─── */

export interface MovieMeta {
  runtimeMinutes?: number;
  director?: string;
  cast?: string[];
}

export interface ShowMeta {
  seasons?: number;
  episodes?: number;
  network?: string;
}

export interface BookMeta {
  pages?: number;
  isbn?: string;
  author?: string;
}

export interface GameMeta {
  platforms?: string[];
  developer?: string;
  timeToBeatHours?: number;
}

export type TypeMeta = MovieMeta | ShowMeta | BookMeta | GameMeta;

/* ─── Progress (the `progress` JSON column, LIB-015) ─── */

export type Progress =
  | { kind: "book"; pagesRead: number }
  | { kind: "show"; season: number; episodesWatched: number }
  | { kind: "game"; hoursPlayed: number };

/* ─── Core entities (the three tables the whole app is built on) ─── */

/** Cached external metadata about a piece of media. */
export interface MediaItem {
  id: string;
  mediaType: MediaType;
  source: MediaSource;
  sourceId: string;
  title: string;
  originalTitle?: string;
  releaseDate?: string; // ISO date
  coverPath?: string; // local cached image path
  backdropPath?: string;
  synopsis?: string;
  genres: string[];
  creators: Record<string, string[]>; // role → names
  typeMeta: TypeMeta;
  fetchedAt: string; // ISO timestamp
}

/** The user's relationship to one media item. Exactly one per item (LIB-004). */
export interface LibraryEntry {
  id: string;
  userId: string; // 'local' in single-user mode (NFR-010)
  mediaItemId: string;
  status: Status;
  qualifier: Qualifier | null;
  rating: number | null; // int 1–10, = half-stars × 2 (LOG-003)
  isFavorite: boolean;
  progress: Progress | null;
  addedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
}

/** A dated diary entry. Many per media item (LOG-002). */
export interface LogEntry {
  id: string;
  userId: string;
  mediaItemId: string;
  loggedDate: string; // ISO date
  endDate: string | null; // ranged reads/plays (LOG-005)
  rating: number | null;
  isRedo: boolean; // rewatch / reread / replay
  reviewText: string | null; // markdown (LOG-006)
  hasSpoilers: boolean;
  sessionMinutes: number | null; // games (LOG-011)
  note: string | null;
  createdAt: string;
}

/* ─── Convenience composite (what the UI usually needs to render a card) ─── */

/** A media item joined with the user's entry — the typical shape a grid/card receives. */
export interface LibraryItem {
  media: MediaItem;
  entry: LibraryEntry;
}

/* ─── Search results (normalized provider output, SRCH-002/009) ─── */

/** A normalized search hit, before it's added to the library. */
export interface SearchResult {
  source: MediaSource;
  sourceId: string;
  mediaType: MediaType;
  title: string;
  releaseYear?: number;
  coverUrl?: string; // remote URL (not yet cached)
  primaryCreator?: string; // director / author / developer
}
