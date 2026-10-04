// Tiny procedural audio (no sound files) for the crossing bell and the train
// horn, plus the town radio (real songs, lazy-loaded once playback starts so
// they never weigh down the initial page load).
let ctx = null;
let bellTimer = null;
let bellVolume = 0.08;
let lastHorn = 0;

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

// The '70's radio station: a little local playlist. Both tracks are
// lazy-loaded (only fetched once the car radio actually needs them) and
// play back to back, looping the station when it reaches the end.
export const STATION = [
  { src: "audio/take-it-back.mp3", title: "I'll Take It Back", artist: "Blake" },
  { src: "audio/peel-on.mp3", title: "Peel On", artist: "The Thicker Bradshall" },
  { src: "audio/nananananana.mp3", title: "Nananananana", artist: "The Thicker Bradshall" },
];

let radioEl = null;
let fadeTimer = null;
let trackIndex = 0;
let radioOn = false;
let onTrackChange = null;

function getRadioEl() {
  if (!radioEl) {
    radioEl = new Audio(STATION[trackIndex].src);
    radioEl.volume = 0;
    radioEl.preload = "none";
    radioEl.addEventListener("ended", () => {
      trackIndex = (trackIndex + 1) % STATION.length;
      radioEl.src = STATION[trackIndex].src;
      if (radioOn) radioEl.play().catch(() => {});
      if (onTrackChange) onTrackChange(STATION[trackIndex]);
    });
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

export function onRadioTrackChange(cb) {
  onTrackChange = cb;
}

export function currentTrack() {
  return STATION[trackIndex];
}

export function playRadio() {
  radioOn = true;
  const el = getRadioEl();
  if (el.paused) el.play().catch(() => {});
  fadeTo(0.55, 500);
}

export function stopRadio() {
  radioOn = false;
  if (!radioEl) return;
  fadeTo(0, 400);
}

export function nextStation() {
  if (!radioEl) return;
  trackIndex = (trackIndex + 1) % STATION.length;
  radioEl.src = STATION[trackIndex].src;
  if (radioOn) radioEl.play().catch(() => {});
  if (onTrackChange) onTrackChange(STATION[trackIndex]);
}

// Jump straight to a track (used when you ask Bradshall to play one).
export function playTrack(index) {
  const el = getRadioEl();
  trackIndex = ((index % STATION.length) + STATION.length) % STATION.length;
  el.src = STATION[trackIndex].src;
  radioOn = true;
  el.play().catch(() => {});
  fadeTo(0.55, 300);
  if (onTrackChange) onTrackChange(STATION[trackIndex]);
}
