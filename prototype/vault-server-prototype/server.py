#!/usr/bin/env python3
"""
Vault — full-stack UI prototype server (stdlib only; run: python3 server.py [port])

A runnable reference for the Vault spec: real SQLite schema with constraints
(schema.sql, §3.2), mock metadata providers behind a common adapter interface
(SRCH-009), normalized API responses, SQL-aggregated stats (STAT-005),
JSON/CSV export (DATA-002/003), locally generated+served covers with a
path-traversal guard (SEC-001), and input validation on every mutation (SEC-002).

NOTE: the production build targets Next.js + TypeScript + Drizzle per the spec.
This Python server is prototype scaffolding — the schema, routes, payload
shapes, and domain rules are the parts meant to translate one-to-one.
"""

import csv
import io
import json
import html
import os
import re
import sqlite3
import sys
import time
import uuid
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote

ROOT = Path(__file__).resolve().parent
WEB_DIR = ROOT / "web"
DATA_DIR = ROOT / "data"            # DATA-001: the entire user-owned universe
IMAGES_DIR = DATA_DIR / "images"
DB_PATH = DATA_DIR / "vault.db"

STATUSES = ("wishlist", "backlog", "in_progress", "completed", "dropped")
QUALIFIERS = ("finished", "hundred_percent", "replayed", "abandoned_late")
TYPES = ("movie", "show", "book", "game")


# ───────────────────────────── db plumbing ─────────────────────────────

def db():
    """One connection per request (the server is threaded)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    DATA_DIR.mkdir(exist_ok=True)
    IMAGES_DIR.mkdir(exist_ok=True)
    conn = db()
    conn.execute("PRAGMA journal_mode = WAL")        # DATA-005
    conn.executescript((ROOT / "schema.sql").read_text())
    empty = conn.execute("SELECT COUNT(*) AS n FROM media_items").fetchone()["n"] == 0
    conn.commit()
    conn.close()
    if empty:
        seed()
        print("· seeded data/vault.db with the mock library")


def uid(prefix="u"):
    return f"{prefix}{uuid.uuid4().hex[:10]}"


def today():
    return date.today().isoformat()


def now():
    return datetime.now().isoformat(timespec="seconds")


# ───────────────────────────── seed catalog ─────────────────────────────
# One canonical record per title. Each provider re-shapes its slice into a
# provider-flavored "raw" response at startup, and its adapter normalizes it
# back — so the normalizers exercised here are real, not decorative.

CATALOG = [
    dict(key="m1", type="movie", title="Heat", year=1995, role="Director", creator="Michael Mann", genres=["Crime", "Thriller"], meta={"runtime": 170}, palette=["#27435F", "#0D1622"], synopsis="A meticulous thief and the detective hunting him circle each other across Los Angeles, two professionals who understand each other better than anyone else in their lives."),
    dict(key="m2", type="movie", title="Aftersun", year=2022, role="Director", creator="Charlotte Wells", genres=["Drama"], meta={"runtime": 102}, palette=["#C98A4B", "#46365C"], synopsis="A woman sifts through camcorder memories of a childhood holiday in Turkey, searching the edges of the frame for the father she only partly knew."),
    dict(key="m3", type="movie", title="Dune: Part Two", year=2024, role="Director", creator="Denis Villeneuve", genres=["Science Fiction", "Adventure"], meta={"runtime": 166}, palette=["#B07B3E", "#2E1F14"], synopsis="Paul Atreides joins the Fremen of Arrakis and rides his growing legend toward a war he has foreseen and fears."),
    dict(key="m4", type="movie", title="The Zone of Interest", year=2023, role="Director", creator="Jonathan Glazer", genres=["Drama", "History"], meta={"runtime": 105}, palette=["#6E7B6C", "#1C211C"], synopsis="A commandant's family tends an immaculate garden home built against the wall of Auschwitz, the horror present only as sound."),
    dict(key="m5", type="movie", title="In the Mood for Love", year=2000, role="Director", creator="Wong Kar-wai", genres=["Romance", "Drama"], meta={"runtime": 98}, palette=["#7E2F35", "#2A4138"], synopsis="Two neighbors in 1962 Hong Kong, each betrayed by an absent spouse, fall into a restrained, unconsummated intimacy."),
    dict(key="s1", type="show", title="Severance", year=2022, role="Creator", creator="Dan Erickson", genres=["Science Fiction", "Thriller"], meta={"seasons": 2, "episodes": 19}, palette=["#4A7A6F", "#0F1A1E"], synopsis="Office workers undergo a procedure that splits their memories between work and home — until the two halves begin to reach for each other."),
    dict(key="s2", type="show", title="Andor", year=2022, role="Creator", creator="Tony Gilroy", genres=["Science Fiction", "Drama"], meta={"seasons": 2, "episodes": 24}, palette=["#9A5A33", "#1A2430"], synopsis="A thief is radicalized step by step into the rebellion, in a Star Wars story about what insurgency actually costs."),
    dict(key="s3", type="show", title="The Bear", year=2022, role="Creator", creator="Christopher Storer", genres=["Drama", "Comedy"], meta={"seasons": 3, "episodes": 28}, palette=["#2F4FA3", "#13182B"], synopsis="A fine-dining chef returns home to run his late brother's Chicago sandwich shop and inherits its chaos, debts, and family."),
    dict(key="s4", type="show", title="Twin Peaks: The Return", year=2017, role="Creator", creator="David Lynch", genres=["Mystery", "Drama"], meta={"seasons": 1, "episodes": 18}, palette=["#7A2230", "#1A0F14"], synopsis="Twenty-five years on, Agent Cooper's long way back to Twin Peaks bends television into something stranger and sadder."),
    dict(key="b1", type="book", title="Blood Meridian", year=1985, role="Author", creator="Cormac McCarthy", genres=["Western", "Literary"], meta={"pages": 351}, palette=["#8A3A2A", "#2B1A12"], synopsis="A teenage drifter falls in with a scalp-hunting expedition along the Mexican border, presided over by the enormous and terrifying Judge Holden."),
    dict(key="b2", type="book", title="Piranesi", year=2020, role="Author", creator="Susanna Clarke", genres=["Fantasy", "Mystery"], meta={"pages": 245}, palette=["#4E7997", "#152330"], synopsis="A man lives alone in an infinite house of halls and tides, certain he understands his world completely — and he is wrong."),
    dict(key="b3", type="book", title="The Left Hand of Darkness", year=1969, role="Author", creator="Ursula K. Le Guin", genres=["Science Fiction"], meta={"pages": 304}, palette=["#8FA8BC", "#1E2A36"], synopsis="An envoy from a human coalition arrives on a planet of ambisexual people, where winter and politics are equally unforgiving."),
    dict(key="b4", type="book", title="Stoner", year=1965, role="Author", creator="John Williams", genres=["Literary"], meta={"pages": 278}, palette=["#8E7B4F", "#241F14"], synopsis="The quiet life of a Missouri farm boy who becomes a literature professor, rendered with devastating plainness."),
    dict(key="g1", type="game", title="Disco Elysium", year=2019, role="Developer", creator="ZA/UM", genres=["RPG", "Detective"], meta={"platforms": ["PC"], "ttb": 30}, palette=["#B66A4F", "#27333F"], synopsis="An amnesiac detective wakes up in a trashed hostel room and must reassemble his case, his politics, and himself."),
    dict(key="g2", type="game", title="Hades", year=2020, role="Developer", creator="Supergiant Games", genres=["Roguelike", "Action"], meta={"platforms": ["PC", "Switch"], "ttb": 22}, palette=["#A33A3A", "#1F1426"], synopsis="The prince of the underworld fights his way out of his father's realm, dying and learning, again and again."),
    dict(key="g3", type="game", title="Outer Wilds", year=2019, role="Developer", creator="Mobius Digital", genres=["Adventure", "Puzzle"], meta={"platforms": ["PC", "PS5"], "ttb": 17}, palette=["#C2703D", "#1B2740"], synopsis="A four-eyed astronaut in a backyard space program explores a solar system stuck in a 22-minute loop ending in supernova."),
    dict(key="g4", type="game", title="Elden Ring", year=2022, role="Developer", creator="FromSoftware", genres=["Action RPG"], meta={"platforms": ["PC", "PS5"], "ttb": 60}, palette=["#A8893F", "#161A12"], synopsis="A Tarnished returns to the Lands Between to gather the shards of a shattered ring and claim a broken order."),
    dict(key="x1", type="movie", title="Collateral", year=2004, role="Director", creator="Michael Mann", genres=["Crime", "Thriller"], meta={"runtime": 120}, palette=["#5E6E7E", "#15191E"], synopsis="A Los Angeles cab driver's night shift is hijacked by a contract killer working down a list."),
    dict(key="x2", type="book", title="Suttree", year=1979, role="Author", creator="Cormac McCarthy", genres=["Literary"], meta={"pages": 471}, palette=["#566B4F", "#181D14"], synopsis="A man who has renounced his family lives on a houseboat on the Tennessee River among Knoxville's outcasts."),
    dict(key="x3", type="game", title="Citizen Sleeper", year=2022, role="Developer", creator="Jump Over the Age", genres=["RPG"], meta={"platforms": ["PC", "Switch"], "ttb": 8}, palette=["#C25E7A", "#1B2030"], synopsis="A digitized mind in a leased body scrapes out cycles of survival on a crumbling ring station."),
    dict(key="x4", type="show", title="Mr. Robot", year=2015, role="Creator", creator="Sam Esmail", genres=["Drama", "Thriller"], meta={"seasons": 4, "episodes": 45}, palette=["#B03030", "#101418"], synopsis="A vulnerable cybersecurity engineer is recruited by an anarchist to take down the corporation he is paid to protect."),
    dict(key="x5", type="movie", title="Sicario", year=2015, role="Director", creator="Denis Villeneuve", genres=["Crime", "Thriller"], meta={"runtime": 121}, palette=["#9A8A5E", "#1C1A14"], synopsis="An FBI agent volunteers for a cartel task force and learns how far outside the law it operates."),
    dict(key="x6", type="book", title="The Passenger", year=2022, role="Author", creator="Cormac McCarthy", genres=["Literary"], meta={"pages": 383}, palette=["#46647A", "#0F161D"], synopsis="A salvage diver finds a sunken jet with a body missing and surfaces into grief and surveillance."),
]
BY_KEY = {c["key"]: c for c in CATALOG}

SEED_ENTRIES = [
    # (key, media_key, status, qualifier, rating, manual_at, fav, tags, progress, added, started, finished)
    ("e1", "m1", "completed", "finished", 10, None, 1, ["heist", "los-angeles"], {}, "2025-08-02", "2025-08-10", "2025-08-10"),
    ("e2", "m2", "completed", "finished", 8, None, 0, ["a24"], {}, "2025-10-28", None, "2025-11-02"),
    ("e3", "m3", "completed", "finished", 9, None, 1, ["epic", "imax"], {}, "2026-02-20", None, "2026-03-15"),
    ("e4", "m4", "backlog", None, None, None, 0, [], {}, "2026-04-12", None, None),
    ("e5", "m5", "wishlist", None, None, None, 0, [], {}, "2026-05-22", None, None),
    ("e6", "s1", "in_progress", None, 9, None, 0, ["workplace", "sci-fi"], {"episodes": 16}, "2025-02-14", "2025-02-15", None),
    ("e7", "s2", "completed", "finished", 9, None, 0, ["star-wars"], {}, "2025-11-20", None, "2025-12-14"),
    ("e8", "s3", "dropped", "abandoned_late", 6, None, 0, [], {}, "2026-01-05", "2026-01-08", None),
    ("e9", "s4", "backlog", None, None, None, 0, [], {}, "2026-05-30", None, None),
    ("e10", "b1", "in_progress", None, None, None, 0, ["western", "mccarthy"], {"pages": 212}, "2026-05-10", "2026-05-14", None),
    ("e11", "b2", "completed", "finished", 9, None, 1, ["locked-room"], {}, "2026-01-02", None, "2026-01-19"),
    ("e12", "b3", "completed", "finished", 8, "2025-07-06", 0, ["hugo-winner"], {}, "2025-06-18", None, "2025-07-06"),
    ("e13", "b4", "backlog", None, None, None, 0, [], {}, "2026-03-02", None, None),
    ("e14", "g1", "completed", "finished", 10, None, 1, ["rpg", "detective"], {}, "2025-09-12", "2025-09-14", "2025-10-05"),
    ("e15", "g2", "completed", "hundred_percent", 9, None, 0, ["roguelike"], {}, "2026-02-08", "2026-02-12", "2026-02-27"),
    ("e16", "g3", "in_progress", None, None, None, 0, ["space"], {}, "2026-05-28", "2026-06-01", None),
    ("e17", "g4", "backlog", None, None, None, 0, [], {}, "2026-04-20", None, None),
]

SEED_LOGS = [
    # (key, media_key, date, end, rating, redo, review, spoilers, mins, note) — newest first
    ("l4", "m3", "2026-06-09", None, None, 1, None, 0, None, "IMAX rewatch with Sam."),
    ("l19", "g3", "2026-06-08", None, None, 0, None, 0, 130, "Nomai text trail through Brittle Hollow. No spoilers, but the quantum moon is doing things."),
    ("l8", "s1", "2026-06-07", None, None, 0, None, 0, None, "S2E9. Theories multiplying. Saving the finale for the weekend."),
    ("l11", "b1", "2026-06-04", None, None, 0, None, 0, None, "p. 212. The judge's campfire speech on war. Had to put it down and stare at a wall."),
    ("l18", "g3", "2026-06-01", None, None, 0, None, 0, 85, "First loop out past the village. The Hourglass Twins are already my favorite thing in the system."),
    ("l7", "s1", "2026-05-18", None, None, 0, None, 0, None, "S2E7. The ORTBO episode is the show at its funniest and most sinister at once."),
    ("l2", "m1", "2026-03-22", None, 10, 1, "Even better knowing where every thread lands. The shootout still sounds like the inside of a metal drum.", 0, None, None),
    ("l3", "m3", "2026-03-15", None, 9, 0, "Spectacle with actual dread underneath it. The black-and-white arena sequence is the best stretch of studio filmmaking in years.", 0, None, None),
    ("l17", "g2", "2026-02-27", None, 9, 0, "The loop is the story and the story justifies the loop. Best roguelike onboarding ever made.", 0, 150, None),
    ("l16", "g2", "2026-02-20", None, None, 0, None, 0, 200, "Cleared a heat-8 run with the rail."),
    ("l10", "s3", "2026-02-11", None, 6, 0, "Respect the craft, but three seasons of being yelled at is enough. Dropping it two episodes into S3.", 0, None, None),
    ("l6", "b2", "2026-01-19", None, 9, 0, "The reveal that the Other has been wiping his memory the whole time lands because Piranesi never stops being kind. The journals-as-evidence structure is perfect.", 1, None, None),
    ("l9", "s2", "2025-12-14", None, 9, 0, "The prison arc is as good as television gets.", 0, None, None),
    ("l5", "m2", "2025-11-02", None, 8, 0, "Quiet for eighty minutes and then it caves your chest in. The final dance sequence recontextualizes everything before it.", 0, None, None),
    ("l15", "g1", "2025-10-05", None, 10, 0, "Nothing else is structured like this — a detective game where the central mystery is your own ruined self. The writing carries every system.", 0, 160, None),
    ("l14", "g1", "2025-09-28", None, None, 0, None, 0, 210, None),
    ("l13", "g1", "2025-09-21", None, None, 0, None, 0, 240, "Failed every Authority check and somehow that's the better story."),
    ("l12", "g1", "2025-09-14", None, None, 0, None, 0, 180, "Rolled a thought-cabinet build. The Hanged Man case opens strong."),
    ("l1", "m1", "2025-08-10", None, 9, 0, "The diner scene alone earns the runtime. Everything is procedure until suddenly it's grief.", 0, None, None),
]

SEED_LISTS = [
    ("L1", "Desert Island Eight", "If the boat sinks, these come with me.", 1,
     [("g1", "The one I would replay forever."), ("m1", ""), ("b2", "Comfort and mystery in one volume."), ("s2", ""), ("b3", ""), ("g3", "Cheating — you can only play it once.")]),
    ("L2", "2026 Watchlist", "Queued for this year.", 0,
     [("m4", "Steeling myself."), ("m5", "Criterion 4K."), ("s4", "18 hours of whatever this is."), ("g4", "Waiting for a free month.")]),
    ("L3", "Short & Perfect", "Under four hours or 250 pages. No filler.", 0,
     [("m2", ""), ("m5", ""), ("b2", "")]),
]


# ──────────────────── providers (SRCH-009 adapter pattern) ────────────────────
# Each provider holds raw responses in its own wire format and exposes the same
# two methods returning one normalized shape. Nothing outside this section ever
# sees a provider-specific field name — exactly the contract the real
# server/providers/ folder must keep. Normalizers are where Phase 1 bugs live;
# in the real build these get Vitest fixtures first.

NORMALIZED_FIELDS = ("type", "source", "sourceId", "title", "year",
                     "creators", "genres", "typeMeta", "palette", "synopsis")


class MockTMDB:
    """Movies + shows. TMDB really does serve both from one multi-search."""
    source = "tmdb"
    media_types = ("movie", "show")
    latency = 0.35

    def __init__(self):
        self.raw = [
            {  # TMDB-flavored wire format
                "id": 70000 + i,
                "media_type": "tv" if c["type"] == "show" else "movie",
                "title" if c["type"] == "movie" else "name": c["title"],
                "release_date" if c["type"] == "movie" else "first_air_date": f"{c['year']}-01-01",
                "genre_names": c["genres"],
                "credits": {c["role"].lower(): c["creator"]},
                "overview": c["synopsis"],
                "_meta": c["meta"], "_palette": c["palette"], "_key": c["key"],
            }
            for i, c in enumerate(CATALOG) if c["type"] in self.media_types
        ]

    def search(self, query, media_type=None):
        time.sleep(self.latency)                       # simulated network
        q = query.lower()
        out = []
        for r in self.raw:
            n = self.normalize(r)
            if media_type and n["type"] != media_type:
                continue
            if q in n["title"].lower() or q in list(n["creators"].values())[0].lower():
                out.append(n)
        return out

    def get_details(self, source_id):
        for r in self.raw:
            if str(r["id"]) == str(source_id):
                return self.normalize(r)
        return None

    def normalize(self, r):
        is_tv = r["media_type"] == "tv"
        role = "Creator" if is_tv else "Director"
        return {
            "type": "show" if is_tv else "movie",
            "source": self.source,
            "sourceId": str(r["id"]),
            "title": r["name"] if is_tv else r["title"],
            "year": int((r["first_air_date"] if is_tv else r["release_date"])[:4]),
            "creators": {role: r["credits"][role.lower()]},
            "genres": r["genre_names"],
            "typeMeta": r["_meta"],
            "palette": r["_palette"],
            "synopsis": r["overview"],
        }


class MockIGDB:
    """Games. IGDB's wire format (APICalypse results) looks nothing like TMDB's."""
    source = "igdb"
    media_types = ("game",)
    latency = 0.45

    def __init__(self):
        self.raw = [
            {
                "id": 9000 + i,
                "name": c["title"],
                "first_release_year": c["year"],
                "involved_companies": [{"company": c["creator"], "developer": True}],
                "genres": [{"name": g} for g in c["genres"]],
                "platforms": [{"abbreviation": p} for p in c["meta"]["platforms"]],
                "time_to_beat_h": c["meta"]["ttb"],
                "summary": c["synopsis"],
                "_palette": c["palette"], "_key": c["key"],
            }
            for i, c in enumerate(CATALOG) if c["type"] == "game"
        ]

    def search(self, query, media_type=None):
        time.sleep(self.latency)
        q = query.lower()
        out = []
        for r in self.raw:
            dev = next(ic["company"] for ic in r["involved_companies"] if ic["developer"])
            if q in r["name"].lower() or q in dev.lower():
                out.append(self.normalize(r))
        return out

    def get_details(self, source_id):
        for r in self.raw:
            if str(r["id"]) == str(source_id):
                return self.normalize(r)
        return None

    def normalize(self, r):
        dev = next(ic["company"] for ic in r["involved_companies"] if ic["developer"])
        return {
            "type": "game",
            "source": self.source,
            "sourceId": str(r["id"]),
            "title": r["name"],
            "year": r["first_release_year"],
            "creators": {"Developer": dev},
            "genres": [g["name"] for g in r["genres"]],
            "typeMeta": {"platforms": [p["abbreviation"] for p in r["platforms"]], "ttb": r["time_to_beat_h"]},
            "palette": r["_palette"],
            "synopsis": r["summary"],
        }


class MockOpenLibrary:
    """Books. In the real build this adapter merges Open Library + Google Books."""
    source = "openlibrary"
    media_types = ("book",)
    latency = 0.55

    def __init__(self):
        self.raw = [
            {
                "key": f"/works/OL{1000 + i}W",
                "title": c["title"],
                "first_publish_year": c["year"],
                "author_name": [c["creator"]],
                "subject": c["genres"],
                "number_of_pages_median": c["meta"]["pages"],
                "description": c["synopsis"],
                "_palette": c["palette"], "_key": c["key"],
            }
            for i, c in enumerate(CATALOG) if c["type"] == "book"
        ]

    def search(self, query, media_type=None):
        time.sleep(self.latency)
        q = query.lower()
        return [self.normalize(r) for r in self.raw
                if q in r["title"].lower() or q in r["author_name"][0].lower()]

    def get_details(self, source_id):
        for r in self.raw:
            if r["key"] == source_id:
                return self.normalize(r)
        return None

    def normalize(self, r):
        return {
            "type": "book",
            "source": self.source,
            "sourceId": r["key"],
            "title": r["title"],
            "year": r["first_publish_year"],
            "creators": {"Author": r["author_name"][0]},
            "genres": r["subject"],
            "typeMeta": {"pages": r["number_of_pages_median"]},
            "palette": r["_palette"],
            "synopsis": r["description"],
        }


_tmdb, _igdb, _ol = MockTMDB(), MockIGDB(), MockOpenLibrary()
PROVIDERS = {"movie": _tmdb, "show": _tmdb, "book": _ol, "game": _igdb}   # registry
PROVIDER_BY_SOURCE = {"tmdb": _tmdb, "igdb": _igdb, "openlibrary": _ol}


def provider_search(query, media_type=None):
    """Fan out to the relevant providers; results are already normalized."""
    seen, out = set(), []
    targets = [PROVIDERS[media_type]] if media_type else [_tmdb, _ol, _igdb]
    for p in targets:
        for n in p.search(query, media_type):
            k = (n["source"], n["sourceId"])
            if k not in seen:
                seen.add(k)
                out.append(n)
    return out


# ───────────────── cover generation (LIB-003 stand-in) ─────────────────
# Real build: download provider art -> sharp -> WebP into data/images/.
# Prototype: generate an SVG jacket into the same directory so the image
# cache, the serving route, and SEC-001 are all real.

def _wrap(text, width=13, max_lines=4):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] += "…"
    return lines


def gen_cover(media_id, m):
    c1, c2 = m["palette"]
    t = html.escape(m["title"].upper())
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">',
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="0.7" y2="1">'
        f'<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>'
        f'<radialGradient id="v" cx="0.5" cy="0.2" r="1">'
        f'<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.10"/>'
        f'<stop offset="0.55" stop-color="#000000" stop-opacity="0"/>'
        f'<stop offset="1" stop-color="#000000" stop-opacity="0.45"/></radialGradient></defs>',
    ]
    if m["type"] == "book":
        author = html.escape(list(m["creators"].values())[0].upper())
        parts.append('<rect width="400" height="600" fill="#17171D"/>')
        parts.append('<rect x="44" y="56" width="312" height="488" rx="6" fill="url(#g)"/>')
        parts.append('<rect x="44" y="56" width="312" height="488" rx="6" fill="url(#v)"/>')
        parts.append('<rect x="66" y="56" width="2" height="488" fill="#000000" opacity="0.35"/>')
        y = 130
        for ln in _wrap(m["title"], 14):
            parts.append(f'<text x="88" y="{y}" font-family="Georgia, serif" font-size="30" fill="#FFFFFF" fill-opacity="0.93">{html.escape(ln.upper())}</text>')
            y += 38
        parts.append(f'<text x="88" y="500" font-family="monospace" font-size="14" letter-spacing="3" fill="#FFFFFF" fill-opacity="0.62">{author}</text>')
    else:
        parts.append('<rect width="400" height="600" fill="url(#g)"/>')
        if m["type"] == "show":
            parts.append('<pattern id="sc" width="4" height="4" patternUnits="userSpaceOnUse">'
                         '<rect width="4" height="1" fill="#FFFFFF" opacity="0.05"/></pattern>'
                         '<rect width="400" height="600" fill="url(#sc)"/>')
        if m["type"] == "game":
            parts.append('<polygon points="120,-50 220,-50 -20,650 -120,650" fill="#FFFFFF" opacity="0.08"/>')
        parts.append('<rect width="400" height="600" fill="url(#v)"/>')
        parts.append(f'<text x="26" y="42" font-family="monospace" font-size="15" letter-spacing="3" fill="#FFFFFF" fill-opacity="0.66">{m["year"]}</text>')
        lines = _wrap(m["title"], 13)
        y = 560 - (len(lines) - 1) * 40
        for ln in lines:
            parts.append(f'<text x="26" y="{y}" font-family="Georgia, serif" font-size="34" letter-spacing="1.5" fill="#FFFFFF" fill-opacity="0.94">{html.escape(ln)}</text>')
            y += 40
    parts.append("</svg>")
    path = f"{media_id}.svg"
    (IMAGES_DIR / path).write_text("".join(parts))
    return path


# ───────────────────── persistence & client serialization ─────────────────────
# The API speaks the client's camelCase shapes; mapping lives here, in one place.

def insert_media(conn, n):
    """Persist a normalized provider record + cache its cover. Returns media id."""
    row = conn.execute("SELECT id FROM media_items WHERE source=? AND source_id=?",
                       (n["source"], n["sourceId"])).fetchone()
    if row:
        return row["id"]
    mid = uid("m_")
    cover = gen_cover(mid, n)
    conn.execute(
        """INSERT INTO media_items (id, media_type, source, source_id, title, release_year,
           cover_path, synopsis, genres, creators, type_meta, palette, fetched_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (mid, n["type"], n["source"], n["sourceId"], n["title"], n["year"], cover,
         n["synopsis"], json.dumps(n["genres"]), json.dumps(n["creators"]),
         json.dumps(n["typeMeta"]), json.dumps(n["palette"]), now()))
    return mid


def media_out(row):
    m = {"id": row["id"], "type": row["media_type"], "title": row["title"],
         "year": row["release_year"], "coverPath": row["cover_path"],
         "synopsis": row["synopsis"], "genres": json.loads(row["genres"]),
         "creators": json.loads(row["creators"]), "palette": json.loads(row["palette"]),
         "source": row["source"], "fetchedAt": row["fetched_at"]}
    m.update(json.loads(row["type_meta"]))     # runtime / seasons / pages / platforms / ttb
    return m


def entry_out(row, tags):
    return {"id": row["id"], "mediaId": row["media_item_id"], "status": row["status"],
            "qualifier": row["qualifier"], "rating": row["rating"],
            "ratingManualAt": row["rating_manual_at"], "favorite": bool(row["is_favorite"]),
            "tags": tags, "progress": json.loads(row["progress"]),
            "addedAt": row["added_at"], "startedAt": row["started_at"],
            "finishedAt": row["finished_at"]}


def log_out(row):
    return {"id": row["id"], "mediaId": row["media_item_id"], "date": row["logged_date"],
            "endDate": row["end_date"], "rating": row["rating"], "isRedo": bool(row["is_redo"]),
            "review": row["review_text"], "hasSpoilers": bool(row["has_spoilers"]),
            "sessionMinutes": row["session_minutes"], "note": row["note"]}


def full_state(conn):
    media = [media_out(r) for r in conn.execute(
        """SELECT m.* FROM media_items m
           JOIN library_entries e ON e.media_item_id = m.id ORDER BY m.title""")]
    tag_rows = conn.execute(
        """SELECT et.entry_id, t.name FROM entry_tags et JOIN tags t ON t.id = et.tag_id
           ORDER BY t.name""").fetchall()
    tags_by_entry = {}
    for r in tag_rows:
        tags_by_entry.setdefault(r["entry_id"], []).append(r["name"])
    entries = [entry_out(r, tags_by_entry.get(r["id"], [])) for r in conn.execute(
        "SELECT * FROM library_entries WHERE user_id='local' ORDER BY added_at DESC")]
    logs = [log_out(r) for r in conn.execute(
        "SELECT * FROM log_entries WHERE user_id='local' ORDER BY logged_date DESC, created_at DESC")]
    lists = []
    for L in conn.execute("SELECT * FROM lists WHERE user_id='local' ORDER BY created_at"):
        items = [{"mediaId": r["media_item_id"], "note": r["note"]} for r in conn.execute(
            "SELECT * FROM list_items WHERE list_id=? ORDER BY position", (L["id"],))]
        lists.append({"id": L["id"], "name": L["name"], "note": L["description"],
                      "ranked": bool(L["is_ranked"]), "items": items})
    return {"media": media, "entries": entries, "logs": logs, "lists": lists}


# ───────────────────────── domain rules ─────────────────────────

def status_patch(entry, status, start=None, end=None):
    """LIB-006/LIB-007 side effects of a status transition (mirrors the UI prototype)."""
    patch = {"status": status}
    if status not in ("completed", "dropped"):
        patch["qualifier"] = None
    if status == "in_progress" and not entry["started_at"]:
        patch["started_at"] = start or today()
    if status == "completed":
        patch["finished_at"] = entry["finished_at"] or end or today()
        if not entry["qualifier"]:
            patch["qualifier"] = "finished"
    return patch


def update_entry(conn, entry_id, patch):
    if not patch:
        return
    cols = {"status": "status", "qualifier": "qualifier", "rating": "rating",
            "rating_manual_at": "rating_manual_at", "is_favorite": "is_favorite",
            "progress": "progress", "started_at": "started_at", "finished_at": "finished_at"}
    sets, vals = [], []
    for k, v in patch.items():
        sets.append(f"{cols[k]}=?")
        vals.append(v)
    sets.append("updated_at=?")
    vals.extend([now(), entry_id])
    conn.execute(f"UPDATE library_entries SET {', '.join(sets)} WHERE id=?", vals)


def apply_log(conn, form):
    """Insert a log entry and apply LOG-004 + status side effects. Returns synced flag."""
    conn.execute(
        """INSERT INTO log_entries (id, user_id, media_item_id, logged_date, end_date, rating,
           is_redo, review_text, has_spoilers, session_minutes, note, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (uid("l_"), "local", form["mediaId"], form["date"], form.get("endDate"),
         form.get("rating"), 1 if form.get("isRedo") else 0, form.get("review"),
         1 if form.get("hasSpoilers") else 0, form.get("sessionMinutes"),
         form.get("note"), now()))
    e = conn.execute("SELECT * FROM library_entries WHERE media_item_id=? AND user_id='local'",
                     (form["mediaId"],)).fetchone()
    synced = False
    if e:
        patch = {}
        if form.get("status") and form["status"] != e["status"]:
            patch = status_patch(e, form["status"], start=form["date"],
                                 end=form.get("endDate") or form["date"])
        blocked = e["rating_manual_at"] and e["rating_manual_at"] > form["date"]   # LOG-004
        if form.get("rating") is not None and not blocked:
            patch["rating"] = form["rating"]
            synced = True
        update_entry(conn, e["id"], patch)
    return synced


def seed():
    conn = db()
    key_to_id = {}
    saved = [(p, p.latency) for p in (_tmdb, _igdb, _ol)]
    for p, _ in saved:
        p.latency = 0                                 # no simulated latency while seeding
    for c in CATALOG:
        if c["key"].startswith("x"):
            continue                                  # search-only: stays ephemeral (spec §3.4)
        results = PROVIDERS[c["type"]].search(c["title"], c["type"])
        n = next(r for r in results if r["title"] == c["title"])
        key_to_id[c["key"]] = insert_media(conn, n)
    for p, lat in saved:
        p.latency = lat
    for (k, mk, status, qual, rating, manual, fav, tags, prog, added, started, fin) in SEED_ENTRIES:
        eid = uid("e_")
        conn.execute(
            """INSERT INTO library_entries (id, user_id, media_item_id, status, qualifier, rating,
               rating_manual_at, is_favorite, progress, added_at, started_at, finished_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (eid, "local", key_to_id[mk], status, qual, rating, manual, fav,
             json.dumps(prog), added, started, fin, now()))
        for t in tags:
            trow = conn.execute("SELECT id FROM tags WHERE user_id='local' AND name=?", (t,)).fetchone()
            tid = trow["id"] if trow else uid("t_")
            if not trow:
                conn.execute("INSERT INTO tags (id, user_id, name) VALUES (?,?,?)", (tid, "local", t))
            conn.execute("INSERT INTO entry_tags (entry_id, tag_id) VALUES (?,?)", (eid, tid))
    for (k, mk, d, end, rating, redo, review, spoil, mins, note) in SEED_LOGS:
        conn.execute(
            """INSERT INTO log_entries (id, user_id, media_item_id, logged_date, end_date, rating,
               is_redo, review_text, has_spoilers, session_minutes, note, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (uid("l_"), "local", key_to_id[mk], d, end, rating, redo, review, spoil, mins, note, now()))
    for (lk, name, desc, ranked, items) in SEED_LISTS:
        lid = uid("L_")
        conn.execute("INSERT INTO lists (id, user_id, name, description, is_ranked, created_at) VALUES (?,?,?,?,?,?)",
                     (lid, "local", name, desc, ranked, now()))
        for pos, (mk, note) in enumerate(items):
            conn.execute("INSERT INTO list_items (list_id, media_item_id, position, note) VALUES (?,?,?,?)",
                         (lid, key_to_id[mk], pos, note))
    conn.commit()
    conn.close()


# ───────────────────── validation (SEC-002 stand-in for Zod) ─────────────────────

class Invalid(Exception):
    pass


def expect(body, field, kind, required=False, enum=None, lo=None, hi=None):
    v = body.get(field)
    if v is None:
        if required:
            raise Invalid(f"'{field}' is required")
        return None
    if kind == "str":
        if not isinstance(v, str) or len(v) > 10000:
            raise Invalid(f"'{field}' must be a string")
        if enum and v not in enum:
            raise Invalid(f"'{field}' must be one of {enum}")
    elif kind == "int":
        if not isinstance(v, int) or isinstance(v, bool):
            raise Invalid(f"'{field}' must be an integer")
        if lo is not None and not (lo <= v <= (hi if hi is not None else v)):
            raise Invalid(f"'{field}' out of range")
    elif kind == "bool":
        if not isinstance(v, bool):
            raise Invalid(f"'{field}' must be a boolean")
    elif kind == "date":
        if not isinstance(v, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
            raise Invalid(f"'{field}' must be YYYY-MM-DD")
    elif kind == "obj":
        if not isinstance(v, dict):
            raise Invalid(f"'{field}' must be an object")
    return v


# ───────────────────────────── http handler ─────────────────────────────

class Handler(BaseHTTPRequestHandler):
    server_version = "VaultPrototype/0.2"

    # ---- plumbing ----
    def log_message(self, fmt, *args):
        sys.stderr.write("· %s %s\n" % (self.command, self.path))

    def send_json(self, obj, status=200):
        raw = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def send_bytes(self, raw, ctype, status=200, download=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        if download:
            self.send_header("Content-Disposition", f'attachment; filename="{download}"')
        self.end_headers()
        self.wfile.write(raw)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n == 0:
            return {}
        try:
            data = json.loads(self.rfile.read(n))
        except json.JSONDecodeError:
            raise Invalid("body must be valid JSON")
        if not isinstance(data, dict):
            raise Invalid("body must be a JSON object")
        return data

    # ---- routing ----
    def route(self, method):
        path = urlparse(self.path).path
        qs = {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}
        try:
            for pat, m, fn in ROUTES:
                if m != method:
                    continue
                hit = re.fullmatch(pat, path)
                if hit:
                    conn = db()
                    try:
                        fn(self, conn, qs, *[unquote(g) for g in hit.groups()])
                        conn.commit()
                    finally:
                        conn.close()
                    return
            self.send_json({"error": "not found"}, 404)
        except Invalid as ex:                       # SEC-002: rejected without side effects
            self.send_json({"error": str(ex)}, 400)
        except Exception as ex:                     # never a blank page (NFR-003 spirit)
            self.send_json({"error": f"server error: {ex}"}, 500)

    def do_GET(self):
        self.route("GET")

    def do_POST(self):
        self.route("POST")

    def do_PATCH(self):
        self.route("PATCH")

    def do_DELETE(self):
        self.route("DELETE")


# ───────────────────────────── route handlers ─────────────────────────────

def r_state(h, conn, qs):
    h.send_json(full_state(conn))


def r_search(h, conn, qs):
    q = (qs.get("q") or "").strip()
    mtype = qs.get("type") or None
    if mtype and mtype not in TYPES:
        raise Invalid("unknown media type")
    if not q:
        h.send_json({"results": []})
        return
    results = provider_search(q, mtype)             # SRCH-001/003; latency lives in providers
    in_lib = {(r["source"], r["source_id"]): r["id"] for r in conn.execute(
        """SELECT m.id, m.source, m.source_id FROM media_items m
           JOIN library_entries e ON e.media_item_id = m.id""")}
    for n in results:
        n["inLibrary"] = in_lib.get((n["source"], n["sourceId"]))
    h.send_json({"results": results})


def r_add_library(h, conn, qs):
    b = h.body()
    source = expect(b, "source", "str", required=True, enum=tuple(PROVIDER_BY_SOURCE))
    source_id = expect(b, "sourceId", "str", required=True)
    n = PROVIDER_BY_SOURCE[source].get_details(source_id)
    if not n:
        raise Invalid("provider has no such item")
    mid = insert_media(conn, n)                      # LIB-002/003: cache metadata + cover
    exists = conn.execute(
        "SELECT 1 FROM library_entries WHERE user_id='local' AND media_item_id=?", (mid,)).fetchone()
    if exists:                                       # LIB-004 (also enforced by UNIQUE)
        h.send_json({"error": "already in your library"}, 409)
        return
    conn.execute(
        """INSERT INTO library_entries (id, user_id, media_item_id, added_at, updated_at)
           VALUES (?,?,?,?,?)""",
        (uid("e_"), "local", mid, today(), now()))   # LIB-007: defaults to backlog
    h.send_json({"id": mid, "title": n["title"]})


def r_patch_entry(h, conn, qs, entry_id):
    e = conn.execute("SELECT * FROM library_entries WHERE id=? AND user_id='local'",
                     (entry_id,)).fetchone()
    if not e:
        h.send_json({"error": "no such entry"}, 404)
        return
    b = h.body()
    patch = {}
    if "status" in b:
        status = expect(b, "status", "str", enum=STATUSES)
        if status != e["status"]:
            patch.update(status_patch(e, status))
    if "qualifier" in b:
        q = b["qualifier"]
        if q is not None:
            expect(b, "qualifier", "str", enum=QUALIFIERS)
        status_now = patch.get("status", e["status"])
        if q is not None and status_now not in ("completed", "dropped"):
            raise Invalid("qualifier only applies to completed/dropped entries")   # LIB-006
        patch["qualifier"] = q
    if "rating" in b:
        r = b["rating"]
        if r is not None:
            expect(b, "rating", "int", lo=1, hi=10)  # LOG-003
        patch["rating"] = r
        patch["rating_manual_at"] = today()          # manual override marker (LOG-004)
    if "favorite" in b:
        fav = expect(b, "favorite", "bool")
        if fav:
            mtype = conn.execute("SELECT media_type FROM media_items WHERE id=?",
                                 (e["media_item_id"],)).fetchone()["media_type"]
            n = conn.execute(
                """SELECT COUNT(*) AS n FROM library_entries le
                   JOIN media_items m ON m.id = le.media_item_id
                   WHERE le.user_id='local' AND le.is_favorite=1 AND m.media_type=?""",
                (mtype,)).fetchone()["n"]
            if n >= 4:                               # LIB-016
                h.send_json({"error": f"favorites are capped at 4 per type"}, 409)
                return
        patch["is_favorite"] = 1 if fav else 0
    if "progress" in b:
        p = expect(b, "progress", "obj")             # LIB-015
        merged = json.loads(e["progress"])
        merged.update(p or {})
        patch["progress"] = json.dumps(merged)
    update_entry(conn, entry_id, patch)
    h.send_json({"ok": True})


def r_add_tag(h, conn, qs, entry_id):
    b = h.body()
    name = expect(b, "tag", "str", required=True).strip().lower().replace(" ", "-")[:40]
    if not name:
        raise Invalid("empty tag")
    trow = conn.execute("SELECT id FROM tags WHERE user_id='local' AND name=?", (name,)).fetchone()
    tid = trow["id"] if trow else uid("t_")
    if not trow:
        conn.execute("INSERT INTO tags (id, user_id, name) VALUES (?,?,?)", (tid, "local", name))
    conn.execute("INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?,?)", (entry_id, tid))
    h.send_json({"ok": True})


def r_del_tag(h, conn, qs, entry_id, name):
    conn.execute("""DELETE FROM entry_tags WHERE entry_id=? AND tag_id IN
                    (SELECT id FROM tags WHERE user_id='local' AND name=?)""", (entry_id, name))
    conn.execute("DELETE FROM tags WHERE user_id='local' AND id NOT IN (SELECT tag_id FROM entry_tags)")
    h.send_json({"ok": True})


def r_add_log(h, conn, qs):
    b = h.body()
    form = {
        "mediaId": expect(b, "mediaId", "str", required=True),
        "date": expect(b, "date", "date", required=True),
        "endDate": expect(b, "endDate", "date"),
        "status": expect(b, "status", "str", enum=STATUSES),
        "rating": expect(b, "rating", "int", lo=1, hi=10),
        "isRedo": expect(b, "isRedo", "bool"),
        "review": expect(b, "review", "str"),
        "hasSpoilers": expect(b, "hasSpoilers", "bool"),
        "sessionMinutes": expect(b, "sessionMinutes", "int", lo=0, hi=100000),
        "note": expect(b, "note", "str"),
    }
    if not conn.execute("SELECT 1 FROM media_items WHERE id=?", (form["mediaId"],)).fetchone():
        raise Invalid("unknown media item")
    synced = apply_log(conn, form)                   # LOG-001/004
    h.send_json({"ok": True, "synced": synced})


def r_refresh(h, conn, qs, media_id):                # LIB-014
    m = conn.execute("SELECT * FROM media_items WHERE id=?", (media_id,)).fetchone()
    if not m:
        h.send_json({"error": "no such media item"}, 404)
        return
    n = PROVIDER_BY_SOURCE[m["source"]].get_details(m["source_id"])
    stamp = now()
    if n:
        conn.execute("""UPDATE media_items SET title=?, release_year=?, synopsis=?, genres=?,
                        creators=?, type_meta=?, fetched_at=? WHERE id=?""",
                     (n["title"], n["year"], n["synopsis"], json.dumps(n["genres"]),
                      json.dumps(n["creators"]), json.dumps(n["typeMeta"]), stamp, media_id))
    h.send_json({"ok": True, "fetchedAt": stamp, "source": m["source"]})


def r_create_list(h, conn, qs):
    b = h.body()
    name = expect(b, "name", "str", required=True).strip()
    if not name:
        raise Invalid("empty list name")
    lid = uid("L_")
    conn.execute("INSERT INTO lists (id, user_id, name, created_at) VALUES (?,?,?,?)",
                 (lid, "local", name, now()))
    h.send_json({"id": lid})


def r_patch_list(h, conn, qs, list_id):
    b = h.body()
    if "name" in b:
        conn.execute("UPDATE lists SET name=? WHERE id=?",
                     (expect(b, "name", "str", required=True).strip(), list_id))
    if "note" in b:
        conn.execute("UPDATE lists SET description=? WHERE id=?",
                     (expect(b, "note", "str") or "", list_id))
    if "ranked" in b:
        conn.execute("UPDATE lists SET is_ranked=? WHERE id=?",
                     (1 if expect(b, "ranked", "bool") else 0, list_id))
    h.send_json({"ok": True})


def r_delete_list(h, conn, qs, list_id):
    conn.execute("DELETE FROM lists WHERE id=?", (list_id,))
    h.send_json({"ok": True})


def r_add_list_item(h, conn, qs, list_id):
    b = h.body()
    mid = expect(b, "mediaId", "str", required=True)
    pos = conn.execute("SELECT COALESCE(MAX(position)+1, 0) AS p FROM list_items WHERE list_id=?",
                       (list_id,)).fetchone()["p"]
    conn.execute("INSERT OR IGNORE INTO list_items (list_id, media_item_id, position) VALUES (?,?,?)",
                 (list_id, mid, pos))
    h.send_json({"ok": True})


def r_patch_list_item(h, conn, qs, list_id, media_id):
    b = h.body()
    if "note" in b:
        conn.execute("UPDATE list_items SET note=? WHERE list_id=? AND media_item_id=?",
                     (expect(b, "note", "str") or "", list_id, media_id))
    h.send_json({"ok": True})


def r_move_list_item(h, conn, qs, list_id, media_id):
    b = h.body()
    d = expect(b, "dir", "int", required=True, lo=-1, hi=1)
    rows = conn.execute("SELECT media_item_id, position FROM list_items WHERE list_id=? ORDER BY position",
                        (list_id,)).fetchall()
    idx = next((i for i, r in enumerate(rows) if r["media_item_id"] == media_id), None)
    if idx is None or not (0 <= idx + d < len(rows)):
        h.send_json({"ok": True})
        return
    a, bb = rows[idx], rows[idx + d]
    conn.execute("UPDATE list_items SET position=? WHERE list_id=? AND media_item_id=?",
                 (bb["position"], list_id, a["media_item_id"]))
    conn.execute("UPDATE list_items SET position=? WHERE list_id=? AND media_item_id=?",
                 (a["position"], list_id, bb["media_item_id"]))
    h.send_json({"ok": True})


def r_del_list_item(h, conn, qs, list_id, media_id):
    conn.execute("DELETE FROM list_items WHERE list_id=? AND media_item_id=?", (list_id, media_id))
    h.send_json({"ok": True})


def r_stats(h, conn, qs):                            # STAT-001…004 via SQL (STAT-005)
    years = [r["y"] for r in conn.execute(
        "SELECT DISTINCT substr(logged_date,1,4) AS y FROM log_entries ORDER BY y DESC")]
    want = qs.get("year", "latest")
    year = ("all" if want == "all" else (want if want in years else (years[0] if years else "all")))
    heat_year = year if year != "all" else (years[0] if years else str(date.today().year))
    hist_all = qs.get("hist") == "all" or year == "all"

    yr = (year,)
    counts = {t: 0 for t in TYPES}
    sql = """SELECT m.media_type AS t, COUNT(*) AS n FROM library_entries e
             JOIN media_items m ON m.id = e.media_item_id
             WHERE e.status='completed' {} GROUP BY m.media_type"""
    rows = conn.execute(sql.format("" if year == "all" else "AND substr(e.finished_at,1,4)=?"),
                        () if year == "all" else yr)
    for r in rows:
        counts[r["t"]] = r["n"]

    buckets = [0] * 10
    sql = "SELECT rating AS r, COUNT(*) AS n FROM log_entries WHERE rating IS NOT NULL {} GROUP BY rating"
    rows = conn.execute(sql.format("" if hist_all else "AND substr(logged_date,1,4)=?"),
                        () if hist_all else yr)
    for r in rows:
        buckets[r["r"] - 1] = r["n"]

    heat = {r["d"]: r["n"] for r in conn.execute(
        """SELECT logged_date AS d, COUNT(*) AS n FROM log_entries
           WHERE substr(logged_date,1,4)=? GROUP BY logged_date""", (heat_year,))}

    scope = "" if year == "all" else "AND substr(l.logged_date,1,4)=?"
    args = () if year == "all" else yr
    top_genres = [[r["g"], r["n"]] for r in conn.execute(
        f"""SELECT j.value AS g, COUNT(*) AS n FROM log_entries l
            JOIN media_items m ON m.id = l.media_item_id, json_each(m.genres) j
            WHERE 1=1 {scope} GROUP BY j.value ORDER BY n DESC, g LIMIT 6""", args)]
    top_creators = [[r["c"], r["n"]] for r in conn.execute(
        f"""SELECT (SELECT j.value FROM json_each(m.creators) j LIMIT 1) AS c, COUNT(*) AS n
            FROM log_entries l JOIN media_items m ON m.id = l.media_item_id
            WHERE 1=1 {scope} GROUP BY c ORDER BY n DESC, c LIMIT 6""", args)]

    h.send_json({"years": years, "year": year, "heatYear": heat_year, "histAll": hist_all,
                 "counts": counts, "buckets": buckets, "heat": heat,
                 "topGenres": top_genres, "topCreators": top_creators})


def r_export_json(h, conn, qs):                      # DATA-002
    state = full_state(conn)
    state["exportedAt"] = now()
    state["format"] = "vault-prototype/1"
    h.send_bytes(json.dumps(state, indent=2).encode(), "application/json",
                 download="vault-export.json")


def r_export_csv(h, conn, qs):                       # DATA-003
    t = qs.get("type")
    if t not in TYPES:
        raise Invalid("type must be one of movie/show/book/game")
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["title", "year", "creator", "status", "qualifier", "rating_x10",
                "favorite", "added_at", "started_at", "finished_at"])
    for r in conn.execute(
            """SELECT m.title, m.release_year, m.creators, e.status, e.qualifier, e.rating,
                      e.is_favorite, e.added_at, e.started_at, e.finished_at
               FROM library_entries e JOIN media_items m ON m.id = e.media_item_id
               WHERE m.media_type=? ORDER BY m.title""", (t,)):
        w.writerow([r["title"], r["release_year"], list(json.loads(r["creators"]).values())[0],
                    r["status"], r["qualifier"] or "", r["rating"] or "",
                    r["is_favorite"], r["added_at"], r["started_at"] or "", r["finished_at"] or ""])
    h.send_bytes(buf.getvalue().encode(), "text/csv", download=f"vault-{t}s.csv")


def r_image(h, conn, qs, rest):                      # SEC-001: containment or 404
    base = IMAGES_DIR.resolve()
    target = (base / rest).resolve()
    if not target.is_relative_to(base) or not target.is_file():
        h.send_json({"error": "not found"}, 404)
        return
    h.send_bytes(target.read_bytes(), "image/svg+xml")


def r_static(h, conn, qs):
    path = urlparse(h.path).path
    name = "index.html" if path == "/" else path.lstrip("/")
    base = WEB_DIR.resolve()
    target = (base / name).resolve()
    if not target.is_relative_to(base) or not target.is_file():
        h.send_json({"error": "not found"}, 404)
        return
    ctype = {"html": "text/html; charset=utf-8", "js": "text/javascript",
             "jsx": "text/plain; charset=utf-8", "css": "text/css"}.get(
        target.suffix.lstrip("."), "application/octet-stream")
    h.send_bytes(target.read_bytes(), ctype)


ROUTES = [
    (r"/api/state",                              "GET",    r_state),
    (r"/api/search",                             "GET",    r_search),
    (r"/api/library",                            "POST",   r_add_library),
    (r"/api/entries/([^/]+)",                    "PATCH",  r_patch_entry),
    (r"/api/entries/([^/]+)/tags",               "POST",   r_add_tag),
    (r"/api/entries/([^/]+)/tags/([^/]+)",       "DELETE", r_del_tag),
    (r"/api/logs",                               "POST",   r_add_log),
    (r"/api/media/([^/]+)/refresh",              "POST",   r_refresh),
    (r"/api/lists",                              "POST",   r_create_list),
    (r"/api/lists/([^/]+)",                      "PATCH",  r_patch_list),
    (r"/api/lists/([^/]+)",                      "DELETE", r_delete_list),
    (r"/api/lists/([^/]+)/items",                "POST",   r_add_list_item),
    (r"/api/lists/([^/]+)/items/([^/]+)/move",   "POST",   r_move_list_item),
    (r"/api/lists/([^/]+)/items/([^/]+)",        "PATCH",  r_patch_list_item),
    (r"/api/lists/([^/]+)/items/([^/]+)",        "DELETE", r_del_list_item),
    (r"/api/stats",                              "GET",    r_stats),
    (r"/api/export/json",                        "GET",    r_export_json),
    (r"/api/export/csv",                         "GET",    r_export_csv),
    (r"/api/images/(.+)",                        "GET",    r_image),
    (r"/(?!api/).*",                             "GET",    r_static),
]


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8377
    init_db()
    print(f"\nVAULT prototype server · http://localhost:{port}")
    print(f"· database  {DB_PATH}")
    print(f"· images    {IMAGES_DIR}  (served via /api/images, SEC-001 guarded)")
    print(f"· exports   /api/export/json · /api/export/csv?type=movie|show|book|game\n")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
