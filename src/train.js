import * as THREE from "three";
import { RAIL } from "./config.js";

const CAR_LENGTH = 9;
const CAR_COUNT = 7;
const TRAIN_SPEED = 20; // units/sec
const WARNING_DISTANCE = 34; // how far out the gates start lowering

function buildLocomotive() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 3.4, CAR_LENGTH),
    new THREE.MeshLambertMaterial({ color: 0x2a3a2a })
  );
  body.position.y = 2.0;
  group.add(body);
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 2.2, 1.6),
    new THREE.MeshLambertMaterial({ color: 0xc9a227 })
  );
  nose.position.set(0, 1.4, CAR_LENGTH / 2 + 0.6);
  group.add(nose);
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.6, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x3a4a3a })
  );
  cab.position.set(0, 4.5, CAR_LENGTH / 2 - 1.5);
  group.add(cab);
  const headlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff4c2 })
  );
  headlight.position.set(0, 2.1, CAR_LENGTH / 2 + 1.3);
  group.add(headlight);
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

function buildFreightCar(colorSeed) {
  const colors = [0x8c3b32, 0x4a5a6b, 0x6b5a3a, 0x3a5a4a];
  const color = colors[colorSeed % colors.length];
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 3.0, CAR_LENGTH - 0.6),
    new THREE.MeshLambertMaterial({ color })
  );
  body.position.y = 1.9;
  group.add(body);
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

export function createTrain(scene) {
  const root = new THREE.Group();
  const cars = [];
  for (let i = 0; i < CAR_COUNT; i++) {
    const car = i === 0 ? buildLocomotive() : buildFreightCar(i);
    root.add(car);
    cars.push(car);
  }
  // Wheels (simple shared cylinders per car for a bit of detail)
  for (const car of cars) {
    for (const zOff of [-CAR_LENGTH / 2 + 1.4, CAR_LENGTH / 2 - 1.4]) {
      for (const xOff of [-1.5, 1.5]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 0.6, 0.4, 10),
          new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(xOff, 0.6, zOff);
        car.add(wheel);
      }
    }
  }
  scene.add(root);

  const state = {
    root,
    cars,
    z: RAIL.zMin - 40,
    dir: 1,
    speed: TRAIN_SPEED,
    waitTimer: 4,
  };

  function reset() {
    state.z = RAIL.zMin - 60 - Math.random() * 40;
    state.dir = 1;
  }
  reset();

  function headZ() {
    return state.z;
  }

  function update(dt) {
    if (state.waitTimer > 0) {
      state.waitTimer -= dt;
      return;
    }
    state.z += state.dir * state.speed * dt;
    const tailZ = state.z - state.dir * CAR_COUNT * CAR_LENGTH;
    const farEnd = state.dir > 0 ? RAIL.zMax + 50 : RAIL.zMin - 50;
    if ((state.dir > 0 && state.z > farEnd) || (state.dir < 0 && state.z < farEnd)) {
      state.dir *= -1;
      state.z = state.dir > 0 ? RAIL.zMin - 60 - Math.random() * 60 : RAIL.zMax + 60 + Math.random() * 60;
      state.waitTimer = 6 + Math.random() * 10;
    }
    for (let i = 0; i < cars.length; i++) {
      const carZ = state.z - state.dir * i * CAR_LENGTH;
      cars[i].position.set(RAIL.x, 0, carZ);
      cars[i].rotation.y = state.dir > 0 ? 0 : Math.PI;
    }
  }

  function distanceToCrossing() {
    // Distance of the nearest part of the train to Main St (z=0).
    const headDist = Math.abs(state.z);
    const tailZ = state.z - state.dir * CAR_COUNT * CAR_LENGTH;
    const tailDist = Math.abs(tailZ);
    return Math.min(headDist, tailDist);
  }

  function isApproachingOrCrossing() {
    if (state.waitTimer > 0) return false;
    const headZ = state.z;
    const tailZ = state.z - state.dir * CAR_COUNT * CAR_LENGTH;
    const lo = Math.min(headZ, tailZ) - WARNING_DISTANCE;
    const hi = Math.max(headZ, tailZ) + 2;
    return 0 >= lo && 0 <= hi;
  }

  return { update, isApproachingOrCrossing, distanceToCrossing };
}
