// MENU button (top left) or Esc: a confirm box, then back to the title
// screen. A fresh page load is the cleanest reset: the title, PRESS START,
// the theme and the character picker, with every mission back at the start.
// canOpen() says whether the game is running (no menu on the title screen).
export function createMenu(canOpen) {
  const box = document.getElementById("menuConfirm");
  let open = false;
  const set = (on) => {
    open = on;
    box.classList.toggle("show", on);
  };
  const leave = () => location.reload();

  document.getElementById("btnMenu").addEventListener("click", (e) => { e.stopPropagation(); if (canOpen()) set(!open); });
  document.getElementById("mcYes").addEventListener("click", (e) => { e.stopPropagation(); leave(); });
  document.getElementById("mcNo").addEventListener("click", (e) => { e.stopPropagation(); set(false); });
  window.addEventListener("keydown", (e) => {
    if (!canOpen()) return;
    if (e.code === "Escape") set(!open);
    else if (open && e.code === "Enter") leave();
  });

  return { get open() { return open; } };
}
