// i18n.mjs — regression test for the IT/EN localisation (src/i18n/).
//
// This is the one gate in the suite that deliberately does NOT use PAGE_LOCALE: it opens pages in
// several device locales, because language DETECTION is the thing under test. Everything the
// runtime promises gets asserted here:
//   • an Italian device gets Italian, an English one English, anything else English;
//   • `?lang=` overrides the device but is NOT persisted (it is a debug switch, not a setting);
//   • the settings toggle retranslates the DOM overlay in place AND rebuilds the canvas scene
//     (Kaplay bakes text into the scene graph, so nothing short of re-entering the scene works);
//   • the choice persists across a reload;
//   • the language row is MENU-ONLY — from the pause menu a rebuild would cost her the checkpoint;
//   • the offline leaderboard message (the graceful-degradation path) is translated too.
//
// Usage:  python tools/serve.py 8137   (then)   node tools/test/i18n.mjs
// Exit code 0 = all pass, 1 = a failure.

import { launchBrowser, routeVendorKaplay } from "./browser.mjs";

const TARGET = process.argv[2] || process.env.PJ_URL || "http://localhost:8137";
const T = 15000;

const results = [];
const check = (name, ok, extra = "") => results.push({ name, ok: !!ok, extra });

const browser = await launchBrowser();

/** Open the menu in a given device locale (and optional query string), storage wiped. */
async function openMenu(locale, qs = "") {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, locale });
  await routeVendorKaplay(page);
  await page.goto(TARGET + qs, { waitUntil: "domcontentloaded", timeout: T });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__pj?.k?.getSceneName() === "menu", null, {
    timeout: T,
    polling: 100,
  });
  await page.waitForTimeout(300); // let the scene finish building its labels
  return page;
}

/** Every string the current scene draws — the canvas half of the translation. */
const sceneText = (page) =>
  page.evaluate(() =>
    window.__pj.k
      .get("*", { recursive: true })
      .filter((o) => typeof o.text === "string")
      .map((o) => o.text),
  );

try {
  // --- Detection: the device's own language decides, with English as the world's default ---
  let page = await openMenu("it-IT");
  let text = await sceneText(page);
  check("an Italian device boots Italian", text.includes("Classifica"), text.join(" | "));
  check(
    "html lang follows",
    (await page.evaluate(() => document.documentElement.lang)) === "it",
  );
  await page.close();

  page = await openMenu("en-US");
  text = await sceneText(page);
  check("an English device boots English", text.includes("Leaderboard"), text.join(" | "));
  // The DOM half is painted by applyDomStrings from the data-i18n attributes.
  check("the DOM overlays are translated too", (await page.textContent("#settings-close")) === "Close");
  await page.close();

  page = await openMenu("fr-FR");
  text = await sceneText(page);
  check("a non-Italian device falls back to English", text.includes("Leaderboard"), text.join(" | "));
  await page.close();

  // --- ?lang= is an override, not a preference: it must not stick ---
  page = await openMenu("it-IT", "?lang=en");
  text = await sceneText(page);
  check("?lang=en overrides an Italian device", text.includes("Leaderboard"), text.join(" | "));
  check(
    "?lang= is never persisted",
    (await page.evaluate(() => localStorage.getItem("pj.lang"))) === null,
  );
  await page.close();

  // --- Switching from the settings overlay ---
  page = await openMenu("it-IT");
  await page.mouse.click(640, 664); // "Impostazioni" (GAME_H - 56, 1:1 at this viewport)
  await page.waitForTimeout(300);
  check("the language row shows on the menu", await page.isVisible(".lang-row"));
  await page.click('.lang-btn[data-lang="en"]');
  await page.waitForTimeout(300);
  check("the overlay retranslates in place", (await page.textContent("#settings-close")) === "Close");
  check(
    "the active language is marked",
    await page.evaluate(() =>
      document.querySelector('.lang-btn[data-lang="en"]').classList.contains("is-active"),
    ),
  );
  await page.click("#settings-close");
  await page.waitForTimeout(700); // the menu scene re-enters itself
  text = await sceneText(page);
  check("closing rebuilds the canvas in the new language", text.includes("Leaderboard"), text.join(" | "));
  check(
    "the choice is persisted",
    (await page.evaluate(() => localStorage.getItem("pj.lang"))) === "en",
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__pj?.k?.getSceneName() === "menu", null, { timeout: T });
  await page.waitForTimeout(300);
  text = await sceneText(page);
  check("the choice survives a reload", text.includes("Leaderboard"), text.join(" | "));

  // --- Menu-only: from the pause menu the row is gone (a rebuild there costs the checkpoint) ---
  await page.evaluate(() => window.__pj.k.go("game"));
  await page.waitForTimeout(800);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.click("#pause-settings");
  await page.waitForTimeout(300);
  check("the language row is hidden off the menu", !(await page.isVisible(".lang-row")));
  await page.close();

  // --- The offline leaderboard path speaks the player's language as well ---
  page = await openMenu("en-US");
  await page.mouse.click(640, 600); // "Leaderboard"
  await page.waitForTimeout(1200); // the /api fetch 404s here (no server-side API) and degrades
  const status = await page.textContent("#lb-status");
  check("the offline leaderboard degrades in English", /unavailable/i.test(status), status);
  await page.close();

  // --- Report ---
  let allOk = true;
  for (const r of results) {
    allOk = allOk && r.ok;
    console.log(`${r.ok ? "PASS" : "FAIL"} — ${r.name}${r.extra ? `  (${r.extra})` : ""}`);
  }
  process.exitCode = allOk ? 0 : 1;
} catch (err) {
  console.error(`FAIL — exception: ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
