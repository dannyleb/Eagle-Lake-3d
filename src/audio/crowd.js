// The crowd at a show (The Thicker Bradshall at the Ferris Hotel).
// All synthesized: a murmuring bed of filtered noise that swells and dips,
// "woo!" voices (sawtooth through a vocal-ish band-pass, sliding up), finger
// whistles, and hand claps. startCrowd() runs under the song; playCheer()
// is the big roar and applause at the end.
import { getCtx } from "./engine.js";

let crowd = null;
let noiseBuf = null;
function getNoiseBuf(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < d.length; i++) {
      b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); // soft low-passed noise
      d[i] = b * 6 + (Math.random() * 2 - 1) * 0.25;
    }
  }
  return noiseBuf;
}
function crowdOut(c) {
  return crowd ? crowd.bus : c.destination;
}
function woo(c, t, vol = 0.05) {
  const o = c.createOscillator();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  const base = 260 + Math.random() * 380;
  const len = 0.35 + Math.random() * 0.5;
  o.type = "sawtooth";
  o.frequency.setValueAtTime(base, t);
  o.frequency.exponentialRampToValueAtTime(base * (1.5 + Math.random() * 0.6), t + len * 0.6);
  o.frequency.exponentialRampToValueAtTime(base * 1.2, t + len);
  f.type = "bandpass";
  f.frequency.value = 900 + Math.random() * 600;
  f.Q.value = 2.5;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(f).connect(g).connect(crowdOut(c));
  o.start(t);
  o.stop(t + len + 0.05);
}
function whistle(c, t, vol = 0.03) {
  const o = c.createOscillator();
  const g = c.createGain();
  const f0 = 1800 + Math.random() * 500;
  o.type = "sine";
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 1.35, t + 0.18);
  o.frequency.setValueAtTime(f0 * 1.05, t + 0.24);
  o.frequency.exponentialRampToValueAtTime(f0 * 1.4, t + 0.55);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  g.gain.setValueAtTime(vol, t + 0.2);
  g.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.23);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.27);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g).connect(crowdOut(c));
  o.start(t);
  o.stop(t + 0.65);
}
function clap(c, t, vol = 0.05) {
  const src = c.createBufferSource();
  src.buffer = getNoiseBuf(c);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1100 + Math.random() * 1400;
  f.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.03);
  src.connect(f).connect(g).connect(crowdOut(c));
  src.start(t, Math.random() * 2.5, 0.1);
}
function applause(c, t0, seconds, perSec = 45, vol = 0.045) {
  const n = Math.floor(seconds * perSec);
  for (let i = 0; i < n; i++) {
    const u = Math.random();
    // Busiest at the start, thinning out toward the end.
    const t = t0 + seconds * u * u;
    clap(c, t, vol * (1 - 0.6 * u));
  }
}

// The crowd during the set: a bed that rises and falls, plus woos, whistles
// and the odd clap. Opens with a cheer as the band kicks in.
export function startCrowd() {
  const c = getCtx();
  if (!c || crowd) return;
  const bus = c.createGain();
  bus.gain.value = 2.2; // loud enough to hear the room over the band
  bus.connect(c.destination);
  const src = c.createBufferSource();
  src.buffer = getNoiseBuf(c);
  src.loop = true;
  const low = c.createBiquadFilter();
  low.type = "bandpass";
  low.frequency.value = 520;
  low.Q.value = 0.7;
  const bed = c.createGain();
  bed.gain.value = 0.0001;
  src.connect(low).connect(bed).connect(bus);
  src.start();
  crowd = { bus, src, bed, timer: null };
  const t = c.currentTime;
  bed.gain.exponentialRampToValueAtTime(0.16, t + 0.4);
  bed.gain.setTargetAtTime(0.07, t + 1.6, 0.8);
  for (let i = 0; i < 7; i++) woo(c, t + Math.random() * 1.4, 0.05);
  whistle(c, t + 0.3);
  whistle(c, t + 0.9, 0.025);
  applause(c, t, 2.4, 40, 0.045);
  crowd.timer = setInterval(() => {
    if (!crowd) return;
    const now = c.currentTime;
    crowd.bed.gain.setTargetAtTime(0.06 + Math.random() * 0.09, now, 0.5);
    if (Math.random() < 0.7) woo(c, now + Math.random() * 0.5, 0.025 + Math.random() * 0.025);
    if (Math.random() < 0.18) whistle(c, now + Math.random() * 0.5, 0.02);
    if (Math.random() < 0.3) for (let k = 0; k < 4; k++) clap(c, now + Math.random() * 0.5, 0.025);
  }, 600);
}

// End of the set: the room goes off. A roar, a wall of applause, whistles,
// then the crowd settles back down to nothing.
export function playCheer() {
  const c = getCtx();
  if (!c) return;
  if (!crowd) startCrowd();
  if (!crowd) return;
  clearInterval(crowd.timer);
  const t = c.currentTime;
  crowd.bed.gain.cancelScheduledValues(t);
  crowd.bus.gain.setTargetAtTime(1.5, t, 0.3);
  crowd.bed.gain.setTargetAtTime(0.22, t, 0.15);
  crowd.bed.gain.setTargetAtTime(0.0001, t + 3.2, 0.9);
  for (let i = 0; i < 16; i++) woo(c, t + Math.random() * 2.6, 0.04 + Math.random() * 0.03);
  for (let i = 0; i < 5; i++) whistle(c, t + Math.random() * 2.4, 0.03);
  applause(c, t, 5.5, 60, 0.06);
  const done = crowd;
  crowd = null;
  setTimeout(() => {
    try { done.src.stop(); } catch (e) { /* already stopped */ }
    done.bus.disconnect();
  }, 8000);
}
