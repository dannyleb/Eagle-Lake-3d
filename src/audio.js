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
  { src: "audio/drunk-with-the-crowd.mp3", title: "I Got Drunk with the Crowd", artist: "Blake" },
];
// Index of the song The Thicker Bradshall plays at the Ferris Hotel.
export const SHOW_TRACK = 3;

let radioEl = null;
let fadeTimer = null;
let trackIndex = 0;
let radioOn = false;
let onTrackChange = null;

// The radio is an <audio> element routed through a Web Audio gain node.
// iOS Safari ignores .volume on media elements, so all fading, ducking and
// muting goes through the gain node instead (works everywhere).
let radioGain = null;
function getRadioEl() {
  if (!radioEl) {
    radioEl = new Audio(STATION[trackIndex].src);
    radioEl.volume = 0;
    const c = getCtx();
    if (c && c.createMediaElementSource) {
      try {
        radioGain = c.createGain();
        radioGain.gain.value = 0;
        c.createMediaElementSource(radioEl).connect(radioGain).connect(c.destination);
        radioEl.volume = 1;
      } catch (e) {
        radioGain = null;
      }
    }
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

let radioTarget = 0.55; // where the radio level is headed (siren ducking etc.)
let radioLevel = 0; // current radio level before voice ducking
let voiceDuck = 1; // 1 = full, ~0.2 while Sidney is talking
// Sidney's line window on the audio clock: the music dips just before he
// speaks and swells back after, timed by the audio hardware, not frames.
let talkFrom = -1, talkTo = -1;
let themeDuck = 1; // 1 = radio at full, 0 = tuned away while the theme plays
function applyRadioVolume() {
  const c = radioGain ? radioGain.context : null;
  const talking = c && c.currentTime >= talkFrom && c.currentTime <= talkTo;
  if (radioGain) {
    const v = Math.max(0, Math.min(1, radioLevel * themeDuck * (talking ? 0.18 : 1)));
    radioGain.gain.setTargetAtTime(v, c.currentTime, talking ? 0.04 : 0.3);
  } else if (radioEl) {
    radioEl.volume = Math.max(0, Math.min(1, radioLevel * themeDuck * voiceDuck));
  }
}
function fadeTo(target, ms) {
  clearInterval(fadeTimer);
  radioTarget = target;
  const el = getRadioEl();
  const start = radioLevel;
  const startTime = performance.now();
  fadeTimer = setInterval(() => {
    const t = Math.min(1, (performance.now() - startTime) / ms);
    radioLevel = start + (target - start) * t;
    applyRadioVolume();
    if (t >= 1) {
      clearInterval(fadeTimer);
      fadeTimer = null;
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
  fadeTo(0, 300);
  // Pause outright shortly after, even if the fade timer is throttled
  // (background tabs, low-power mode).
  setTimeout(() => { if (!radioOn && radioEl) radioEl.pause(); }, 350);
}

// RADIO button: pause / resume. Returns true if the radio is now on.
export function toggleRadio() {
  if (radioOn) stopRadio();
  else playRadio();
  return radioOn;
}
export const radioIsOn = () => radioOn;

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

// ---------- Mission sounds (all procedural) ----------

// Lower the radio while something important is happening (the siren).
export function duckRadio(on) {
  if (!radioEl || !radioOn) return;
  fadeTo(on ? 0.22 : 0.55, 600);
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

function tone(freq, start, len, { type = "square", vol = 0.06, slide = 0 } = {}) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + len);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + len + 0.05);
}

function noise(start, len, { vol = 0.12, freq = 1200, q = 0.8, type = "bandpass" } = {}) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + start;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

// Achievement fanfare: a quick rising arpeggio and a held chord.
export function playFanfare() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.16, { type: "square", vol: 0.05 }));
  for (const f of [523, 659, 784]) tone(f, 0.4, 0.7, { type: "triangle", vol: 0.06 });
  tone(1047, 0.4, 0.7, { type: "square", vol: 0.025 });
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

// ---------- Sidney's voice ----------
// Short lines cut from Sid's voicemails (captions transcribed from the
// recordings). One plays at random every 8-13 seconds while you play,
// drawn from a shuffled bag so none repeats back to back. The music ducks
// down under each line so you can hear him.
export const SID_LINES = [
  { src: "sid01", text: "Hey, Blakey Boy! Have a Thanksgiving." },
  { src: "sid02", text: "Give me a call back later. Bye." },
  { src: "sid03", text: "Hey, Blakey Boy, happy New Year, brother!" },
  { src: "sid04", text: "Bye!" },
  { src: "sid05", text: "Hey Blake, give me a call back." },
  { src: "sid08", text: "Give me a call back. Bye." },
  { src: "sid09", text: "Hey Blake, give me a call back." },
  { src: "sid10", text: "Bye." },
  { src: "sid11", text: "Hey, Blakey Boy, give me a call back." },
  { src: "sid15", text: "Go home. Give me a call back." },
  { src: "sid16", text: "Bye." },
];
let sidBuffers = null;
let sidBag = [];
let sidLast = -1;
let sidNext = 5;
let sidBusy = 0;
let onSidLine = null;
export const onSidVoice = (cb) => (onSidLine = cb); // cb(line | null)

function loadSid() {
  const c = getCtx();
  if (!c || sidBuffers) return;
  sidBuffers = [];
  SID_LINES.forEach((line, i) => {
    fetch(`audio/sid/${line.src}.mp3`)
      .then((r) => r.arrayBuffer())
      .then((b) => c.decodeAudioData(b))
      .then((buf) => { sidBuffers[i] = buf; })
      .catch(() => {});
  });
}

function nextSidClip() {
  const ready = sidBuffers ? sidBuffers.map((b, i) => (b ? i : -1)).filter((i) => i >= 0) : [];
  if (!ready.length) return -1;
  if (!sidBag.length) {
    sidBag = ready.slice();
    for (let i = sidBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sidBag[i], sidBag[j]] = [sidBag[j], sidBag[i]];
    }
    if (sidBag.length > 1 && sidBag[sidBag.length - 1] === sidLast) sidBag.unshift(sidBag.pop());
  }
  return sidBag.pop();
}

// Call every frame; `active` is false during story cards and menus.
// Timing runs on game time (not `onended`), so a stalled or suspended
// audio context can never leave the voice stuck "busy".
export function updateSidVoice(dt, active) {
  loadSid();
  // Music ducks quickly when he starts and swells back after he stops.
  const duckTarget = sidBusy > 0 ? 0.18 : 1;
  voiceDuck += (duckTarget - voiceDuck) * Math.min(1, dt * (duckTarget < voiceDuck ? 9 : 2.5));
  if (!fadeTimer) applyRadioVolume();
  if (sidBusy > 0) {
    sidBusy -= dt;
    if (sidBusy <= 0 && onSidLine) onSidLine(null);
    return;
  }
  if (!active) return;
  sidNext -= dt;
  if (sidNext > 0) return;
  const c = getCtx();
  if (!c || c.state !== "running") return;
  const i = nextSidClip();
  if (i < 0) return;
  const src = c.createBufferSource();
  src.buffer = sidBuffers[i];
  src.playbackRate.value = 0.97 + Math.random() * 0.06; // a little variety
  const g = c.createGain();
  // Let the duck land before he speaks.
  const t0 = c.currentTime + 0.15;
  g.gain.value = 1.0;
  src.connect(g).connect(c.destination);
  src.start(t0);
  sidLast = i;
  sidBusy = 0.15 + src.buffer.duration / src.playbackRate.value;
  talkFrom = c.currentTime;
  talkTo = c.currentTime + sidBusy + 0.1;
  applyRadioVolume();
  // Next line 8-13 s after this one starts.
  sidNext = Math.max(2, 8 + Math.random() * 5 - sidBusy);
  if (onSidLine) onSidLine(SID_LINES[i]);
}

// Party-popper crack for the confetti.
export function playPop() {
  noise(0, 0.08, { vol: 0.5, freq: 2400, q: 0.6, type: "highpass" });
  tone(1800, 0, 0.12, { type: "triangle", vol: 0.05, slide: 0.4 });
  noise(0.42, 0.07, { vol: 0.35, freq: 2600, q: 0.6, type: "highpass" });
}

// Testing: what the radio is actually putting out right now.
export const radioOutput = () => (radioGain ? radioGain.gain.value : radioEl ? radioEl.volume : 0);

// ---------- The crowd at a show ----------
// All synthesized: a murmuring bed of filtered noise that swells and dips,
// "woo!" voices (sawtooth through a vocal-ish band-pass, sliding up), finger
// whistles, and hand claps. startCrowd() runs under the song; playCheer()
// is the big roar and applause at the end.
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

// The song winds down under the applause, then the radio carries on with
// the next track on the station.
export function endShowSong() {
  if (!radioEl || !radioOn) return;
  fadeTo(0.08, 2600);
  setTimeout(() => {
    if (!radioOn) return;
    nextStation();
    fadeTo(0.55, 1200);
  }, 5200);
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

// ---------- Main theme ----------
// The game's theme song plays on the title screen, and a slice of it fades
// in over each mission achievement: the radio tunes away under it, then
// tunes back in as the theme fades out. Its own <audio> element and gain
// node (iOS ignores .volume), separate from the radio, so the radio's song
// keeps its place.
//
// ACHIEVEMENT_CUES: where in the theme each achievement starts, taken in
// turn (strong spots in the song). Add a second theme track by adding it to
// THEME_TRACKS; achievements alternate through them.
const THEME_TRACKS = ["audio/main-theme.mp3"];
const ACHIEVEMENT_CUES = [19.5, 50, 114.5, 160];
const THEME_LEVEL = 0.7;
let themeEl = null, themeGain = null, themeVol = 0, themeTween = null, themeOff = null, duckTween = null;
let themeMode = null; // "menu" | "achievement" | null
let achievementCount = 0;

function getThemeEl() {
  if (!themeEl) {
    themeEl = new Audio(THEME_TRACKS[0]);
    themeEl.preload = "auto";
    themeEl.volume = 0;
    const c = getCtx();
    if (c && c.createMediaElementSource) {
      try {
        themeGain = c.createGain();
        themeGain.gain.value = 0;
        c.createMediaElementSource(themeEl).connect(themeGain).connect(c.destination);
        themeEl.volume = 1;
      } catch (e) {
        themeGain = null;
      }
    }
  }
  return themeEl;
}
function setThemeVol(v) {
  themeVol = v;
  if (themeGain) themeGain.gain.setTargetAtTime(v, themeGain.context.currentTime, 0.05);
  else if (themeEl) themeEl.volume = Math.max(0, Math.min(1, v));
}
// Tween helper (wall clock, 40 ms steps).
function tween(from, to, ms, set, done) {
  const t0 = performance.now();
  const id = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    set(from + (to - from) * k);
    if (k >= 1) {
      clearInterval(id);
      if (done) done();
    }
  }, 40);
  return id;
}
function fadeTheme(to, ms, done) {
  clearInterval(themeTween);
  themeTween = tween(themeVol, to, ms, setThemeVol, done);
}
function duckRadioFor(to, ms) {
  clearInterval(duckTween);
  duckTween = tween(themeDuck, to, ms, (v) => { themeDuck = v; applyRadioVolume(); });
}
function seekAndPlay(el, at) {
  const go = () => {
    try { el.currentTime = at; } catch (e) { /* not seekable yet */ }
    el.play().catch(() => {});
  };
  if (el.readyState >= 1) go();
  else {
    el.addEventListener("loadedmetadata", go, { once: true });
    el.play().catch(() => {});
  }
}

// Radio static, for the moment the dial swings back to the station.
export function playTuneStatic() {
  noise(0, 0.5, { vol: 0.05, freq: 2400, q: 0.4 });
  tone(900, 0, 0.35, { type: "sine", vol: 0.012, slide: 1.8 });
}

// Title screen: the theme from the top, looping.
export function playMenuTheme() {
  const el = getThemeEl();
  clearTimeout(themeOff);
  themeMode = "menu";
  el.loop = true;
  if (el.paused) {
    if (el.src.indexOf(THEME_TRACKS[0]) < 0) el.src = THEME_TRACKS[0];
    el.play().catch(() => {});
  }
  fadeTheme(THEME_LEVEL, 1200);
  return !el.paused;
}
export function stopMenuTheme(ms = 1400) {
  if (!themeEl || themeMode !== "menu") return;
  themeMode = null;
  fadeTheme(0, ms, () => { if (!themeMode) themeEl.pause(); });
}

// Achievement: fade the theme in over the radio, hold, fade it out and tune
// the radio back in. hold = seconds at full level.
export function playAchievementTheme(hold = 5.2) {
  const el = getThemeEl();
  clearTimeout(themeOff);
  themeMode = "achievement";
  const src = THEME_TRACKS[achievementCount % THEME_TRACKS.length];
  const cue = ACHIEVEMENT_CUES[achievementCount % ACHIEVEMENT_CUES.length];
  achievementCount++;
  el.loop = false;
  if (el.src.indexOf(src) < 0) el.src = src;
  setThemeVol(0);
  seekAndPlay(el, cue);
  fadeTheme(THEME_LEVEL, 700);
  duckRadioFor(0, 600);
  themeOff = setTimeout(() => {
    fadeTheme(0, 1800, () => { if (themeMode === "achievement") { themeMode = null; el.pause(); } });
    setTimeout(() => {
      if (radioOn) playTuneStatic();
      duckRadioFor(1, 1600);
    }, 700);
  }, (0.7 + hold) * 1000);
}

// True while the theme is up (Sid holds his voicemails).
export const themePlaying = () => themeMode != null;

// Testing: where the theme and the radio duck are right now.
export const themeDebug = () => ({ mode: themeMode, vol: +themeVol.toFixed(2), duck: +themeDuck.toFixed(2), at: themeEl ? +themeEl.currentTime.toFixed(1) : null, paused: themeEl ? themeEl.paused : null });
