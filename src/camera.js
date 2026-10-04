import * as THREE from "three";

// Slab-method ray-vs-AABB test in the XZ plane. Returns the entry distance
// along (dx,dz) in world units, or null if the segment [0, maxDist] misses
// the box entirely.
function rayBoxDistance(ox, oz, dx, dz, maxDist, box) {
  const minX = box.x - box.hw, maxX = box.x + box.hw;
  const minZ = box.z - box.hd, maxZ = box.z + box.hd;
  let tmin = 0, tmax = maxDist;

  if (Math.abs(dx) < 1e-6) {
    if (ox < minX || ox > maxX) return null;
  } else {
    let t1 = (minX - ox) / dx;
    let t2 = (maxX - ox) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (Math.abs(dz) < 1e-6) {
    if (oz < minZ || oz > maxZ) return null;
  } else {
    let t1 = (minZ - oz) / dz;
    let t2 = (maxZ - oz) / dz;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  return tmin >= 0 ? tmin : null;
}

export function createChaseCamera(camera) {
  const lookOffset = new THREE.Vector3(0, 1.6, 0);
  const desiredPos = new THREE.Vector3();
  const currentLook = new THREE.Vector3();
  let initialized = false;

  function update(target, heading, dt, distance = 7, height = 3.2, obstacles = null) {
    const dirX = Math.sin(heading) * -1;
    const dirZ = Math.cos(heading) * -1;

    let clearDistance = distance;
    if (obstacles) {
      for (const o of obstacles) {
        if (o.type !== "box") continue;
        const hit = rayBoxDistance(target.x, target.z, dirX, dirZ, distance, o);
        if (hit !== null) clearDistance = Math.min(clearDistance, Math.max(1.5, hit - 0.6));
      }
    }

    desiredPos.set(target.x + dirX * clearDistance, target.y + height, target.z + dirZ * clearDistance);

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
