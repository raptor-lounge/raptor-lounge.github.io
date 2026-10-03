/* FOOTBALLERS — 8-bit chiptune audio engine (WebAudio, no assets). */
"use strict";
const Sfx = (() => {
  let ctx = null, master = null, crowdGain = null, crowdSrc = null, muted = false;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  }
  function resume() { init(); if (ctx.state === "suspended") ctx.resume(); }

  function tone(freq, dur, type = "square", vol = 0.25, when = 0, slide = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.3, when = 0, lowpass = 1200) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lowpass;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }

  // looping crowd rumble (filtered noise), intensity 0..1
  function startCrowd() {
    init();
    if (crowdSrc) return;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 8; }
    crowdSrc = ctx.createBufferSource(); crowdSrc.buffer = buf; crowdSrc.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 500; f.Q.value = 0.5;
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0.03;
    crowdSrc.connect(f); f.connect(crowdGain); crowdGain.connect(master);
    crowdSrc.start();
  }
  function setCrowd(intensity) { // 0..1
    if (crowdGain && !muted) crowdGain.gain.setTargetAtTime(0.02 + intensity * 0.16, ctx.currentTime, 0.3);
  }
  function cheer() {
    noise(0.9, 0.35, 0, 2500);
    setCrowdTemp(1);
  }
  let cheerT = 0;
  function setCrowdTemp(v) {
    cheerT = performance.now() + 1600;
  }
  function tickCrowd(base) {
    if (!crowdGain) return;
    const hot = performance.now() < cheerT ? 1 : 0;
    setCrowd(Math.min(1, base + hot));
  }

  const sounds = {
    snap()      { tone(180, 0.06, "square", 0.3); noise(0.05, 0.2, 0, 800); },
    whistle()   { tone(2350, 0.14, "triangle", 0.22); tone(2350, 0.14, "triangle", 0.22, 0.18); },
    hit()       { noise(0.12, 0.5, 0, 700); tone(90, 0.1, "square", 0.3, 0, -40); },
    catchIt()   { tone(660, 0.05, "square", 0.25); tone(990, 0.07, "square", 0.25, 0.05); },
    incomplete(){ tone(300, 0.12, "square", 0.2, 0, -120); },
    ui()        { tone(520, 0.05, "square", 0.2); },
    pickPlay()  { tone(392, 0.05, "square", 0.2); tone(523, 0.06, "square", 0.2, 0.05); },
    touchdown() {
      const seq = [392, 523, 659, 784, 659, 784, 1046];
      seq.forEach((f, i) => tone(f, 0.12, "square", 0.28, i * 0.11));
      cheer();
    },
    firstDown(){ tone(523, 0.08, "square", 0.25); tone(659, 0.1, "square", 0.25, 0.08); cheer(); },
    turnover() { tone(220, 0.15, "sawtooth", 0.25, 0, -100); tone(160, 0.2, "sawtooth", 0.25, 0.14, -60); },
    quarter()  { tone(880, 0.1, "triangle", 0.25); tone(880, 0.1, "triangle", 0.25, 0.15); },
  };

  return { resume, startCrowd, tickCrowd, setCrowd, cheer, sounds,
    toggleMute() { muted = !muted; if (crowdGain) crowdGain.gain.value = muted ? 0 : 0.03; return muted; } };
})();
