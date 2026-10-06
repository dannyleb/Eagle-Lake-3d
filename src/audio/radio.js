// The town radio: the station playlist, play / pause / skip, and the volume
// mix (fades, ducking under voices, tuning away under the theme song).
import { createMediaChannel, tween } from "./engine.js";

// The town radio station: a little local playlist. Tracks are lazy-loaded
// (only fetched once playback starts) and play back to back, looping the
// station when it reaches the end.
export const STATION = [
  { src: "audio/take-it-back.mp3", title: "I'll Take It Back", artist: "Blake" },
  { src: "audio/peel-on.mp3", title: "Peel On", artist: "The Thicker Bradshall" },
  { src: "audio/nananananana.mp3", title: "Nananananana", artist: "The Thicker Bradshall" },
  { src: "audio/drunk-with-the-crowd.mp3", title: "I Got Drunk with the Crowd", artist: "Blake" },
];
// Index of the song The Thicker Bradshall plays at the Ferris Hotel.
export const SHOW_TRACK = 3;

let radioEl = null;
let radioGain = null;
let fadeTimer = null;
let trackIndex = 0;
let radioOn = false;
let onTrackChange = null;

function getRadioEl() {
  if (!radioEl) {
    ({ el: radioEl, gain: radioGain } = createMediaChannel(STATION[trackIndex].src, "none"));
    radioEl.addEventListener("ended", () => {
      trackIndex = (trackIndex + 1) % STATION.length;
      radioEl.src = STATION[trackIndex].src;
      if (radioOn) radioEl.play().catch(() => {});
      if (onTrackChange) onTrackChange(STATION[trackIndex]);
    });
  }
  return radioEl;
}

// The radio's level is a mix of: its own level (fades, siren ducking), a
// dip while someone talks (on the audio clock, so it lands exactly with the
// voice), and the theme song tuning it away.
let radioLevel = 0; // own level, before ducking
let voiceDuck = 1; // fallback path only: 1 = full, ~0.2 while someone talks
let talkFrom = -1, talkTo = -1; // audio-clock window someone is talking in
let themeDuck = 1; // 1 = radio at full, 0 = tuned away under the theme
let duckTween = null;
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

// Lower the radio while something important is happening (the siren).
export function duckRadio(on) {
  if (!radioEl || !radioOn) return;
  fadeTo(on ? 0.22 : 0.55, 600);
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

// Voices: dip the music for someone talking between audio-clock times
// [from, to], and (fallback path) the smoothed duck level.
export function setTalkWindow(from, to) {
  talkFrom = from;
  talkTo = to;
  applyRadioVolume();
}
export function setVoiceDuck(v) {
  voiceDuck = v;
  if (!fadeTimer) applyRadioVolume();
}

// Theme song: tune the radio away (0) or back in (1) over ms.
export function setThemeDuck(v) {
  clearInterval(duckTween);
  themeDuck = v;
  applyRadioVolume();
}
export function duckRadioFor(to, ms) {
  clearInterval(duckTween);
  duckTween = tween(themeDuck, to, ms, (v) => { themeDuck = v; applyRadioVolume(); });
}

// Testing: what the radio is actually putting out right now, and the duck.
export const radioOutput = () => (radioGain ? radioGain.gain.value : radioEl ? radioEl.volume : 0);
export const radioDuckLevel = () => themeDuck;
