// Unified input: keyboard (desktop) + touch joystick and the on-screen bezel
// buttons (which work for mouse and touch alike).
export function createControls() {
  const keys = new Set();
  const pressed = { interact: false, view: false, map: false, radio: false };
  let holdRun = false;

  const press = (name) => {
    if (name in pressed) pressed[name] = true;
  };

  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (e.repeat) return;
    if (e.code === "KeyE" || e.code === "Enter") press("interact");
    if (e.code === "KeyV" || e.code === "KeyC") press("view");
    if (e.code === "KeyM") press("map");
    if (e.code === "KeyR") press("radio");
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
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
  bindButton("btnRadio", "radio");

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

  // Touch joystick
  const joyBase = document.getElementById("joyBase");
  const joyStick = document.getElementById("joyStick");
  const joy = { x: 0, y: 0, id: null };
  const R = 46;
  function joyMoveTo(cx, cy) {
    const rect = joyBase.getBoundingClientRect();
    let dx = cx - (rect.left + rect.width / 2);
    let dy = cy - (rect.top + rect.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
    joy.x = dx / R;
    joy.y = -dy / R;
  }
  function joyEnd() {
    joy.id = null;
    joy.x = 0;
    joy.y = 0;
    joyStick.style.transform = "translate(0px, 0px)";
  }
  if (joyBase) {
    joyBase.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      joy.id = t.identifier;
      joyMoveTo(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });
    joyBase.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) if (t.identifier === joy.id) joyMoveTo(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });
    joyBase.addEventListener("touchend", joyEnd);
    joyBase.addEventListener("touchcancel", joyEnd);
  }

  return {
    poll() {
      let x = 0, y = 0;
      if (keys.has("KeyW") || keys.has("ArrowUp")) y += 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) y -= 1;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
      if (Math.abs(joy.x) > Math.abs(x)) x = joy.x;
      if (Math.abs(joy.y) > Math.abs(y)) y = joy.y;
      const out = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
        sprint: keys.has("ShiftLeft") || keys.has("ShiftRight") || holdRun,
        brake: keys.has("Space"),
        stick: { x: joy.x, y: joy.y, on: joy.id !== null },
        ...pressed,
      };
      for (const k of Object.keys(pressed)) pressed[k] = false;
      return out;
    },
  };
}
