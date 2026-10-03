/* FOOTBALLERS — input: touch joystick + buttons, keyboard fallback.
   Produces a normalized move vector and edge-triggered actions. */
"use strict";
const Input = (() => {
  const move = { x: 0, y: 0 };          // -1..1
  const pressed = {};                    // action -> true for one frame consumption
  let joyId = null, joyOrigin = { x: 0, y: 0 };

  function setStick(dx, dy) {
    const max = 48;
    move.x = Math.max(-1, Math.min(1, dx / max));
    move.y = Math.max(-1, Math.min(1, dy / max));
  }

  function bindJoystick() {
    const zone = document.getElementById("joy-zone");
    const base = document.getElementById("joy-base");
    const stick = document.getElementById("joy-stick");
    zone.addEventListener("touchstart", e => {
      const t = e.changedTouches[0];
      joyId = t.identifier;
      joyOrigin = { x: t.clientX, y: t.clientY };
      base.style.display = "block";
      base.style.left = (t.clientX - 48) + "px";
      base.style.top = (t.clientY - 48) + "px";
      e.preventDefault();
    }, { passive: false });
    zone.addEventListener("touchmove", e => {
      for (const t of e.changedTouches) if (t.identifier === joyId) {
        setStick(t.clientX - joyOrigin.x, t.clientY - joyOrigin.y);
        stick.style.transform = `translate(calc(-50% + ${move.x * 26}px), calc(-50% + ${move.y * 26}px))`;
      }
      e.preventDefault();
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) if (t.identifier === joyId) {
        joyId = null; move.x = 0; move.y = 0;
        base.style.display = "none";
        stick.style.transform = "translate(-50%,-50%)";
      }
    };
    zone.addEventListener("touchend", end);
    zone.addEventListener("touchcancel", end);
  }

  function bindBtn(id, action) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("touchstart", e => { pressed[action] = true; e.preventDefault(); }, { passive: false });
    el.addEventListener("mousedown", () => { pressed[action] = true; });
  }

  const keys = {};
  window.addEventListener("keydown", e => {
    if (!keys[e.code]) pressed[e.code] = true;
    keys[e.code] = true;
    if (["1", "2", "3"].includes(e.key)) pressed["Digit" + e.key] = true;
  });
  window.addEventListener("keyup", e => { keys[e.code] = false; });

  function init() {
    bindJoystick();
    bindBtn("btn-a", "ActionA");
    bindBtn("btn-b", "ActionB");
    document.querySelectorAll(".tbtn-r").forEach(b =>
      b.addEventListener("touchstart", e => { pressed["Rcv" + b.dataset.rcv] = true; e.preventDefault(); }, { passive: false }));
  }

  // keyboard into move vector each frame
  function poll() {
    let kx = 0, ky = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) kx -= 1;
    if (keys["ArrowRight"] || keys["KeyD"]) kx += 1;
    if (keys["ArrowUp"] || keys["KeyW"]) ky -= 1;
    if (keys["ArrowDown"] || keys["KeyS"]) ky += 1;
    if (kx || ky) { const l = Math.hypot(kx, ky); move.x = kx / l; move.y = ky / l; }
  }

  function consume(action) {
    const alias = { Space: "ActionA", KeyX: "ActionB", ShiftLeft: "ActionB" };
    let hit = false;
    for (const k of [action, ...Object.keys(alias).filter(k => alias[k] === action)]) {
      if (pressed[k]) { hit = true; delete pressed[k]; }
    }
    for (let i = 0; i < 3; i++) {
      if (action === "Rcv" + i && pressed["Digit" + (i + 1)]) { hit = true; delete pressed["Digit" + (i + 1)]; }
    }
    return hit;
  }
  function clearFrame() { for (const k in pressed) delete pressed[k]; }

  return { init, poll, consume, clearFrame, move };
})();
