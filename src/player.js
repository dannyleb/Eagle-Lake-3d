import * as THREE from "three";
import { toonify } from "./render/toon.js";
import { clearHeading, wrapAngle } from "./assist.js";
import { makeFaceTexture, makeHeadMaterials } from "./textures.js";

// Sidney — a stylized tribute built from the photos: heavyset, glasses and a
// thin mustache, dark wavy hair, a charcoal-brown uniform shirt with a gold
// badge, "SIDNEY" name tag and a radio mic clipped at the shoulder, white
// camo cargo shorts, navy sneakers, a silver watch and a pink wristband.

const SKIN = 0x9a6a46;
const BASE_SCALE = 0.8;

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const camoTex = () =>
  canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#e9e9e4";
    ctx.fillRect(0, 0, w, h);
    const cols = ["#cfd0cb", "#b9bab4", "#f7f7f3", "#a7a8a2"];
    for (let i = 0; i < 46; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 14, 4 + Math.random() * 8, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

const nameTagTex = () =>
  canvasTex(128, 40, (ctx, w, h) => {
    ctx.fillStyle = "#f4f4f0";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SIDNEY", w / 2, h / 2 + 1);
  });

export function buildSidney() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: SKIN });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x4d4741 });
  const shirtDark = new THREE.MeshLambertMaterial({ color: 0x3b3631 });
  const shorts = new THREE.MeshLambertMaterial({ map: camoTex() });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1b1b1b });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x141210 });
  const gold = new THREE.MeshLambertMaterial({ color: 0xd4a72c, emissive: 0x3a2a00 });
  const navy = new THREE.MeshLambertMaterial({ color: 0x23356b });
  const white = new THREE.MeshLambertMaterial({ color: 0xf4f4f0 });
  const silver = new THREE.MeshLambertMaterial({ color: 0xc9cdd0 });

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  group.add(hips);

  // Torso: a rounded, heavyset build
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.3, 6, 12), shirt);
  torso.scale.set(1.12, 1, 0.86);
  torso.position.y = 0.42;
  hips.add(torso);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.08, 16), dark);
  belt.scale.set(1.08, 1, 0.84);
  belt.position.y = 0.06;
  hips.add(belt);
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.08), dark);
  pouch.position.set(0.18, 0.04, 0.3);
  hips.add(pouch);
  for (const sx of [-0.15, 0.15]) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.04), shirtDark);
    flap.position.set(sx, 0.66, 0.285);
    hips.add(flap);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.03), shirtDark);
    pocket.position.set(sx, 0.57, 0.28);
    hips.add(pocket);
  }
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), gold);
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0.15, 0.6, 0.31);
  hips.add(badge);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.055), new THREE.MeshBasicMaterial({ map: nameTagTex() }));
  tag.position.set(-0.15, 0.7, 0.307);
  hips.add(tag);
  for (const sx of [-0.33, 0.33]) {
    const ep = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.12), shirtDark);
    ep.position.set(sx, 0.86, 0);
    hips.add(ep);
  }
  const mic = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.05), dark);
  mic.position.set(0.27, 0.78, 0.2);
  hips.add(mic);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), dark);
  cord.position.set(0.3, 0.52, 0.12);
  cord.rotation.z = 0.15;
  hips.add(cord);

  // Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.12, 10), skin);
  neck.position.y = 0.92;
  hips.add(neck);
  const faceTex = makeFaceTexture({ skin: "#9a6a46", glasses: true, mustache: true, browColor: "#141210" });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.44), makeHeadMaterials(faceTex, SKIN));
  head.position.y = 1.22;
  hips.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
  hair.scale.set(0.54, 0.3, 0.5);
  hair.position.set(0, 1.44, -0.02);
  hips.add(hair);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.1), hairMat);
  hairBack.position.set(0, 1.32, -0.2);
  hips.add(hairBack);
  for (const sx of [-0.25, 0.25]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin);
    ear.position.set(sx, 1.2, 0);
    hips.add(ear);
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.24), dark);
    temple.position.set(sx * 0.98, 1.25, 0.1);
    hips.add(temple);
  }

  function buildArm(sign) {
    const arm = new THREE.Group();
    arm.position.set(sign * 0.44, 0.74, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.12, 4, 8), shirt);
    sleeve.position.y = -0.12;
    arm.add(sleeve);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.26, 4, 8), skin);
    fore.position.y = -0.4;
    arm.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), skin);
    hand.position.y = -0.6;
    arm.add(hand);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.05, 10), sign > 0 ? silver : new THREE.MeshLambertMaterial({ color: 0xff5fa2 }));
    band.position.y = -0.5;
    arm.add(band);
    return arm;
  }
  const armL = buildArm(1);
  const armR = buildArm(-1);
  hips.add(armL, armR);

  function buildLeg(sign) {
    const leg = new THREE.Group();
    leg.position.set(sign * 0.17, 0.02, 0);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.3), shorts);
    thigh.position.y = -0.22;
    leg.add(thigh);
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.18), shorts);
    cargo.position.set(sign * 0.16, -0.3, 0);
    leg.add(cargo);
    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.2, 4, 8), skin);
    calf.position.y = -0.6;
    leg.add(calf);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.34), navy);
    shoe.position.set(0, -0.83, 0.05);
    leg.add(shoe);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.04, 0.35), white);
    sole.position.set(0, -0.9, 0.05);
    leg.add(sole);
    return leg;
  }
  const legL = buildLeg(1);
  const legR = buildLeg(-1);
  hips.add(legL, legR);

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.scale.setScalar(BASE_SCALE);
  return { group, parts: { hips, armL, armR, legL, legR, torso } };
}

export function createPlayer(scene, spawn) {
  const { group, parts } = buildSidney();
  group.position.set(spawn.x, 0.16, spawn.z);
  group.rotation.y = spawn.heading;
  scene.add(group);

  const state = { group, heading: spawn.heading, speed: 0, walkSpeed: 4.8, sprintSpeed: 8.2, walkCycle: 0, radius: 0.45, pose: "walk" };
  let pedal = 0;
  let punchT = 0;
  let helmet = null;

  // A quick right hook (mission takedowns).
  function punch() {
    punchT = 0.32;
  }

  // Gold championship belt: black strap, big center plate with a red jewel,
  // and two side plates.
  let belt = null;
  function setBelt(on) {
    if (!on || belt) return;
    belt = new THREE.Group();
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.16, 18), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    strap.scale.set(1.1, 1, 0.88);
    strap.position.y = 0.08;
    belt.add(strap);
    const gold = new THREE.MeshLambertMaterial({ color: 0xf2c230 });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), gold);
    plate.rotation.x = Math.PI / 2;
    plate.scale.set(1.25, 1, 1);
    plate.position.set(0, 0.09, 0.35);
    belt.add(plate);
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshLambertMaterial({ color: 0xd62828 }));
    jewel.position.set(0, 0.1, 0.39);
    belt.add(jewel);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.04), gold);
      side.position.set(sx * 0.33, 0.08, 0.24);
      side.rotation.y = sx * 0.7;
      belt.add(side);
    }
    belt.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    toonify(belt);
    parts.hips.add(belt);
  }

  // White fire-chief helmet: dome, long back brim, front shield, top comb.
  function setChief(on) {
    if (!on || helmet) return;
    helmet = new THREE.Group();
    const white = new THREE.MeshLambertMaterial({ color: 0xf7f7f2 });
    const gold = new THREE.MeshLambertMaterial({ color: 0xe0b23c });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), white);
    dome.scale.set(0.62, 0.5, 0.62);
    dome.position.set(0, 1.45, -0.01);
    helmet.add(dome);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.05, 20), white);
    brim.scale.set(0.95, 1, 1.3);
    brim.position.set(0, 1.46, -0.1);
    helmet.add(brim);
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.56), white);
    comb.position.set(0, 1.71, -0.02);
    helmet.add(comb);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.04), gold);
    shield.position.set(0, 1.55, 0.31);
    shield.rotation.x = -0.25;
    helmet.add(shield);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.02), new THREE.MeshLambertMaterial({ color: 0xb5342c }));
    mark.position.set(0, 1.55, 0.335);
    mark.rotation.x = -0.25;
    helmet.add(mark);
    helmet.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    toonify(helmet);
    parts.hips.add(helmet);
  }

  function setPose(pose) {
    state.pose = pose;
    parts.hips.rotation.x = 0;
    parts.armL.rotation.set(0, 0, 0);
    parts.armR.rotation.set(0, 0, 0);
    parts.legL.rotation.set(0, 0, 0);
    parts.legR.rotation.set(0, 0, 0);
    if (pose === "ride") {
      parts.hips.rotation.x = 0.32;
      parts.armL.rotation.set(-1.25, 0, -0.18);
      parts.armR.rotation.set(-1.25, 0, 0.18);
      parts.legL.rotation.x = -0.75;
      parts.legR.rotation.x = -0.75;
    } else if (pose === "drive") {
      parts.legL.rotation.x = -1.45;
      parts.legR.rotation.x = -1.45;
      parts.armL.rotation.set(-1.1, 0, 0.15);
      parts.armR.rotation.set(-1.1, 0, -0.15);
    }
    parts.hips.position.y = 0.95;
    group.scale.setScalar(pose === "drive" ? 0.55 : BASE_SCALE);
  }

  // Pedaling on Green Dog: legs circle with the cranks.
  function animateRide(speed, dt) {
    pedal += dt * speed * 1.4;
    parts.legL.rotation.x = -0.75 + Math.sin(pedal) * 0.35;
    parts.legR.rotation.x = -0.75 - Math.sin(pedal) * 0.35;
  }

  function update(dt, input, bounds, collision) {
    let target;
    const pointed = input.dir != null;
    if (pointed) {
      // Point-and-go (touch stick): turn quickly to face the stick, speed
      // from how far it's pushed; a full push breaks into a run.
      const d = wrapAngle(input.dir - state.heading);
      state.heading += Math.sign(d) * Math.min(Math.abs(d), 11 * dt);
      target = input.sprint || input.mag > 0.9 ? state.sprintSpeed : state.walkSpeed * (0.45 + 0.55 * input.mag);
    } else {
      state.heading += -input.x * 2.6 * dt;
      // Backing up is slower than walking forward.
      target = input.y > 0 ? (input.sprint ? state.sprintSpeed : state.walkSpeed) : input.y < 0 ? -state.walkSpeed * 0.6 : 0;
    }
    state.speed += (target - state.speed) * Math.min(1, dt * 8);

    const oldX = group.position.x, oldZ = group.position.z;
    // Guardrail: bend the path around whatever is ahead instead of
    // walking face-first into it.
    let moveH = state.heading;
    if (collision && state.speed > 0.5) {
      const bias = pointed ? Math.sign(wrapAngle(input.dir - state.heading)) || 1 : -Math.sign(input.x) || 1;
      const h = clearHeading(collision, oldX, oldZ, state.heading, state.radius, 1.0 + state.speed * 0.12, bias);
      if (h !== null) moveH = h;
      if (pointed) state.heading += wrapAngle(moveH - state.heading) * Math.min(1, dt * 6);
    }
    const nx = THREE.MathUtils.clamp(oldX + Math.sin(moveH) * state.speed * dt, -bounds, bounds);
    const nz = THREE.MathUtils.clamp(oldZ + Math.cos(moveH) * state.speed * dt, -bounds, bounds);
    const r = collision ? collision.resolveMove(oldX, oldZ, nx, nz, state.radius) : { x: nx, z: nz };
    group.position.x = r.x;
    group.position.z = r.z;
    group.rotation.y = state.heading;

    const walking = Math.abs(state.speed) > 0.1;
    if (walking) {
      state.walkCycle += dt * (6 + Math.abs(state.speed) * 0.9);
      const swing = Math.sin(state.walkCycle) * 0.55;
      parts.legL.rotation.x = swing;
      parts.legR.rotation.x = -swing;
      parts.armL.rotation.x = -swing * 0.7;
      parts.armR.rotation.x = swing * 0.7;
      parts.hips.position.y = 0.95 + Math.abs(Math.sin(state.walkCycle)) * 0.04;
    } else {
      for (const p of [parts.legL, parts.legR, parts.armL, parts.armR]) p.rotation.x *= 0.8;
      parts.hips.position.y = 0.95;
    }
    if (punchT > 0) {
      punchT = Math.max(0, punchT - dt);
      const k = Math.sin((1 - punchT / 0.32) * Math.PI);
      parts.armR.rotation.x = -1.65 * k;
      parts.armR.rotation.z = 0.15 * k;
      parts.hips.rotation.y = -0.45 * k;
    } else {
      parts.hips.rotation.y = 0;
    }
  }

  return { group, state, update, setPose, animateRide, punch, setChief, setBelt };
}
