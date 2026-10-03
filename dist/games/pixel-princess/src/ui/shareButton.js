// shareButton.js — the "Sfida un amico" button (top-left of the menu).
//
// The game is a time-attack with a global classifica, so the only thing that makes the board
// interesting is other people being on it. Until now nothing in the game ever handed you a link
// to send: the sole share path was the receipt's WhatsApp button, whose message brags about the
// finishing time but carries no URL — the friend receiving it has nothing to tap.
//
// WHY THIS IS A DOM BUTTON AND NOT A KAPLAY ONE (the menu is otherwise all canvas buttons):
// navigator.share() requires transient user activation. A Kaplay onClick is dispatched from
// inside the rAF loop, long after the browser has finished processing the real pointer event, so
// iOS Safari rejects the call with NotAllowedError — the exact same trap documented for the
// AudioContext unlock (src/audioUnlock.js). Only a real DOM listener keeps the activation alive.
//
// Bound once at startup like the audio toggle; visibility is pure CSS (body.at-menu), set by the
// menu scene and cleared by game/finale, mirroring how body.playing gates the pause button.

import { t } from "../i18n/index.js";

let btn = null;
let toast = null;
let toastTimer = null;

// The game's own name is a proper noun and stays put; the pitch around it is translated, and
// read at CLICK time so it always matches the language on screen.
const SHARE_TITLE = "Pixel Princess Platformer";

/**
 * The canonical link. Read from <meta property="og:url"> rather than hardcoded: that tag is
 * already the single source of truth for the public origin (it feeds the WhatsApp/Twitter link
 * preview), so the two can never drift apart. Falls back to the live origin — which is what you
 * want on localhost anyway, where the meta URL would point at production.
 */
export function gameUrl() {
  const meta = document.querySelector('meta[property="og:url"]')?.content;
  return (meta || "").trim() || location.origin;
}

/** Flash the confirmation pill (the clipboard fallbacks are otherwise completely silent). */
function flash(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  // Next frame, so the transition actually runs on the freshly-unhidden element.
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => {
      if (toast) toast.hidden = true;
    }, 200); // after the fade-out, so it can't sit invisibly over the canvas
  }, 1800);
}

/** Last-resort copy for insecure contexts, where navigator.clipboard is simply absent. */
function legacyCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

async function share() {
  const url = gameUrl();
  // 1. The native sheet: on a phone this is WhatsApp/Telegram/Messaggi, which is the whole point.
  if (navigator.share) {
    try {
      await navigator.share({ title: SHARE_TITLE, text: t("share.text"), url });
      return;
    } catch (err) {
      // Dismissing the sheet throws AbortError — that's a choice, not a failure. Say nothing.
      if (err?.name === "AbortError") return;
      // Anything else (a browser that advertises share but refuses it) falls through to copying.
    }
  }
  // 2. Desktop, where navigator.share is usually missing: put it on the clipboard instead.
  const payload = `${t("share.text")} ${url}`;
  try {
    await navigator.clipboard.writeText(payload);
    flash(t("share.copied"));
    return;
  } catch {
    // 3. Insecure context / clipboard denied.
  }
  flash(legacyCopy(payload) ? t("share.copied") : url);
}

/** Wire the share button. Call once at startup. */
export function bindShareButton() {
  btn = document.getElementById("share-btn");
  toast = document.getElementById("share-toast");
  if (!btn) return;
  btn.addEventListener("click", share);
}
