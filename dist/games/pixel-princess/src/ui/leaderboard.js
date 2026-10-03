// leaderboard.js (UI) — the DOM overlay for the global leaderboard.
//
// Pure DOM (like the other overlays), opened from the finale (submit mode) and the menu
// (read-only standings). It owns the small amount of logic — fetching, paging, submitting,
// rendering — and leans on the graceful client (src/leaderboard.js): if the store is unavailable
// the list just shows a friendly "non disponibile" and nothing breaks. Markup lives in index.html.
//
// The board is a HISTORY: every finished run is its own row (see api/leaderboard.js), so the same
// nickname legitimately appears more than once and the list is PAGED (‹ Prec · 11–20 di 47 · Succ ›).
// Two consequences this module has to honour:
//   • Highlight "me" by the run's unique `id`, NOT by nickname — matching on the name would light
//     up every row that player ever set.
//   • Never let one run be submitted twice (it would create a duplicate row). `lastSentRunKey`
//     remembers the run we already sent, so re-opening the overlay shows it as already filed.

import { fetchTop, submitScore } from "../leaderboard.js";
import { getNickname, setNickname } from "../state.js";
import { formatDuration } from "../format.js";
import { t } from "../i18n/index.js";

const PAGE = 10; // rows per page

let overlay = null;
let form = null;
let invite = null;
let scoreEl = null;
let timeEl = null;
let input = null;
let submitBtn = null;
let listEl = null;
let statusEl = null;
let closeBtn = null;
let pager = null;
let prevBtn = null;
let nextBtn = null;
let rangeEl = null;

// --- Live view state ---------------------------------------------------------
let offset = 0; // first row of the page on screen
let total = 0; // rows in the whole board
let myId = null; // the id of the row just submitted (highlight target)
let lastSentRunKey = null; // "<timeMs>:<score>" of the run already filed — blocks a duplicate
let lastSentId = null; // its row id, so re-opening still highlights her

function els() {
  overlay ||= document.getElementById("leaderboard-overlay");
  form ||= document.getElementById("lb-form");
  invite ||= document.getElementById("lb-invite");
  scoreEl ||= document.getElementById("lb-score");
  timeEl ||= document.getElementById("lb-time");
  input ||= document.getElementById("nickname-input");
  submitBtn ||= document.getElementById("lb-submit");
  listEl ||= document.getElementById("lb-list");
  statusEl ||= document.getElementById("lb-status");
  closeBtn ||= document.getElementById("lb-close");
  pager ||= document.getElementById("lb-pager");
  prevBtn ||= document.getElementById("lb-prev");
  nextBtn ||= document.getElementById("lb-next");
  rangeEl ||= document.getElementById("lb-range");
}

// Paint the pager under the list. Hidden entirely while everything fits on one page — no point
// showing dead controls on an empty or very short board.
function renderPager() {
  if (!pager) return;
  if (total <= PAGE) {
    pager.hidden = true;
    return;
  }
  pager.hidden = false;
  const from = offset + 1;
  const to = Math.min(offset + PAGE, total);
  if (rangeEl) rangeEl.textContent = t("lb.range", { from, to, total });
  if (prevBtn) prevBtn.disabled = offset <= 0;
  if (nextBtn) nextBtn.disabled = offset + PAGE >= total;
}

// Paint one page of standings. `pageData` is the object from the client, or null when unavailable.
function renderPage(pageData) {
  if (!listEl) return;
  listEl.innerHTML = "";
  if (!pageData) {
    if (statusEl) statusEl.textContent = t("lb.unavailable");
    if (pager) pager.hidden = true;
    return;
  }
  offset = pageData.offset ?? 0;
  total = pageData.total ?? 0;
  if (total === 0) {
    if (statusEl) statusEl.textContent = t("lb.empty");
    if (pager) pager.hidden = true;
    return;
  }
  const me = getNickname();
  let mine = null; // the row element to scroll into view, if the player is on this page
  pageData.rows.forEach((row) => {
    const li = document.createElement("li");
    // Highlight by the run's unique id when we have one (the row we just submitted). Legacy rows
    // carry no id, so fall back to the nickname there — the old behaviour, only as a fallback.
    const isMine = myId !== null ? row.id === myId : row.id === null && row.name === me;
    if (isMine) {
      li.className = "lb-me";
      mine = li;
    }
    const rank = document.createElement("span");
    rank.className = "lb-rank";
    rank.textContent = `${row.rank}`; // GLOBAL position — stays true on page 2, 3, …
    const name = document.createElement("span");
    name.className = "lb-name";
    name.textContent = row.name;
    // Time-attack: the rank is BY time (fastest first), so the time is the emphasised column;
    // the run's score rides along as a secondary stat.
    const time = document.createElement("span");
    time.className = "lb-time";
    time.textContent = `${formatDuration(row.time)} ⏱`;
    const pts = document.createElement("span");
    pts.className = "lb-pts";
    pts.textContent = `${row.score ?? 0} ★`;
    li.append(rank, name, time, pts);
    listEl.appendChild(li);
  });
  renderPager();
  mine?.scrollIntoView({ block: "nearest" });
}

/** Load a page and paint it (keeps the "Caricamento…" status honest). */
async function loadPage(next = 0) {
  // One lookup, used both to set the placeholder and to recognise it again below: comparing
  // against a literal would stop matching the moment the interface is not Italian.
  const loading = t("lb.loading");
  if (statusEl && !statusEl.textContent) statusEl.textContent = loading;
  const pageData = await fetchTop({ offset: Math.max(0, next), limit: PAGE });
  if (overlay?.hidden) return; // closed before the fetch resolved
  if (statusEl && statusEl.textContent === loading) statusEl.textContent = "";
  renderPage(pageData);
}

// Wire the pager + close button. Called by both open modes.
function wireChrome(onClose) {
  if (prevBtn) prevBtn.onclick = () => loadPage(offset - PAGE);
  if (nextBtn) nextBtn.onclick = () => loadPage(offset + PAGE);
  if (closeBtn) {
    closeBtn.onclick = () => {
      hideLeaderboard();
      onClose?.();
    };
  }
}

/**
 * Open in SUBMIT mode (finale): the run's time + score, a nickname field, and the standings below.
 * The classifica ranks by fastest time (time-attack).
 *
 * @param {number} score   the run's score
 * @param {number} timeMs  the run's net play time
 * @param {boolean} [inviteMode]  finale invitation: shows the headline and turns the close button
 *   into a small "Salta", so entering the board is the expected step rather than a hidden option.
 * @param {() => void} [onDone]  runs when she closes this step — "Salta" if she skipped, or the
 *   "Chiudi" the button becomes once her time is in. The finale uses it to chain the receipt, so
 *   it fires on both paths and exactly once. NOT fired by hideLeaderboard() (a defensive hide on
 *   entering another scene must not spring the receipt).
 */
export function openLeaderboard({ score, timeMs, inviteMode = false, onDone } = {}) {
  els();
  if (!overlay) return;
  overlay.hidden = false;
  offset = 0;

  const runKey = `${timeMs}:${score}`;
  const alreadySent = runKey === lastSentRunKey; // this exact run is already on the board
  myId = alreadySent ? lastSentId : null; // re-opening still lights up her row

  if (invite) invite.hidden = !inviteMode;
  if (form) form.hidden = alreadySent;
  if (scoreEl) scoreEl.textContent = String(score);
  if (timeEl) timeEl.textContent = formatDuration(timeMs);
  if (input) input.value = getNickname();
  // #lb-close carries NO data-i18n: its label is state ("Salta" while the finale invitation is
  // still skippable, "Chiudi" once the time is in), so applyDomStrings must not overwrite it.
  if (closeBtn) closeBtn.textContent = inviteMode ? t("lb.skip") : t("lb.close");
  if (statusEl) statusEl.textContent = alreadySent ? t("lb.already") : t("lb.loading");
  if (listEl) listEl.innerHTML = "";
  if (pager) pager.hidden = true;

  // `onDone` fires on "Salta"/"Chiudi" too — the finale must continue either way.
  wireChrome(onDone);

  const send = async () => {
    const nickname = (input?.value || "").trim();
    if (!nickname) {
      if (statusEl) statusEl.textContent = t("lb.needName");
      input?.focus();
      return;
    }
    setNickname(nickname);
    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) statusEl.textContent = t("lb.sending");
    const pageData = await submitScore({ nickname, score, timeMs, limit: PAGE });
    if (submitBtn) submitBtn.disabled = false;
    if (!pageData) {
      if (statusEl) statusEl.textContent = t("lb.unreachable");
      return;
    }
    lastSentRunKey = runKey; // never file this same run twice — it would be a duplicate row
    myId = pageData.id ?? null;
    lastSentId = myId;
    if (form) form.hidden = true; // sent — collapse the form, the standings take over
    if (invite) invite.hidden = true;
    if (statusEl) {
      statusEl.textContent = pageData.rank
        ? t("lb.placed", { rank: pageData.rank })
        : t("lb.sent");
    }
    // The endpoint already answered with the page CONTAINING this run, so she lands on herself.
    renderPage(pageData);
    if (closeBtn) closeBtn.textContent = t("lb.close"); // no longer a "skip" — the step is done
  };

  if (submitBtn) submitBtn.onclick = send;
  if (input) {
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        send();
      }
    };
  }

  // In INVITE mode the standings stay off screen until she's actually filed her time. On a
  // landscape phone (430px tall) the form + ten rows + pager overflow the card, which pushed the
  // "Salta" button below the fold — an escape hatch you have to scroll to find is not an escape
  // hatch. So the invitation is just: your time, your name, send, skip; the board arrives right
  // after as the reward (and the ★ Classifica button browses it any time).
  if (inviteMode && !alreadySent) {
    // A returning player's nickname is already in the field (it survives every reset, state.js),
    // so her whole job is one tap — say so, or the pre-filled box reads as "already done". No
    // autofocus: on a landscape iPhone (~430px tall) the keyboard would swallow the card, and
    // style.css already fights for that vertical space (@media max-height: 560px).
    const known = getNickname();
    if (statusEl) {
      statusEl.textContent = known ? t("lb.welcomeBack", { name: known }) : "";
    }
    return;
  }
  loadPage(0); // otherwise show the current standings underneath the form right away
}

/** Open in READ-ONLY mode (menu): just the standings, no submit form. */
export function openLeaderboardReadOnly() {
  els();
  if (!overlay) return;
  overlay.hidden = false;
  myId = null;
  offset = 0;
  if (form) form.hidden = true;
  if (invite) invite.hidden = true;
  if (closeBtn) closeBtn.textContent = t("lb.close");
  if (statusEl) statusEl.textContent = t("lb.loading");
  if (listEl) listEl.innerHTML = "";
  if (pager) pager.hidden = true;
  wireChrome(null);
  loadPage(0);
}

/** Hide the overlay (also called defensively when entering other scenes). */
export function hideLeaderboard() {
  els();
  if (overlay) overlay.hidden = true;
}

/**
 * Is the overlay up right now? The finale binds Enter/Space/Esc to "back to menu" on the CANVAS;
 * those keys keep firing while a DOM overlay is open (typing a nickname ends with Enter!), which
 * would jump to the menu right past the leaderboard step. The finale guards on this.
 */
export function isLeaderboardOpen() {
  els();
  return !!overlay && !overlay.hidden;
}
