import * as THREE from "three";

// The Thicker Bradshall — a local musician NPC, modeled the same way Sidney
// is: an original, stylized low-poly tribute (bald head, goatee, ball cap,
// guitar), not a scanned or photo-based likeness of the real person.
export function buildBradshall() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc9a87c });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x4a4a48 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x6b6b63 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
  const capMat = new THREE.MeshLambertMaterial({ color: 0x2f3a2f });
  const guitarBody = new THREE.MeshLambertMaterial({ color: 0xa9752f });
  const guitarNeck = new THREE.MeshLambertMaterial({ color: 0x3c2a1a });

  const hips = new THREE.Group();
  hips.position.y = 1.0;
  group.add(hips);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.66, 0.38), shirt);
  torso.position.y = 0.42;
  hips.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8), skin);
  neck.position.y = 0.78;
  hips.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
  head.position.y = 1.0;
  hips.add(head);

  // Balding: hair only low on the sides/back, not on top.
  const sideHair = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 12, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.4),
    dark
  );
  sideHair.position.y = 0.98;
  hips.add(sideHair);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.275, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), capMat);
  cap.position.y = 1.04;
  hips.add(cap);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16, 1, false, 0, Math.PI), capMat);
  brim.position.set(0, 0.97, 0.2);
  brim.rotation.x = -0.15;
  hips.add(brim);

  const goatee = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.1), dark);
  goatee.position.set(0, 0.84, 0.22);
  hips.add(goatee);

  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.04), dark);
  shades.position.set(0, 0.99, 0.25);
  hips.add(shades);

  function buildArm(sign) {
    const arm = new THREE.Group();
    arm.position.set(sign * 0.38, 0.68, 0);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.18), shirt);
    upper.position.y = -0.21;
    arm.add(upper);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), skin);
    hand.position.y = -0.46;
    arm.add(hand);
    return arm;
  }
  const armL = buildArm(-1);
  const armR = buildArm(1);
  armL.rotation.x = -0.9;
  armR.rotation.x = -0.5;
  hips.add(armL, armR);

  function buildLeg(sign) {
    const leg = new THREE.Group();
    leg.position.set(sign * 0.16, 0.1, 0);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.22), pants);
    upper.position.y = -0.25;
    leg.add(upper);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.28), dark);
    shoe.position.set(0, -0.56, 0.04);
    leg.add(shoe);
    return leg;
  }
  hips.add(buildLeg(-1), buildLeg(1));

  // Guitar, slung across the front on a strap.
  const guitar = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.1, 16), guitarBody);
  body.rotation.x = Math.PI / 2;
  guitar.add(body);
  const soundHole = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), dark);
  soundHole.position.z = 0.051;
  guitar.add(soundHole);
  const guitarNeckMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.04), guitarNeck);
  guitarNeckMesh.position.set(0, 0.5, 0);
  guitar.add(guitarNeckMesh);
  const headstock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.04), guitarNeck);
  headstock.position.set(0, 0.86, 0);
  guitar.add(headstock);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.02), new THREE.MeshLambertMaterial({ color: 0x5c3a24 }));
  strap.position.set(0, 0.3, -0.08);
  strap.rotation.z = 0.5;
  guitar.add(strap);
  guitar.rotation.z = -0.15;
  guitar.position.set(0.05, 0.55, 0.26);
  hips.add(guitar);

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  return { group, parts: { hips, armR, guitar } };
}

export function createNPC(scene, spawn) {
  const { group, parts } = buildBradshall();
  group.position.set(spawn.x, 0, spawn.z);
  group.rotation.y = spawn.heading;
  scene.add(group);

  let t = 0;
  function update(dt) {
    t += dt;
    // A slow idle strum/sway so he doesn't look frozen.
    parts.armR.rotation.x = -0.5 + Math.sin(t * 2.2) * 0.12;
    parts.guitar.rotation.x = Math.sin(t * 2.2) * 0.03;
    group.position.y = Math.sin(t * 1.1) * 0.01;
  }

  return { group, update };
}
