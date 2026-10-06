// Procedural sound effects (no sound files): the crossing bell and train
// horn, the fire-station siren, mission blips, the gators, Dr. Pebber cans.
import { getCtx, tone, noise } from "./engine.js";

let bellTimer = null;
let bellVolume = 0.08;
let lastHorn = 0;

function ding() {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, bellVolume), c.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.22);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.25);
}

export function setBellVolume(v) {
  bellVolume = Math.max(0, Math.min(0.1, v));
}

// Two long, one short, one long — the grade-crossing horn pattern, on a
// slightly sour three-note chord like a real freight horn.
export function playHorn(volume = 0.12) {
  const c = getCtx();
  if (!c || volume < 0.005) return;
  const now = c.currentTime;
  if (now - lastHorn < 8) return;
  lastHorn = now;
  const pattern = [[0, 1.1], [1.35, 1.1], [2.7, 0.45], [3.35, 1.6]];
  for (const [start, len] of pattern) {
    for (const f of [311, 370, 466]) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(volume / 3, now + start + 0.06);
      g.gain.setValueAtTime(volume / 3, now + start + len - 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + len);
      osc.connect(g).connect(c.destination);
      osc.start(now + start);
      osc.stop(now + start + len + 0.05);
    }
  }
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

// Fire-station siren: two detuned sawtooths swept up and down by a slow
// LFO, through a lowpass so it wails instead of buzzing.
let siren = null;
export function startSiren() {
  const c = getCtx();
  if (!c || siren) return;
  const out = c.createGain();
  out.gain.value = 0.0001;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1800;
  lp.connect(out).connect(c.destination);
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.32;
  const depth = c.createGain();
  depth.gain.value = 330;
  lfo.connect(depth);
  const oscs = [0, 7].map((det) => {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 820;
    o.detune.value = det;
    depth.connect(o.frequency);
    o.connect(lp);
    o.start();
    return o;
  });
  lfo.start();
  out.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 0.8);
  siren = { out, oscs, lfo };
}

export function setSirenVolume(v) {
  const c = getCtx();
  if (!c || !siren) return;
  siren.out.gain.setTargetAtTime(Math.max(0.0001, Math.min(0.08, v)), c.currentTime, 0.2);
}

export function stopSiren() {
  const c = getCtx();
  if (!c || !siren) return;
  const s = siren;
  siren = null;
  s.out.gain.setTargetAtTime(0.0001, c.currentTime, 0.25);
  setTimeout(() => {
    for (const o of [...s.oscs, s.lfo]) o.stop();
  }, 1500);
}

// New objective: two-note ping.
export function playObjective() {
  tone(880, 0, 0.12, { type: "triangle", vol: 0.07 });
  tone(1320, 0.12, 0.22, { type: "triangle", vol: 0.07 });
}

// Punch / ram impact.
export function playHit() {
  noise(0, 0.12, { vol: 0.35, freq: 900, q: 0.7 });
  tone(140, 0, 0.14, { type: "sine", vol: 0.12, slide: 0.5 });
}

// Ninja vanishing in a puff of smoke.
export function playPoof() {
  noise(0, 0.45, { vol: 0.14, freq: 2600, q: 0.5, type: "highpass" });
}

// A ninja's kick landing on Sidney.
export function playOof() {
  tone(220, 0, 0.18, { type: "square", vol: 0.04, slide: 0.6 });
  noise(0, 0.1, { vol: 0.2, freq: 600 });
}

// Gator hiss: a long breathy highpassed exhale.
export function playHiss(volume = 0.16) {
  noise(0, 0.9, { vol: volume, freq: 3200, q: 0.4, type: "highpass" });
  noise(0.05, 0.7, { vol: volume * 0.6, freq: 1400, q: 1.2 });
}

// Jaws slamming shut.
export function playSnap() {
  noise(0, 0.06, { vol: 0.45, freq: 1800, q: 1.5 });
  tone(90, 0, 0.12, { type: "square", vol: 0.08, slide: 0.6 });
}

// Countdown tick (last ten seconds) and a sad trombone-ish miss.
export function playTick(urgent = false) {
  tone(urgent ? 1760 : 1320, 0, 0.05, { type: "square", vol: 0.04 });
}
export function playFail() {
  [392, 370, 349, 311].forEach((f, i) => tone(f, i * 0.28, i === 3 ? 0.7 : 0.26, { type: "sawtooth", vol: 0.04, slide: i === 3 ? 0.9 : 1 }));
}

// Cracking open a can: the tab pop, a fizz, and a rising whoosh for the boost.
export function playFizz() {
  noise(0, 0.05, { vol: 0.4, freq: 3000, q: 1.2 });
  noise(0.04, 0.6, { vol: 0.16, freq: 5200, q: 0.3, type: "highpass" });
  tone(300, 0.05, 0.45, { type: "sawtooth", vol: 0.035, slide: 3 });
  tone(600, 0.1, 0.4, { type: "triangle", vol: 0.04, slide: 2.2 });
}

// Boost wearing off: a short falling tone.
export function playBoostEnd() {
  tone(700, 0, 0.3, { type: "triangle", vol: 0.04, slide: 0.5 });
}

// Radio static, for the moment the dial swings back to the station.
export function playTuneStatic() {
  noise(0, 0.5, { vol: 0.05, freq: 2400, q: 0.4 });
  tone(900, 0, 0.35, { type: "sine", vol: 0.012, slide: 1.8 });
}

// Party-popper crack for the confetti.
export function playPop() {
  noise(0, 0.08, { vol: 0.5, freq: 2400, q: 0.6, type: "highpass" });
  tone(1800, 0, 0.12, { type: "triangle", vol: 0.05, slide: 0.4 });
  noise(0.42, 0.07, { vol: 0.35, freq: 2600, q: 0.6, type: "highpass" });
}

// ---------- Fishing (Granny's Lake) ----------
// Rod whipping forward and the line singing out.
export function playCast() {
  noise(0, 0.28, { vol: 0.12, freq: 1800, q: 0.6, type: "highpass" });
  tone(1400, 0.05, 0.5, { type: "sine", vol: 0.015, slide: 0.6 });
}
// The steak and bobber landing.
export function playPlop() {
  tone(420, 0, 0.12, { type: "sine", vol: 0.08, slide: 0.45 });
  noise(0.02, 0.18, { vol: 0.1, freq: 900, q: 0.8 });
}
// Water churning: big = the gator thrashing or coming out of the lake.
export function playSplash(big = false) {
  noise(0, big ? 0.9 : 0.35, { vol: big ? 0.3 : 0.16, freq: big ? 700 : 1100, q: 0.5 });
  noise(0.03, big ? 0.6 : 0.25, { vol: big ? 0.18 : 0.08, freq: 2600, q: 0.4, type: "highpass" });
  if (big) tone(110, 0, 0.35, { type: "sine", vol: 0.12, slide: 0.5 });
}
// One crank of the reel.
export function playReelClick() {
  for (let k = 0; k < 3; k++) noise(k * 0.035, 0.02, { vol: 0.12, freq: 3200, q: 2 });
}
// Line snapping (he got away).
export function playLineSnap() {
  noise(0, 0.05, { vol: 0.3, freq: 2500, q: 1.5 });
  tone(900, 0, 0.25, { type: "triangle", vol: 0.04, slide: 0.3 });
}
