// Audio engine: the shared Web Audio context, unlocking sound on phones, and
// the small building blocks (tones, noise bursts, tweens, media channels)
// the rest of the game's audio is made from.
let ctx = null;
let unlocked = false;

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

// Call from inside a tap / click / key handler: phones only let audio start
// from a real user gesture.
export function unlockAudio() {
  // iOS: play through the silent switch like a music app would (Safari 16.4+).
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* older Safari */ }
  const c = getCtx();
  if (!c) return;
  if (c.state !== "running") c.resume();
  // iOS also wants something actually played in the gesture: a silent blip.
  if (!unlocked) {
    unlocked = true;
    const b = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = b;
    src.connect(c.destination);
    src.start(0);
  }
}

// An <audio> element routed through a Web Audio gain node: iOS Safari
// ignores .volume on media elements, so fading and ducking go through the
// gain node instead (falls back to .volume where Web Audio can't take it).
export function createMediaChannel(src, preload) {
  const el = new Audio(src);
  el.preload = preload;
  el.volume = 0;
  let gain = null;
  const c = getCtx();
  if (c && c.createMediaElementSource) {
    try {
      gain = c.createGain();
      gain.gain.value = 0;
      c.createMediaElementSource(el).connect(gain).connect(c.destination);
      el.volume = 1;
    } catch (e) {
      gain = null;
    }
  }
  return { el, gain };
}

export function tone(freq, start, len, { type = "square", vol = 0.06, slide = 0 } = {}) {
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

export function noise(start, len, { vol = 0.12, freq = 1200, q = 0.8, type = "bandpass" } = {}) {
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


// Tween helper (wall clock, 40 ms steps).
export function tween(from, to, ms, set, done) {
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

// Testing: the audio context's state.
export const audioState = () => (ctx ? ctx.state : null);
