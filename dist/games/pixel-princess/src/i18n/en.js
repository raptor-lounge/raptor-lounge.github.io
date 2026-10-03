// en.js — English dictionary. Same keys, same order as it.js (the source language): a missing key
// here silently falls back to Italian, so keeping the two files aligned line by line is how you
// see a gap at a glance.
//
// The three rules in it.js apply verbatim (no square brackets in k.text strings, no emoji in
// pixel-font strings, placeholders are `{name}`). English needs no gendered care.
//
// Proper nouns stay put: "Anna", "Pixel Princess Platformer". "Coccoline" — the in-joke currency
// this whole game bills her in — DOES get translated ("Cuddles"): it is the punchline of the
// receipt, and a punchline nobody can read is not a punchline.

export const en = {
  // --- Loading -------------------------------------------------------------
  "loading.text": "Loading...",

  // --- Menu ----------------------------------------------------------------
  "menu.subtitle": "A journey through six enchanted worlds",
  "menu.resume": "Resume · Level {n}",
  "menu.reviewBall": "Replay the Grand Ball",
  "menu.newGame": "New game",
  "menu.start": "Start",
  "menu.leaderboard": "Leaderboard",
  "menu.settings": "Settings",
  "menu.chooseHeroine": "Choose your heroine",

  // --- Heroines (src/config.js CHARACTERS) ---------------------------------
  "char.anna.name": "Anna",
  "char.anna.tagline": "The Heroine",
  "char.anna.desc": "Sweet and brave, she wins every heart at first sight.",
  "char.sognatrice.name": "Dreamer",
  "char.sognatrice.tagline": "Gentle Soul",
  "char.sognatrice.desc": "She dreams of true love among the roses of the enchanted castle.",
  "char.avventuriera.name": "Adventurer",
  "char.avventuriera.tagline": "Free Spirit",
  "char.avventuriera.desc": "Her free heart runs wherever the desert wind takes her.",

  // --- Skins (src/config.js SKINS) -----------------------------------------
  "skin.skirt": "Royal Skirt",
  "skin.bodice": "Elegant Bodice",
  "skin.necklace": "Jewelled Necklace",
  "skin.crown": "Royal Crown",
  "skin.gloves": "Silk Gloves",
  "skin.cape": "Royal Cape",

  // --- Level names (src/levels/level*.js) ----------------------------------
  "level.1.name": "Enchanted Forest",
  "level.2.name": "Coral Depths",
  "level.3.name": "Eastern Rooftops",
  "level.4.name": "Snowy Peaks",
  "level.5.name": "Twilight Garden",
  "level.6.name": "Royal Castle",

  // --- In game -------------------------------------------------------------
  "game.chapter": "Chapter {n} — {name}",
  "hud.invincible": "★ INVINCIBLE  {sec}",
  "hud.feather": "FEATHER  {sec}",
  "game.bossDefeat": "Defeat the Keeper to pass!",
  "game.bossKey": "Grab the Ballroom Key!",
  "game.ballroomOpen": "The Ballroom is open!",

  // --- Level-cleared reward screen -----------------------------------------
  "reward.title": "Level complete!",
  "reward.unlocked": "You unlocked:",
  "reward.continue": "Continue",
  "reward.toBall": "To the Grand Ball",
  "reward.toMenu": "Back to menu",
  "reward.storyWaits": "Your story is waiting...",

  // --- Finale --------------------------------------------------------------
  "finale.finalTime": "Final time  {time}",
  "finale.heroineTitle": "The Perfect Princess",
  "finale.title": "For Anna",
  "finale.message":
    "You crossed enchanted forests, coral depths,\n" +
    "eastern rooftops and snowy peaks...\n" +
    "you danced among the petals of the garden at dusk\n" +
    "and outlasted the keeper of the castle.\n" +
    "With every step you became more yourself.\n\n" +
    "The ballroom doors are open.\n" +
    "Safe travels, princess.",
  "finale.leaderboard": "★ Leaderboard",
  "finale.backToMenu": "Back to menu",

  // --- Pause overlay -------------------------------------------------------
  "pause.title": "Paused",
  "pause.resume": "Resume",
  "pause.settings": "Settings",
  "pause.restart": "Restart level",
  "pause.menu": "Back to menu",

  // --- Settings overlay ----------------------------------------------------
  "settings.title": "Settings",
  "settings.music": "Music",
  "settings.sfx": "Effects",
  "settings.language": "Language",
  "settings.reset": "Erase progress",
  "settings.resetConfirm": "Are you sure? Tap again",
  "settings.close": "Close",
  // Each language names itself, in both dictionaries — see it.js.
  "lang.it": "Italiano",
  "lang.en": "English",

  // --- Insert Coin (death) -------------------------------------------------
  "coin.text": "Oops! You slipped.<br />Insert <strong>500 Cuddles</strong> to continue.",
  "coin.lives": "Lives left:",
  "coin.btn": "Insert Coin",

  // --- Game Over -----------------------------------------------------------
  "gameover.title": "Game Over",
  "gameover.text":
    "You are out of lives!<br />" +
    "The princess starts the journey over.<br />" +
    '<span class="gameover-note">(The Cuddles stay on the tab 😉)</span>',
  "gameover.btn": "Start over",

  // --- Receipt (finale) ----------------------------------------------------
  "receipt.head": "RECEIPT",
  "receipt.sub": "Perfect Princess Inc.",
  "receipt.cost": "Cost of this adventure:",
  "receipt.currency": "Cuddles",
  "receipt.lifetime": "Lifetime total:",
  "receipt.time": "Play time:",
  "receipt.foot": "Thanks for playing ❤️",
  "receipt.pay": "Pay the Debt!",
  "receipt.close": "Close",
  "receipt.wa":
    "I finished the game and I am the Perfect Princess! ❤️ " +
    "It took me {time}! " +
    "Get ready, I owe you {run} cuddles! " +
    "(Lifetime total: {lifetime} cuddles) " +
    "Fancy beating me? {url}",

  // --- Leaderboard ---------------------------------------------------------
  "lb.title": "Leaderboard",
  "lb.invite": "🏆 You finished the journey!<br />Put your time on the leaderboard",
  "lb.yourScore": "Your score:",
  "lb.yourTime": "Your time:",
  "lb.namePlaceholder": "Your name",
  "lb.submit": "Send my time",
  "lb.prev": "‹ Prev",
  "lb.next": "Next ›",
  "lb.close": "Close",
  "lb.skip": "Skip",
  "lb.range": "{from}–{to} of {total}",
  "lb.loading": "Loading…",
  "lb.sending": "Sending…",
  "lb.unavailable": "Leaderboard unavailable. Try again later.",
  "lb.unreachable": "Could not reach the leaderboard. Try again later.",
  "lb.empty": "No times yet. Be the first!",
  "lb.already": "Already on the board ✓",
  "lb.needName": "Type a name to join the leaderboard.",
  "lb.placed": "You are on the board in place {rank}! 🎉",
  "lb.sent": "Time sent! 🎉",
  "lb.welcomeBack": "Welcome back, {name}! Your name is set: send your time.",

  // --- Share ---------------------------------------------------------------
  "share.btn": "Challenge a friend",
  "share.text":
    "I played Pixel Princess Platformer: six enchanted worlds, a boss and a time-attack leaderboard. " +
    "Can you beat my time? 👑",
  "share.copied": "Link copied! 📋",

  // --- iOS install hint ----------------------------------------------------
  "install.title": "📲 Play fullscreen",
  "install.body": "Tap <b>Share</b> ⬆️ below, then \"Add to Home Screen\"",

  // --- Portrait warning ----------------------------------------------------
  "rotate.text": "Turn your device to landscape",

  // --- aria-labels (never seen, always read aloud) -------------------------
  "a11y.left": "Left",
  "a11y.right": "Right",
  "a11y.jump": "Jump",
  "a11y.pause": "Pause",
  "a11y.audioOff": "Mute audio",
  "a11y.audioOn": "Unmute audio",
  "a11y.closeHint": "Dismiss hint",
  "a11y.musicVol": "Music volume",
  "a11y.sfxVol": "Effects volume",
  "a11y.prevPage": "Previous page",
  "a11y.nextPage": "Next page",
};
