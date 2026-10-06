import * as THREE from "three";

// Small helpers shared across the game.

// Seeded pseudo-random numbers in [0, 1) (mulberry32). Same seed, same
// sequence, so the town is laid out identically on every load.
export function seededRandom(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Angle wrapped into [-PI, PI].
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// A 2D canvas to draw a texture on.
export function makeCanvas(w, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

// A color texture from a drawn canvas.
export function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Ease an object's yaw toward `want` (radians) the short way round, by a
// fraction k (0..1) of the remaining turn.
export function turnToward(obj, want, k) {
  obj.rotation.y += wrapAngle(want - obj.rotation.y) * Math.min(1, k);
}
