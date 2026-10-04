import * as THREE from "three";

// Three views: STREET (low chase cam), TOWN (elevated three-quarter view, the
// default — closest to the old pre-rendered aerial look), and BIRD'S EYE.
// Distances are [walk, bike, car] x [back, up].
export const VIEWS = [
  { name: "TOWN VIEW", back: [15, 17, 21], up: [15, 16, 18], lead: 0.4 },
  { name: "BIRD'S EYE", back: [36, 38, 44], up: [34, 36, 40], lead: 0.45 },
  { name: "STREET VIEW", back: [6.5, 7.5, 9.5], up: [2.9, 3.3, 4.0], lead: 0.1 },
];

const MODE_INDEX = { walk: 0, bike: 1, car: 2 };

export function createChaseCamera(camera) {
  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let yaw = 0;
  let view = 0;
  let initialized = false;

  function update(target, heading, dt, mode, collision) {
    const v = VIEWS[view];
    const mi = MODE_INDEX[mode] ?? 0;
    const back = v.back[mi], up = v.up[mi];

    // Let the camera's yaw lag behind the player a little for a smoother feel.
    let diff = heading - yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    yaw += diff * Math.min(1, dt * (initialized ? 3.2 : 100));

    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    let dist = back;
    if (collision && view !== 1) {
      const eyeY = target.y + 1.6;
      dist = Math.max(3, collision.rayClear(target.x, eyeY, target.z, -fx, -fz, back, target.y + up) - 0.8);
    }
    const lift = up * (dist / back);
    desired.set(target.x - fx * dist, target.y + Math.max(2.2, lift), target.z - fz * dist);
    lookTarget.set(target.x + fx * back * v.lead, target.y + 1.4, target.z + fz * back * v.lead);

    if (!initialized) {
      camera.position.copy(desired);
      look.copy(lookTarget);
      initialized = true;
    } else {
      const t = 1 - Math.pow(0.002, dt);
      camera.position.lerp(desired, t);
      look.lerp(lookTarget, t);
    }
    camera.lookAt(look);
  }

  return {
    update,
    snap() {
      initialized = false;
    },
    cycle() {
      view = (view + 1) % VIEWS.length;
      return VIEWS[view].name;
    },
    get viewName() {
      return VIEWS[view].name;
    },
    get yaw() {
      return yaw;
    },
  };
}
