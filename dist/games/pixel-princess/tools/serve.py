#!/usr/bin/env python3
"""Tiny static dev server with correct MIME types for ES modules — and a path filter.

WHY THE MIME OVERRIDES
Python's built-in `python -m http.server` reads MIME types from the Windows registry,
which often maps `.js` to `text/plain`. Browsers enforce strict MIME checking for ES
module scripts and refuse to run them, so the game silently fails to load. This server
forces the JavaScript/CSS/wasm types so `import` works everywhere.

WHY THE PATH FILTER (security review, 2026-09-18 — finding F2)
The server binds every interface (`""` → 0.0.0.0) ON PURPOSE: the developer plays the
game from an iPhone over Wi-Fi, so it must be reachable from the LAN. Keep that bind.
But it serves the PROJECT ROOT with `SimpleHTTPRequestHandler`, which hands out any
file it can read and renders a directory listing when there is no index.html. Verified
during the review: `GET /.env` (VERCEL_TOKEN + LB_ADMIN_TOKEN), `/.env.local`,
`/.vercel/project.json`, `/.git/config` and the listing of `/tools/` all answered 200
to anyone on the same network — every secret the deploy pipeline uses, one curl away.
Python's stock handler only filters `..`; it does not treat dotfiles as private.

The fix is a deny-list applied in `send_head`, which is the single choke point for both
GET and HEAD (do_GET/do_HEAD both call it), so nothing is streamed before the check:
  * any path component that starts with "." → 403. That covers `.env*`, `.git/`,
    `.vercel/`, `.claude/`, `.github/`, `..` and `.` alike (there is nothing legitimate
    to serve under a dot-name; index.html/style.css/sw.js/manifest.webmanifest/src/
    assets/vendor/jsconfig.json are all untouched).
  * a first component of `tools`, `node_modules`, `api` or `types` → 403. The game needs
    none of them; `tools/` holds the deploy/test scripts, `api/` the serverless function
    source (its secrets come from env vars, but its source still describes the admin
    route).
  * `list_directory` → 403. Listings are a map of the repo for whoever is probing;
    `/` still serves index.html because `send_head` looks for the index BEFORE it
    falls back to a listing.
The check runs on the DECODED, normalised URL path — the same transformation
`translate_path` applies (`unquote` + posix normpath + split on "/") — so `%2eenv`,
`/./.env`, backslash separators and `a/../.env` cannot slip past a naive string match
on the raw request line. It is a deny-list rather than an allow-list only so that a
new top-level asset folder keeps working without touching this file; the sensitive
names are stable, the public ones are not.

TWO GATES, NOT ONE (found by the adversarial re-check of the first patch). A URL-string
deny-list alone is bypassable on Windows, because the FILESYSTEM, not the URL, decides
what opens: NTFS is case-insensitive (`/TOOLS/serve.py`, `/Api/leaderboard.js` served
200) and Win32 strips trailing dots and spaces from every path component
(`/tools./serve.py`, `/api./leaderboard.js` served 200 too). So the name comparison is
case-folded with trailing `. ` stripped, AND `send_head` re-checks the path the OS would
actually open: `os.path.realpath(translate_path(url))`, which returns the canonical
on-disk spelling (true case, dots stripped, `..`/symlinks resolved), must lie under ROOT
and must not have a private component. Whatever spelling a client invents, the second
gate sees the file it would really get. The dotfile rule survives on its own — a leading
"." is never stripped by Win32 — but it goes through the same gate for uniformity.
8.3 short names (`ENV~1`) are not a hole here: the volume has them disabled (`dir /x`
shows none); the realpath gate would resolve them to the long name anyway.

Usage:  python tools/serve.py [port]   (default 8080)
Then open http://localhost:<port>
"""

import os
import posixpath
import sys
from functools import partial
from http.server import HTTPStatus, SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

# Serve the project root (parent of this tools/ dir), regardless of where it's launched.
ROOT = Path(__file__).resolve().parent.parent

# Top-level folders the browser never needs. Dot-names are refused generically below.
PRIVATE_TOP_LEVEL = frozenset({"tools", "node_modules", "api", "types"})


def has_private_component(parts) -> bool:
    """True when any component is a dot-name or the first one is a private folder.

    Names are compared the way Win32 opens them: case-folded, trailing dots/spaces
    stripped (`TOOLS.` opens `tools`). A leading "." is never stripped, so the dotfile
    rule keys on the raw component."""
    parts = [p for p in parts if p]
    if not parts:
        return False  # "/" → index.html (or a 403'd listing if index.html vanished)
    if any(p.startswith(".") for p in parts):
        return True
    return parts[0].rstrip(". ").lower() in PRIVATE_TOP_LEVEL


def is_private_path(raw_path: str) -> bool:
    """Gate 1 — the URL. True when the request path must be refused. Mirrors
    translate_path's decoding so encoded/relative spellings collapse first."""
    path = raw_path.split("?", 1)[0].split("#", 1)[0]
    # Decode %2e & co. BEFORE inspecting components; os.path.join on Windows would also
    # honour a backslash as a separator, so treat it as one here too.
    path = unquote(path).replace("\\", "/")
    path = posixpath.normpath(path)
    return has_private_component(path.split("/"))


def is_private_file(fs_path: str) -> bool:
    """Gate 2 — the filesystem. True when the file the OS would actually open is outside
    ROOT or has a private component in its CANONICAL on-disk path (realpath resolves
    case, trailing dots/spaces, `..` and symlinks — everything the URL check cannot see)."""
    real = Path(os.path.realpath(fs_path))
    try:
        rel = real.relative_to(ROOT)
    except ValueError:
        return True  # escaped the project root, whatever the spelling
    return has_private_component(rel.parts)


class Handler(SimpleHTTPRequestHandler):
    # Override the registry-derived types that break module loading on Windows.
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".webmanifest": "application/manifest+json",
        ".wasm": "application/wasm",
        ".svg": "image/svg+xml",
    }

    def send_head(self):
        # One choke point for GET and HEAD: refuse before any file is opened.
        # Gate 1: the decoded URL. Gate 2: the canonical file it maps to (see header —
        # on Windows `/TOOLS./serve.py` is a different string but the same file).
        if is_private_path(self.path) or is_private_file(self.translate_path(self.path)):
            self.send_error(HTTPStatus.FORBIDDEN, "Private path")
            return None
        return super().send_head()

    def list_directory(self, path):
        # Never enumerate the tree. `/` is unaffected: send_head serves index.html first.
        self.send_error(HTTPStatus.FORBIDDEN, "Directory listing disabled")
        return None

    def end_headers(self):
        # No caching during development so edits show up on reload.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    # "" = all interfaces, deliberately: the iPhone on the LAN must reach it (see header).
    httpd = ThreadingHTTPServer(("", port), partial(Handler, directory=str(ROOT)))
    print(f"Serving {ROOT} at http://localhost:{port}  (Ctrl+C to stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
