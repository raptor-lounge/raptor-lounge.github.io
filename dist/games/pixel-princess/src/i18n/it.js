// it.js — Italian dictionary. THIS IS THE SOURCE LANGUAGE: every key must exist here, because
// `t()` falls back to it when a translation is missing. Keep en.js in the same order, key for key.
//
// THREE RULES FOR ANYONE EDITING THESE STRINGS:
//  1. NO SQUARE BRACKETS in anything rendered by k.text() — Kaplay reads bracketed tokens as its
//     own inline style tags and crashes on them. This matters most in the finale letter and the
//     heroine descriptions, the two longest strings here.
//  2. NO EMOJI in anything rendered with the pixel font. The pixel font has no emoji/★ glyphs, so
//     they may appear only in DOM strings, or where the k.text() call already passes
//     font: "sans-serif" (the HUD counters, "★ Classifica", the invincibility label).
//  3. The Italian stays FEMININE ("Sii la prima", "Bentornata", "Sei sicura"): the game is a gift
//     for Anna. English is naturally neutral, so en.js needs no equivalent care.
//
// Placeholders are `{name}` and are interpolated by t(key, vars).

export const it = {
  // --- Loading -------------------------------------------------------------
  "loading.text": "Caricamento...",

  // --- Menu ----------------------------------------------------------------
  "menu.subtitle": "Un viaggio in sei mondi incantati",
  "menu.resume": "Riprendi · Livello {n}",
  "menu.reviewBall": "Rivedi il Gran Ballo",
  "menu.newGame": "Nuova partita",
  "menu.start": "Start",
  "menu.leaderboard": "Classifica",
  "menu.settings": "Impostazioni",
  "menu.chooseHeroine": "Scegli la tua eroina",

  // --- Heroines (src/config.js CHARACTERS) ---------------------------------
  "char.anna.name": "Anna",
  "char.anna.tagline": "La Protagonista",
  "char.anna.desc": "Dolce e coraggiosa, conquista ogni cuore al primo sguardo.",
  "char.sognatrice.name": "Sognatrice",
  "char.sognatrice.tagline": "Anima Gentile",
  "char.sognatrice.desc": "Sogna l'amore vero tra le rose del castello incantato.",
  "char.avventuriera.name": "Avventuriera",
  "char.avventuriera.tagline": "Spirito Libero",
  "char.avventuriera.desc": "Il suo cuore libero corre dove la porta il vento del deserto.",

  // --- Skins (src/config.js SKINS) -----------------------------------------
  "skin.skirt": "Gonna Reale",
  "skin.bodice": "Corpetto Elegante",
  "skin.necklace": "Collana di Gioielli",
  "skin.crown": "Corona Reale",
  "skin.gloves": "Guanti di Seta",
  "skin.cape": "Mantello Reale",

  // --- Level names (src/levels/level*.js) ----------------------------------
  "level.1.name": "Foresta Incantata",
  "level.2.name": "Abissi di Corallo",
  "level.3.name": "Tetti d'Oriente",
  "level.4.name": "Cime Innevate",
  "level.5.name": "Giardino del Crepuscolo",
  "level.6.name": "Castello Reale",

  // --- In game -------------------------------------------------------------
  "game.chapter": "Capitolo {n} — {name}",
  "hud.invincible": "★ INVINCIBILE  {sec}",
  "hud.feather": "PIUMA  {sec}",
  "game.bossDefeat": "Sconfiggi il Custode per passare!",
  "game.bossKey": "Raccogli la Chiave della Sala da Ballo!",
  "game.ballroomOpen": "La Sala da Ballo è aperta!",

  // --- Level-cleared reward screen -----------------------------------------
  "reward.title": "Livello completato!",
  "reward.unlocked": "Hai sbloccato:",
  "reward.continue": "Continua",
  "reward.toBall": "Al Gran Ballo",
  "reward.toMenu": "Torna al menu",
  "reward.storyWaits": "La tua storia ti aspetta...",

  // --- Finale --------------------------------------------------------------
  "finale.finalTime": "Tempo finale  {time}",
  "finale.heroineTitle": "Principessa Perfetta",
  "finale.title": "Per Anna",
  "finale.message":
    "Hai attraversato foreste incantate, abissi di corallo,\n" +
    "tetti d'oriente e cime innevate...\n" +
    "hai danzato tra i petali del giardino al crepuscolo\n" +
    "e superato il custode del castello.\n" +
    "A ogni passo sei diventata piu te stessa.\n\n" +
    "Le porte della sala da ballo sono aperte.\n" +
    "Buon viaggio, principessa.",
  "finale.leaderboard": "★ Classifica",
  "finale.backToMenu": "Torna al menu",

  // --- Pause overlay -------------------------------------------------------
  "pause.title": "In pausa",
  "pause.resume": "Riprendi",
  "pause.settings": "Impostazioni",
  "pause.restart": "Ricomincia il livello",
  "pause.menu": "Torna al menu",

  // --- Settings overlay ----------------------------------------------------
  "settings.title": "Impostazioni",
  "settings.music": "Musica",
  "settings.sfx": "Effetti",
  "settings.language": "Lingua",
  "settings.reset": "Cancella i progressi",
  "settings.resetConfirm": "Sei sicura? Tocca ancora",
  "settings.close": "Chiudi",
  // Language names stay in their OWN language in both dictionaries — that is how you find yours
  // when the interface is in a language you don't read.
  "lang.it": "Italiano",
  "lang.en": "English",

  // --- Insert Coin (death) -------------------------------------------------
  "coin.text": "Ops! Hai sbagliato.<br />Inserisci <strong>500 Coccoline</strong> per continuare.",
  "coin.lives": "Vite rimaste:",
  "coin.btn": "Inserisci Coin",

  // --- Game Over -----------------------------------------------------------
  "gameover.title": "Game Over",
  "gameover.text":
    "Hai esaurito le vite!<br />" +
    "La principessa ricomincia il viaggio dall'inizio.<br />" +
    '<span class="gameover-note">(Le Coccoline restano sul conto 😉)</span>',
  "gameover.btn": "Ricomincia da capo",

  // --- Receipt (finale) ----------------------------------------------------
  "receipt.head": "SCONTRINO",
  "receipt.sub": "Principessa Perfetta S.p.A.",
  "receipt.cost": "Costo di questa avventura:",
  "receipt.currency": "Coccoline",
  "receipt.lifetime": "Totale storico:",
  "receipt.time": "Tempo di gioco:",
  "receipt.foot": "Grazie per aver giocato ❤️",
  "receipt.pay": "Paga il Debito!",
  "receipt.close": "Chiudi",
  "receipt.wa":
    "Ho finito il gioco e sono la Principessa Perfetta! ❤️ " +
    "Ci ho messo {time}! " +
    "Preparati, ti devo {run} coccoline! " +
    "(Totale storico: {lifetime} coccoline) " +
    "Provi a battermi? {url}",

  // --- Leaderboard ---------------------------------------------------------
  "lb.title": "Classifica",
  "lb.invite": "🏆 Hai finito il viaggio!<br />Metti il tuo tempo in classifica",
  "lb.yourScore": "Il tuo punteggio:",
  "lb.yourTime": "Il tuo tempo:",
  "lb.namePlaceholder": "Il tuo nome",
  "lb.submit": "Invia in classifica",
  "lb.prev": "‹ Prec",
  "lb.next": "Succ ›",
  "lb.close": "Chiudi",
  "lb.skip": "Salta",
  "lb.range": "{from}–{to} di {total}",
  "lb.loading": "Caricamento…",
  "lb.sending": "Invio…",
  "lb.unavailable": "Classifica non disponibile. Riprova più tardi.",
  "lb.unreachable": "Classifica non raggiungibile. Riprova più tardi.",
  "lb.empty": "Ancora nessun tempo. Sii la prima!",
  "lb.already": "Già in classifica ✓",
  "lb.needName": "Scrivi un nome per entrare in classifica.",
  "lb.placed": "Sei in classifica al posto {rank}! 🎉",
  "lb.sent": "Tempo inviato! 🎉",
  "lb.welcomeBack": "Bentornata, {name}! Il nome c'è già: manda il tempo.",

  // --- Share ---------------------------------------------------------------
  "share.btn": "Sfida un amico",
  "share.text":
    "Ho giocato a Pixel Princess Platformer: sei mondi incantati, un boss e una classifica a tempo. " +
    "Riesci a battere il mio tempo? 👑",
  "share.copied": "Link copiato! 📋",

  // --- iOS install hint ----------------------------------------------------
  "install.title": "📲 Gioca a schermo intero",
  "install.body": "Tocca <b>Condividi</b> ⬆️ in basso, poi «Aggiungi a Home»",

  // --- Portrait warning ----------------------------------------------------
  "rotate.text": "Ruota il dispositivo in orizzontale",

  // --- aria-labels (never seen, always read aloud) -------------------------
  "a11y.left": "Sinistra",
  "a11y.right": "Destra",
  "a11y.jump": "Salto",
  "a11y.pause": "Pausa",
  "a11y.audioOff": "Disattiva audio",
  "a11y.audioOn": "Attiva audio",
  "a11y.closeHint": "Chiudi suggerimento",
  "a11y.musicVol": "Volume musica",
  "a11y.sfxVol": "Volume effetti",
  "a11y.prevPage": "Pagina precedente",
  "a11y.nextPage": "Pagina successiva",
};
