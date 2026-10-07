import { playChaChing } from "./audio/index.js";

// Rawhide & Rhinestones Western Wear: Gary's $1,500 shopping list. A store
// counter card lists the five things he needs; tap one (or E for the next)
// to buy it and he changes into it on the spot. Then check out.
//
// Same job interface as fishing and the tree work: spot, facing, begin(),
// press(), prompt(), status(), update(), end(), active, done.

export const SHOPPING_LIST = [
  { id: "boots", name: "Cowboy boots", detail: "Ostrich print, stitched shafts, pointed toes", price: 475 },
  { id: "jeans", name: "Jeans", detail: "Dark-wash boot-cut denim", price: 135 },
  { id: "belt", name: "Belt", detail: "Tooled leather, big silver buckle", price: 165 },
  { id: "pearlsnap", name: "Pearl snap", detail: "Denim western shirt, pearl snaps", price: 125 },
  { id: "hat", name: "Cowboy hat", detail: "10X indigo felt, cattleman crease", price: 600 },
];
const TOTAL = SHOPPING_LIST.reduce((n, i) => n + i.price, 0); // $1,500
const money = (n) => `$${n.toLocaleString("en-US")}`;

export function createShopJob({ player, spot, say }) {
  const card = document.getElementById("shopCard");
  const list = document.getElementById("shopList");
  const totalEl = document.getElementById("shopTotal");
  const go = document.getElementById("shopGo");
  const bought = new Set();
  let state = "idle", t = 0;

  const spent = () => SHOPPING_LIST.filter((i) => bought.has(i.id)).reduce((n, i) => n + i.price, 0);
  const nextItem = () => SHOPPING_LIST.find((i) => !bought.has(i.id));

  function render() {
    const next = nextItem();
    list.innerHTML = "";
    for (const item of SHOPPING_LIST) {
      const li = document.createElement("li");
      li.className = bought.has(item.id) ? "bought" : item === next ? "next" : "";
      li.innerHTML = `<span class="shopCheck">${bought.has(item.id) ? "&#10003;" : ""}</span><span class="shopName">${item.name}<small>${item.detail}</small></span><span class="shopPrice">${money(item.price)}</span>`;
      const tap = (e) => { e.preventDefault(); e.stopPropagation(); buy(item); };
      li.addEventListener("click", tap);
      li.addEventListener("touchend", tap, { passive: false });
      list.appendChild(li);
    }
    totalEl.textContent = `${money(spent())} of ${money(TOTAL)}`;
    go.innerHTML = next
      ? `<span class="keycap">E</span> BUY THE ${next.name.toUpperCase()}`
      : `<span class="keycap">E</span> CHECK OUT ${money(TOTAL)}`;
  }

  function buy(item) {
    if (state !== "shopping" || !item || bought.has(item.id)) return;
    bought.add(item.id);
    player.dress(item.id);
    playChaChing();
    say(`${item.name}: ${money(item.price)}. Lookin' good, Gary.`, 1600);
    render();
  }

  function checkout() {
    if (bought.size < SHOPPING_LIST.length) return;
    playChaChing();
    say(`That'll be ${money(TOTAL)}. Pleasure doin' business!`, 2200);
    card.classList.remove("show");
    state = "paid";
    t = 0;
  }

  const onGo = (e) => {
    e.preventDefault();
    e.stopPropagation();
    press();
  };
  function press() {
    if (state !== "shopping") return;
    const next = nextItem();
    if (next) buy(next);
    else checkout();
  }

  return {
    spot,
    facing: 0, // the store's door faces the highway: face south into it
    begin() {
      state = "shopping";
      render();
      card.classList.add("show");
      go.addEventListener("click", onGo);
      go.addEventListener("touchend", onGo, { passive: false });
    },
    press,
    prompt() {
      if (state !== "shopping") return null;
      return { text: nextItem() ? "Buy the next thing on the list" : "Check out", action: nextItem() ? "BUY" : "PAY" };
    },
    status() {
      return { sub: `${money(spent())} of ${money(TOTAL)} spent`, meter: null };
    },
    update(dt) {
      if (state === "paid") {
        t += dt;
        if (t > 0.6) state = "done";
      }
    },
    end() {
      card.classList.remove("show");
      go.removeEventListener("click", onGo);
      go.removeEventListener("touchend", onGo);
      state = "idle";
    },
    get active() { return state !== "idle"; },
    get done() { return state === "done"; },
  };
}
