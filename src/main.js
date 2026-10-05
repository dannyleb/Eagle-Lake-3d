import * as THREE from "three";
import { WORLD, SPAWN, GAME_TITLE, BRADSHALL } from "./config.js";
import { RAILS, distToRoad } from "./map/layout.js";
import { buildWorld } from "./world/index.js";
import { inCrossingZone } from "./world/rail.js";
import { createNPC } from "./npc.js";
import { createTrain } from "./train.js";
import { createControls } from "./controls.js";
import { createPlayer, CHARACTERS } from "./player.js";
import { createVehicle } from "./vehicles.js";
import { createChaseCamera } from "./camera.js";
import { createHud } from "./ui/hud.js";
import { toonify } from "./render/toon.js";
import { treeFocus } from "./world/trees.js";
import { createPost } from "./render/post.js";
import { createMissions } from "./missions/index.js";
import { createStuckWatch } from "./assist.js";
import { makeFaceTexture } from "./textures.js";
import { createGators } from "./gators.js";
import { createTownsfolk } from "./townsfolk.js";
import { createPickups, BOOST_SECONDS, BOOST_MULT } from "./pickups.js";
import {
  unlockAudio, startCrossingBell, stopCrossingBell, setBellVolume, playHorn,
  playRadio, nextStation, playTrack, currentTrack, onRadioTrackChange, STATION, playHiss, playSnap, updateVoices, onVoice, toggleRadio, radioIsOn, radioOutput,
  playFizz, playBoostEnd, playMenuTheme, nudgeMenuTheme, introThenRadio, debugCall, themePlaying, themeDebug,
} from "./audio.js";

document.title = GAME_TITLE;
const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
if (touch) document.body.classList.add("touch");

// ---------- Renderer, sized to the viewport inside the bezel ----------
const canvas = document.getElementById("gameCanvas");
const viewport = document.getElementById("viewport");
// Anti-aliasing happens in the post pass's multisampled target, so the
// canvas itself doesn't need it.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
let pixelRatio = Math.min(window.devicePixelRatio, touch ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd0f0);
scene.fog = new THREE.Fog(WORLD.fogColor, WORLD.fogNear, WORLD.fogFar);

const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 3200);
const post = createPost(renderer);

function resize() {
  const w = Math.max(1, viewport.clientWidth), h = Math.max(1, viewport.clientHeight);
  renderer.setSize(w, h, false);
  post.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();

// ---------- Light: bright, saturated mid-afternoon Texas sun ----------
scene.add(new THREE.HemisphereLight(0xe4f4ff, 0x7d8f5a, 0.95));
const sun = new THREE.DirectionalLight(0xfff1d2, 1.75);
const SUN_OFFSET = new THREE.Vector3(-70, 130, 55);
sun.castShadow = true;
sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 360 });
sun.shadow.bias = -0.0012;
sun.shadow.normalBias = 0.4;
sun.shadow.camera.layers.enable(1); // tree shadow stand-ins
scene.add(sun, sun.target);

// ---------- World ----------
const world = buildWorld(scene);
const { collision, crossings, triggers, sky } = world;

const trains = {
  sunset: createTrain(scene, { path: RAILS.sunset.pts, cars: 12, speed: 18, locoColor: "#e8562a", firstDelay: 5, seed: 1 }),
  saap: createTrain(scene, { path: RAILS.saap.pts, cars: 5, speed: 15, locoColor: "#2c5aa0", firstDelay: 45, seed: 3 }),
};
const gated = crossings.filter((c) => c.gated);

// ---------- Characters & rides ----------
const controls = createControls();
const player = createPlayer(scene, SPAWN.player);
const bike = createVehicle(scene, "bike", SPAWN.bike);
const car = createVehicle(scene, "car", SPAWN.car);
const bradshall = createNPC(scene, BRADSHALL);
const chaseCam = createChaseCamera(camera);
const hud = createHud(world.minimap);
const gators = createGators(scene, collision);
const townsfolk = createTownsfolk(scene, collision);
const pickups = createPickups(scene);
toonify(scene);

const RIDES = {
  bike: { veh: bike, pose: "ride", label: "GREEN DOG · BEACH CRUISER", name: "Green Dog" },
  car: { veh: car, pose: "drive", label: "THE '70 · 454 V8", name: "the '70" },
};
let mode = "walk";
let started = false;
let bradshallLine = 0;
let driveThruCount = 0;

const active = () => (mode === "walk" ? player : RIDES[mode].veh);

// Shove Sidney a couple of meters (ninja kicks, gator snaps) with a red flash.
function knockPlayer(dx, dz, dist = 2.4) {
  const p = player.group.position;
  const l = Math.hypot(dx, dz) || 1;
  const r = collision.resolveMove(p.x, p.z, p.x + (dx / l) * dist, p.z + (dz / l) * dist, player.state.radius);
  p.x = r.x;
  p.z = r.z;
  viewport.classList.remove("hurt");
  void viewport.offsetWidth;
  viewport.classList.add("hurt");
}

// ---------- Missions ----------
const missions = createMissions({
  scene, camera, viewport, collision, hud, player, world,
  getMode: () => mode,
  getPos: () => active().group.position,
  getVehicle: () => {
    if (mode === "walk") return null;
    const v = RIDES[mode].veh;
    return { x: v.group.position.x, z: v.group.position.z, speed: v.state.speed, radius: v.state.radius };
  },
  // Turn to face the ninja and throw a punch.
  punch: (target) => {
    const p = player.group.position;
    if (target) player.state.heading = Math.atan2(target.x - p.x, target.z - p.z);
    player.group.rotation.y = player.state.heading;
    player.state.speed = 0;
    player.punch();
  },
  kickPlayer: (dx, dz) => knockPlayer(dx, dz),
  // Reached an objective: brake, then Sidney hops off (handled in frame()).
  arrive: () => {
    if (mode === "walk") return;
    RIDES[mode].veh.stop();
    hopOffWhenStopped = true;
  },
});
let hopOffWhenStopped = false;

function nearestRide() {
  const p = player.group.position;
  let best = null, bestD = 3.4;
  for (const key of ["bike", "car"]) {
    const d = p.distanceTo(RIDES[key].veh.group.position);
    if (d < bestD) { bestD = d; best = key; }
  }
  return best;
}

function mount(key) {
  const { veh, pose } = RIDES[key];
  veh.park(); // re-lock onto the nearest road, facing the way it's parked
  veh.group.add(player.group);
  player.group.position.copy(veh.group.userData.seat);
  player.group.rotation.set(0, 0, 0);
  player.setPose(pose);
  mode = key;
}

function dismount() {
  const veh = RIDES[mode].veh;
  const h = veh.state.heading;
  const vp = veh.group.position;
  scene.add(player.group);
  player.setPose("walk");
  // Step off on the left, or the right if something's in the way.
  const side = mode === "car" ? 2.0 : 1.2;
  let spot = null;
  for (const s of [1, -1, 0]) {
    const x = vp.x + Math.cos(h) * side * s - (s === 0 ? Math.sin(h) * 2.6 : 0);
    const z = vp.z - Math.sin(h) * side * s - (s === 0 ? Math.cos(h) * 2.6 : 0);
    if (!collision.hits(x, z, player.state.radius)) { spot = [x, z]; break; }
  }
  spot = spot || [vp.x, vp.z];
  player.group.position.set(spot[0], 0.16, spot[1]);
  player.state.heading = h;
  player.state.speed = 0;
  player.group.rotation.set(0, h, 0);
  veh.state.speed = 0;
  mode = "walk";
}

const BRADSHALL_LINES = [
  "Bradshall: \"Request? I got two of my own on the radio.\"",
  "Bradshall: \"This pond's got the best acoustics in Colorado County.\"",
  "Bradshall: \"Train's my drummer. Never late, never early.\"",
];
const DRIVE_THRU_MENU = [
  "Cashier: \"Six-pack of Lone Goose Lager. Don't open it in the car.\"",
  "Cashier: \"Pack of Prairie Lights. Those'll kill ya, hon.\"",
  "Cashier: \"Bag of ice and a Big Red. Ten-four.\"",
  "Cashier: \"Sack of boiled peanuts, on the house, Chief.\"",
];

let character = "sidney";
function nearBradshall() {
  if (character === "bradshall") return false; // can't busk with yourself
  return player.group.parent === scene && player.group.position.distanceTo(bradshall.group.position) < 4.2;
}

function inTrigger() {
  const p = active().group.position;
  return triggers.find((t) => p.x > t.x0 && p.x < t.x1 && p.z > t.z0 && p.z < t.z1) || null;
}

function interact() {
  if (missions.interact()) return;
  const trig = inTrigger();
  if (mode !== "walk" && trig) {
    driveThruCount++;
    hud.toast(DRIVE_THRU_MENU[(driveThruCount - 1) % DRIVE_THRU_MENU.length], 3200);
    return;
  }
  if (mode !== "walk") return dismount();
  const local = townsfolk.nearest(player.group.position.x, player.group.position.z);
  if (local) {
    hud.toast(`${local.name}: "${townsfolk.talk(local, { id: character, short: CHARACTERS[character].short })}"`, 4200);
    return;
  }
  if (nearBradshall()) {
    // Alternate between his two songs.
    const idx = STATION.findIndex((t, i) => t.artist === "The Thicker Bradshall" && i !== STATION.indexOf(currentTrack()));
    if (idx >= 0) playTrack(idx);
    hud.toast(BRADSHALL_LINES[bradshallLine++ % BRADSHALL_LINES.length], 3200);
    return;
  }
  const ride = nearestRide();
  if (ride) mount(ride);
  else callRide("bike"); // nothing close by: whistle for Green Dog
}

// Call a ride to wherever Sidney is and hop on. If he's on the other one,
// he parks it first.
function callRide(key) {
  if (missions.blocking || mode === key) return;
  if (mode !== "walk") dismount();
  const { veh, name } = RIDES[key];
  const p = player.group.position;
  if (p.distanceTo(veh.group.position) > 3.4) {
    const h = player.state.heading;
    veh.group.position.set(p.x + Math.cos(h) * 1.4, 0.16, p.z - Math.sin(h) * 1.4);
    veh.state.heading = h;
    veh.group.rotation.set(0, h, 0);
    hud.toast(key === "bike" ? "Green Dog rolls up" : "The '70 pulls up", 1400);
  }
  mount(key);
}

const radioBtn = document.getElementById("btnRadio");
function syncRadioButton() {
  const on = radioIsOn();
  radioBtn.classList.toggle("off", !on);
  radioBtn.innerHTML = on ? "&#10074;&#10074; RADIO" : "&#9654; RADIO";
}

function promptText() {
  const mp = missions.prompt();
  if (mp) return mp;
  if (mode !== "walk") {
    const v = RIDES[mode].veh.state;
    if (!v.cruise && v.speed < 0.5 && !inTrigger()) {
      return { text: touch ? "Tap \u25B2 to ride \u00b7 \u25C0 \u25B6 picks your next turn" : "W to ride \u00b7 A / D picks your next turn \u00b7 S stops" };
    }
  }
  const trig = inTrigger();
  if (mode !== "walk") {
    if (trig) return { text: "Roll up to the cashier's window", action: "ORDER" };
    return null;
  }
  const local = townsfolk.nearest(player.group.position.x, player.group.position.z);
  if (local) return { text: `Talk to ${local.name}`, action: "TALK" };
  if (nearBradshall()) return { text: "Ask The Thicker Bradshall to play one", action: "TALK" };
  const ride = nearestRide();
  if (ride === "bike") return { text: "Hop on Green Dog", action: "RIDE" };
  if (ride === "car") return { text: "Get in the '70", action: "DRIVE" };
  if (trig) return { text: trig.text };
  return null;
}

onRadioTrackChange((t) => hud.toast(`ON THE RADIO: ${t.title} — ${t.artist}`));

// Voices: caption card lower right with the speaker's face. Sid's own lines
// as Sidney; phone calls (Sid calling Bradshall, Brian calling anybody)
// get an INCOMING CALL / ON THE PHONE tag.
const voiceCard = document.getElementById("voiceCard");
const voiceText = document.getElementById("voiceText");
const voiceWho = document.getElementById("vWho");
const voiceTag = document.getElementById("vTag");
const voiceFace = document.getElementById("voiceFace").getContext("2d");
const CALLERS = {
  sid: {
    name: "SIDNEY",
    draw(c) {
      const face = makeFaceTexture({ skin: "#9a6a46", glasses: true, mustache: true, browColor: "#141210" }).image;
      c.fillStyle = "#21c4b5";
      c.fillRect(0, 0, 112, 112);
      c.drawImage(face, 6, 14, 100, 100);
      c.fillStyle = "#1b1611"; // close-cropped hair
      c.beginPath();
      c.ellipse(56, 16, 52, 20, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#4d4741"; // shirt collar
      c.fillRect(0, 104, 112, 8);
    },
  },
  brian: {
    name: "BRIAN WEED",
    draw(c) {
      const face = makeFaceTexture({ skin: "#f2c6a8", bigMustache: "#5e4a3a", stubble: true, blush: true, browColor: "#4a3420", eyeColor: "#3a2616" }).image;
      c.fillStyle = "#e8742a";
      c.fillRect(0, 0, 112, 112);
      c.drawImage(face, 2, 16, 108, 100);
      c.fillStyle = "#16181c"; // black ball cap and brim
      c.beginPath();
      c.ellipse(56, 18, 56, 22, 0, Math.PI, 0);
      c.fill();
      c.fillRect(0, 16, 112, 8);
      c.fillRect(20, 22, 80, 6);
      c.fillStyle = "#6b6f75"; // gray tee
      c.fillRect(0, 104, 112, 8);
    },
  },
};
let voiceShown = null;
onVoice((v) => {
  if (v) {
    if (voiceShown !== v.who) {
      voiceShown = v.who;
      CALLERS[v.who].draw(voiceFace);
      voiceWho.textContent = CALLERS[v.who].name;
    }
    voiceText.textContent = v.text;
    voiceTag.textContent = v.call === "ringing" ? "INCOMING CALL" : v.call ? "ON THE PHONE" : "";
  }
  voiceCard.classList.toggle("show", !!v);
  voiceCard.classList.toggle("ringing", !!v && v.call === "ringing");
  voiceCard.classList.toggle("phone", !!v && !!v.call);
  viewport.classList.toggle("talking", !!v);
});

// ---------- Trains and gates ----------
let bellOn = false;
function updateRail(dt, time) {
  for (const t of Object.values(trains)) t.update(dt);
  const p = active().group.position;
  let nearestActive = Infinity;
  for (const cr of gated) {
    const on = trains[cr.rail].approaching(cr.s, 85);
    cr.amount += ((on ? 1 : 0) - cr.amount) * Math.min(1, dt * 2.2);
    for (const g of cr.gates) g.pivot.rotation.z = (-Math.PI / 2) * cr.amount;
    const blink = on && Math.floor(time * 2.3) % 2 === 0;
    cr.lamps[0].color.setHex(on ? (blink ? 0xff2a1a : 0x3a0606) : 0x3a0606);
    cr.lamps[1].color.setHex(on ? (!blink ? 0xff2a1a : 0x3a0606) : 0x3a0606);
    if (on) nearestActive = Math.min(nearestActive, Math.hypot(p.x - cr.x, p.z - cr.z));
  }
  const bellRange = 160;
  if (nearestActive < bellRange) {
    setBellVolume(0.09 * (1 - nearestActive / bellRange));
    if (!bellOn) { startCrossingBell(); bellOn = true; }
  } else if (bellOn) {
    stopCrossingBell();
    bellOn = false;
  }
  // Horn when a moving train is close enough to hear.
  for (const t of Object.values(trains)) {
    if (!t.moving) continue;
    const hp = t.headPos();
    const d = Math.hypot(hp.x - p.x, hp.z - p.z);
    if (d < 260) playHorn(0.13 * (1 - d / 260));
  }
  hud.setTrainWarning(nearestActive < 260);
}

// Vehicles on rails ask this before moving onto (x, z): is it the road over
// the tracks while that crossing's gates are down?
function gateBlocks(x, z) {
  const p = active().group.position;
  for (const cr of gated) {
    if (cr.amount < 0.35) continue;
    if (inCrossingZone(cr, x, z) && !inCrossingZone(cr, p.x, p.z)) return true;
  }
  return false;
}

// ---------- Adaptive resolution ----------
// If the frame rate sags (older phones), step the render resolution down
// rather than stutter. Checked every 3 seconds, never below 1x.
let perfTime = 0, perfFrames = 0, perfWarmup = 3;
function adaptQuality(dt) {
  if (!started) return;
  // Ignore the first seconds: shaders compile and audio loads then.
  if (perfWarmup > 0) {
    perfWarmup -= dt;
    return;
  }
  perfTime += dt;
  perfFrames++;
  if (perfTime < 3) return;
  const avg = perfTime / perfFrames;
  perfTime = 0;
  perfFrames = 0;
  if (avg > 1 / 40 && pixelRatio > 1) {
    pixelRatio = Math.max(1, pixelRatio - 0.25);
    renderer.setPixelRatio(pixelRatio);
    resize();
  }
}

// ---------- Main loop ----------
let last = performance.now();
let time = 0;
const stuckWatch = createStuckWatch();
const IDLE = { x: 0, y: 0, sprint: false, brake: false, interact: false, view: false, map: false, radio: false };
const extras = [];

const GREETINGS = ["Hey, {you}!", "Afternoon, {you}.", "Well, look who it is!", "Howdy, {you}!", "{you}! C'mere a sec.", "Hot enough for ya, {you}?"];
let greetIdx = 0;

// ---------- Back to the main menu (switch characters) ----------
// A fresh page load is the cleanest reset: the title screen, PRESS START,
// the theme and the character picker, with every mission back at the start.
const menuConfirm = document.getElementById("menuConfirm");
let menuOpen = false;
function openMenu(on) {
  menuOpen = on;
  menuConfirm.classList.toggle("show", on);
}
document.getElementById("btnMenu").addEventListener("click", (e) => { e.stopPropagation(); if (started) openMenu(!menuOpen); });
document.getElementById("mcYes").addEventListener("click", (e) => { e.stopPropagation(); location.reload(); });
document.getElementById("mcNo").addEventListener("click", (e) => { e.stopPropagation(); openMenu(false); });
window.addEventListener("keydown", (e) => {
  if (!started) return;
  if (e.code === "Escape") openMenu(!menuOpen);
  else if (menuOpen && e.code === "Enter") location.reload();
});

// ---------- Dr. Pebber cans: grab one for a few seconds of extra speed ----------
const boostChip = document.getElementById("boostChip");
const boostBar = boostChip.querySelector("i");
let boostT = 0;
function updateBoost(dt, pos) {
  const live = started && !missions.blocking;
  const got = pickups.update(dt, time, pos, live ? (mode === "walk" ? 1.7 : 3.4) : 0);
  if (got) {
    if (boostT <= 0) hud.toast("DR. PEBBER RUSH! 24 flavors of speed", 1600);
    boostT = BOOST_SECONDS;
    playFizz();
  } else if (boostT > 0) {
    boostT -= dt;
    if (boostT <= 0) playBoostEnd();
  }
  const m = boostT > 0 ? BOOST_MULT : 1;
  player.state.boost = bike.state.boost = car.state.boost = m;
  boostChip.classList.toggle("show", boostT > 0);
  if (boostT > 0) boostBar.style.width = `${(100 * boostT) / BOOST_SECONDS}%`;
  // Widen the view a touch while boosted, for the rush.
  const fov = boostT > 0 ? 66 : 55;
  if (Math.abs(camera.fov - fov) > 0.05) {
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 5);
    camera.updateProjectionMatrix();
  }
}

function frame() {
  requestAnimationFrame(frame);
  const nowMs = performance.now();
  const dt = Math.min((nowMs - last) / 1000, 0.05);
  last = nowMs;
  time += dt;
  const polled = controls.poll();
  // Story cards hold everything except the button that closes them.
  let input = !started || menuOpen ? IDLE : missions.blocking ? { ...IDLE, interact: polled.interact } : polled;
  // D-pad while walking works from Sidney's point of view: up walks the way
  // he's facing, left / right turn him, down backs up.
  if (input === polled && polled.stick.on && mode === "walk") {
    input = { ...polled, x: polled.stick.x, y: polled.stick.y };
  }

  adaptQuality(dt);
  if (input.interact) interact();
  if (input.view) hud.toast(chaseCam.cycle());
  if (input.map) hud.toast(hud.cycleMap());
  if (input.radio) { unlockAudio(); playRadio(); nextStation(); syncRadioButton(); }
  if (input.radioToggle) {
    unlockAudio();
    hud.toast(toggleRadio() ? "RADIO ON" : "RADIO PAUSED", 1200);
    syncRadioButton();
  }
  if (input.car) callRide("car");

  updateRail(dt, time);
  bradshall.update(dt);

  const ent = active();
  ent.update(dt, input, WORLD.bounds, collision, { blocked: gateBlocks, routeDir: missions.routeDirAt });
  // On foot: pushing but going nowhere for a moment? Pop free. (Vehicles are
  // on rails and can't get stuck.)
  const pushing = mode === "walk" && ((input.dir != null && input.mag > 0.3) || Math.abs(input.y) > 0.3);
  stuckWatch.update(dt, pushing, ent.group.position, collision, ent.state.radius, input.dir ?? ent.state.heading);
  // Sid's voicemail lines are Sidney's voice: only when playing Sidney.
  updateVoices(dt, started && !missions.blocking && !themePlaying(), character);
  if (mode === "bike") player.animateRide(bike.state.speed, dt);
  if (hopOffWhenStopped) {
    if (mode === "walk") hopOffWhenStopped = false;
    else if (ent.state.speed < 0.6) {
      hopOffWhenStopped = false;
      dismount();
    }
  }

  const pos = ent.group.position;
  chaseCam.update(pos, ent.state.heading, dt, mode, collision);
  camera.updateMatrixWorld();
  treeFocus.value.set(pos.x, pos.y + 1.2, pos.z).applyMatrix4(camera.matrixWorldInverse);
  missions.update(dt, time);
  updateBoost(dt, pos);
  townsfolk.update(dt, {
    px: pos.x,
    pz: pos.z,
    vehicle: mode === "walk" ? null : { x: pos.x, z: pos.z, speed: ent.state.speed },
    onDodge: (f) => hud.toast(`${f.name}: "Whoa! Watch it, ${CHARACTERS[character].short}!"`, 1600),
    onGreet: started && !missions.blocking ? (f) => {
      const hi = GREETINGS[(greetIdx++) % GREETINGS.length].replace("{you}", CHARACTERS[character].short);
      hud.toast(`${f.name}: "${hi}"${mode === "walk" ? " (E to chat)" : ""}`, 2200);
    } : null,
  });
  gators.update(dt, {
    px: pos.x,
    pz: pos.z,
    onFoot: mode === "walk",
    hiss: () => playHiss(),
    snap: (dx, dz) => {
      playSnap();
      knockPlayer(dx, dz, 3);
      hud.toast("Gator! Back away from the water.", 1600);
    },
  });
  sky.follow(camera, dt);
  world.update(time);
  sun.target.position.set(pos.x, 0, pos.z);
  sun.position.copy(sun.target.position).add(SUN_OFFSET);

  hud.setMode(mode === "walk" ? `ON FOOT · ${CHARACTERS[character].name}` : RIDES[mode].label, mode !== "walk");
  hud.setPrompt(promptText());
  if (mode === "walk") hud.setTurn(null);
  else {
    const v = RIDES[mode].veh.state;
    hud.setTurn(v.turnIntent === -1 ? "left" : v.turnIntent === 1 ? "right" : v.followingRoute && v.cruise ? "route" : null);
  }
  extras.length = 0;
  for (const t of Object.values(trains)) {
    if (t.moving) { const h = t.headPos(); extras.push({ x: h.x, z: h.z, r: 4, color: "#e8262a" }); }
  }
  if (mode !== "bike") extras.push({ x: bike.group.position.x, z: bike.group.position.z, r: 2.4, color: "#2ecc71" });
  if (mode !== "car") extras.push({ x: car.group.position.x, z: car.group.position.z, r: 2.6, color: "#1f8a4c" });
  if (bradshall.group.visible) extras.push({ x: bradshall.group.position.x, z: bradshall.group.position.z, r: 2.6, color: "#8e44ad" });
  for (const c of pickups.spots) {
    if (c.gone <= 0 && Math.abs(c.x - pos.x) < 160 && Math.abs(c.z - pos.z) < 160) extras.push({ x: c.x, z: c.z, r: 1.6, color: "#a51c30" });
  }
  for (const f of townsfolk.list) extras.push({ x: f.group.position.x, z: f.group.position.z, r: 2.2, color: "#4dabf7" });
  const maxSpeed = mode === "walk" ? player.state.sprintSpeed : ent.state.maxSpeed * 1.3;
  const t = currentTrack();
  hud.update({
    x: pos.x, z: pos.z, heading: ent.state.heading,
    speedFrac: Math.abs(ent.state.speed) / maxSpeed,
    now: `${t.title} — ${t.artist}`, time, extras,
    mission: { route: missions.route, target: missions.target, enemies: missions.enemies },
  });

  post.render(scene, camera);
}
frame();

if (location.search.includes("debug")) {
  window.__debug = {
    THREE, scene, camera, renderer, post, player, bike, car, bradshall, trains, crossings, chaseCam, hud, world,
    mount, dismount, missions, gators, townsfolk, pickups, boost: () => boostT, themeDebug, debugCall, distToRoad, radioOutput, radioIsOn, getMode: () => mode, gameTime: () => time,
    teleport(x, z, heading = 0) {
      const e = active();
      e.group.position.x = x;
      e.group.position.z = z;
      e.state.heading = heading;
      e.group.rotation.y = heading;
      chaseCam.snap();
    },
  };
}

// ---------- Start: pick a character (tap a card, or arrows + Enter) ----------
const overlay = document.getElementById("startOverlay");
const picks = [...document.querySelectorAll(".charPick")];
let highlighted = 0;
function highlight(i) {
  highlighted = (i + picks.length) % picks.length;
  picks.forEach((p, k) => p.classList.toggle("on", k === highlighted));
}
// Portraits on the cards, drawn from the same face art as the 3D models.
function drawPortrait(canvas, opts, hair) {
  const c = canvas.getContext("2d");
  const face = makeFaceTexture(opts).image;
  c.fillStyle = "#21c4b5";
  c.fillRect(0, 0, 112, 112);
  c.drawImage(face, 6, 18, 100, 100);
  hair(c);
}
drawPortrait(document.getElementById("pickSidney"), { skin: "#9a6a46", glasses: true, mustache: true, browColor: "#141210" }, (c) => {
  c.fillStyle = "#1b1611";
  c.beginPath();
  c.ellipse(56, 20, 52, 20, 0, 0, Math.PI * 2);
  c.fill();
});
drawPortrait(document.getElementById("pickBradshall"), { skin: "#e0ad86", muttonChops: true, hairColor: "#5a3a22", browColor: "#4a2f1a" }, (c) => {
  c.fillStyle = "#caa46a"; // cowboy hat
  c.beginPath();
  c.ellipse(56, 26, 58, 11, 0, 0, Math.PI * 2);
  c.fill();
  c.fillRect(28, 0, 56, 26);
  c.fillStyle = "#3b2614";
  c.fillRect(28, 18, 56, 6);
});

function start(id = picks[highlighted]?.dataset.char || "sidney") {
  if (started || performance.now() - pressedAt < 450) return;
  started = true;
  character = CHARACTERS[id] ? id : "sidney";
  if (character !== "sidney") {
    player.setCharacter(character);
    if (character === "bradshall") bradshall.group.visible = false; // he's you now
  }
  missions.setCharacter(character);
  unlockAudio();
  introThenRadio(5); // theme plays on ~5 s into the game, then the radio takes over
  overlay.classList.add("hidden");
  window.removeEventListener("keydown", onStartKey);
  // ?debug&mission=3 starts at the third mission (testing only).
  const q = new URLSearchParams(location.search);
  missions.start(q.has("debug") ? Math.max(0, (parseInt(q.get("mission"), 10) || 1) - 1) : 0);
}
// Title screen: PRESS START (any key or tap) brings up the theme song and
// the character picker. Phones only allow sound from a real tap (click /
// touchend / keydown, not touchstart or pointerdown), so that's what
// starts it; any later tap on the title screen retries if it didn't take.
let pressedAt = -1e9;
function pressStart() {
  if (!overlay.classList.contains("title")) return nudgeMenuTheme();
  overlay.classList.remove("title");
  pressedAt = performance.now();
  unlockAudio();
  playMenuTheme();
}
overlay.addEventListener("click", () => pressStart());
overlay.addEventListener("touchend", (e) => {
  // Leaving the title: swallow the tap's follow-up click so it can't land
  // on a character card that just appeared under the finger.
  if (overlay.classList.contains("title")) e.preventDefault();
  pressStart();
}, { passive: false });
function onStartKey(e) {
  if (overlay.classList.contains("title")) return pressStart();
  if (e.code === "ArrowLeft" || e.code === "KeyA") highlight(highlighted - 1);
  else if (e.code === "ArrowRight" || e.code === "KeyD") highlight(highlighted + 1);
  else if (e.code === "Digit1") start("sidney");
  else if (e.code === "Digit2") start("bradshall");
  else if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") start();
}
picks.forEach((p, i) => {
  p.addEventListener("click", (e) => { e.stopPropagation(); start(p.dataset.char); });
  p.addEventListener("touchend", (e) => { e.preventDefault(); e.stopPropagation(); start(p.dataset.char); }, { passive: false });
  p.addEventListener("mouseenter", () => highlight(i));
});
window.addEventListener("keydown", onStartKey);
// Belt and braces: if audio was blocked, the next touch anywhere retries it.
window.addEventListener("pointerdown", () => { if (started) { unlockAudio(); if (radioIsOn()) playRadio(); } }, { once: true });
