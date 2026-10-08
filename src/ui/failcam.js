import { getCtx } from "../audio/engine.js";
import { duckRadioFor } from "../audio/index.js";

// The OG Gary tape: real footage of Gary Jones going down in the brush with
// a chainsaw, played on a beat-up VHS screen when he falls off the ladder.
// The first fall plays the whole tape, later ones just the wipeout.
//
// The video plays muted (phones allow that any time) and its soundtrack
// runs through the game's Web Audio context, which a tap already unlocked:
// the fall isn't a tap, so a video with its own sound wouldn't be allowed
// to play on a phone.
const VIDEO = "media/gary-og.mp4";
const SOUND = "audio/gary-og.mp3";
const CUTS = {
  full: { from: 0.4, to: 27.9, label: "THE OG GARY JONES · ACTUAL FOOTAGE" },
  replay: { from: 14.2, to: 22.6, label: "INSTANT REPLAY" },
};
const SKIP_AFTER = 2; // s: taps right after a fall are still climbing taps, not skips

let cam = null;
export const failCam = () => cam || (cam = createFailCam());
export const failCamOpen = () => !!cam && cam.open;

function createFailCam() {
  const card = document.getElementById("failCam");
  const video = document.getElementById("failVideo");
  const label = document.getElementById("failLabel");
  const c = getCtx();
  let buf = null, src = null, cut = null, open = false, openedAt = 0, safety = 0;

  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = VIDEO;
  if (c) {
    fetch(SOUND)
      .then((r) => r.arrayBuffer())
      .then((b) => c.decodeAudioData(b))
      .then((b) => { buf = b; })
      .catch(() => {});
  }

  // The soundtrack follows the picture: (re)started wherever the video is
  // whenever it starts playing, stopped while it buffers.
  function startSound() {
    stopSound();
    if (!open || !c || !buf) return;
    src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0, Math.min(video.currentTime, buf.duration - 0.05));
  }
  function stopSound() {
    if (!src) return;
    try { src.stop(); } catch (e) { /* already stopped */ }
    src = null;
  }
  video.addEventListener("playing", startSound);
  video.addEventListener("waiting", stopSound);
  video.addEventListener("timeupdate", () => { if (open && video.currentTime >= cut.to) close(); });
  video.addEventListener("ended", () => close());
  video.addEventListener("error", () => close());

  function play(kind) {
    if (video.error) return; // the tape won't play here: straight back to the game
    cut = CUTS[kind] || CUTS.full;
    open = true;
    openedAt = performance.now();
    label.textContent = cut.label;
    card.classList.add("show");
    duckRadioFor(0, 400);
    const go = () => {
      video.currentTime = cut.from;
      const p = video.play();
      if (p) p.catch(() => close()); // no video: skip straight back to the game
    };
    if (video.readyState >= 1) go();
    else video.addEventListener("loadedmetadata", go, { once: true });
    clearTimeout(safety);
    safety = setTimeout(close, (cut.to - cut.from + 6) * 1000); // a stalled tape never strands him
  }

  function close() {
    if (!open) return;
    open = false;
    clearTimeout(safety);
    video.pause();
    stopSound();
    card.classList.remove("show");
    duckRadioFor(1, 900);
  }

  function skip() {
    if (performance.now() - openedAt > SKIP_AFTER * 1000) close();
  }

  const tap = (e) => { e.preventDefault(); e.stopPropagation(); skip(); };
  card.addEventListener("click", tap);
  card.addEventListener("touchend", tap, { passive: false });

  return {
    play,
    close,
    skip,
    get open() { return open; },
  };
}
