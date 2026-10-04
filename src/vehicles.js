import * as THREE from "three";
import { resolveMove } from "./collision.js";
import { makeWheelTexture, makeGrilleTexture } from "./textures.js";

const bikeWheelTex = () => makeWheelTexture(5, "#e8e2c8", "#1a1a1a");
const carWheelTex = () => makeWheelTexture(6, "#cfd2d4", "#111214");

// "Green Dog" — Sidney's beach-cruiser bicycle. Modeled after the classic
// white-frame / red-fender cruiser look, an original low-poly build (no
// manufacturer logos or licensed parts).
export function buildBike() {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.45, metalness: 0.35 });
  const fenderMat = new THREE.MeshStandardMaterial({ color: 0xb5342c, roughness: 0.4, metalness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xcf3a2e, roughness: 0.5, metalness: 0.4 });
  const wheelFaceTex = bikeWheelTex();

  function wheel(x) {
    const w = new THREE.Group();
    w.position.set(x, 0.42, 0);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.085, 10, 20), tireMat);
    tire.rotation.y = Math.PI / 2;
    w.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 20), hubMat);
    rim.rotation.z = Math.PI / 2;
    w.add(rim);
    for (const side of [-0.031, 0.031]) {
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(0.32, 20),
        new THREE.MeshStandardMaterial({ map: wheelFaceTex, roughness: 0.5 })
      );
      face.position.x = side;
      face.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      w.add(face);
    }
    const fender = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.045, 6, 16, Math.PI * 1.15), fenderMat);
    fender.rotation.y = Math.PI / 2;
    fender.rotation.z = Math.PI - 0.1;
    fender.position.y = 0.12;
    w.add(fender);
    return w;
  }
  const wheelF = wheel(0.78);
  const wheelR = wheel(-0.78);
  group.add(wheelF, wheelR);

  function tube(len, radius = 0.032) {
    return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10), frameMat);
  }

  const bar = tube(1.55);
  bar.position.set(0, 0.62, 0);
  bar.rotation.z = Math.PI / 2 + 0.15;
  group.add(bar);

  const downTube = tube(0.92);
  downTube.position.set(0.35, 0.5, 0);
  downTube.rotation.z = Math.PI / 2 - 0.55;
  group.add(downTube);

  const seatTube = tube(0.62);
  seatTube.position.set(-0.3, 0.55, 0);
  seatTube.rotation.z = Math.PI / 2 + 0.9;
  group.add(seatTube);

  const chainStay = tube(0.75);
  chainStay.position.set(-0.4, 0.3, 0);
  chainStay.rotation.z = Math.PI / 2 + 0.12;
  group.add(chainStay);

  const seat = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6 })
  );
  seat.rotation.x = Math.PI;
  seat.scale.set(1.3, 0.8, 1.8);
  seat.position.set(-0.46, 0.84, 0);
  group.add(seat);

  const handlebar = tube(0.56, 0.028);
  handlebar.rotation.x = Math.PI / 2;
  handlebar.position.set(0.74, 0.9, 0);
  group.add(handlebar);
  const stem = tube(0.3, 0.03);
  stem.position.set(0.74, 0.76, 0);
  group.add(stem);

  const pedalAxle = tube(0.32, 0.03);
  pedalAxle.rotation.x = Math.PI / 2;
  pedalAxle.position.set(0.1, 0.28, 0);
  group.add(pedalAxle);
  for (const side of [-1, 1]) {
    const crank = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.03), frameMat);
    crank.position.set(0.1, 0.28 - 0.11 * side, side * 0.17);
    group.add(crank);
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.14), new THREE.MeshStandardMaterial({ color: 0x2b2b2b }));
    pedal.position.set(0.1, 0.17 - 0.22 * side, side * 0.17);
    group.add(pedal);
  }

  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.24, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xd8d3c4, roughness: 0.7, wireframe: true })
  );
  basket.position.set(0.92, 0.82, 0);
  group.add(basket);

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.rotation.y = Math.PI / 2;
  const wrapper = new THREE.Group();
  wrapper.add(group);
  wrapper.userData.wheels = [wheelF, wheelR];
  return wrapper;
}

// A low-poly, deliberately abstracted muscle-car silhouette in the spirit of
// an early-'70s Chevelle — original proportions and panel shapes, finished
// green with white racing stripes per Sidney's car. No manufacturer badges,
// logos, or licensed body panels are used.
export function buildCar() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2e5d34, roughness: 0.35, metalness: 0.55 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.4, metalness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1c2a30, roughness: 0.15, metalness: 0.2 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d7d9, roughness: 0.15, metalness: 0.9 });
  const blackTrim = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });

  // Lower body: a gentle taper from a wider rear haunch to the front.
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.5, 4.5), bodyMat);
  body.position.y = 0.5;
  group.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.08, 1.5), bodyMat);
  hood.position.set(0, 0.78, 1.55);
  group.add(hood);
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.06, 1.1), bodyMat);
  trunk.position.set(0, 0.76, -1.6);
  group.add(trunk);

  // Tapered greenhouse: wider base, narrower roof.
  const cabinLower = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.3, 2.1), bodyMat);
  cabinLower.position.set(0, 0.9, -0.15);
  group.add(cabinLower);
  const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.85), bodyMat);
  cabinRoof.position.set(0, 1.18, -0.2);
  group.add(cabinRoof);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.5, 0.08), glassMat);
  windshield.position.set(0, 1.0, 0.72);
  windshield.rotation.x = -0.35;
  group.add(windshield);
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.46, 0.08), glassMat);
  rearGlass.position.set(0, 0.98, -1.08);
  rearGlass.rotation.x = 0.4;
  group.add(rearGlass);
  for (const side of [-1, 1]) {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 1.7), glassMat);
    sideGlass.position.set(side * 0.74, 1.08, -0.2);
    group.add(sideGlass);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.16), bodyMat);
    mirror.position.set(side * 0.98, 0.95, 0.95);
    group.add(mirror);
  }

  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 4.5), stripeMat);
    stripe.position.set(side * 0.46, 0.76, 0);
    group.add(stripe);
  }

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 0.22), chromeMat);
  frontBumper.position.set(0, 0.3, 2.3);
  group.add(frontBumper);
  const rearBumper = frontBumper.clone();
  rearBumper.position.z = -2.3;
  group.add(rearBumper);

  const grille = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.3),
    new THREE.MeshStandardMaterial({ map: makeGrilleTexture(), roughness: 0.5, metalness: 0.4 })
  );
  grille.position.set(0, 0.5, 2.26);
  group.add(grille);

  for (const [hx, hz] of [[-0.62, 2.27], [0.62, 2.27]]) {
    const headlight = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), new THREE.MeshStandardMaterial({ color: 0xfff4c2, emissive: 0x554400, emissiveIntensity: 0.3 }));
    headlight.position.set(hx, 0.55, hz);
    headlight.rotation.y = Math.PI;
    group.add(headlight);
  }
  for (const [hx, hz] of [[-0.62, -2.27], [0.62, -2.27]]) {
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.03), new THREE.MeshStandardMaterial({ color: 0x8a1f1a, emissive: 0x330000, emissiveIntensity: 0.4 }));
    taillight.position.set(hx, 0.55, hz);
    group.add(taillight);
  }

  const wheels = [];
  const wheelTex = carWheelTex();
  for (const [wx, wz] of [[-0.98, 1.5], [0.98, 1.5], [-0.98, -1.5], [0.98, -1.5]]) {
    const wheel = new THREE.Group();
    wheel.position.set(wx, 0.42, wz);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), tireMat);
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);
    for (const side of [-0.151, 0.151]) {
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(0.34, 16),
        new THREE.MeshStandardMaterial({ map: wheelTex, roughness: 0.4, metalness: 0.5 })
      );
      face.position.x = side;
      face.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      wheel.add(face);
    }
    group.add(wheel);
    wheels.push(wheel);
  }

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.userData.wheels = wheels;
  return group;
}

export function createVehicle(scene, type, spawn) {
  const group = type === "bike" ? buildBike() : buildCar();
  group.position.set(spawn.x, 0, spawn.z);
  group.rotation.y = spawn.heading;
  scene.add(group);

  const isBike = type === "bike";
  const maxSpeed = isBike ? 9.5 : 22;
  const accel = isBike ? 7 : 11;
  const turnRate = isBike ? 2.0 : 1.5;
  const wheels = group.userData.wheels || [];

  const state = {
    group,
    heading: spawn.heading,
    speed: 0,
    type,
    radius: isBike ? 0.7 : 1.4,
  };

  function update(dt, input, worldBounds, obstacles) {
    const throttle = input.y;
    const targetSpeed = throttle * maxSpeed * (input.sprint && !isBike ? 1.25 : 1);
    const diff = targetSpeed - state.speed;
    const rate = input.brake ? accel * 3 : accel;
    state.speed += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
    if (input.brake) state.speed *= 0.9;

    const speedFactor = Math.min(1, Math.abs(state.speed) / (maxSpeed * 0.5));
    const turnDir = state.speed >= 0 ? 1 : -1;
    state.heading += -input.x * turnRate * speedFactor * turnDir * dt;

    const oldX = group.position.x;
    const oldZ = group.position.z;
    const dx = Math.sin(state.heading) * state.speed * dt;
    const dz = Math.cos(state.heading) * state.speed * dt;
    const newX = THREE.MathUtils.clamp(oldX + dx, -worldBounds, worldBounds);
    const newZ = THREE.MathUtils.clamp(oldZ + dz, -worldBounds, worldBounds);
    const resolved = obstacles ? resolveMove(oldX, oldZ, newX, newZ, state.radius, obstacles) : { x: newX, z: newZ };
    if (resolved.x !== newX || resolved.z !== newZ) state.speed *= 0.4; // soft thump off a wall
    group.position.x = resolved.x;
    group.position.z = resolved.z;
    group.rotation.y = state.heading;

    const wheelSpin = (state.speed * dt) / 0.42;
    for (const w of wheels) {
      const tire = w.children[0];
      if (tire) tire.rotation.x += wheelSpin;
    }
  }

  return { group, state, update };
}
