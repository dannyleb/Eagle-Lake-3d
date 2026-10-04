import { BUILDINGS, HOUSES, HOUSE_SIZE, LAKE } from "./config.js";

const MARGIN = 0.3; // inflate building footprints slightly so you don't clip corners

export function buildObstacles() {
  const obstacles = [];
  for (const b of BUILDINGS) {
    obstacles.push({ type: "box", x: b.x, z: b.z, hw: b.w / 2 + MARGIN, hd: b.d / 2 + MARGIN });
  }
  for (const h of HOUSES) {
    obstacles.push({ type: "box", x: h.x, z: h.z, hw: HOUSE_SIZE.w / 2 + MARGIN, hd: HOUSE_SIZE.d / 2 + MARGIN });
  }
  obstacles.push({ type: "ellipse", x: LAKE.x, z: LAKE.z, rx: LAKE.rx, rz: LAKE.rz });
  return obstacles;
}

function circleIntersectsBox(cx, cz, r, o) {
  const clampedX = Math.max(o.x - o.hw, Math.min(cx, o.x + o.hw));
  const clampedZ = Math.max(o.z - o.hd, Math.min(cz, o.z + o.hd));
  const dx = cx - clampedX;
  const dz = cz - clampedZ;
  return dx * dx + dz * dz < r * r;
}

function circleIntersectsEllipse(cx, cz, r, o) {
  const dx = (cx - o.x) / (o.rx + r);
  const dz = (cz - o.z) / (o.rz + r);
  return dx * dx + dz * dz < 1;
}

function hitsAny(x, z, radius, obstacles) {
  for (const o of obstacles) {
    if (o.type === "box" ? circleIntersectsBox(x, z, radius, o) : circleIntersectsEllipse(x, z, radius, o)) {
      return true;
    }
  }
  return false;
}

// Axis-separated resolution so moving entities slide along a wall instead of
// stopping dead (and so an entity that somehow ends up overlapping an
// obstacle can still back itself out rather than freezing in place).
export function resolveMove(oldX, oldZ, newX, newZ, radius, obstacles) {
  let x = newX;
  if (hitsAny(x, oldZ, radius, obstacles) && !hitsAny(oldX, oldZ, radius, obstacles)) x = oldX;
  let z = newZ;
  if (hitsAny(x, z, radius, obstacles) && !hitsAny(x, oldZ, radius, obstacles)) z = oldZ;
  return { x, z };
}
