-- Vault prototype schema — faithful to spec §3.2 / SRS §7-§9.
-- Translate table-for-table into db/schema.ts (Drizzle) in the real build.

CREATE TABLE IF NOT EXISTS media_items (
  id           TEXT PRIMARY KEY,
  media_type   TEXT NOT NULL CHECK (media_type IN ('movie','show','book','game')),
  source       TEXT NOT NULL CHECK (source IN ('tmdb','igdb','openlibrary','googlebooks','manual')),
  source_id    TEXT NOT NULL,
  title        TEXT NOT NULL,
  release_year INTEGER,                            -- real build: release_date TEXT
  cover_path   TEXT,                               -- LIB-003: locally cached cover
  synopsis     TEXT,
  genres       TEXT NOT NULL DEFAULT '[]',         -- JSON array (Zod-validated in real build)
  creators     TEXT NOT NULL DEFAULT '{}',         -- JSON role -> name
  type_meta    TEXT NOT NULL DEFAULT '{}',         -- JSON: runtime / seasons+episodes / pages / platforms+ttb
  palette      TEXT NOT NULL DEFAULT '[]',         -- prototype-only: drives generated SVG covers
  fetched_at   TEXT NOT NULL,                      -- LIB-014 staleness
  UNIQUE (source, source_id)
);

CREATE TABLE IF NOT EXISTS library_entries (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL DEFAULT 'local',  -- NFR-010
  media_item_id    TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'backlog'  -- LIB-005, LIB-007
                   CHECK (status IN ('wishlist','backlog','in_progress','completed','dropped')),
  qualifier        TEXT CHECK (qualifier IN ('finished','hundred_percent','replayed','abandoned_late')),
  rating           INTEGER CHECK (rating BETWEEN 1 AND 10),   -- LOG-003 encoding
  rating_manual_at TEXT,                            -- prototype addition supporting LOG-004
  is_favorite      INTEGER NOT NULL DEFAULT 0,      -- LIB-016
  progress         TEXT NOT NULL DEFAULT '{}',      -- LIB-015 (JSON)
  added_at         TEXT NOT NULL,
  started_at       TEXT,
  finished_at      TEXT,
  updated_at       TEXT NOT NULL,
  UNIQUE (user_id, media_item_id),                  -- LIB-004 enforced by the database
  CHECK (qualifier IS NULL OR status IN ('completed','dropped'))   -- LIB-006
);

CREATE TABLE IF NOT EXISTS log_entries (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL DEFAULT 'local',
  media_item_id   TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  logged_date     TEXT NOT NULL,
  end_date        TEXT,                             -- LOG-005
  rating          INTEGER CHECK (rating BETWEEN 1 AND 10),
  is_redo         INTEGER NOT NULL DEFAULT 0,
  review_text     TEXT,                             -- LOG-006 (markdown)
  has_spoilers    INTEGER NOT NULL DEFAULT 0,       -- LOG-007
  session_minutes INTEGER,                          -- LOG-011
  note            TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lists (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL DEFAULT 'local',
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_ranked   INTEGER NOT NULL DEFAULT 0,           -- LST-003
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS list_items (
  list_id       TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  note          TEXT NOT NULL DEFAULT '',           -- LST-004
  PRIMARY KEY (list_id, media_item_id)
);

CREATE TABLE IF NOT EXISTS tags (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  name    TEXT NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id TEXT NOT NULL REFERENCES library_entries(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_media_type   ON media_items(media_type);
CREATE INDEX IF NOT EXISTS idx_entry_status ON library_entries(status);
CREATE INDEX IF NOT EXISTS idx_log_date     ON log_entries(logged_date);
