import * as THREE from "three";

// Sidney — an original, stylized low-poly tribute character (not a scanned
// or photo-based likeness): stocky build, dark hair, thin glasses, a
// blue-gray work shirt with a small badge, and a shoulder radio, evoking a
// small-town volunteer firefighter without reproducing any real person's
// exact appearance.
export function buildSidney() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xa8754f });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x5c6b78 });
  const pants = new THREE.MeshLambertMaterial({ color: 0xcfc8ae });
  const dark = new THREE.MeshLambertMaterial({ color: 0x232323 });
  const gold = new THREE.MeshLambertMaterial({ color: 0xc9a227 });

  const hips = new THREE.Group();
  hips.position.y = 1.0;
  group.add(hips);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.36), shirt);
  torso.position.y = 0.42;
  hips.add(torso);

  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), gold);
  badge.position.set(0.16, 0.58, 0.19);
  hips.add(badge);

  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), dark);
  radio.position.set(-0.3, 0.6, 0.14);
  hips.add(radio);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8), skin);
  neck.position.y = 0.78;
  hips.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
  head.position.y = 1.0;
  hips.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), dark);
  hair.position.y = 1.05;
  hips.add(hair);

  const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.04), dark);
  glasses.position.set(0, 0.98, 0.24);
  hips.add(glasses);

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
  const legL = buildLeg(-1);
  const legR = buildLeg(1);
  hips.add(legL, legR);

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  return { group, parts: { hips, armL, armR, legL, legR } };
}

export function createPlayer(scene, spawn) {
  const { group, parts } = buildSidney();
  group.position.set(spawn.x, 0, spawn.z);
  group.rotation.y = spawn.heading;
  scene.add(group);

  const state = {
    group,
    heading: spawn.heading,
    speed: 0,
    walkSpeed: 4.6,
    sprintSpeed: 7.6,
    walkCycle: 0,
    radius: 0.5,
  };

  function update(dt, input, worldBounds) {
    const turning = -input.x;
    state.heading += turning * 2.4 * dt;

    const targetSpeed = input.y !== 0 ? (input.sprint ? state.sprintSpeed : state.walkSpeed) * Math.sign(input.y) : 0;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 8);

    const dx = Math.sin(state.heading) * state.speed * dt;
    const dz = Math.cos(state.heading) * state.speed * dt;
    group.position.x = THREE.MathUtils.clamp(group.position.x + dx, -worldBounds, worldBounds);
    group.position.z = THREE.MathUtils.clamp(group.position.z + dz, -worldBounds, worldBounds);
    group.rotation.y = state.heading;

    const moving = Math.abs(state.speed) > 0.1;
    if (moving) {
      state.walkCycle += dt * (6 + Math.abs(state.speed));
      const swing = Math.sin(state.walkCycle) * 0.6;
      parts.legL.rotation.x = swing;
      parts.legR.rotation.x = -swing;
      parts.armL.rotation.x = -swing * 0.8;
      parts.armR.rotation.x = swing * 0.8;
    } else {
      parts.legL.rotation.x *= 0.8;
      parts.legR.rotation.x *= 0.8;
      parts.armL.rotation.x *= 0.8;
      parts.armR.rotation.x *= 0.8;
    }
  }

  return { group, state, update };
}
