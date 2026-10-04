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
function applyRadioVolume() {
  const c = radioGain ? radioGain.context : null;
  const talking = c && c.currentTime >= talkFrom && c.currentTime <= talkTo;
  if (radioGain) {
    const v = Math.max(0, Math.min(1, radioLevel * (talking ? 0.18 : 1)));
    radioGain.gain.setTargetAtTime(v, c.currentTime, talking ? 0.04 : 0.3);
  } else if (radioEl) {
    radioEl.volume = Math.max(0, Math.min(1, radioLevel * voiceDuck));
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

// Crowd cheer at the end of a show: layered noise swells with whistles.
export function playCheer() {
  for (let i = 0; i < 6; i++) noise(i * 0.12, 1.4 - i * 0.12, { vol: 0.09, freq: 900 + i * 300, q: 0.5 });
  tone(1900, 0.3, 0.35, { type: "sine", vol: 0.04, slide: 1.3 });
  tone(2200, 0.9, 0.3, { type: "sine", vol: 0.035, slide: 1.25 });
}
