import * as THREE from "three";

export function createChaseCamera(camera) {
  const offset = new THREE.Vector3();
  const lookOffset = new THREE.Vector3(0, 1.6, 0);
  const desiredPos = new THREE.Vector3();
  const currentLook = new THREE.Vector3();
  let initialized = false;

  function update(target, heading, dt, distance = 7, height = 3.2) {
    offset.set(Math.sin(heading) * -distance, height, Math.cos(heading) * -distance);
    desiredPos.copy(target).add(offset);

    if (!initialized) {
      camera.position.copy(desiredPos);
      currentLook.copy(target).add(lookOffset);
      initialized = true;
    } else {
      const t = 1 - Math.pow(0.0008, dt);
      camera.position.lerp(desiredPos, t);
      currentLook.lerp(new THREE.Vector3().copy(target).add(lookOffset), t);
    }
    camera.lookAt(currentLook);
  }

  return { update };
}
