// Tiny procedural audio (no sound files) for the crossing bell, plus the
// '70's radio (a real song, lazy-loaded only once you actually get in the
// car so it never weighs down the initial page load).
let ctx = null;
let bellTimer = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume();
}

function ding() {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.22);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.25);
}

export function startCrossingBell() {
  if (bellTimer) return;
  ding();
  bellTimer = setInterval(ding, 420);
}

export function stopCrossingBell() {
  if (bellTimer) {
    clearInterval(bellTimer);
    bellTimer = null;
  }
}

let radioEl = null;
let fadeTimer = null;

function getRadioEl() {
  if (!radioEl) {
    radioEl = new Audio("audio/take-it-back.mp3");
    radioEl.loop = true;
    radioEl.volume = 0;
    radioEl.preload = "none";
  }
  return radioEl;
}

function fadeTo(target, ms) {
  clearInterval(fadeTimer);
  const el = getRadioEl();
  const start = el.volume;
  const startTime = performance.now();
  fadeTimer = setInterval(() => {
    const t = Math.min(1, (performance.now() - startTime) / ms);
    el.volume = start + (target - start) * t;
    if (t >= 1) {
      clearInterval(fadeTimer);
      if (target === 0) el.pause();
    }
  }, 40);
}

export function playRadio() {
  const el = getRadioEl();
  if (el.paused) el.play().catch(() => {});
  fadeTo(0.55, 500);
}

export function stopRadio() {
  if (!radioEl) return;
  fadeTo(0, 400);
}
