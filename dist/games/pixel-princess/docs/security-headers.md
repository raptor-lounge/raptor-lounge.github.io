# Security headers (`vercel.json`)

Why this file exists: `vercel.json` is JSON and cannot carry the "why" comment the repo puts at
the top of every file. This is that comment. `docs/` is in `.vercelignore`, so it never ships.

**Symptom (security review, 2026-09-18):** `curl -sI https://gameforprincess.vercel.app` showed
only `Strict-Transport-Security` (Vercel adds it). No CSP, no `X-Content-Type-Options`, no
`X-Frame-Options`, no `Referrer-Policy`, no `Permissions-Policy`. **Root cause:** `vercel.json`
only ever set `Cache-Control`. **Fix:** one `"source": "/(.*)"` block, placed FIRST. Vercel
applies every matching block and merges by key, so the per-path `Cache-Control` entries below it
are unaffected (different key) and must stay exactly as they are.

## The headers

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | see below | The game is a same-origin, no-build static site with one same-origin API. Everything it needs is `'self'`, so a stray `<script>` (XSS via a future bug, a compromised dependency, a browser extension injecting into the page) cannot load or beacon anywhere. |
| `X-Content-Type-Options` | `nosniff` | Stops the browser MIME-sniffing a response into a script/stylesheet. The ES-module loader already refuses non-JS MIME types, but the CSS/font/manifest paths gain the same guarantee. |
| `X-Frame-Options` | `DENY` | Legacy twin of `frame-ancestors 'none'` for browsers that ignore CSP framing. No one has a reason to embed the game in an iframe; framing is the clickjacking vector for the leaderboard submit button. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | The WhatsApp share (`window.open`) and any outbound link only learn the origin, never the path/query (`?lang=`, `?maxfps=`, `?fps=`). Same-origin requests keep the full referrer for the API. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | The game uses none of these; denying them means even an injected script cannot prompt for them. Fullscreen, gamepad, autoplay etc. are deliberately NOT restricted (Kaplay may use gamepad; autoplay policy is what `audioUnlock.js` fights already). |

## The CSP, directive by directive

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
media-src 'self' blob:;
connect-src 'self';
font-src 'self';
worker-src 'self';
manifest-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none'
```

| Directive | What in the code needs it |
|---|---|
| `script-src 'self'` | `index.html` has exactly one `<script type="module" src="./src/main.js">`; every module and the vendored `vendor/kaplay-3001.0.19.mjs` are same-origin. No inline script, no `on*=` handlers, no `javascript:` URLs. **Kaplay does not use `eval`, `new Function`, `importScripts`, `WebAssembly` or `new Worker`** (grep counts all 0, see audit), so no `'unsafe-eval'` and no `wasm-unsafe-eval`. |
| `style-src 'self' 'unsafe-inline'` | `style.css` is same-origin. All runtime styling in `src/` goes through the CSSOM (`el.style.x = …`, `Object.assign(el.style, {…})`, `ta.style.cssText = …` in `shareButton.js`, `canvas.style.width` in `viewportResync.js`) and Kaplay does the same (`canvas.style.cssText`, `document.body.style.*`) — the CSSOM is NOT governed by `style-src`, so strictly nothing needs `'unsafe-inline'` today. It is kept as headroom because `data-i18n-html` strings are painted via `innerHTML` and a future `<span style="">` in a dictionary string would otherwise silently lose its styling. Tightening candidate once verified in a browser: drop `'unsafe-inline'`. |
| `img-src 'self' data: blob:` | Sprites/atlas/icons come from `assets/` via `new Image` (Kaplay `loadSprite`, `crossOrigin="anonymous"`, same-origin). **`data:` is REQUIRED**: Kaplay ships its built-in bitmap font and the default "bean" sprite as `data:image/png;base64,…` constants (three of them) and loads them through the same `new Image` path; without `data:` the loading-scene fallback font and any debug draw would fail. `blob:` is unused today (Kaplay's `URL.createObjectURL` is only in its download helper); kept for headroom. |
| `media-src 'self' blob:` | Kaplay's `loadMusic`/streaming path is `new Audio(url)`; the game's `loadSound` path does not use it (see `connect-src`), but `media-src 'self'` keeps that door open at zero cost. `blob:` unused today. |
| `connect-src 'self'` | `src/leaderboard.js` → `fetch("/api/leaderboard…")` (same-origin). Kaplay `loadSound` → `fetch(url).arrayBuffer()` → `AudioContext.decodeAudioData` (same-origin `assets/audio/*.wav`). `sw.js` → `fetch(req)` on same-origin requests only (`/api/*` bypassed, never cached). `audioUnlock.js` builds a 1-sample buffer in memory (no network). No analytics, no CDN, no third-party endpoint anywhere. |
| `font-src 'self'` | `style.css` `@font-face { src: url("assets/fonts/PixelifySans.woff2") }` and Kaplay `loadFont` → `new FontFace(name, url(assets/fonts/PixelifySans.woff2))`. No Google Fonts, no `@import`. |
| `worker-src 'self'` | `main.js` registers `./sw.js` (prod only). No `new Worker`/`SharedWorker`/`AudioWorklet` in app or vendor code. |
| `manifest-src 'self'` | `<link rel="manifest" href="./manifest.webmanifest">`; its icons are `assets/icons/*` (same-origin). |
| `frame-ancestors 'none'` | Nobody embeds the game; pairs with `X-Frame-Options: DENY`. |
| `base-uri 'self'` | No `<base>` tag; blocks an injected one from rebasing `./src/main.js`. |
| `form-action 'self'` | There is no `<form>`; the nickname input submits via `fetch`. Defence in depth. |
| `object-src 'none'` | No plugins, ever. |

### Things CSP does NOT govern (so they keep working)

- `window.open("https://api.whatsapp.com/send?…", "_blank", "noopener,noreferrer")` in
  `src/ui/receipt.js` is a **navigation**, not a fetch: CSP has no shipped directive for it
  (`navigate-to` was dropped from CSP3). It is the only cross-origin URL in `src/`.
- `navigator.share()` / `navigator.clipboard` (`src/ui/shareButton.js`): OS-level APIs, not
  resource loads.
- The `og:url` / `og:image` absolute URLs in `index.html` are metadata read by link-preview
  crawlers; the browser never fetches them.
- Kaplay's `canvas.toDataURL()` (screenshot) produces a string; it does not load anything.

## Audit that produced the policy (2026-09-18, by reading code; not run in a browser)

App code (`src/`, `style.css`, `index.html`, `sw.js`, `manifest.webmanifest`):

- External URLs: only `og:*` meta in `index.html` and `api.whatsapp.com` in `receipt.js` (navigation).
- `data:` / `blob:` / `createObjectURL`: none.
- Inline `<script>` / `<style>` / `style=""` / `on*=` / `<form>` / `<base>` / `http-equiv`: none.
- `@font-face`: one, same-origin. `@import`: none.
- `new Worker` / `WebAssembly` / `eval` / `new Function` / `importScripts` / `AudioWorklet`: none.
- `setAttribute("style", …)`: none (only `aria-label`, `placeholder`, `readonly`).
- `innerHTML`: `i18n/index.js` (dictionary strings only, `data-i18n-html`) and `leaderboard.js`
  (`= ""` to clear a list). No user data.

`vendor/kaplay-3001.0.19.mjs` (minified, `grep -oF | wc -l` counts):

| Pattern | Hits | Verdict |
|---|---|---|
| `createElement("style")`, `innerHTML`, `new Worker`, `eval(`, `new Function`, `importScripts`, `WebAssembly`, `AudioWorklet`, `XMLHttpRequest`, `document.head`, `@font-face` | 0 | nothing to allow |
| `data:` | 7 | 3 embedded `data:image/png;base64` (built-in font + bean sprite) → **`img-src data:`**; 1 regex that detects data: URLs for `loadSound` (decoded in-memory, no load); 1 `data:text/plain` in the debug download helper (anchor click = navigation, unused by the game); 2 are unrelated substrings (`t.data:`) |
| `createObjectURL` | 1 | download helper only (`downloadBlob`), unused by the game |
| `https://` | 4 | `package.json` metadata strings (homepage/bugs/funding/repo), never fetched |
| `fetch(` | 1 | the asset loader → `connect-src 'self'` |
| `new Image` | 4 | 2 real (`loadSprite`, `crossOrigin="anonymous"`), 2 are `new ImageData` |
| `new Audio` | 2 | `loadMusic` / music streaming → `media-src 'self'` (unused by this game) |
| `decodeAudioData` | 2 | `loadSound` from fetched bytes + the built-in "burp" decoded from an in-memory buffer |
| `FontFace` / `document.fonts` | 1 / 2 | `loadFont` → `font-src 'self'` |
| `.style.` / `cssText` | 8 / 1 | all CSSOM (`canvas.style.cssText`, `document.body.style.*`, `canvas.style.cursor`) — allowed regardless of `style-src` |
| `appendChild` | 1 | only when no `canvas` option is passed; `main.js` passes `#game` |

**Widened directives: none.** The baseline proposed in the review already contained everything
the audit found necessary (`img-src data:` being the one non-`'self'` source that is genuinely
load-bearing).

## Known limits / follow-ups

- **Verified in a browser on 2026-09-19** (headless Edge against a protected preview deploy,
  reached with the dev OIDC token in the `x-vercel-trusted-oidc-idp-token` header): boot → menu →
  Classifica (GET `/api/leaderboard`, 5 rows) → a same-origin POST (answered 400 by the
  plausibility floor, so nothing was written) → character select → Livello 1 played until a death
  overlay. A `securitypolicyviolation` listener and the console both recorded **zero**
  violations, and every request went to the deployment's own origin. Not covered by that run:
  the finale, the receipt's WhatsApp button (a navigation, outside CSP anyway) and the service
  worker. The worker could not register on the preview, because its script fetch doesn't carry the
  auth header and hits the SSO redirect. That is a preview-protection artifact, not a CSP one
  (`worker-src 'self'`). Re-check both on production. `npm test` still can't catch a CSP break:
  it runs against `tools/serve.py`, which sends no CSP.
- **Vercel preview toolbar.** On *preview* deployments Vercel may inject its comments toolbar
  (`vercel.live`); `script-src 'self'` blocks it and logs CSP errors. This is expected and does
  not affect production; do not widen the policy for it.
- **Tightening candidates** (only after the browser check): drop `'unsafe-inline'` from
  `style-src`, drop `blob:` from `img-src`/`media-src`. Both are unused by the code today.
- `/api/*` responses get the same headers; harmless for JSON (the CSP is inert on a non-document
  response) and `nosniff` is a plus there.
- The dev server (`tools/serve.py`) does not replicate these headers on purpose: the test suite
  drives the DOM and `window.__pj`, not the network policy.
