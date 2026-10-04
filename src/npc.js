import * as THREE from "three";
import { makeFaceTexture, makeHeadMaterials } from "./textures.js";

// The Thicker Bradshall — a stylized tribute from his photos: ball cap,
// sunglasses, goatee and stubble, a charcoal tee, gray work pants, brown work
// boots, and an acoustic guitar with a few stickers on it.

const SKIN = 0xd9a27c;

export function buildBradshall() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: SKIN });
  const tee = new THREE.MeshLambertMaterial({ color: 0x55575a });
  const pants = new THREE.MeshLambertMaterial({ color: 0x6e706b });
  const boots = new THREE.MeshLambertMaterial({ color: 0x6b4426 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
  const capMat = new THREE.MeshLambertMaterial({ color: 0x2a2a28 });
  const capFront = new THREE.MeshLambertMaterial({ color: 0xc9a33a });
  const wood = new THREE.MeshLambertMaterial({ color: 0xd59a45 });
  const woodDark = new THREE.MeshLambertMaterial({ color: 0x3c2a1a });

  const hips = new THREE.Group();
  hips.position.y = 1.0;
  group.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.34, 6, 12), tee);
  torso.scale.set(1.08, 1, 0.82);
  torso.position.y = 0.44;
  hips.add(torso);
  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.03), dark);
  shades.position.set(0.02, 0.72, 0.27);
  shades.rotation.z = 0.1;
  hips.add(shades);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.12, 10), skin);
  neck.position.y = 0.92;
  hips.add(neck);
  const faceTex = makeFaceTexture({ skin: "#d9a27c", sunglasses: true, goatee: true, mustache: true, stubble: true, browColor: "#3a2a1c" });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.52, 0.44), makeHeadMaterials(faceTex, SKIN));
  head.position.y = 1.2;
  hips.add(head);

  // Trucker cap
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
  cap.scale.set(0.52, 0.34, 0.5);
  cap.position.set(0, 1.4, -0.01);
  hips.add(cap);
  const patch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.02), capFront);
  patch.position.set(0, 1.52, 0.235);
  patch.rotation.x = -0.4;
  hips.add(patch);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.24), capMat);
  brim.position.set(0, 1.43, 0.32);
  brim.rotation.x = 0.12;
  hips.add(brim);
  for (const sx of [-0.245, 0.245]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin);
    ear.position.set(sx, 1.18, 0);
    hips.add(ear);
  }

  function buildArm(sign) {
    const arm = new THREE.Group();
    arm.position.set(sign * 0.41, 0.76, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.1, 4, 8), tee);
    sleeve.position.y = -0.1;
    arm.add(sleeve);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 4, 8), skin);
    fore.position.y = -0.4;
    arm.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), skin);
    hand.position.y = -0.62;
    arm.add(hand);
    return arm;
  }
  const armL = buildArm(1);
  const armR = buildArm(-1);
  armL.rotation.set(-0.95, 0, -0.35);
  armR.rotation.set(-0.55, 0, 0.25);
  hips.add(armL, armR);

  for (const sign of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(sign * 0.15, 0.02, 0);
    const pant = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.86, 0.26), pants);
    pant.position.y = -0.43;
    leg.add(pant);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.34), boots);
    boot.position.set(0, -0.92, 0.05);
    leg.add(boot);
    hips.add(leg);
  }

  // Acoustic guitar with a few stickers, slung across the front.
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
  guitar.rotation.z = 1.05;
  guitar.position.set(0.05, 0.38, 0.3);
  hips.add(guitar);

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.scale.setScalar(0.8);
  return { group, parts: { hips, armR, guitar } };
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
    parts.hips.position.y = 1.0 + Math.abs(Math.sin(t * 2.6)) * 0.025;
  }

  return { group, update };
}
