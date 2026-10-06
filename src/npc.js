import * as THREE from "three";
import { makeFaceTexture, makeHeadMaterials } from "./textures.js";
import { FACES } from "./faces.js";

// The Thicker Bradshall, country musician: a stylized tribute from his
// photos: cowboy hat, big mutton chops and a mustache, a pearl-snap western
// shirt, jeans with a buckle, cowboy boots, and an acoustic guitar with a
// few stickers on it.
//
// buildBradshall({ playable }) — as the busker NPC the guitar is in his
// hands; as a playable character it's slung across his back (and swings to
// the front when he plays a show).

const SKIN = 0xe0ad86;

function guitarMesh() {
  const wood = new THREE.MeshLambertMaterial({ color: 0xd59a45 });
  const woodDark = new THREE.MeshLambertMaterial({ color: 0x3c2a1a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
  const guitar = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.12, 18), wood);
  body.rotation.x = Math.PI / 2;
  guitar.add(body);
  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.121, 18), wood);
  waist.rotation.x = Math.PI / 2;
  waist.position.y = 0.3;
  guitar.add(waist);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.08, 14), dark);
  hole.position.set(0, 0.2, 0.062);
  guitar.add(hole);
  for (const [sx, sy, col] of [[-0.14, -0.08, 0xe74c3c], [0.12, -0.14, 0x2ecc71], [0.1, 0.05, 0xf1c40f]]) {
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.06), new THREE.MeshLambertMaterial({ color: col }));
    st.position.set(sx, sy, 0.062);
    guitar.add(st);
  }
  const neckG = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.05), woodDark);
  neckG.position.set(0, 0.78, 0);
  guitar.add(neckG);
  const headstock = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.05), woodDark);
  headstock.position.set(0, 1.18, 0);
  guitar.add(headstock);
  return guitar;
}

// Guitar placements (in hips space).
export const GUITAR_FRONT = { pos: [0.05, 0.38, 0.3], rot: [0, 0, 1.05] };
export const GUITAR_BACK = { pos: [0, 0.5, -0.3], rot: [0, Math.PI, 0.75] };

export function buildBradshall({ playable = false } = {}) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: SKIN });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x3e5f8a });
  const yoke = new THREE.MeshLambertMaterial({ color: 0x2c4566 });
  const denim = new THREE.MeshLambertMaterial({ color: 0x2f3f5c });
  const boots = new THREE.MeshLambertMaterial({ color: 0x6b4426 });
  const pearl = new THREE.MeshLambertMaterial({ color: 0xf2efe6 });
  const gold = new THREE.MeshLambertMaterial({ color: 0xd4a72c });
  const hatMat = new THREE.MeshLambertMaterial({ color: 0xcaa46a });
  const band = new THREE.MeshLambertMaterial({ color: 0x3b2614 });
  const hairMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(FACES.bradshall.hairColor).getHex() });

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  group.add(hips);

  // Western shirt: yoke, pearl snaps, belt and a big buckle.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.34, 6, 12), shirt);
  torso.scale.set(1.1, 1, 0.84);
  torso.position.y = 0.44;
  hips.add(torso);
  const yokeM = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.5), yoke);
  yokeM.position.set(0, 0.72, 0.02);
  hips.add(yokeM);
  for (let i = 0; i < 4; i++) {
    const snap = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), pearl);
    snap.position.set(0, 0.62 - i * 0.12, 0.27);
    hips.add(snap);
  }
  const beltM = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 16), band);
  beltM.scale.z = 0.84;
  beltM.position.y = 0.1;
  hips.add(beltM);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.03), gold);
  buckle.position.set(0, 0.1, 0.29);
  hips.add(buckle);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.12, 10), skin);
  neck.position.y = 0.92;
  hips.add(neck);
  const faceTex = makeFaceTexture(FACES.bradshall);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.52, 0.44), makeHeadMaterials(faceTex, SKIN));
  head.position.y = 1.2;
  hips.add(head);
  // Chops stand out a little from the cheeks.
  for (const sx of [-1, 1]) {
    const chop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.2), hairMat);
    chop.position.set(sx * 0.24, 1.12, 0.08);
    hips.add(chop);
  }
  for (const sx of [-0.25, 0.25]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin);
    ear.position.set(sx, 1.2, 0);
    hips.add(ear);
  }

  // Cowboy hat: wide brim curled up at the sides, pinched crown, band.
  const hat = new THREE.Group();
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.035, 24), hatMat);
  brim.scale.set(1, 1, 0.85);
  hat.add(brim);
  for (const sx of [-1, 1]) {
    const curl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.6), hatMat);
    curl.position.set(sx * 0.44, 0.06, 0);
    curl.rotation.z = sx * 0.55;
    hat.add(curl);
  }
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.26, 16), hatMat);
  crown.scale.set(1, 1, 1.15);
  crown.position.y = 0.14;
  hat.add(crown);
  const pinch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.4), new THREE.MeshLambertMaterial({ color: 0xb08d55 }));
  pinch.position.y = 0.27;
  hat.add(pinch);
  const bandM = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.05, 16), band);
  bandM.scale.set(1, 1, 1.15);
  bandM.position.y = 0.05;
  hat.add(bandM);
  hat.position.set(0, 1.47, 0);
  hat.rotation.x = -0.06;
  hips.add(hat);

  function buildArm(sign) {
    const arm = new THREE.Group();
    arm.position.set(sign * 0.42, 0.76, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8), shirt);
    sleeve.position.y = -0.22;
    arm.add(sleeve);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.06, 10), yoke);
    cuff.position.y = -0.47;
    arm.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), skin);
    hand.position.y = -0.6;
    arm.add(hand);
    return arm;
  }
  const armL = buildArm(1);
  const armR = buildArm(-1);
  hips.add(armL, armR);

  function buildLeg(sign) {
    const leg = new THREE.Group();
    leg.position.set(sign * 0.15, 0.02, 0);
    const jean = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), denim);
    jean.position.y = -0.36;
    leg.add(jean);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 0.27), boots);
    shaft.position.set(0, -0.78, 0.01);
    leg.add(shaft);
    const toe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.38), boots);
    toe.position.set(0, -0.9, 0.08);
    leg.add(toe);
    const heel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.1), new THREE.MeshLambertMaterial({ color: 0x2b1a10 }));
    heel.position.set(0, -0.94, -0.12);
    leg.add(heel);
    return leg;
  }
  const legL = buildLeg(1);
  const legR = buildLeg(-1);
  hips.add(legL, legR);

  const guitar = guitarMesh();
  const place = playable ? GUITAR_BACK : GUITAR_FRONT;
  guitar.position.set(...place.pos);
  guitar.rotation.set(...place.rot);
  hips.add(guitar);
  if (!playable) {
    armL.rotation.set(-0.95, 0, -0.35);
    armR.rotation.set(-0.55, 0, 0.25);
  }

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.scale.setScalar(0.8);
  return { group, parts: { hips, armL, armR, legL, legR, torso, guitar, head, hat } };
}

export function createNPC(scene, spawn) {
  const { group, parts } = buildBradshall();
  group.position.set(spawn.x, 0.05, spawn.z);
  group.rotation.y = spawn.heading;
  scene.add(group);

  let t = 0;
  function update(dt) {
    t += dt;
    parts.armR.rotation.x = -0.55 + Math.sin(t * 7) * 0.18;
    parts.hips.rotation.y = Math.sin(t * 1.3) * 0.08;
    parts.hips.position.y = 0.95 + Math.abs(Math.sin(t * 2.6)) * 0.025;
  }

  return { group, update };
}
