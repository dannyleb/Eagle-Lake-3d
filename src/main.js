import * as THREE from "three";
import { COLORS, WORLD, RAIL, SPAWN, GAME_TITLE } from "./config.js";
import { buildWorld } from "./world.js";
import { createTrain } from "./train.js";
import { createControls } from "./controls.js";
import { createPlayer } from "./player.js";
import { createVehicle } from "./vehicles.js";
import { createChaseCamera } from "./camera.js";
import { unlockAudio, startCrossingBell, stopCrossingBell } from "./audio.js";

document.title = GAME_TITLE;

if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
  document.body.classList.add("touch");
}

const canvas = document.getElementById("gameCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.sky);
scene.fog = new THREE.Fog(COLORS.fog, WORLD.fogNear, WORLD.fogFar);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// --- Lighting ---
const hemi = new THREE.HemisphereLight(0xdceeff, 0x4a5a3a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3d6, 1.15);
sun.position.set(80, 120, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -140;
sun.shadow.camera.right = 140;
sun.shadow.camera.top = 140;
sun.shadow.camera.bottom = -140;
sun.shadow.camera.far = 300;
sun.shadow.bias = -0.0015;
scene.add(sun);
scene.add(sun.target);

// --- World ---
const { gates } = buildWorld(scene);
const train = createTrain(scene);

// --- Entities ---
const controls = createControls();
const player = createPlayer(scene, SPAWN.player);
const bike = createVehicle(scene, "bike", SPAWN.bike);
const car = createVehicle(scene, "car", SPAWN.car);
const chaseCam = createChaseCamera(camera);

let mode = "walk"; // "walk" | "bike" | "car"
let gateClosedAmount = 0; // 0 open -> 1 closed

const hudMode = document.getElementById("hudMode");
const promptEl = document.getElementById("prompt");
const trainBanner = document.getElementById("trainBanner");

function activeEntity() {
  if (mode === "walk") return player;
  if (mode === "bike") return bike;
  return car;
}

function nearestMountable() {
  const p = player.group.position;
  let best = null;
  let bestDist = 3.4;
  for (const [key, veh] of [["bike", bike], ["car", car]]) {
    const d = p.distanceTo(veh.group.position);
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best;
}

function tryInteract() {
  if (mode === "walk") {
    const target = nearestMountable();
    if (target) {
      const veh = target === "bike" ? bike : car;
      veh.state.heading = player.state.heading;
      veh.group.rotation.y = veh.state.heading;
      veh.group.position.copy(player.group.position);
      mode = target;
    }
  } else {
    const veh = activeEntity();
    const dismountOffset = new THREE.Vector3(Math.cos(veh.state.heading) * 1.4, 0, -Math.sin(veh.state.heading) * 1.4);
    player.group.position.copy(veh.group.position).add(dismountOffset);
    player.state.heading = veh.state.heading;
    player.group.rotation.y = player.state.heading;
    veh.state.speed = 0;
    mode = "walk";
  }
}

function updatePrompt() {
  if (mode === "walk") {
    const target = nearestMountable();
    if (target === "bike") promptEl.textContent = "Press E / tap ◉ to hop on Green Dog";
    else if (target === "car") promptEl.textContent = "Press E / tap ◉ to drive the '70";
    else promptEl.textContent = "";
  } else {
    promptEl.textContent = "Press E / tap ◉ to park";
  }
  promptEl.style.opacity = promptEl.textContent ? "1" : "0";
}

function syncVisibility() {
  player.group.visible = mode === "walk";
}

function updateHud() {
  if (mode === "walk") hudMode.textContent = "On foot — Sidney";
  else if (mode === "bike") hudMode.textContent = "Riding — Green Dog";
  else hudMode.textContent = "Driving — the '70";
}
updateHud();

const CROSSING_BOX = { xMin: RAIL.x - 3.4, xMax: RAIL.x + 3.4, zMin: -RAIL.gateZOffset, zMax: RAIL.gateZOffset };
function insideCrossingBox(pos) {
  return pos.x > CROSSING_BOX.xMin && pos.x < CROSSING_BOX.xMax && pos.z > CROSSING_BOX.zMin && pos.z < CROSSING_BOX.zMax;
}

let bellActive = false;

function updateTrainAndGates(dt) {
  train.update(dt);
  const approaching = train.isApproachingOrCrossing();
  const targetClosed = approaching ? 1 : 0;
  gateClosedAmount += (targetClosed - gateClosedAmount) * Math.min(1, dt * 3);

  for (const gate of gates) {
    gate.armPivot.rotation.z = gate.closedRot * gateClosedAmount;
    const blink = approaching && Math.floor(performance.now() / 260) % 2 === 0;
    for (const light of gate.lights) {
      light.material.color.setHex(blink ? 0xff2020 : 0x440000);
    }
  }

  if (approaching && !bellActive) {
    startCrossingBell();
    bellActive = true;
  } else if (!approaching && bellActive) {
    stopCrossingBell();
    bellActive = false;
  }

  trainBanner.style.opacity = approaching ? "1" : "0";
}

const WORLD_BOUNDS = WORLD.halfSize - 4;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  const input = controls.poll();
  if (input.interact) tryInteract();

  updateTrainAndGates(dt);

  const entity = activeEntity();
  const prevPos = entity.group.position.clone();
  entity.update(dt, input, WORLD_BOUNDS);

  if (mode !== "walk" && gateClosedAmount > 0.4 && insideCrossingBox(entity.group.position)) {
    entity.group.position.copy(prevPos);
    entity.state.speed = 0;
  }

  // Keep inactive entities visually resting (no physics needed while parked).
  syncVisibility();
  updatePrompt();
  updateHud();

  chaseCam.update(entity.group.position, entity.state.heading, dt, mode === "car" ? 8.5 : mode === "bike" ? 6.5 : 5.2, mode === "car" ? 3.6 : 3.0);

  sun.target.position.copy(entity.group.position);
  sun.position.copy(entity.group.position).add(new THREE.Vector3(80, 120, 40));

  renderer.render(scene, camera);
}
animate();

if (window.location.search.includes("debug")) {
  window.__debug = { player, bike, car, tryInteract, getMode: () => mode };
}

// --- Start overlay ---
const startOverlay = document.getElementById("startOverlay");
const startBtn = document.getElementById("startBtn");
startBtn.addEventListener("click", () => {
  unlockAudio();
  startOverlay.classList.add("hidden");
});
