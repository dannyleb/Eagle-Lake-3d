// Unified input: keyboard (desktop) + on-screen touch joystick & buttons (mobile).
export function createControls() {
  const keys = new Set();
  let interactPressed = false;
  let changeStationPressed = false;

  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (e.code === "KeyE" || e.code === "Enter") interactPressed = true;
    if (e.code === "KeyR") changeStationPressed = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  const state = {
    sprint: false,
    brake: false,
  };

  function readKeyboard() {
    let x = 0, y = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) y += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) y -= 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
    state.sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
    state.brake = keys.has("Space");
    return { x, y };
  }

  // --- Touch joystick ---
  const joyBase = document.getElementById("joyBase");
  const joyStick = document.getElementById("joyStick");
  let joyActive = false;
  let joyTouchId = null;
  let joyVec = { x: 0, y: 0 };
  const JOY_RADIUS = 46;

  function joyRect() {
    return joyBase.getBoundingClientRect();
  }

  function handleJoyStart(e) {
    const t = e.changedTouches ? e.changedTouches[0] : e;
    joyActive = true;
    joyTouchId = e.changedTouches ? t.identifier : "mouse";
    updateJoy(t.clientX, t.clientY);
    e.preventDefault();
  }
  function updateJoy(clientX, clientY) {
    const rect = joyRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > JOY_RADIUS) {
      dx = (dx / dist) * JOY_RADIUS;
      dy = (dy / dist) * JOY_RADIUS;
    }
    joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
    joyVec.x = dx / JOY_RADIUS;
    joyVec.y = -dy / JOY_RADIUS;
  }
  function handleJoyMove(e) {
    if (!joyActive) return;
    const touches = e.changedTouches ? Array.from(e.changedTouches) : [e];
    for (const t of touches) {
      const id = e.changedTouches ? t.identifier : "mouse";
      if (id === joyTouchId) updateJoy(t.clientX, t.clientY);
    }
    e.preventDefault();
  }
  function handleJoyEnd(e) {
    joyActive = false;
    joyVec.x = 0;
    joyVec.y = 0;
    joyStick.style.transform = `translate(0px, 0px)`;
  }

  if (joyBase) {
    joyBase.addEventListener("touchstart", handleJoyStart, { passive: false });
    joyBase.addEventListener("touchmove", handleJoyMove, { passive: false });
    joyBase.addEventListener("touchend", handleJoyEnd);
    joyBase.addEventListener("touchcancel", handleJoyEnd);
    joyBase.addEventListener("mousedown", handleJoyStart);
    window.addEventListener("mousemove", handleJoyMove);
    window.addEventListener("mouseup", handleJoyEnd);
  }

  const interactBtn = document.getElementById("interactBtn");
  if (interactBtn) {
    const fire = (e) => { interactPressed = true; e.preventDefault(); };
    interactBtn.addEventListener("touchstart", fire, { passive: false });
    interactBtn.addEventListener("mousedown", fire);
  }

  const sprintBtn = document.getElementById("sprintBtn");
  let touchSprint = false;
  if (sprintBtn) {
    sprintBtn.addEventListener("touchstart", (e) => { touchSprint = true; e.preventDefault(); }, { passive: false });
    sprintBtn.addEventListener("touchend", () => (touchSprint = false));
    sprintBtn.addEventListener("mousedown", () => (touchSprint = true));
    sprintBtn.addEventListener("mouseup", () => (touchSprint = false));
  }

  return {
    poll() {
      const kb = readKeyboard();
      const x = Math.abs(joyVec.x) > Math.abs(kb.x) ? joyVec.x : kb.x;
      const y = Math.abs(joyVec.y) > Math.abs(kb.y) ? joyVec.y : kb.y;
      const out = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
        sprint: state.sprint || touchSprint,
        brake: state.brake,
        interact: interactPressed,
        changeStation: changeStationPressed,
      };
      interactPressed = false;
      changeStationPressed = false;
      return out;
    },
  };
}
