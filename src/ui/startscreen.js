import { drawPortrait } from "./portraits.js";
import { unlockAudio, playMenuTheme, nudgeMenuTheme } from "../audio/index.js";

// The start screen:
//   title    PRESS START (any key or tap) starts the theme song
//   menu     with a saved game: CONTINUE or NEW GAME
//   picker   pick a character, for a new game (or, with saves for more than
//            one character, which one to continue)
//
// The theme starts on PRESS START because phones only allow sound from a
// real tap (click / touchend / keydown, not touchstart or pointerdown). Any
// later tap on the start screen retries it if the phone said no.
//
// saves: { slots: { sidney: "Mission 3 of 5 · ...", ... }, last: "sidney" }
// (labels for characters with a saved game). onPick(id, resume) is called
// once: resume is true to continue that character's saved game. Keys: arrows
// / A D + Enter, or 1 / 2 / 3.
export function createStartScreen(onPick, saves = { slots: {}, last: null }) {
  const overlay = document.getElementById("startOverlay");
  const picks = [...document.querySelectorAll(".charPick")];
  const menuOpts = [document.getElementById("btnContinue"), document.getElementById("btnNewGame")];
  const pickTitle = document.getElementById("pickTitleText");
  const saved = Object.keys(saves.slots);
  let screen = "title";
  let resume = false; // picker mode: continue a save vs. start fresh
  let highlighted = 0;
  let menuIdx = 0;
  let shownAt = -1e9;
  let done = false;

  drawPortrait(document.getElementById("pickSidney"), "sidney");
  drawPortrait(document.getElementById("pickBradshall"), "bradshall");
  drawPortrait(document.getElementById("pickGary"), "gary");
  if (saved.length) {
    overlay.classList.add("hasSaves");
    const last = saves.last || saved[0];
    const name = picks.find((p) => p.dataset.char === last)?.querySelector(".pickName").textContent || last;
    document.getElementById("continueSub").textContent = `${name} · ${saves.slots[last]}`;
  }

  // Ignore input in the same instant a screen appears (a tap falling
  // through onto a button that just showed up under the finger).
  const settled = () => performance.now() - shownAt > 450;

  function show(next) {
    screen = next;
    shownAt = performance.now();
    overlay.classList.toggle("title", next === "title");
    overlay.classList.toggle("menu", next === "menu");
    overlay.classList.toggle("resume", next === "picker" && resume);
    if (next === "menu") highlightMenu(0);
    if (next === "picker") {
      pickTitle.textContent = resume ? "CONTINUE AS..." : "PICK YOUR CHARACTER";
      for (const p of picks) {
        const label = saves.slots[p.dataset.char];
        p.classList.toggle("noSave", !label);
        p.querySelector(".pickSave").textContent = label ? (resume ? label : "Has a save · starts over") : "";
      }
      const first = resume ? picks.findIndex((p) => saves.slots[p.dataset.char]) : 0;
      highlight(Math.max(0, first));
    }
  }

  function highlight(i) {
    highlighted = (i + picks.length) % picks.length;
    picks.forEach((p, k) => p.classList.toggle("on", k === highlighted));
  }
  function highlightMenu(i) {
    menuIdx = (i + menuOpts.length) % menuOpts.length;
    menuOpts.forEach((b, k) => b.classList.toggle("on", k === menuIdx));
  }

  function pressStart() {
    if (done) return;
    if (screen !== "title") return nudgeMenuTheme();
    unlockAudio();
    playMenuTheme();
    show(saved.length ? "menu" : "picker");
  }

  function chooseContinue() {
    if (!settled()) return;
    if (saved.length === 1) return pick(saved[0], true);
    resume = true;
    show("picker");
  }
  function chooseNew() {
    if (!settled()) return;
    resume = false;
    show("picker");
  }

  function pick(id = picks[highlighted]?.dataset.char || "sidney", cont = resume) {
    if (done || screen === "title" || !settled()) return;
    if (cont && !saves.slots[id]) return;
    done = true;
    overlay.classList.add("hidden");
    window.removeEventListener("keydown", onKey);
    onPick(id, cont);
  }

  function onKey(e) {
    if (screen === "title") return pressStart();
    if (screen === "menu") {
      if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "ArrowDown" || e.code === "KeyS") highlightMenu(menuIdx + 1);
      else if (e.code === "KeyC") chooseContinue();
      else if (e.code === "KeyN") chooseNew();
      else if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") (menuIdx === 0 ? chooseContinue : chooseNew)();
      return;
    }
    if (e.code === "Escape" || e.code === "Backspace") {
      if (saved.length) show("menu");
    } else if (e.code === "ArrowLeft" || e.code === "KeyA") highlight(highlighted - 1);
    else if (e.code === "ArrowRight" || e.code === "KeyD") highlight(highlighted + 1);
    else if (e.code === "Digit1") pick("sidney");
    else if (e.code === "Digit2") pick("bradshall");
    else if (e.code === "Digit3") pick("gary");
    else if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") pick();
  }

  // A tap: real activation events only (see above). Leaving the title, the
  // tap's follow-up click is swallowed so it can't land on what appears.
  overlay.addEventListener("click", pressStart);
  overlay.addEventListener("touchend", (e) => {
    if (screen === "title") e.preventDefault();
    pressStart();
  }, { passive: false });
  const tap = (el, fn) => {
    el.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
    el.addEventListener("touchend", (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
  };
  tap(menuOpts[0], chooseContinue);
  tap(menuOpts[1], chooseNew);
  tap(document.getElementById("pickBack"), () => { if (settled()) show("menu"); });
  menuOpts.forEach((b, i) => b.addEventListener("mouseenter", () => highlightMenu(i)));
  picks.forEach((p, i) => {
    tap(p, () => pick(p.dataset.char));
    p.addEventListener("mouseenter", () => highlight(i));
  });
  window.addEventListener("keydown", onKey);
}
