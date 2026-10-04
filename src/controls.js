// Unified input: keyboard (desktop), the on-screen D-pad (touch and mouse),
// and the bezel buttons.
//
// poll() returns:
//   x, y      keyboard axes (walking uses these as tank controls)
//   stick     { x, y, on } the D-pad as a direction while held (walking)
//   taps      { up, down, left, right } one-shot presses this frame (riding:
//             go, stop / turn around, queue a turn)
//   sprint, brake, interact, view, map, radio (next song), radioToggle
//   (pause / play), car (call the '70)
export function createControls() {
  const keys = new Set();
  const pressed = { interact: false, view: false, map: false, radio: false, radioToggle: false, car: false };
  const taps = { up: false, down: false, left: false, right: false };
  let holdRun = false;

  const press = (name) => {
    if (name in pressed) pressed[name] = true;
  };

  const KEY_TAPS = {
    KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down",
    KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
  };
  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (KEY_TAPS[e.code]) taps[KEY_TAPS[e.code]] = true;
    if (e.code === "KeyE" || e.code === "Enter") press("interact");
    if (e.code === "KeyV" || e.code === "KeyC") press("view");
    if (e.code === "KeyM") press("map");
    if (e.code === "KeyR") press("radio");
    if (e.code === "KeyP") press("radioToggle");
    if (e.code === "KeyF") press("car");
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  function bindButton(id, name) {
    const el = document.getElementById(id);
    if (!el) return;
    const fire = (e) => {
      e.preventDefault();
      press(name);
    };
    el.addEventListener("touchstart", fire, { passive: false });
    el.addEventListener("mousedown", fire);
  }
  bindButton("btnRide", "interact");
  bindButton("btnView", "view");
  bindButton("btnMap", "map");
  bindButton("btnRadio", "radioToggle");
  bindButton("btnNext", "radio");
  bindButton("btnCar", "car");

  const runBtn = document.getElementById("btnRun");
  if (runBtn) {
    const on = (e) => { e.preventDefault(); holdRun = true; };
    const off = () => (holdRun = false);
    runBtn.addEventListener("touchstart", on, { passive: false });
    runBtn.addEventListener("touchend", off);
    runBtn.addEventListener("touchcancel", off);
    runBtn.addEventListener("mousedown", on);
    window.addEventListener("mouseup", off);
  }

  // ---------- D-pad ----------
  // One finger anywhere on the pad: the angle from the center picks one of
  // eight directions (the four arrows plus diagonals for walking). Sliding
  // onto a new arrow counts as a fresh tap of that arrow.
  const pad = document.getElementById("dpad");
  const dir = { x: 0, y: 0, id: null, sector: -1 };
  const ARROWS = ["right", "down", "left", "up"]; // sector 0 = east, clockwise on screen
  function setSector(sector) {
    if (sector === dir.sector) return;
    dir.sector = sector;
    if (pad) pad.querySelectorAll(".arrow").forEach((a) => a.classList.remove("on"));
    if (sector < 0) {
      dir.x = 0;
      dir.y = 0;
      return;
    }
    const ang = (sector * Math.PI) / 4;
    dir.x = Math.round(Math.cos(ang) * 100) / 100;
    dir.y = -Math.round(Math.sin(ang) * 100) / 100;
    if (sector % 2 === 0) {
      const name = ARROWS[sector / 2];
      taps[name] = true;
      const a = pad && pad.querySelector(`.arrow.${name}`);
      if (a) a.classList.add("on");
    } else if (pad) {
      // Diagonal: light both neighbours.
      for (const n of [ARROWS[(sector - 1) / 2], ARROWS[((sector + 1) / 2) % 4]]) pad.querySelector(`.arrow.${n}`)?.classList.add("on");
    }
  }
  function padAt(cx, cy) {
    const r = pad.getBoundingClientRect();
    const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.12) return setSector(-1); // dead center
    const ang = Math.atan2(dy, dx);
    setSector(((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8);
  }
  if (pad) {
    pad.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      dir.id = t.identifier;
      dir.sector = -1;
      padAt(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });
    pad.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) if (t.identifier === dir.id) padAt(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });
    const end = () => { dir.id = null; setSector(-1); };
    pad.addEventListener("touchend", end);
    pad.addEventListener("touchcancel", end);
    // Mouse works too (handy on desktop and for testing).
    let mouseDown = false;
    pad.addEventListener("mousedown", (e) => { mouseDown = true; dir.sector = -1; padAt(e.clientX, e.clientY); e.preventDefault(); });
    window.addEventListener("mousemove", (e) => { if (mouseDown) padAt(e.clientX, e.clientY); });
    window.addEventListener("mouseup", () => { if (mouseDown) { mouseDown = false; setSector(-1); } });
  }

  return {
    poll() {
      let x = 0, y = 0;
      if (keys.has("KeyW") || keys.has("ArrowUp")) y += 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) y -= 1;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
      const out = {
        x, y,
        sprint: keys.has("ShiftLeft") || keys.has("ShiftRight") || holdRun,
        brake: keys.has("Space"),
        stick: { x: dir.x, y: dir.y, on: dir.sector >= 0 },
        taps: { ...taps },
        ...pressed,
      };
      for (const k of Object.keys(pressed)) pressed[k] = false;
      for (const k of Object.keys(taps)) taps[k] = false;
      return out;
    },
  };
}
