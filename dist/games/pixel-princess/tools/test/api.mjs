// api.mjs — unit gate for the leaderboard function (api/leaderboard.js) with an IN-MEMORY Redis.
//
// The function is the only server-side code in the project and the only place an attacker can
// write to shared state, so its abuse controls (see the "ABUSE CONTROLS" note atop the function)
// get a gate of their own. No browser, no network, no Vercel: `globalThis.fetch` is replaced by a
// tiny emulator of the dozen Upstash REST commands the function uses, and the handler is called
// with a `{method, query, body, headers}` request and a `res.status().json()` response, exactly
// the shape Vercel's Node runtime hands it.
//
// It asserts what the 2026-09-18 security review proved was missing:
//   • a forged run below the plausibility floor (timeMs: 1) is REJECTED, not ranked #1;
//   • a score above the cap is rejected;
//   • the 6th submission from one IP inside the window is throttled (429), a different IP is not;
//   • a POST whose Origin is another site is refused (403); same-origin and no-Origin pass;
//   • a flood (more than the old MAX_ROWS of 200) no longer evicts honest rows via trim();
//   • every accepted run lands in the audit list with its IP;
//   • GET paging clamps stay in place, GET responses carry the edge-cache header, and DELETE
//     without LB_ADMIN_TOKEN configured still answers 404 (fails closed).
//
// Loading the function: api/leaderboard.js is CommonJS by design (it runs on Vercel WITHOUT the
// repo's package.json, which .vercelignore excludes), but locally that package.json's
// `"type": "module"` makes Node treat every .js as ESM and `require` inside it throws. So the
// source is compiled through `Module.prototype._compile` under a `.cjs` name — same code, no copy.
//
// Usage:  node tools/test/api.mjs        Exit code 0 = all pass, 1 = a failure.

import { readFileSync } from "node:fs";
import { Module } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const API = join(HERE, "..", "..", "api", "leaderboard.js");

// --- In-memory Redis --------------------------------------------------------------------------
const store = { seq: 0, z: [], h: new Map(), lists: new Map(), counters: new Map() };
let commands = 0;
const zsorted = () => store.z.slice().sort((a, b) => a.s - b.s || (a.m < b.m ? -1 : a.m > b.m ? 1 : 0));
function range(start, stop) {
  const arr = zsorted();
  const len = arr.length;
  const norm = (i) => (Number(i) < 0 ? len + Number(i) : Number(i));
  let a = norm(start);
  let b = norm(stop);
  if (a < 0) a = 0;
  if (b >= len) b = len - 1;
  return a > b ? [] : arr.slice(a, b + 1);
}
function exec(cmd) {
  commands++;
  const [op, key, ...args] = cmd;
  switch (op) {
    case "INCR": {
      if (key === "pj:lb:seq") return ++store.seq;
      const n = (store.counters.get(key) || 0) + 1;
      store.counters.set(key, n);
      return n;
    }
    case "EXPIRE":
      return store.counters.has(key) ? 1 : 0;
    case "ZADD": {
      const [s, m] = args;
      const e = store.z.find((x) => x.m === m);
      if (e) {
        e.s = Number(s);
        return 0;
      }
      store.z.push({ m, s: Number(s) });
      return 1;
    }
    case "ZCARD":
      return store.z.length;
    case "ZRANGE": {
      const [a, b, ws] = args;
      const sl = range(a, b);
      return ws ? sl.flatMap((x) => [x.m, String(x.s)]) : sl.map((x) => x.m);
    }
    case "HMGET":
      return args.map((f) => (store.h.has(f) ? store.h.get(f) : null));
    case "HSET":
      store.h.set(args[0], args[1]);
      return 1;
    case "HDEL": {
      let n = 0;
      for (const f of args) if (store.h.delete(f)) n++;
      return n;
    }
    case "ZREMRANGEBYRANK": {
      const rm = new Set(range(args[0], args[1]).map((x) => x.m));
      store.z = store.z.filter((x) => !rm.has(x.m));
      return rm.size;
    }
    case "ZRANK": {
      const i = zsorted().findIndex((x) => x.m === args[0]);
      return i < 0 ? null : i;
    }
    case "ZREM": {
      const n = store.z.length;
      store.z = store.z.filter((x) => x.m !== args[0]);
      return n - store.z.length;
    }
    case "RPUSH": {
      const l = store.lists.get(key) || [];
      l.push(...args);
      store.lists.set(key, l);
      return l.length;
    }
    case "LTRIM": {
      const l = store.lists.get(key) || [];
      const len = l.length;
      const norm = (i) => (Number(i) < 0 ? len + Number(i) : Number(i));
      const a = Math.max(0, norm(args[0]));
      const b = Math.min(len - 1, norm(args[1]));
      store.lists.set(key, a > b ? [] : l.slice(a, b + 1));
      return "OK";
    }
    default:
      throw new Error(`fake redis: unsupported ${op}`);
  }
}
globalThis.fetch = async (_url, init) => ({
  ok: true,
  json: async () => ({ result: exec(JSON.parse(init.body)) }),
});
process.env.UPSTASH_REDIS_REST_URL = "http://fake.invalid";
process.env.UPSTASH_REDIS_REST_TOKEN = "fake";
delete process.env.LB_ADMIN_TOKEN; // DELETE must fail closed in this gate

// --- Load the CommonJS function under an ESM package --------------------------------------
const mod = new Module(API);
mod.filename = `${API}.cjs`;
mod.paths = Module._nodeModulePaths(dirname(API));
mod._compile(readFileSync(API, "utf8"), mod.filename);
const handler = mod.exports;

// --- Tiny request helper -----------------------------------------------------------------
const HOST = "gameforprincess.vercel.app";
function call(method, { query = {}, body, headers = {}, ip = "203.0.113.10" } = {}) {
  return new Promise((resolve) => {
    const hdr = { host: HOST, "x-real-ip": ip, ...headers };
    const out = { headers: {} };
    const res = {
      setHeader(k, v) {
        out.headers[k.toLowerCase()] = v;
      },
      status(c) {
        out.code = c;
        return this;
      },
      json(o) {
        out.body = o;
        resolve(out);
      },
    };
    handler({ method, query, body, headers: hdr }, res);
  });
}
const post = (nickname, score, timeMs, extra = {}) => call("POST", { body: { nickname, score, timeMs }, ...extra });

const results = [];
const check = (name, ok, extra = "") => results.push({ name, ok: !!ok, extra });

// --- The gate -----------------------------------------------------------------------------
// Three honest runs from three different players/IPs.
const honest = [
  ["Anna", 12100, 160831, "198.51.100.1"],
  ["vvvvvitoo", 12300, 169060, "198.51.100.2"],
  ["Anna", 11000, 175320, "198.51.100.3"],
];
for (const [n, s, t, ip] of honest) {
  const r = await post(n, s, t, { ip });
  check(`honest run accepted (${n} ${t}ms)`, r.code === 200 && r.body.ok === true, `code ${r.code}`);
}

let r = await post("h4x", 12000, 1, { ip: "203.0.113.20" });
check("forged timeMs=1 rejected (400)", r.code === 400, `code ${r.code}`);
r = await post("h4x", 12000, 59999, { ip: "203.0.113.20" });
check("timeMs just under the floor rejected (400)", r.code === 400, `code ${r.code}`);
r = await post("h4x", 9999999, 170000, { ip: "203.0.113.20" });
check("score above cap rejected (400)", r.code === 400, `code ${r.code}`);
r = await call("GET", {});
check("forged runs are not on the board", !r.body.rows.some((x) => x.name === "h4x"));
check("fastest honest run is #1", r.body.rows[0]?.name === "Anna" && r.body.rows[0]?.time === 160831);

// Origin: browsers send it on every cross-origin POST; only our own page may submit.
r = await post("evil", 100, 170000, { ip: "203.0.113.30", headers: { origin: "https://evil.example" } });
check("cross-origin POST refused (403)", r.code === 403, `code ${r.code}`);
r = await post("ok", 100, 170000, { ip: "203.0.113.31", headers: { origin: `https://${HOST}` } });
check("same-origin POST accepted", r.code === 200, `code ${r.code}`);
r = await post("cli", 100, 170000, { ip: "203.0.113.32" });
check("POST with no Origin (curl) accepted", r.code === 200, `code ${r.code}`);

// Rate limit: RL_POST (5) per IP per window; the 6th is throttled; another IP is unaffected.
// (Rejected 400s above already counted against 203.0.113.20: 3 so far.)
const codes = [];
for (let i = 0; i < 4; i++) codes.push((await post("spam", 100, 170000, { ip: "203.0.113.20" })).code);
check("6th POST from one IP throttled (429)", codes[0] === 200 && codes[1] === 200 && codes[2] === 429 && codes[3] === 429, codes.join(","));
r = await post("other", 100, 170000, { ip: "203.0.113.21" });
check("different IP not throttled", r.code === 200, `code ${r.code}`);
check("rate-limit key got an EXPIRE", store.counters.has("pj:lb:rl:post:203.0.113.20"));

// Flood from many IPs: 300 plausible-but-fake runs (more than the old MAX_ROWS of 200) must NOT
// evict the honest rows any more — the damage cap is MAX_ROWS = 1000.
for (let i = 1; i <= 300; i++) await post(`bot${i}`, 100, 60000 + i, { ip: `10.0.${Math.floor(i / 250)}.${i % 250}` });
let all = [];
r = await call("GET", { query: { limit: "50" } });
for (let off = 0; off < r.body.total; off += 50) {
  all.push(...(await call("GET", { query: { limit: "50", offset: String(off) }, ip: `10.9.9.${off % 200}` })).body.rows);
}
const survivors = all.filter((x) => honest.some(([n, , t]) => x.name === n && x.time === t));
check("300-row flood leaves every honest row on the board", survivors.length === honest.length, `${survivors.length}/${honest.length}, total ${r.body.total}`);
check("board total stays under MAX_ROWS", r.body.total <= 1000, `total ${r.body.total}`);

// Audit trail: every accepted run, with its IP.
const log = (store.lists.get("pj:lb:log") || []).map((s) => JSON.parse(s));
check("audit list has one entry per accepted run", log.length === store.seq, `${log.length} vs seq ${store.seq}`);
check("audit entries carry the submitter IP", log.every((e) => typeof e.ip === "string" && e.ip.length > 0));

// Paging + cache header + GET throttle.
r = await call("GET", { query: { limit: "999", offset: "-5" }, ip: "203.0.113.40" });
check("limit/offset clamped", r.body.limit === 50 && r.body.offset === 0, JSON.stringify({ limit: r.body.limit, offset: r.body.offset }));
check("GET carries the edge-cache header", /s-maxage=\d+/.test(String(r.headers["cache-control"])), String(r.headers["cache-control"]));
const getCodes = [];
for (let i = 0; i < 61; i++) getCodes.push((await call("GET", { ip: "203.0.113.50" })).code);
check("61st GET from one IP throttled (429)", getCodes[59] === 200 && getCodes[60] === 429, `#60=${getCodes[59]} #61=${getCodes[60]}`);
commands = 0;
await call("GET", { ip: "203.0.113.51" });
check("one GET costs ≤ 5 Redis commands", commands <= 5, `${commands}`);

// Nickname sanitiser (also what makes ":" a safe member separator).
r = await post("<img src=x onerror=alert(1)>", 100, 170000, { ip: "203.0.113.60" });
const mine = r.body.rows.find((x) => x.id === r.body.id);
check("nickname stripped of markup", mine?.name === "img srcx onerror", JSON.stringify(mine?.name));
r = await post("a:b:c", 100, 170000, { ip: "203.0.113.61" });
check("':' never reaches a member", r.body.rows.find((x) => x.id === r.body.id)?.name === "abc");

// DELETE fails closed with no admin token configured.
r = await call("DELETE", { body: { id: 1 }, headers: { "x-admin-token": "anything" } });
check("DELETE without LB_ADMIN_TOKEN answers 404", r.code === 404, `code ${r.code}`);

// --- Report ------------------------------------------------------------------------------
let failed = 0;
for (const { name, ok, extra } of results) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
