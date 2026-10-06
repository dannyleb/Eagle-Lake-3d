import { drawPortrait } from "./portraits.js";
import { unlockAudio, playMenuTheme, nudgeMenuTheme } from "../audio/index.js";

// The start screen: a title card with PRESS START, then the character
// picker with the theme song playing.
//
// PRESS START (any key or tap) is what starts the theme: phones only allow
// sound from a real tap (click / touchend / keydown, not touchstart or
// pointerdown). Any later tap on the start screen retries the theme if the
// phone said no the first time.
//
// Picking: tap a card, or arrows / A D + Enter / Space / E, or 1 / 2.
// onPick(id) is called once with "sidney" or "bradshall".
export function createStartScreen(onPick) {
  const overlay = document.getElementById("startOverlay");
  const picks = [...document.querySelectorAll(".charPick")];
  const onTitle = () => overlay.classList.contains("title");
  let highlighted = 0;
  let pressedAt = -1e9;
  let done = false;

  drawPortrait(document.getElementById("pickSidney"), "sidney");
  drawPortrait(document.getElementById("pickBradshall"), "bradshall");

  function highlight(i) {
    highlighted = (i + picks.length) % picks.length;
    picks.forEach((p, k) => p.classList.toggle("on", k === highlighted));
  }

  function pressStart() {
    if (done) return;
    if (!onTitle()) return nudgeMenuTheme();
    overlay.classList.remove("title");
    pressedAt = performance.now();
    unlockAudio();
    playMenuTheme();
  }

  function pick(id = picks[highlighted]?.dataset.char || "sidney") {
    // Ignore a pick in the same instant the picker appears (a tap falling
    // through from PRESS START onto a card).
    if (done || onTitle() || performance.now() - pressedAt < 450) return;
    done = true;
    overlay.classList.add("hidden");
    window.removeEventListener("keydown", onKey);
    onPick(id);
  }

  function onKey(e) {
    if (onTitle()) return pressStart();
    if (e.code === "ArrowLeft" || e.code === "KeyA") highlight(highlighted - 1);
    else if (e.code === "ArrowRight" || e.code === "KeyD") highlight(highlighted + 1);
    else if (e.code === "Digit1") pick("sidney");
    else if (e.code === "Digit2") pick("bradshall");
    else if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") pick();
  }

  overlay.addEventListener("click", pressStart);
  overlay.addEventListener("touchend", (e) => {
    // Leaving the title: swallow the tap's follow-up click so it can't land
    // on a character card that just appeared under the finger.
    if (onTitle()) e.preventDefault();
    pressStart();
  }, { passive: false });
  picks.forEach((p, i) => {
    p.addEventListener("click", (e) => { e.stopPropagation(); pick(p.dataset.char); });
    p.addEventListener("touchend", (e) => { e.preventDefault(); e.stopPropagation(); pick(p.dataset.char); }, { passive: false });
    p.addEventListener("mouseenter", () => highlight(i));
  });
  window.addEventListener("keydown", onKey);
}
