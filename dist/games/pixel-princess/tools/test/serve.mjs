// serve.mjs — gate for the dev server's path filter (tools/serve.py).
//
// The dev server binds every interface on purpose (the iPhone on the LAN must reach it), and it
// serves the PROJECT ROOT — where `.env` holds VERCEL_TOKEN and LB_ADMIN_TOKEN. Before the
// 2026-09-18 security review, `GET /.env` answered 200 to anyone on the same Wi-Fi. The fix is a
// two-gate filter in serve.py (decoded URL + canonical on-disk path); this gate keeps it honest:
//   • every private spelling the review and its adversarial re-check found → 403, including the
//     Windows-only ones (case variants, trailing dots/spaces, which Win32 strips when opening);
//   • directory listings → 403;
//   • everything the game actually loads → 200 with the right MIME type (a filter that broke
//     module loading would "pass" a security check while killing the game).
//
// It starts its OWN server on a dedicated port (so it never collides with the 8137 one the browser
// suites need) and talks raw HTTP through node:http: fetch() would normalise `/./.env` or
// `/a/../.env` before sending, hiding exactly the spellings under test.
//
// Usage:  node tools/test/serve.mjs        Exit code 0 = all pass, 1 = a failure.
// Python: PJ_PYTHON if set, else `python`, else `python3` (CI images ship only the latter).

import { spawn, spawnSync } from "node:child_process";
import { request } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVE = join(HERE, "..", "serve.py");
const PORT = Number(process.env.PJ_SERVE_TEST_PORT || 8149);

function pickPython() {
  const candidates = [process.env.PJ_PYTHON, "python", "python3"].filter(Boolean);
  for (const exe of candidates) {
    const r = spawnSync(exe, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return exe;
  }
  return null;
}

// One raw request; resolves {status, type}. `path` goes on the request line untouched.
function probe(method, path) {
  return new Promise((resolve) => {
    const req = request({ host: "127.0.0.1", port: PORT, method, path }, (res) => {
      res.resume();
      res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"] || "" }));
    });
    req.on("error", (e) => resolve({ status: 0, type: "", error: e.message }));
    req.end();
  });
}

async function waitUp(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if ((await probe("HEAD", "/index.html")).status === 200) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

const python = pickPython();
if (!python) {
  console.error("FAIL — no python interpreter found (set PJ_PYTHON)");
  process.exit(1);
}

const server = spawn(python, [SERVE, String(PORT)], { stdio: "ignore" });
const results = [];
const check = (name, ok, extra = "") => results.push({ name, ok: !!ok, extra });

try {
  if (!(await waitUp(8000))) throw new Error(`server did not come up on :${PORT}`);

  // Must be refused. Grouped by the trick each one uses.
  const PRIVATE = [
    // the secrets themselves
    "/.env",
    "/.env.local",
    "/.vercel/project.json",
    "/.git/config",
    "/.git/HEAD",
    "/.claude/settings.local.json",
    // encodings / relative spellings (gate 1 decodes + normalises)
    "/%2eenv",
    "/%2Eenv",
    "/./.env",
    "/src/../.env",
    "/src%2f..%2f.env",
    "/src/..%5c.env",
    "/.env?x=1",
    // Windows filesystem quirks (gate 2 resolves the canonical path)
    "/.ENV",
    "/.env.",
    "/TOOLS/serve.py",
    "/Api/leaderboard.js",
    "/tools./serve.py",
    "/api./leaderboard.js",
    "/tools%20/serve.py",
    "/TOOLS.%20/serve.py",
    // private folders + their listings
    "/tools/",
    "/tools/deploy.mjs",
    "/api/leaderboard.js",
    "/types/globals.d.ts",
    "/node_modules/",
    // escaping the root
    "/../../Windows/win.ini",
    "/%2e%2e/%2e%2e/etc/passwd",
  ];
  for (const p of PRIVATE) {
    const r = await probe("GET", p);
    check(`GET ${p} refused`, r.status === 403 || r.status === 404 || r.status === 400, `status ${r.status}`);
  }
  // The ones that matter most must be an explicit 403, not an accidental 404.
  for (const p of ["/.env", "/.env.local", "/TOOLS/serve.py", "/tools./serve.py"]) {
    const r = await probe("GET", p);
    check(`GET ${p} is 403`, r.status === 403, `status ${r.status}`);
  }
  const head = await probe("HEAD", "/.env");
  check("HEAD /.env refused", head.status === 403, `status ${head.status}`);

  // Listings of public folders are refused too (a map of the repo for whoever probes).
  for (const p of ["/src/", "/assets/"]) {
    const r = await probe("GET", p);
    check(`listing ${p} refused`, r.status === 403, `status ${r.status}`);
  }

  // Everything the game needs still loads, with module-safe MIME types.
  const PUBLIC = [
    ["/", /text\/html/],
    ["/index.html", /text\/html/],
    ["/style.css", /text\/css/],
    ["/sw.js", /text\/javascript/],
    ["/manifest.webmanifest", /application\/manifest\+json/],
    ["/src/main.js", /text\/javascript/],
    ["/src/i18n/it.js", /text\/javascript/],
    ["/vendor/kaplay-3001.0.19.mjs", /text\/javascript/],
    ["/assets/icons/icon-192.png", /image\/png/],
  ];
  for (const [p, type] of PUBLIC) {
    const r = await probe("GET", p);
    check(`GET ${p} served`, r.status === 200 && type.test(r.type), `status ${r.status} ${r.type}`);
  }
} catch (e) {
  check("dev server probe", false, e.message);
} finally {
  server.kill();
}

let failed = 0;
for (const { name, ok, extra } of results) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
