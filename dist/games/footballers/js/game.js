/* FOOTBALLERS — 8-bit gridiron game engine.
   Original code and pixel art. Fictional teams only. */
"use strict";

/* ============================ CONSTANTS ============================ */
const W = 960, H = 540;
const FIELD_Y0 = 150;              // screen y where field starts
const PXY = 24, PXYY = 10;         // pixels per yard (x, y)
const FIELD_W = 53.3;              // yards
const EZ_L = 10, EZ_R = 110;       // endzone lines
const TICK_MS = 1000 / 30;

const TEAMS = {
  home: { name: "RAPTORS", city: "RED ROCK", color: "#d84330", dark: "#7a1d12", alt: "#ffffff" },
  away: { name: "COMETS",  city: "CLEARWATER", color: "#2f6fd8", dark: "#153a80", alt: "#ffffff" },
};

/* Offense playbook — routes are waypoints [dx, dy] relative to lineup spot, +x = downfield */
const OFF_PLAYS = [
  { id: "dive", name: "HB DIVE", desc: "Power run straight up the gut. Hold A to dive for extra yards.", type: "run",
    qbUnder: true, routes: {
      RB: [[1.5, 0], [8, 0], [16, 0]] } },
  { id: "sweep", name: "OUTSIDE SWEEP", desc: "Pitch wide, turn the corner and jet upfield.", type: "run",
    qbUnder: true, routes: {
      RB: [[1, 6], [5, 9], [9, 8], [18, 5]] } },
  { id: "slants", name: "QUICK SLANTS", desc: "Fast throws. Tap 1/2/3 to hit a receiver, or run.", type: "pass",
    qbUnder: false, routes: {
      WR1: [[2.5, 0], [10, 7]], WR2: [[2.5, 0], [10, -7]], SLOT: [[2, 0], [7, -4]] } },
  { id: "deep", name: "DEEP SHOT", desc: "Go long! Streak, post and corner routes. Let it fly.", type: "pass",
    qbUnder: false, routes: {
      WR1: [[6, 0], [26, 0]], WR2: [[5, 0], [14, 0], [24, 7]], SLOT: [[5, 0], [13, -5], [21, -12]] } },
];

/* Defense playbook */
const DEF_PLAYS = [
  { id: "goalline", name: "GOAL LINE", desc: "Pack the box. Stuff the run, slow but heavy.", blitzLB: 0, cushion: 1, zone: false, rushBias: 1 },
  { id: "man", name: "MAN COVERAGE", desc: "Stick with your man everywhere he goes.", blitzLB: 0, cushion: 1.5, zone: false, rushBias: 0 },
  { id: "zone", name: "ZONE COVERAGE", desc: "Defend areas, swarm the catch point.", blitzLB: 0, cushion: 0, zone: true, rushBias: 0 },
  { id: "blitz", name: "ALL-OUT BLITZ", desc: "Send the house. Big play or bust.", blitzLB: 2, cushion: 0.5, zone: false, rushBias: 1 },
];

/* ============================ GAME STATE ============================ */
const G = {
  state: "TITLE",            // TITLE, PLAYCALL, PRESNAP, LIVE, DEAD, GAMEOVER
  userTeam: "home",
  possession: "home",
  score: { home: 0, away: 0 },
  quarter: 1, clock: 90, suddenDeath: false,
  ballOn: 30, down: 1, toGo: 10, firstDownX: 40,
  players: [], carrier: null, controlled: null,
  offPlay: null, defPlay: null,
  ball: null,
  catchGrace: 0,                // {x,y,z, sx,sy, tx,ty, t,dur, phase:'held'|'air'|'dead'}
  losX: 30,
  banner: null,              // {text, sub, t, color}
  deadTimer: 0, playTime: 0, handoffDone: false,
  cpuQBTimer: 0, cam: { x: 40, y: 20 },
  frame: 0, celebrate: 0,
};

const cvs = document.getElementById("game");
const ctx = cvs.getContext("2d");
cvs.width = W; cvs.height = H;
ctx.imageSmoothingEnabled = false;

/* ============================ HELPERS ============================ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const rnd = (a, b) => a + Math.random() * (b - a);
const offTeam = () => G.possession;
const defTeam = () => (G.possession === "home" ? "away" : "home");
const teamCol = p => p.side === "off" ? TEAMS[offTeam()].color : TEAMS[defTeam()].color;
const teamDark = p => p.side === "off" ? TEAMS[offTeam()].dark : TEAMS[defTeam()].dark;
const userOnOffense = () => G.possession === G.userTeam;

function setBanner(text, sub = "", color = "#ffd23f", t = 1.6) { G.banner = { text, sub, color, t: t * 30 }; }

/* ============================ BUILD PLAYERS ============================ */
function buildPlayers() {
  G.players = [];
  const los = G.losX = G.ballOn;
  const cy = FIELD_W / 2;
  const play = G.offPlay;

  const add = (side, role, x, y, spd, num, label) =>
    G.players.push({ side, role, label, x, y, hx: x, hy: y, spd, num, route: null, wp: 0, animT: 0, face: 1, dived: false, gone: false });

  /* offense */
  const qbX = play.qbUnder ? los - 2 : los - 5;
  add("off", "QB", qbX, cy, 8.0, 7);
  for (let i = 0; i < 5; i++) add("off", "OL", los - 1.2, cy - 8 + i * 4, 5.5, 50 + i * 5);
  add("off", "RB", play.qbUnder ? los - 6 : los - 6.5, cy, 9.7, 28);
  add("off", "WR", los - 0.8, 5,  9.0, 11, "WR1");
  add("off", "WR", los - 0.8, 48.3, 9.0, 81, "WR2");
  add("off", "WR", los - 1.2, 13.5, 8.8, 19, "SLOT");
  add("off", "TE", los - 1.0, cy - 12, 7.0, 85);

  /* routes */
  for (const p of G.players) if (p.side === "off" && play.routes[p.label]) {
    p.route = play.routes[p.label].map(([dx, dy]) => [p.x + dx, p.y + dy]);
  }
  if (play.type === "run") {
    const rb = G.players.find(p => p.role === "RB");
    rb.route = play.routes.RB.map(([dx, dy]) => [rb.x + dx, rb.y + dy]);
  }

  /* defense */
  const d = G.defPlay;
  for (let i = 0; i < 4; i++) add("def", "DL", los + 1.3, cy - 6 + i * 4, 6.6, 90 + i);
  for (let i = 0; i < 3; i++) add("def", "LB", los + 4.5, cy - 8 + i * 8, 7.6, 40 + i * 5);
  for (let i = 0; i < 2; i++) add("def", "CB", los + 7, i === 0 ? 5.5 : 48, 8.8, 20 + i * 4);
  add("def", "CB", los + 5.5, 14.5, 8.6, 26);           // slot corner
  add("def", "S", los + 12, cy, 8.4, 31);

  /* assignments: man coverage */
  const wrs = G.players.filter(p => p.side === "off" && (p.role === "WR" || p.role === "TE" || p.role === "RB"));
  const covs = G.players.filter(p => p.side === "def" && (p.role === "CB" || p.role === "S" || (p.role === "LB" && !isBlitzing(p))));
  covs.forEach((c, i) => { c.cover = wrs[i % wrs.length]; });
  G.players.filter(p => p.side === "def" && p.role === "LB").forEach((lb, i) => {
    lb.blitz = i < d.blitzLB;
  });
}
function isBlitzing(p) {
  const lbs = G.players.filter(q => q.side === "def" && q.role === "LB");
  return lbs.indexOf(p) < G.defPlay.blitzLB;
}

/* ============================ FLOW ============================ */
function startGame() {
  G.score = { home: 0, away: 0 };
  G.quarter = 1; G.clock = 90; G.suddenDeath = false;
  G.possession = "home";
  startPossession();
}

function startPossession() {
  G.ballOn = 30; G.down = 1;
  nextFirstDown();
  G.state = "PLAYCALL";
  showPlaycall();
}

function nextFirstDown() { G.firstDownX = Math.min(110, G.ballOn + 10); G.toGo = G.firstDownX - G.ballOn; }

function showPlaycall() {
  document.getElementById("playcall-screen").classList.remove("hidden");
  const wrap = document.getElementById("play-cards");
  wrap.innerHTML = "";
  const title = document.getElementById("playcall-title");
  const userOff = userOnOffense();
  title.textContent = userOff ? `${TEAMS[offTeam()].name} OFFENSE — ${downStr()}` : `${TEAMS[defTeam()].name} DEFENSE — ${downStr()}`;
  const plays = userOff ? OFF_PLAYS : DEF_PLAYS;
  plays.forEach(p => {
    const el = document.createElement("div");
    el.className = "play-card" + (userOff ? "" : " def");
    el.innerHTML = `<div class="pc-name">${p.name}</div><div class="pc-desc">${p.desc}</div>`;
    el.addEventListener("click", () => pickPlay(p));
    wrap.appendChild(el);
  });
  Sfx.sounds.pickPlay();
}
function downStr() { return `${G.down}${["ST", "ND", "RD", "TH"][G.down - 1]} & ${Math.max(1, Math.round(G.toGo))}`; }

function pickPlay(p) {
  if (userOnOffense()) { G.offPlay = p; G.defPlay = DEF_PLAYS[Math.floor(Math.random() * DEF_PLAYS.length)]; }
  else { G.defPlay = p; G.offPlay = OFF_PLAYS[Math.floor(Math.random() * OFF_PLAYS.length)]; }
  document.getElementById("playcall-screen").classList.add("hidden");
  buildPlayers();
  G.carrier = null; G.ball = null; G.handoffDone = false; G.playTime = 0; G.cpuQBTimer = rnd(1.0, 2.2);
  G.state = "PRESNAP";
  setBanner(userOnOffense() ? "TAP SNAP TO HIKE" : "TAP SNAP WHEN READY", userOnOffense() ? G.offPlay.name : "Defend!", "#8ef58e", 2.2);
}

function snap() {
  G.state = "LIVE";
  G.carrier = G.players.find(p => p.role === "QB");
  G.ball = { phase: "held" };
  Sfx.sounds.snap();
  G.banner = null;
  G.controlled = userOnOffense() ? G.carrier
    : nearestDefTo(G.losX + 1, FIELD_W / 2);
}

function endPlay(resultText, sub, color, opts = {}) {
  if (G.state !== "LIVE") return;
  G.state = "DEAD"; G.deadTimer = opts.long ? 2.6 : 1.5;
  setBanner(resultText, sub, color, opts.long ? 2.6 : 1.5);
  Sfx.sounds.whistle();
  resolveDown(opts);
}

/* result: {spot, outcome: 'tackle'|'incomplete'|'int'|'td'|'safety'|'oob'} */
function resolveDown(r) {
  if (r.outcome === "td") return; // handled in touchdown()
  if (r.outcome === "safety") return;
  if (r.outcome === "int") { changePossession(r.spot, "INTERCEPTED!"); return; }
  if (r.outcome === "incomplete") {
    G.down++;
    if (G.down > 4) changePossession(G.ballOn, "TURNOVER ON DOWNS!");
    return;
  }
  G.ballOn = clamp(r.spot, 10.5, 109.5);
  if (G.ballOn >= G.firstDownX) {
    G.down = 1; nextFirstDown(); Sfx.sounds.firstDown();
  } else {
    G.down++;
    if (G.down > 4) return changePossession(G.ballOn, "TURNOVER ON DOWNS!");
  }
}

function changePossession(spot, why) {
  G.possession = defTeam();
  G.ballOn = clamp(spot, 11, 39);
  Sfx.sounds.turnover();
  G._pendingPossession = why;
}

function touchdown() {
  G.score[offTeam()] += 7;
  G.state = "DEAD"; G.deadTimer = 3.0; G.celebrate = 90;
  setBanner("TOUCHDOWN!!", `${TEAMS[offTeam()].city} ${TEAMS[offTeam()].name} +7`, "#ffd23f", 3.0);
  Sfx.sounds.touchdown();
  G._pendingPossession = "SCORE!";
}
function safety() {
  G.score[defTeam()] += 2;
  G.state = "DEAD"; G.deadTimer = 2.6;
  setBanner("SAFETY!", `${TEAMS[defTeam()].name} +2`, "#ff9a3f", 2.6);
  Sfx.sounds.turnover();
  G._pendingPossession = "SAFETY";
}

function afterDead() {
  // quarter / clock
  if (G.clock <= 0) {
    if (G.quarter >= 4) {
      if (G.score.home !== G.score.away) return gameOver();
      G.suddenDeath = true; G.quarter = 5;
      setBanner("OVERTIME", "Next score wins!", "#8ef58e", 2.5);
    } else {
      G.quarter++; G.clock = 90;
      Sfx.sounds.quarter();
      setBanner(`END OF Q${G.quarter - 1}`, "", "#8ef58e", 2);
    }
  }
  if (G._pendingPossession) {
    G._pendingPossession = null;
    startPossession();
    return;
  }
  G.state = "PLAYCALL";
  showPlaycall();
}

function gameOver() {
  G.state = "GAMEOVER";
  document.getElementById("touch-ui").classList.add("hidden");
  const win = G.score[G.userTeam] > G.score[defTeamOf(user())] ;
  const fs = document.getElementById("final-score");
  fs.textContent = `FINAL: ${G.score.home} - ${G.score.away}`;
  document.getElementById("gameover-screen").classList.remove("hidden");
}
function user() { return G.userTeam; }
function defTeamOf(t) { return t === "home" ? "away" : "home"; }

/* ============================ SIMULATION ============================ */
function nearestDefTo(x, y) {
  let best = null, bd = 1e9;
  for (const p of G.players) if (p.side === "def") {
    const d = dist(p.x, p.y, x, y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
function steer(p, tx, ty, speedMul = 1) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d < 0.15) return;
  const v = p.spd * speedMul / 30;
  p.x += dx / d * v; p.y += dy / d * v;
  p.animT += v * 1.6;
  if (Math.abs(dx) > 0.2) p.face = dx > 0 ? 1 : -1;
}
function followRoute(p) {
  if (!p.route || p.wp >= p.route.length) {
    // improvise downfield
    steer(p, p.x + 5, clamp(p.y, 3, 50), 0.85);
    return;
  }
  const [tx, ty] = p.route[p.wp];
  steer(p, tx, ty, 0.95);
  if (dist(p.x, p.y, tx, ty) < 0.8) p.wp++;
}

function simLive() {
  G.playTime += 1 / 30;
  G.clock = Math.max(0, G.clock - 1 / 30);
  const qb = G.players.find(p => p.role === "QB");
  const rb = G.players.find(p => p.role === "RB");
  const runPlay = G.offPlay.type === "run";

  /* --- handoff for run plays --- */
  if (runPlay && !G.handoffDone && G.playTime > 0.2 && G.carrier === qb) {
    G.handoffDone = true;
    G.carrier = rb;
    if (userOnOffense()) G.controlled = rb;
  }

  /* --- CPU offense brain --- */
  if (!userOnOffense()) {
    if (runPlay) {
      if (G.carrier === rb) followRoute(rb);
    } else {
      // dropback then throw to most open receiver
      if (G.carrier === qb) {
        if (G.playTime < 1.0) steer(qb, G.losX - 6.5, qb.hy, 0.8);
        G.cpuQBTimer -= 1 / 30;
        const scrambled = qb.x > G.losX;
        if ((G.cpuQBTimer <= 0 || scrambled) && G.ball.phase === "held") {
          const rcs = G.players.filter(p => p.label);
          let best = null, bs = -1;
          for (const r of rcs) {
            const d = nearestDefTo(r.x, r.y);
            const s = d ? dist(d.x, d.y, r.x, r.y) - (r.x - G.losX) * 0.05 : 5;
            if (s > bs) { bs = s; best = r; }
          }
          if (best && G.playTime > 0.6) throwPass(best);
          else G.cpuQBTimer = 0.4;
        }
        if (scrambled) steer(qb, qb.x + 3, qb.y, 0.9); // QB runs
      } else followRoute(G.carrier);
    }
  }

  /* --- receivers --- */
  for (const p of G.players) {
    if (p.side === "off" && p.label && p !== G.carrier && !p.dived) {
      if (G.ball && G.ball.phase === "air" && G.ball.target === p) {
        steer(p, G.ball.tx, G.ball.ty, 1);
      } else followRoute(p);
    }
  }

  /* --- OL blocking: each lineman takes the i-th nearest rusher to the ball --- */
  {
    const protect2 = G.carrier || qb;
    const threats = G.players.filter(d => d.side === "def" && d.role !== "CB" && d.role !== "S")
      .sort((a, b) => dist(a.x, a.y, protect2.x, protect2.y) - dist(b.x, b.y, protect2.x, protect2.y));
    G.players.filter(p => p.role === "OL").forEach((p, i) => {
      const t = threats[i];
      if (t) steer(p, t.x - 0.6, t.y, 0.95);
    });
  }

  /* --- defense --- */
  const carrier = G.carrier;
  for (const p of G.players) if (p.side === "def" && !p.gone) {
    let mul = 1;
    /* blocker engagement: nearest OL parked on him slows him down */
    for (const o of G.players) if (o.role === "OL" && dist(o.x, o.y, p.x, p.y) < 0.9) {
      mul = 0.35;
      p.x += (p.x - o.x) * 0.02; // shed slowly
    }
    if (G.ball && G.ball.phase === "air") {
      /* defenders react to the ball only when it's near landing or close to them */
      const near = dist(p.x, p.y, G.ball.tx, G.ball.ty) < 9;
      if (near || G.ball.t > 0.62) steer(p, G.ball.tx, G.ball.ty, mul);
      else if (p.cover) steer(p, p.cover.x + 1.5, p.cover.y, mul * 0.9);
      continue;
    }
    const runDetected = runPlay && G.handoffDone;
    const carrierPastLOS = carrier && carrier.x > G.losX + 0.5;
    const pursuer = p.role === "DL" || p.blitz || p.role === "LB";
    const closeEnough = carrier && dist(p.x, p.y, carrier.x, carrier.y) < 8;
    if (p.role === "DL" || p.blitz || (runDetected && pursuer) || carrierPastLOS || (runDetected && closeEnough)) {
      steer(p, carrier.x, carrier.y, mul * (p.role === "DL" ? 1 : 0.93));
    } else if (G.defPlay.zone) {
      const zoneX = p.role === "S" ? G.losX + 13 : G.losX + 8;
      let near = null, nd = 9;
      for (const o of G.players) if (o.side === "off" && o.label) {
        const dd = dist(o.x, o.y, zoneX, p.y);
        if (dd < nd) { nd = dd; near = o; }
      }
      steer(p, near ? (near.x + zoneX) / 2 : zoneX, near ? (near.y + p.y) / 2 : p.y, 0.92);
    } else {
      const m = p.cover;
      if (m && (m.role === "RB" || m.role === "QB")) {
        p.spy = true;
        steer(p, G.losX + 3, p.y, 0.9); // spy the backfield from line depth, don't hover by the QB
      } else if (m) {
        p.spy = false;
        steer(p, m.x + G.defPlay.cushion, m.y, 0.96);
      } else {
        p.spy = false;
        steer(p, carrier.x, carrier.y, 0.95);
      }
    }
  }

  /* --- human control --- */
  if (userOnOffense() && carrier) {
    G.controlled = carrier === qb && G.handoffDone ? rb : carrier;
    const m = Input.move;
    if (m.x || m.y) {
      carrier.x += m.x * carrier.spd / 30;
      carrier.y += m.y * carrier.spd / 30;
      carrier.animT += 0.35;
      if (Math.abs(m.x) > 0.2) carrier.face = m.x > 0 ? 1 : -1;
    } else if (carrier.role === "RB" && carrier.route) {
      followRoute(carrier); // auto-run assist until the player steers
    } else if (carrier.role !== "QB") {
      steer(carrier, carrier.x + 4, carrier.y, 0.9); // caught pass: hustle upfield
    }
    if (carrier !== qb && Input.consume("ActionA") && !carrier.dived) {
      carrier.dived = true;
      carrier.x += carrier.face * 1.4;
    }
    if (carrier.dived && G.ball.phase === "held") {
      if (carrier.x >= EZ_R) return touchdown();
      return endPlay("DIVED FORWARD", gainStr(carrier.x), "#cfe8cf", { spot: carrier.x, outcome: "tackle" });
    }
    // pass buttons
    for (let i = 0; i < 3; i++) if (Input.consume("Rcv" + i) && carrier === qb && G.ball.phase === "held") {
      const rcv = G.players.filter(p => p.label)[i];
      if (rcv) throwPass(rcv);
    }
  } else if (!userOnOffense()) {
    const c = G.controlled;
    if (c && !c.gone) {
      const m = Input.move;
      if (m.x || m.y) {
        c.x += m.x * c.spd / 30; c.y += m.y * c.spd / 30;
        c.animT += 0.35;
        if (Math.abs(m.x) > 0.2) c.face = m.x > 0 ? 1 : -1;
      }
      if (Input.consume("ActionB")) {
        G.controlled = nearestDefTo(G.carrier ? G.carrier.x : G.losX, G.carrier ? G.carrier.y : FIELD_W / 2);
        Sfx.sounds.ui();
      }
      if (Input.consume("ActionA") && G.carrier && dist(c.x, c.y, G.carrier.x, G.carrier.y) < 2.2 && !c.dived) {
        c.dived = true; steer(c, G.carrier.x, G.carrier.y, 2.2);
      }
    }
  }

  /* --- ball in air --- */
  if (G.ball.phase === "air") {
    G.ball.t += 1 / 30 / G.ball.dur;
    const k = Math.min(1, G.ball.t);
    G.ball.x = G.ball.sx + (G.ball.tx - G.ball.sx) * k;
    G.ball.y = G.ball.sy + (G.ball.ty - G.ball.sy) * k;
    G.ball.h = Math.sin(k * Math.PI) * G.ball.arc;
    if (k >= 1) return resolveCatch();
  }

  /* --- carrier bounds / scoring --- */
  if (G.ball.phase === "held" && carrier) {
    carrier.y = clamp(carrier.y, -1.5, FIELD_W + 1.5);
    if (carrier.y < 0.3 || carrier.y > FIELD_W - 0.3) {
      return endPlay("OUT OF BOUNDS", gainStr(carrier.x), "#cfe8cf", { spot: carrier.x, outcome: "oob" });
    }
    if (carrier.x >= EZ_R) return touchdown();
    if (carrier.x <= EZ_L && carrier.role !== "QB") return safety();
    /* tackle check */
    if (G.catchGrace > 0) G.catchGrace--;
    const tackleR = G.catchGrace > 0 ? 0.3 : 0.75;
    for (const d of G.players) if (d.side === "def" && !d.gone) {
      if (d.spy && carrier.role === "QB") continue; // coverage can't sack the QB
      if (dist(d.x, d.y, carrier.x, carrier.y) < tackleR) {
        Sfx.sounds.hit();
        return endPlay("TACKLED!", gainStr(carrier.x), "#ffb0a0", { spot: carrier.x, outcome: carrier.x <= EZ_L ? "safety" : "tackle" });
      }
    }
  }

  /* camera */
  const fx = G.ball.phase === "air" ? G.ball.x : (carrier ? carrier.x : G.losX);
  const fy = G.ball.phase === "air" ? G.ball.y : (carrier ? carrier.y : FIELD_W / 2);
  G.cam.x += (clamp(fx, 20, 100) - G.cam.x) * 0.12;
  G.cam.y += (clamp(fy, 12, FIELD_W - 12) - G.cam.y) * 0.12;
}

function gainStr(spot) {
  const g = Math.round(spot - G.ballOn);
  return g > 0 ? `GAIN OF ${g}` : g === 0 ? "NO GAIN" : `LOSS OF ${-g}`;
}

function throwPass(rcv) {
  const qb = G.carrier;
  const d = dist(qb.x, qb.y, rcv.x, rcv.y);
  const dur = clamp(d / 22, 0.35, 1.1);
  const tx = rcv.x + (rcv.route && rcv.wp < rcv.route.length ? 1.5 : 0.5);
  const ty = rcv.y;
  G.ball = { phase: "air", x: qb.x, y: qb.y, sx: qb.x, sy: qb.y, tx, ty, t: 0, dur, arc: clamp(d * 0.4, 1, 4), target: rcv };
  G.carrier = null;
  Sfx.sounds.ui();
}

function resolveCatch() {
  const b = G.ball;
  let recv = null, rd = 1.8, defr = null, dd = 1e9;
  for (const p of G.players) {
    const d = dist(p.x, p.y, b.tx, b.ty);
    if (p.side === "off" && d < rd) { rd = d; recv = p; }
    if (p.side === "def" && d < dd) { dd = d; defr = p; }
  }
  if (defr && (!recv || dd < rd - 0.5) && dd < 1.0) {
    Sfx.cheer();
    endPlay("INTERCEPTED!", "", "#ff9a3f", { spot: b.tx, outcome: "int" });
  } else if (recv && b.target === recv) {
    G.carrier = recv; b.phase = "held";
    G.catchGrace = 12; // brief catch-and-turn window before a tackle registers
    if (userOnOffense()) G.controlled = recv;
    Sfx.sounds.catchIt();
  } else {
    Sfx.sounds.incomplete();
    endPlay("INCOMPLETE", "", "#cfe8cf", { outcome: "incomplete" });
  }
}

/* ============================ RENDER ============================ */
const CROWD = [];
(function buildCrowd() {
  const pal = ["#e8d8b0","#c9906a","#8a5a3a","#5a7a9a","#b04a3a","#3a6a4a","#d8c04a","#7a4a8a","#e0e0e0","#404858","#a03a5a","#3a8a8a"];
  for (let row = 0; row < 9; row++)
    for (let i = 0; i < 64; i++)
      CROWD.push({ x: (i * 15 + (row % 2) * 7) % W, y: 14 + row * 13, c: pal[(Math.random() * pal.length) | 0], ph: Math.random() * 6.28 });
})();

function w2s(x, y) { return [ (x - G.cam.x) * PXY + W / 2, FIELD_Y0 + (y - G.cam.y) * PXYY ]; }

function render(t) {
  /* sky + stadium */
  ctx.fillStyle = "#0a2a4a"; ctx.fillRect(0, 0, W, FIELD_Y0);
  ctx.fillStyle = "#123a5a"; ctx.fillRect(0, 0, W, 8);
  /* crowd */
  const excite = G.celebrate > 0 ? 1 : (G.state === "LIVE" && G.carrier && G.carrier.x > G.losX + 8 ? 0.6 : 0.15);
  for (const c of CROWD) {
    const j = Math.sin(t / 130 + c.ph) * (1 + excite * 4);
    ctx.fillStyle = c.c;
    ctx.fillRect(c.x, c.y + j, 4, 6);
  }
  /* wall */
  ctx.fillStyle = "#1a1a2a"; ctx.fillRect(0, 128, W, 22);
  ctx.fillStyle = "#ffd23f";
  for (let x = 20; x < W; x += 240) ctx.fillText("· FOOTBALLERS ·", x, 143);

  /* field */
  const [fx0] = w2s(0, 0);
  ctx.fillStyle = "#2e7d32"; ctx.fillRect(0, FIELD_Y0, W, H - FIELD_Y0);
  for (let yd = Math.floor(G.cam.x - 25); yd < G.cam.x + 25; yd++) {
    if (yd < 0 || yd > 120) continue;
    const [sx] = w2s(yd, 0);
    if (yd >= EZ_L && yd < EZ_R) {
      ctx.fillStyle = yd % 10 < 5 ? "#2e8d3a" : "#27772f";
      ctx.fillRect(sx, FIELD_Y0, PXY * 5, H - FIELD_Y0);
    }
  }
  /* endzones */
  const [ezl] = w2s(EZ_L, 0), [ezr] = w2s(EZ_R, 0);
  ctx.fillStyle = TEAMS.away.dark; ctx.fillRect(ezl - PXY * 10, FIELD_Y0, PXY * 10, H - FIELD_Y0);
  ctx.fillStyle = TEAMS.home.dark; ctx.fillRect(ezr, FIELD_Y0, PXY * 10, H - FIELD_Y0);
  ctx.save(); ctx.translate(ezl - PXY * 5, FIELD_Y0 + 150); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#ffffffb0"; ctx.font = "bold 26px monospace"; ctx.textAlign = "center";
  ctx.fillText(TEAMS.away.name, 0, 8); ctx.restore();
  ctx.save(); ctx.translate(ezr + PXY * 5, FIELD_Y0 + 150); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#ffffffb0"; ctx.font = "bold 26px monospace"; ctx.textAlign = "center";
  ctx.fillText(TEAMS.home.name, 0, 8); ctx.restore();

  /* yard numbers + hashes */
  ctx.fillStyle = "#e8f5e8cc"; ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
  for (let yd = 20; yd <= 100; yd += 10) {
    const [sx] = w2s(yd, 0);
    if (sx < -40 || sx > W + 40) continue;
    const n = yd <= 60 ? yd - 10 : 110 - yd;
    ctx.fillText(String(n), sx, FIELD_Y0 + 95); ctx.fillText(String(n), sx, H - 75);
    ctx.fillStyle = "#e8f5e8aa";
    for (let hy = 1; hy < 4; hy++) {
      const yy = FIELD_Y0 + hy * (H - FIELD_Y0) / 4;
      ctx.fillRect(sx - 22, yy - 1, 8, 2); ctx.fillRect(sx + 14, yy - 1, 8, 2);
    }
    ctx.fillStyle = "#e8f5e8cc";
  }
  /* LOS + first down */
  if (G.state === "PRESNAP" || G.state === "LIVE" || G.state === "DEAD") {
    let [lx] = w2s(G.losX, 0); ctx.fillStyle = "#3f6fff"; ctx.fillRect(lx - 1, FIELD_Y0, 3, H - FIELD_Y0);
    let [fx] = w2s(G.firstDownX, 0); ctx.fillStyle = "#ffd23f"; ctx.fillRect(fx - 1, FIELD_Y0, 3, H - FIELD_Y0);
  }

  /* players (depth sort) */
  const sorted = [...G.players].sort((a, b) => a.y - b.y);
  for (const p of sorted) drawPlayer(p, t);

  /* ball */
  if (G.ball && G.ball.phase === "air") drawBall(G.ball.x, G.ball.y, G.ball.h);
  else if (G.carrier) drawBall(G.carrier.x + 0.35 * G.carrier.face, G.carrier.y, 0.8);

  drawHUD();
  if (G.banner) {
    ctx.textAlign = "center";
    ctx.font = "bold 42px monospace";
    ctx.fillStyle = "#000"; ctx.fillText(G.banner.text, W / 2 + 3, 250 + 3);
    ctx.fillStyle = G.banner.color; ctx.fillText(G.banner.text, W / 2, 250);
    if (G.banner.sub) {
      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "#fff"; ctx.fillText(G.banner.sub, W / 2, 282);
    }
  }
}

function drawPlayer(p, t) {
  if (p.gone) return;
  const [sx, sy] = w2s(p.x, p.y);
  if (sx < -20 || sx > W + 20) return;
  const f = Math.floor(p.animT) % 2;
  const col = teamCol(p), dark = teamDark(p);
  /* shadow */
  ctx.fillStyle = "#00000040"; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 7, 3, 0, 0, 6.28); ctx.fill();
  /* controlled ring */
  if (p === G.controlled && G.state === "LIVE") {
    ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy + 2, 10, 4, 0, 0, 6.28); ctx.stroke();
  }
  const y0 = sy - 20;
  /* legs */
  ctx.fillStyle = "#222";
  ctx.fillRect(sx - 4, y0 + 13, 3, 6 + f * 2);
  ctx.fillRect(sx + 1, y0 + 13, 3, 8 - f * 2);
  /* torso */
  ctx.fillStyle = col; ctx.fillRect(sx - 5, y0 + 6, 10, 8);
  ctx.fillStyle = dark; ctx.fillRect(sx - 5, y0 + 12, 10, 2);
  /* arms */
  ctx.fillStyle = col; ctx.fillRect(sx - 7, y0 + 7 + f, 2, 5); ctx.fillRect(sx + 5, y0 + 7 + (1 - f), 2, 5);
  /* helmet */
  ctx.fillStyle = col; ctx.fillRect(sx - 4, y0, 8, 6);
  ctx.fillStyle = "#cfd6df"; ctx.fillRect(sx + (p.face > 0 ? 2 : -4), y0 + 3, 2, 2); // facemask
  ctx.fillStyle = "#fff"; ctx.fillRect(sx - 2, y0 + 2, 1, 1); // eye glint
  /* number */
  ctx.fillStyle = p.side === "off" ? "#fff" : "#ffe0e0";
  ctx.font = "8px monospace"; ctx.textAlign = "center";
  ctx.fillText(String(p.num), sx, y0 + 12);
  /* receiver labels */
  if (p.side === "off" && p.label && G.state === "LIVE" && userOnOffense() && G.ball && G.ball.phase === "held" && G.carrier && G.carrier.role === "QB") {
    const i = G.players.filter(q => q.label).indexOf(p);
    ctx.fillStyle = "#ffd23f"; ctx.font = "bold 12px monospace";
    ctx.fillText(String(i + 1), sx, y0 - 6);
  }
}

function drawBall(x, y, h) {
  const [sx, sy] = w2s(x, y);
  ctx.fillStyle = "#00000040"; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 4, 2, 0, 0, 6.28); ctx.fill();
  const by = sy - 4 - h * 10;
  ctx.fillStyle = "#8a4a20"; ctx.fillRect(sx - 3, by, 6, 4);
  ctx.fillStyle = "#fff"; ctx.fillRect(sx - 1, by + 1, 2, 1);
}

function drawHUD() {
  /* scoreboard bar */
  ctx.fillStyle = "#000000c8"; ctx.fillRect(0, 0, W, 26);
  ctx.font = "bold 15px monospace"; ctx.textAlign = "left";
  const h = TEAMS.home, a = TEAMS.away;
  ctx.fillStyle = h.color; ctx.fillText(h.name, 14, 19);
  ctx.fillStyle = "#fff"; ctx.fillText(String(G.score.home), 14 + ctx.measureText(h.name).width + 8, 19);
  const hw = ctx.measureText(h.name).width;
  ctx.fillStyle = "#888"; ctx.fillText("–", 100, 19);
  ctx.fillStyle = a.color; ctx.fillText(a.name, 120, 19);
  ctx.fillStyle = "#fff"; ctx.fillText(String(G.score.away), 120 + ctx.measureText(a.name).width + 8, 19);
  const q = G.suddenDeath ? "OT" : "Q" + G.quarter;
  const mm = Math.floor(G.clock / 60), ss = Math.floor(G.clock % 60);
  ctx.textAlign = "right";
  ctx.fillStyle = "#8ef58e"; ctx.fillText(`${q}  ${mm}:${String(ss).padStart(2, "0")}`, W - 14, 19);
  if (G.state !== "TITLE" && G.state !== "GAMEOVER") {
    ctx.fillStyle = "#ffd23f"; ctx.fillText(`${downStr()} at ${Math.round(G.ballOn)}`, W - 150, 19);
  }
  /* possession arrow */
  ctx.textAlign = "center";
  ctx.fillStyle = TEAMS[G.possession].color;
  ctx.fillText("◄►", W / 2, 19);
}

/* ============================ MAIN LOOP ============================ */
let last = 0, acc = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(100, t - last); last = t; acc += dt;
  while (acc >= TICK_MS) { acc -= TICK_MS; tick(); }
  if (G.state !== "TITLE" && G.state !== "GAMEOVER") render(t);
  else { render(t); }
}

function tick() {
  G.frame++;
  Input.poll();
  if (G.celebrate > 0) G.celebrate--;
  if (G.banner && --G.banner.t <= 0) G.banner = null;

  if (G.state === "PRESNAP") {
    if (Input.consume("ActionA")) snap();
  } else if (G.state === "LIVE") {
    simLive();
  } else if (G.state === "DEAD") {
    if (--G.deadTimer <= 0) afterDead();
  }
  const excite = G.celebrate > 0 ? 1 : (G.state === "LIVE" && G.carrier && G.carrier.x > G.losX + 8 ? 0.6 : 0.15);
  Sfx.tickCrowd(excite);
  Input.clearFrame();
}

/* ============================ BOOT ============================ */
document.getElementById("btn-start").addEventListener("click", () => {
  Sfx.resume(); Sfx.startCrowd();
  document.getElementById("title-screen").classList.add("hidden");
  document.getElementById("touch-ui").classList.remove("hidden");
  Input.init();
  startGame();
});
document.getElementById("btn-again").addEventListener("click", () => {
  document.getElementById("gameover-screen").classList.add("hidden");
  document.getElementById("touch-ui").classList.remove("hidden");
  startGame();
});

requestAnimationFrame(loop);
