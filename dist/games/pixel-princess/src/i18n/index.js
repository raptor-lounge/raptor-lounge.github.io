// i18n/index.js — the tiny localisation runtime (Italian source, English translation).
//
// WHY THIS EXISTS: the game shipped Italian-only, with ~130 user-facing strings baked into 14
// files. It is a time-attack with a GLOBAL leaderboard and a share button whose whole job is to
// hand the link to someone else — so the link travels, and whoever opens it outside Italy used to
// understand nothing. Two languages, one dictionary per language, zero build step.
//
// HOW IT RESOLVES THE LANGUAGE (first hit wins):
//   1. `?lang=it|en` — an explicit override, NOT persisted (same convention as ?maxfps= / ?fps= /
//      ?audiodebug=). It is also what the test suite and a quick check on a phone use.
//   2. `localStorage["pj.lang"]` — her own choice, made in Impostazioni.
//   3. `navigator.languages` / `navigator.language` — anything Italian gets Italian, everything
//      else gets English. English is the fallback for the world, Italian is the source of truth
//      for the text (a missing key falls back to `it`, then to the key itself, which is loud).
//
// TWO KINDS OF STRING, TWO PATHS:
//   • DOM (index.html) — markup carries `data-i18n*` attributes and `applyDomStrings()` paints
//     them. That runs again on every language change, so the overlays retranslate in place.
//   • Canvas (Kaplay `k.text`) — call sites use `t(key)`. Canvas text is COOKED INTO THE SCENE
//     GRAPH when the scene is built, so changing language requires re-entering the scene. That is
//     why the language switch is menu-only (see src/ui/settings.js) — from the pause menu it would
//     have to rebuild the level and would throw her back to the last checkpoint.
//
// Anything the DOM can't paint by attribute (the audio button's aria-label, which its own paint()
// owns) subscribes via `onLangChange`.

import { it } from "./it.js";
import { en } from "./en.js";

const DICTS = { it, en };
const FALLBACK = "it"; // the source language: every key exists here by definition
const STORE_KEY = "pj.lang";

let lang = FALLBACK;
const listeners = [];

// Guarded storage, same reason as src/state.js: Safari private mode throws on localStorage.
function read() {
  try {
    return window.localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}
function write(value) {
  try {
    window.localStorage.setItem(STORE_KEY, value);
  } catch {
    // The choice just won't survive the session — never break the game over a preference.
  }
}

function known(code) {
  return typeof code === "string" && Object.prototype.hasOwnProperty.call(DICTS, code);
}

/** Resolve the language to start in. See the priority list in the header. */
function detect() {
  let override = null;
  try {
    override = new URLSearchParams(location.search).get("lang");
  } catch {
    override = null;
  }
  if (known(override)) return override;

  const saved = read();
  if (known(saved)) return saved;

  const tags = navigator.languages?.length ? navigator.languages : [navigator.language || ""];
  for (const tag of tags) {
    const base = String(tag).toLowerCase().split("-")[0]; // "it-CH" → "it"
    if (known(base)) return base;
  }
  return "en"; // not an Italian speaker and no dictionary matched → English
}

/** The active language code ("it" | "en"). */
export function getLang() {
  return lang;
}

/** Every language this build ships, in menu order. */
export function getLangs() {
  return Object.keys(DICTS);
}

/**
 * Look a key up in the active dictionary, interpolating `{name}` placeholders.
 * Falls back to Italian (the source), then to the key itself — an unresolved key shows up as
 * `menu.newGame` on screen and in the tests, which is exactly the noise a missing string deserves.
 */
export function t(key, vars) {
  const s = DICTS[lang]?.[key] ?? DICTS[FALLBACK][key] ?? key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}

/**
 * Paint every translatable node under `root`. Four attributes, one per destination:
 *   data-i18n             → textContent  (the common case)
 *   data-i18n-html        → innerHTML    (prose with <br>/<strong>/<span> — the VALUES COME FROM
 *                                         OUR OWN DICTIONARIES, never from user input)
 *   data-i18n-aria        → aria-label
 *   data-i18n-placeholder → placeholder
 * Nodes that host a live <span> (a score, a count) keep the static half in its own span, so
 * painting the label can never blow the live element away.
 */
export function applyDomStrings(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  root.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
}

/** Subscribe to language changes (for text no `data-i18n` attribute can reach). */
export function onLangChange(fn) {
  if (typeof fn === "function") listeners.push(fn);
}

/**
 * Switch language, persist it, and repaint every DOM string.
 * Returns true when something actually changed — the caller (the settings overlay) uses that to
 * decide whether the CANVAS needs rebuilding, since scene text can't be repainted in place.
 */
export function setLang(code) {
  if (!known(code) || code === lang) return false;
  lang = code;
  write(code);
  document.documentElement.lang = code;
  applyDomStrings();
  listeners.forEach((fn) => fn(code));
  return true;
}

/** Resolve + apply the starting language. Call once, before any scene is built. */
export function initI18n() {
  lang = detect();
  document.documentElement.lang = lang;
  applyDomStrings();
  return lang;
}
