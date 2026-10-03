// finale.js — "Sala da Ballo", the closing cutscene.
// A non-playable, cinematic scene: no gravity, no input bound. The chosen heroine stands
// centre-stage as the "Principessa Perfetta" wearing all six unlocked skins, with a
// centred box showing a personalized message (edit finale.* in src/i18n/it.js + en.js). A button
// (or Enter/Esc) returns to the menu.

import { k, setFrameCap } from "../kaplayCtx.js";
import { GAME_W, GAME_H, PALETTE, CHARACTERS, SKINS, PERF } from "../config.js";
import { getSelectedCharacter, getCoccoline, getCoccolineRun, getScore, getRunTime } from "../state.js";
import { addSkinLayers, syncSkins } from "../entities/player.js";
import { formatDuration } from "../format.js";
import { t } from "../i18n/index.js";
import { resetInput } from "../controls.js";
import { showReceipt, hideReceipt } from "../ui/receipt.js";
import { hideInsertCoin } from "../ui/insertCoin.js";
import { hideGameOver } from "../ui/gameOver.js";
import { openLeaderboard, hideLeaderboard, isLeaderboardOpen } from "../ui/leaderboard.js";
import { hidePause } from "../ui/pauseMenu.js";
import { hideSettings } from "../ui/settings.js";
import { fadeToScene } from "../ui/transition.js";
import { resetHitStop } from "../juice.js";
import { sfx } from "../sfx.js";
import { playBgm } from "../audio.js";

// Camera helper — Kaplay renamed cam setters across versions; support both.
function setCam(p) {
  if (typeof k.setCamPos === "function") k.setCamPos(p);
  else k.camPos(p);
}

export function registerFinaleScene() {
  k.scene("finale", () => {
    // Defensive: clear any leftover death overlay; the receipt is shown below after a beat.
    hideInsertCoin();
    hideGameOver();
    hideReceipt();
    hideLeaderboard();
    hidePause();
    hideSettings();
    resetHitStop(); // arrive at full speed even if a stomp's hit-stop was cut short by the goal
    setFrameCap(PERF.IDLE_FPS); // a cinematic still with a bobbing avatar — 30fps is cool and ample
    // Cinematic scene — no controls; keep the gameplay touch buttons hidden. The menu-only
    // share button goes too: this corner belongs to the "★ Classifica" button below.
    document.body.classList.remove("playing");
    document.body.classList.remove("at-menu");

    const charId = getSelectedCharacter();
    const char = CHARACTERS.find((c) => c.id === charId) || CHARACTERS[0];

    // Cinematic: centre the camera (no clamped game camera carries over), drop any held
    // input, and bind no keyboard movement — this scene ignores controls entirely.
    setCam(k.vec2(GAME_W / 2, GAME_H / 2));
    resetInput();

    drawBallroom();
    playBgm("finale-bgm", 0.34); // the grand waltz under the ballroom
    k.wait(0.2, () => sfx("win")); // warm fanfare as the ballroom settles in

    // --- The heroine as "Principessa Perfetta": base body + all six skins layered on ---
    // Sits a touch higher + smaller than before so the message box below can grow: the
    // heartfelt letter was hard to read on a phone (the whole 1280×720 canvas letterboxes into
    // ~932×430 on an iPhone, shrinking every glyph), so the box now hosts noticeably larger text.
    const baseY = 262;
    const avatar = k.add([
      k.sprite(char.sprite),
      k.pos(GAME_W / 2, baseY),
      k.anchor("center"),
      k.scale(2.35),
      k.z(10),
      "avatar",
    ]);
    avatar.skinLayers = addSkinLayers(avatar, SKINS.map((s) => s.key));
    avatar.play("celebrate"); // arms raised — she made it
    // Gentle idle bob; children inherit the parent's position, so the skins follow —
    // but the sheet frame does not, so mirror it every update (see animspec.js).
    avatar.onUpdate(() => {
      avatar.pos.y = baseY + Math.sin(k.time() * 1.5) * 6;
      syncSkins(avatar);
    });

    // Final run time (time-attack): a small scoreboard header at the very top, so the net
    // completion time is on screen through the read, before the receipt/leaderboard appear.
    // "Tempo finale M:SS" is only letters/digits/colon → the pixel font renders it (no override).
    k.add([
      k.text(t("finale.finalTime", { time: formatDuration(getRunTime()) }), { size: 24 }),
      k.pos(GAME_W / 2, 44),
      k.anchor("center"),
      k.color(...PALETTE.cream),
      k.opacity(0.9),
      k.z(11),
    ]);

    // Caption above the heroine. The crown is its own object with NO color tint, so it
    // renders as a full-colour emoji — k.color() multiplies (and would darken) the glyph.
    // It also keeps font:"sans-serif" since the pixel UI font has no emoji glyphs.
    k.add([k.text("👑", { size: 40, font: "sans-serif" }), k.pos(GAME_W / 2, 86), k.anchor("center"), k.z(11)]);
    k.add([
      k.text(t("finale.heroineTitle"), { size: 34 }),
      k.pos(GAME_W / 2, 132),
      k.anchor("center"),
      k.color(...PALETTE.gold),
      k.z(11),
    ]);

    // --- Message box (the personalized note; sized for the six-chapter message) ---
    // Box, title and body are tuned so the eight-line message sits fully inside the frame
    // (it used to spill past the bottom edge): the body is centred in the space below the
    // title with margin to spare above the "Torna al menu" button. Enlarged for phone
    // legibility — bigger body text (18→22), roomier line spacing, a wider + taller fully
    // opaque card — since at the iPhone letterbox scale the old size-18 letter was a squint.
    const boxW = 900;
    const boxH = 300;
    const boxY = 506;
    k.add([
      k.rect(boxW, boxH, { radius: 20 }),
      k.pos(GAME_W / 2, boxY),
      k.anchor("center"),
      k.color(...PALETTE.cream),
      k.opacity(1), // fully opaque — max contrast for the dark letter over the cream card
      k.outline(4, k.rgb(...PALETTE.gold)),
      k.z(20),
    ]);
    k.add([
      k.text(t("finale.title"), { size: 32 }),
      k.pos(GAME_W / 2, boxY - boxH / 2 + 36),
      k.anchor("center"),
      k.color(...PALETTE.rose),
      k.z(21),
    ]);
    k.add([
      // The heartfelt letter is the one place the pixel font hurt readability (long-form text),
      // so this single object overrides to "sans-serif" — the same per-object escape hatch the
      // emoji labels use. Titles + the button above/below stay pixel for the fairy-tale look.
      k.text(t("finale.message"), { size: 22, width: boxW - 80, align: "center", lineSpacing: 7, font: "sans-serif" }),
      k.pos(GAME_W / 2, boxY + 30),
      k.anchor("center"),
      k.color(...PALETTE.deepBlue),
      k.z(21),
    ]);

    // --- The closing sequence: read → CLASSIFICA → scontrino ---------------------------------
    // The leaderboard comes FIRST and unmissably. It used to be last (receipt → "Chiudi" → board),
    // which meant anyone who closed the app on the receipt never saw it at all — the player simply
    // reported "there's no prompt to enter the leaderboard". Now it is the gate: a modal invitation
    // she can only leave by sending her time or tapping the small "Salta". Either way `onDone`
    // chains the Coccoline receipt (with its WhatsApp payoff) behind it, so nothing is lost.
    //
    // ...and the gate is now UNSKIPPABLE, which it quietly wasn't. The invitation was a bare
    // `k.wait(6, …)`, so a finished run's record was lost to any of three everyday paths:
    //   1. Enter/Space/Esc (armed from frame 0) or the big "Torna al menu" button pressed inside
    //      those six seconds — the scene dies and takes the pending timer with it.
    //   2. Tapping "★ Classifica" first, which opened the board with no `inviteMode`/`onDone`:
    //      the receipt never chained, and the timer later re-opened the overlay on top of itself.
    //   3. `k.wait` rides Kaplay's update loop, which a paused tree halts — backgrounding the PWA
    //      mid-letter (backgroundFreeze) froze the countdown indefinitely.
    // So there is now ONE idempotent `offerLeaderboard()` and every path runs through it: the first
    // attempt to leave OPENS the invitation instead of skipping it, a wall-clock timer backstops the
    // engine one, and the `invited` flag makes a double invitation impossible.
    let invited = false; // the classifica has been offered — once per visit, by whoever got there first
    let leaving = false; // the scene is on its way out; the backstop must not pop over the menu
    let backstop = null; // wall-clock twin of the k.wait timer (assigned at the bottom)

    const showBill = () => showReceipt(getCoccolineRun(), getCoccoline(), getRunTime());
    const offerLeaderboard = () => {
      if (invited || leaving) return;
      invited = true;
      openLeaderboard({
        score: getScore(),
        timeMs: getRunTime(),
        inviteMode: true,
        onDone: showBill, // a sent time or a tapped "Salta" — the receipt follows either way
      });
    };

    // --- Return-to-menu button (also Enter / Space / Esc) ---
    const btn = k.add([
      k.rect(260, 60, { radius: 14 }),
      k.pos(GAME_W / 2, GAME_H - 34),
      k.anchor("center"),
      k.area(),
      k.color(...PALETTE.gold),
      k.z(30),
    ]);
    btn.add([k.text(t("finale.backToMenu"), { size: 24 }), k.anchor("center"), k.color(...PALETTE.deepBlue)]);
    btn.onHover(() => {
      btn.scale = k.vec2(1.05);
      k.setCursor("pointer");
    });
    btn.onHoverEnd(() => {
      btn.scale = k.vec2(1);
      k.setCursor("default");
    });
    const toMenu = () => {
      // A DOM overlay above the canvas swallows CLICKS but not KEYS: Enter to confirm a nickname,
      // or Esc, would otherwise fire this and jump to the menu right past the leaderboard step.
      if (isLeaderboardOpen()) return;
      // The board is a gate, not a six-second window: the first attempt to leave opens it. Once
      // she's actually done with it (time sent, or "Salta" tapped) the next press leaves as usual.
      if (!invited) {
        sfx("select");
        offerLeaderboard();
        return;
      }
      leaving = true;
      clearTimeout(backstop);
      sfx("select");
      fadeToScene(() => k.go("menu"));
    };
    btn.onClick(toMenu);
    k.onKeyPress(["enter", "space", "escape"], toMenu);

    // Leaderboard re-entry: re-opens the global classifica once the invitation has run (a run
    // already filed shows as such, so this can't create a duplicate row) — and stands in AS the
    // invitation for anyone who reaches for it first. Top-LEFT: the top-right is the audio toggle,
    // and the pause button (top-left) is hidden in this non-playing scene, so the corner is free.
    const lbBtn = k.add([
      k.rect(248, 56, { radius: 12 }),
      k.pos(148, 52),
      k.anchor("center"),
      k.area(),
      k.color(...PALETTE.cream),
      k.z(30),
    ]);
    lbBtn.add([
      k.text(t("finale.leaderboard"), { size: 22, font: "sans-serif" }),
      k.anchor("center"),
      k.color(...PALETTE.deepBlue),
    ]);
    lbBtn.onHover(() => {
      lbBtn.scale = k.vec2(1.05);
      k.setCursor("pointer");
    });
    lbBtn.onHoverEnd(() => {
      lbBtn.scale = k.vec2(1);
      k.setCursor("default");
    });
    lbBtn.onClick(() => {
      sfx("select");
      // Tapped before the invitation ran, THIS *is* the invitation — otherwise opening the board
      // by hand was a dead end that filed the time but never chained the receipt.
      if (!invited) return offerLeaderboard();
      openLeaderboard({ score: getScore(), timeMs: getRunTime() });
    });

    // The delay still lets the heartfelt letter breathe before anything covers it — shorter than
    // the old 10s, because the letter is no longer the only thing waiting on the player. Offline
    // the board degrades to a friendly "non disponibile" (see leaderboard.js), so the chain never
    // dead-ends; the top-left "★ Classifica" button re-opens it afterwards.
    const INVITE_DELAY = 6; // s — enough to read the letter, soon enough to still feel like the payoff
    k.wait(INVITE_DELAY, offerLeaderboard);
    // Wall-clock backstop for case 3 above: setTimeout keeps counting while the tree is frozen, so
    // the invitation survives a trip to the background. `invited` makes the loser of the race a
    // no-op; toMenu clears it so it can never fire over the menu.
    backstop = setTimeout(offerLeaderboard, (INVITE_DELAY + 1) * 1000);
  });
}

// --- Grand ballroom backdrop (primitive art, matching the level draw* style) ---
function drawBallroom() {
  // Warm wall + a brighter floor band.
  k.add([k.rect(GAME_W, GAME_H), k.pos(0, 0), k.color(...PALETTE.lilac), k.z(-100)]);
  k.add([k.rect(GAME_W, 200), k.pos(0, GAME_H - 200), k.color(...PALETTE.cream), k.opacity(0.4), k.z(-99)]);

  // A few stately columns.
  [200, 480, 800, 1080].forEach((cx) => {
    k.add([k.rect(56, 460), k.pos(cx, 110), k.anchor("top"), k.color(...PALETTE.cream), k.opacity(0.5), k.z(-95)]);
    // Capital + base blocks.
    k.add([k.rect(72, 22), k.pos(cx, 110), k.anchor("top"), k.color(...PALETTE.gold), k.opacity(0.6), k.z(-94)]);
    k.add([k.rect(72, 22), k.pos(cx, 568), k.anchor("bot"), k.color(...PALETTE.gold), k.opacity(0.6), k.z(-94)]);
  });

  // A simple chandelier centred near the top.
  k.add([k.rect(6, 70), k.pos(GAME_W / 2, 0), k.anchor("top"), k.color(...PALETTE.gold), k.z(-93)]);
  k.add([k.circle(26), k.pos(GAME_W / 2, 80), k.color(...PALETTE.gold), k.opacity(0.9), k.z(-93)]);

  // Twinkling sparkles drifting in the hall (scene-scoped → auto-cleaned on leave).
  for (let i = 0; i < 24; i++) {
    const phase = k.rand(0, Math.PI * 2);
    const speed = k.rand(1.5, 3.5);
    const sp = k.add([
      k.circle(k.rand(1.5, 3.5)),
      k.pos(k.rand(0, GAME_W), k.rand(60, GAME_H - 220)),
      k.color(...PALETTE.gold),
      k.opacity(0.6),
      k.z(-90),
    ]);
    sp.onUpdate(() => {
      sp.opacity = 0.25 + 0.5 * Math.abs(Math.sin(k.time() * speed + phase));
    });
  }
}
