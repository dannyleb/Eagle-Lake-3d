import * as THREE from "three";
import { makeFaceTexture, makeHeadMaterials } from "./textures.js";
import { FACES } from "./faces.js";

// Gary Jones, arborist and cowboy: denim from head to toe, a great big
// handlebar mustache, a chainsaw, and a pickup truck.
//
// He starts out in his old faded denim. His first mission is the western
// wear store, and each thing he buys swaps in on the model: boots, jeans,
// belt, pearl snap, cowboy hat (dress(item)).

const SKIN = 0xd9a07a;
const STACHE = 0x4a3524;
const OLD = { hat: 0x6f8fb3, shirt: 0x7d9cc4, jeans: 0x6584ad, boots: 0x6b5a48 };
const NEW = { hat: 0x2c3e66, shirt: 0x2f4f7f, jeans: 0x22314f, boots: 0x8a4b22 };

function cowboyHat(color, crisp) {
  const mat = new THREE.MeshLambertMaterial({ color });
  const band = new THREE.MeshLambertMaterial({ color: crisp ? 0x2b1a10 : 0x4f6f96 });
  const hat = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.035, 24), mat);
  brim.scale.set(1, 1, 0.85);
  // The old one droops; the new one's brim curls up smart at the sides.
  if (!crisp) brim.rotation.x = 0.12;
  hat.add(brim);
  if (crisp) {
    for (const sx of [-1, 1]) {
      const curl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.6), mat);
      curl.position.set(sx * 0.44, 0.06, 0);
      curl.rotation.z = sx * 0.55;
      hat.add(curl);
    }
  }
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, crisp ? 0.3 : 0.24, 16), mat);
  crown.scale.set(1, 1, 1.15);
  crown.position.y = crisp ? 0.16 : 0.13;
  hat.add(crown);
  if (crisp) {
    const pinch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.4), new THREE.MeshLambertMaterial({ color: 0x22314f }));
    pinch.position.y = 0.31;
    hat.add(pinch);
    const concho = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), new THREE.MeshLambertMaterial({ color: 0xd8dde3 }));
    concho.rotation.x = Math.PI / 2;
    concho.position.set(0.2, 0.06, 0.24);
    hat.add(concho);
  }
  const bandM = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.05, 16), band);
  bandM.scale.set(1, 1, 1.15);
  bandM.position.y = 0.05;
  hat.add(bandM);
  hat.position.set(0, 1.5, 0);
  hat.rotation.x = -0.06;
  return hat;
}

// The orange saw, with the bar pointing out along +z from the grip.
export function buildChainsaw() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.42), new THREE.MeshLambertMaterial({ color: 0xe8742a }));
  body.position.z = 0.05;
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.3), new THREE.MeshLambertMaterial({ color: 0x2b2b2b }));
  top.position.set(0, 0.15, 0.02);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 6, 14, Math.PI), new THREE.MeshLambertMaterial({ color: 0x1c1c1c }));
  handle.position.set(0, 0.14, 0.12);
  handle.rotation.y = Math.PI / 2;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.7), new THREE.MeshLambertMaterial({ color: 0xbfc5cc }));
  bar.position.z = 0.6;
  const chain = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.72), new THREE.MeshLambertMaterial({ color: 0x3a3a3a }));
  chain.position.z = 0.6;
  chain.scale.set(1, 1, 1);
  g.add(body, top, handle, chain, bar);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  // Held at the hip in the right hand, bar forward.
  g.position.set(0, -0.62, 0.05);
  return g;
}

export function buildGary() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: SKIN });
  const shirt = new THREE.MeshLambertMaterial({ color: OLD.shirt });
  const jacket = new THREE.MeshLambertMaterial({ color: 0x8eaad0 }); // the old faded denim jacket over it
  const jeans = new THREE.MeshLambertMaterial({ color: OLD.jeans });
  const boots = new THREE.MeshLambertMaterial({ color: OLD.boots });
  const pearl = new THREE.MeshLambertMaterial({ color: 0xf6f3ea });
  const silver = new THREE.MeshLambertMaterial({ color: 0xd8dde3 });
  const leather = new THREE.MeshLambertMaterial({ color: 0x5a3519 });
  const stache = new THREE.MeshLambertMaterial({ color: STACHE });

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  group.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.34, 6, 12), shirt);
  torso.scale.set(1.12, 1, 0.86);
  torso.position.y = 0.44;
  hips.add(torso);
  // Old look: an open denim jacket (two front panels and a collar).
  const oldJacket = new THREE.Group();
  for (const sx of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.06), jacket);
    panel.position.set(sx * 0.2, 0.44, 0.27);
    panel.rotation.y = sx * -0.25;
    oldJacket.add(panel);
  }
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.1, 0.5), jacket);
  collar.position.set(0, 0.76, 0);
  oldJacket.add(collar);
  hips.add(oldJacket);
  // New look: pearl snap western shirt, yoke and a column of pearl snaps.
  const snap = new THREE.Group();
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, 0.54), new THREE.MeshLambertMaterial({ color: 0x1f3557 }));
  yoke.position.set(0, 0.72, 0.01);
  snap.add(yoke);
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), pearl);
    s.position.set(0, 0.66 - i * 0.11, 0.285);
    snap.add(s);
  }
  for (const sx of [-1, 1]) {
    const pocket = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), pearl);
    pocket.position.set(sx * 0.17, 0.6, 0.27);
    snap.add(pocket);
  }
  snap.visible = false;
  hips.add(snap);

  // Belt: tooled leather and a big silver buckle (once he's bought it).
  const belt = new THREE.Group();
  const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.09, 16), leather);
  strap.scale.z = 0.86;
  strap.position.y = 0.1;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.03), silver);
  buckle.position.set(0, 0.1, 0.31);
  const stone = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.02), new THREE.MeshLambertMaterial({ color: 0x2bb3a3 }));
  stone.position.set(0, 0.1, 0.33);
  belt.add(strap, buckle, stone);
  belt.visible = false;
  hips.add(belt);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.12, 10), skin);
  neck.position.y = 0.92;
  hips.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.44), makeHeadMaterials(makeFaceTexture(FACES.gary), SKIN));
  head.position.y = 1.2;
  hips.add(head);
  // The handlebar stands out from the face: a thick bar and curled ends.
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), stache);
  bar.position.set(0, 1.04, 0.24);
  hips.add(bar);
  for (const sx of [-1, 1]) {
    const sweep = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.05), stache);
    sweep.position.set(sx * 0.19, 1.05, 0.23);
    sweep.rotation.z = sx * 0.5;
    hips.add(sweep);
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.016, 6, 10, Math.PI * 1.4), stache);
    curl.position.set(sx * 0.255, 1.1, 0.22);
    curl.rotation.z = sx > 0 ? -0.6 : Math.PI + 0.6;
    hips.add(curl);
  }
  for (const sx of [-0.25, 0.25]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin);
    ear.position.set(sx, 1.2, 0);
    hips.add(ear);
  }

  // Two hats in one: the old floppy denim one, and the new cowboy hat.
  const hat = new THREE.Group();
  const oldHat = cowboyHat(OLD.hat, false);
  const newHat = cowboyHat(NEW.hat, true);
  newHat.visible = false;
  hat.add(oldHat, newHat);
  hips.add(hat);

  function buildArm(sign) {
    const arm = new THREE.Group();
    arm.position.set(sign * 0.44, 0.76, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.3, 4, 8), shirt);
    sleeve.position.y = -0.22;
    arm.add(sleeve);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10), jacket);
    cuff.position.y = -0.47;
    arm.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), skin);
    hand.position.y = -0.6;
    arm.add(hand);
    return arm;
  }
  const armL = buildArm(1);
  const armR = buildArm(-1);
  hips.add(armL, armR);

  // Legs with two pairs of boots: old square-toe work boots, and tall
  // western boots with pointed toes and stitching.
  const westernBoots = [];
  const workBoots = [];
  function buildLeg(sign) {
    const leg = new THREE.Group();
    leg.position.set(sign * 0.16, 0.02, 0);
    const jean = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.72, 0.27), jeans);
    jean.position.y = -0.36;
    leg.add(jean);
    const work = new THREE.Group();
    const wShaft = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.28), boots);
    wShaft.position.set(0, -0.82, 0.01);
    const wToe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.38), boots);
    wToe.position.set(0, -0.9, 0.07);
    work.add(wShaft, wToe);
    leg.add(work);
    workBoots.push(work);
    const western = new THREE.Group();
    const wb = new THREE.MeshLambertMaterial({ color: NEW.boots });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.28), wb);
    shaft.position.set(0, -0.74, 0.01);
    const toe = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 4), wb);
    toe.rotation.x = Math.PI / 2;
    toe.rotation.y = Math.PI / 4;
    toe.scale.set(1, 1, 0.55);
    toe.position.set(0, -0.92, 0.14);
    const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.265, 0.03, 0.285), new THREE.MeshLambertMaterial({ color: 0xe8c48a }));
    stitch.position.set(0, -0.64, 0.01);
    const heel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.1), new THREE.MeshLambertMaterial({ color: 0x2b1a10 }));
    heel.position.set(0, -0.95, -0.12);
    western.add(shaft, toe, stitch, heel);
    western.visible = false;
    leg.add(western);
    westernBoots.push(western);
    return leg;
  }
  const legL = buildLeg(1);
  const legR = buildLeg(-1);
  hips.add(legL, legR);

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.scale.setScalar(0.8);

  // Recolor whatever is on the meshes now (cel shading swaps materials for
  // toon copies after the model is built, so the originals aren't it).
  // (Walks the body, not `group`: setCharacter() moves the body into the
  // player's own group.)
  const recolor = (src, hex) => hips.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m === src || m.userData.src === src) m.color.setHex(hex);
    }
  });
  for (const m of [jeans, shirt, jacket]) m.userData.src = m;

  // Put on something new from the western wear store.
  function dress(item) {
    if (item === "boots") {
      for (const b of westernBoots) b.visible = true;
      for (const b of workBoots) b.visible = false;
    } else if (item === "jeans") recolor(jeans, NEW.jeans);
    else if (item === "belt") belt.visible = true;
    else if (item === "pearlsnap") {
      recolor(shirt, NEW.shirt);
      recolor(jacket, 0x1f3557);
      oldJacket.visible = false;
      snap.visible = true;
    } else if (item === "hat") {
      oldHat.visible = false;
      newHat.visible = true;
    }
  }

  return { group, parts: { hips, armL, armR, legL, legR, torso, head, hat, dress } };
}
