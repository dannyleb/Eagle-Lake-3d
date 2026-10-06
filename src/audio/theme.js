import { createMediaChannel, tween, unlockAudio, audioState } from "./engine.js";
import { playRadio, radioIsOn, setThemeDuck, duckRadioFor, radioDuckLevel } from "./radio.js";
import { playTuneStatic } from "./sfx.js";

// The game's theme song plays on the title screen, carries on about five
// seconds into the game, and a slice of it fades in over each mission
// achievement: the radio tunes away under it, then tunes back in as the
// theme fades out. Its own <audio> element and gain
// node (iOS ignores .volume), separate from the radio, so the radio's song
// keeps its place.
//
// ACHIEVEMENT_CUES: where in the theme each achievement starts, taken in
// turn (strong spots in the song). Add a second theme track by adding it to
// THEME_TRACKS; achievements alternate through them.
const THEME_TRACKS = ["audio/main-theme.mp3"];
const ACHIEVEMENT_CUES = [19.5, 50, 114.5, 160];
const THEME_LEVEL = 0.7;
let themeEl = null, themeGain = null, themeVol = 0, themeTween = null, themeOff = null;
let themeMode = null; // "menu" | "intro" | "achievement" | null
let achievementCount = 0;

function getThemeEl() {
  if (!themeEl) ({ el: themeEl, gain: themeGain } = createMediaChannel(THEME_TRACKS[0], "auto"));
  return themeEl;
}
function setThemeVol(v) {
  themeVol = v;
  if (themeGain) themeGain.gain.setTargetAtTime(v, themeGain.context.currentTime, 0.05);
  else if (themeEl) themeEl.volume = Math.max(0, Math.min(1, v));
}
function fadeTheme(to, ms, done) {
  clearInterval(themeTween);
  themeTween = tween(themeVol, to, ms, setThemeVol, done);
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
// Another tap on the title screen: if the theme didn't get going (the
// phone said no, or the audio engine is still asleep), try again.
export function nudgeMenuTheme() {
  if (themeMode !== "menu" || !themeEl) return;
  unlockAudio();
  if (themeEl.paused) themeEl.play().catch(() => {});
  if (themeVol < THEME_LEVEL) fadeTheme(THEME_LEVEL, 600);
}
// Into the game: the theme keeps going for a few seconds, then fades out as
// the radio station comes up. The radio has to be started inside the tap
// (phones), so it starts silent under the theme and is faded in after.
export function introThenRadio(hold = 5) {
  setThemeDuck(0);
  playRadio();
  if (themeMode !== "menu" || !themeEl || themeEl.paused) {
    duckRadioFor(1, 900); // no theme playing: just bring the radio up
    return;
  }
  themeMode = "intro";
  clearTimeout(themeOff);
  themeOff = setTimeout(() => {
    fadeTheme(0, 2400, () => { if (themeMode === "intro") { themeMode = null; themeEl.pause(); } });
    setTimeout(() => duckRadioFor(1, 2200), 600);
  }, hold * 1000);
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
      if (radioIsOn()) playTuneStatic();
      duckRadioFor(1, 1600);
    }, 700);
  }, (0.7 + hold) * 1000);
}

// True while the theme is up (Sid holds his voicemails).
export const themePlaying = () => themeMode != null;

// Testing: where the theme and the radio duck are right now.
export const themeDebug = () => ({ ctx: audioState(), mode: themeMode, vol: +themeVol.toFixed(2), duck: +radioDuckLevel().toFixed(2), at: themeEl ? +themeEl.currentTime.toFixed(1) : null, paused: themeEl ? themeEl.paused : null });
