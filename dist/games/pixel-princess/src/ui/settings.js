// settings.js — the settings overlay: volumes, language, and the destructive progress wipe.
//
// Pure DOM, like the pause/insert-coin overlays: two range sliders wired to the Music and
// SFX buses in src/audio.js. Reachable from the main menu and from the pause menu (it
// stacks above the pause overlay, so closing it reveals the pause card again). Markup lives
// in index.html; this module just toggles + wires it.
//
// THE LANGUAGE ROW IS MENU-ONLY (CSS gates it on body.at-menu). Kaplay bakes text into the scene
// graph as the scene is built, so a language change only reaches the canvas by re-entering the
// scene. From the menu that is free; from the pause menu it would rebuild the level and throw her
// back to the last checkpoint. The DOM half retranslates in place either way (applyDomStrings),
// which is why the overlay itself updates the instant she taps.
//
// This module deliberately does NOT import `k`: the DOM UI never touches the engine. It reports
// the change through onClose({ langChanged }) and the MENU SCENE decides to rebuild itself.

import { getMusicVolume, getSfxVolume, setMusicVolume, setSfxVolume } from "../audio.js";
import { resetProgress, resetCoccolineRun } from "../state.js";
import { getLang, setLang, t } from "../i18n/index.js";
import { sfx } from "../sfx.js";

let overlay = null;
let musicSlider = null;
let sfxSlider = null;
let resetBtn = null;
let closeBtn = null;
let langBtns = null;
let resetArmed = false; // two-tap confirm guard for the destructive reset

function els() {
  overlay ||= document.getElementById("settings-overlay");
  musicSlider ||= document.getElementById("set-music-vol");
  sfxSlider ||= document.getElementById("set-sfx-vol");
  resetBtn ||= document.getElementById("settings-reset");
  closeBtn ||= document.getElementById("settings-close");
  langBtns ||= Array.from(document.querySelectorAll("#settings-overlay .lang-btn"));
}

/** Solid gold on the active language, so the current choice is readable at a glance. */
function paintLangButtons() {
  langBtns?.forEach((b) => b.classList.toggle("is-active", b.dataset.lang === getLang()));
}

/** Back to the unarmed "Cancella i progressi" label, in the current language. */
function disarmReset() {
  resetArmed = false;
  if (!resetBtn) return;
  resetBtn.textContent = t("settings.reset");
  resetBtn.classList.remove("danger-armed");
}

/**
 * Show the settings overlay, seeding the controls from the saved preferences and wiring live
 * updates.
 * @param {(info: {langChanged: boolean}) => void} [onClose] runs after the overlay hides.
 *   `langChanged` tells the caller whether the CANVAS is now stale (see the header): the menu
 *   scene re-enters itself, the pause menu never sees it (the row is hidden there).
 */
export function showSettings(onClose) {
  els();
  if (!overlay) return;
  let langChanged = false;
  if (musicSlider) {
    musicSlider.value = String(Math.round(getMusicVolume() * 100));
    musicSlider.oninput = () => setMusicVolume(musicSlider.value / 100); // live, no churn
  }
  if (sfxSlider) {
    sfxSlider.value = String(Math.round(getSfxVolume() * 100));
    sfxSlider.oninput = () => setSfxVolume(sfxSlider.value / 100);
    sfxSlider.onchange = () => sfx("select"); // a tick at the new level on release
  }
  // Reset: a destructive wipe of the saved journey (character, level, score + this run's
  // bill — the lifetime total survives, it's the joke). Two taps to confirm; a full reload
  // then re-reads the cleared storage so every scene reflects the fresh start.
  if (resetBtn) {
    disarmReset();
    resetBtn.onclick = () => {
      if (!resetArmed) {
        resetArmed = true;
        resetBtn.textContent = t("settings.resetConfirm");
        resetBtn.classList.add("danger-armed");
        sfx("select");
        return;
      }
      resetProgress();
      resetCoccolineRun();
      location.reload();
    };
  }
  // Language: one tap switches it. The overlay retranslates itself immediately (setLang runs
  // applyDomStrings), so she sees the effect right where she tapped; the canvas behind it waits
  // for the scene rebuild the caller performs on close.
  paintLangButtons();
  langBtns?.forEach((b) => {
    b.onclick = () => {
      if (!setLang(b.dataset.lang)) return; // already this language — nothing to do
      langChanged = true;
      paintLangButtons();
      // applyDomStrings has just rewritten the reset button back to its idle label; keep the
      // ARMED FLAG honest with it, or the next tap would wipe her progress under a button that
      // no longer says "Sei sicura?".
      disarmReset();
      sfx("select");
    };
  });
  if (closeBtn) {
    closeBtn.onclick = () => {
      sfx("select");
      hideSettings();
      onClose?.({ langChanged });
    };
  }
  overlay.hidden = false;
}

/** Hide the overlay (also called defensively when entering other scenes). */
export function hideSettings() {
  els();
  if (overlay) overlay.hidden = true;
}
