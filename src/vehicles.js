import * as THREE from "three";
import { resolveMove } from "./collision.js";

// "Green Dog" — Sidney's beach-cruiser bicycle. Modeled after the classic
// white-frame / red-fender cruiser look, an original low-poly build (no
// manufacturer logos or licensed parts).
export function buildBike() {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshLambertMaterial({ color: 0xf2efe6 });
  const fenderMat = new THREE.MeshLambertMaterial({ color: 0xb5342c });
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const rimMat = new THREE.MeshLambertMaterial({ color: 0xcf3a2e });
  const basketMat = new THREE.MeshLambertMaterial({ color: 0xd8d3c4, wireframe: false });

  function wheel(x) {
    const w = new THREE.Group();
    w.position.set(x, 0.42, 0);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 16), tireMat);
    tire.rotation.y = Math.PI / 2;
    w.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    w.add(rim);
    const fender = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 6, 12, Math.PI), fenderMat);
    fender.rotation.y = Math.PI / 2;
    fender.rotation.z = Math.PI;
    fender.position.y = 0.1;
    w.add(fender);
    return w;
  }
  const wheelF = wheel(0.78);
  const wheelR = wheel(-0.78);
  group.add(wheelF, wheelR);

  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08), frameMat);
  bar.position.set(0, 0.62, 0);
  bar.rotation.z = 0.15;
  group.add(bar);

  const downTube = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), frameMat);
  downTube.position.set(0.35, 0.5, 0);
  downTube.rotation.z = -0.55;
  group.add(downTube);

  const seatTube = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.08), frameMat);
  seatTube.position.set(-0.3, 0.55, 0);
  seatTube.rotation.z = 0.9;
  group.add(seatTube);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.18), new THREE.MeshLambertMaterial({ color: 0x2b2b2b }));
  seat.position.set(-0.46, 0.82, 0);
  group.add(seat);

  const handlebar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), frameMat);
  handlebar.position.set(0.74, 0.9, 0);
  group.add(handlebar);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), frameMat);
  stem.position.set(0.74, 0.76, 0);
  group.add(stem);

  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.3), basketMat);
  basket.position.set(0.9, 0.8, 0);
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
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2e5d34 });
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xf2efe6 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x22333a });
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x151515 });
  const chromeMat = new THREE.MeshLambertMaterial({ color: 0xc9cdd0 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.4), bodyMat);
  body.position.y = 0.55;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.0), bodyMat);
  cabin.position.set(0, 1.05, -0.2);
  group.add(cabin);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.42, 1.9), glassMat);
  windshield.position.set(0, 1.02, -0.2);
  windshield.scale.set(0.96, 1, 0.9);
  group.add(windshield);

  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 4.4), stripeMat);
    stripe.position.set(side * 0.45, 0.83, 0);
    group.add(stripe);
  }

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 0.2), chromeMat);
  frontBumper.position.set(0, 0.32, 2.25);
  group.add(frontBumper);
  const rearBumper = frontBumper.clone();
  rearBumper.position.z = -2.25;
  group.add(rearBumper);

  for (const [hx, hz] of [[-0.6, 2.25], [0.6, 2.25]]) {
    const headlight = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), new THREE.MeshBasicMaterial({ color: 0xfff4c2 }));
    headlight.position.set(hx, 0.55, hz);
    headlight.rotation.y = Math.PI;
    group.add(headlight);
  }

  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]]) {
    const wheel = new THREE.Group();
    wheel.position.set(wx, 0.42, wz);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 14), tireMat);
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 10), chromeMat);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);
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
