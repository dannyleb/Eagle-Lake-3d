import * as THREE from "three";

// Cel shading: every lit material in the scene becomes a MeshToonMaterial
// that quantizes light into a few flat bands, like a hand-inked cartoon.

let gradient = null;
export function toonGradient() {
  if (gradient) return gradient;
  // Shadow, mid, light, highlight.
  const steps = [92, 150, 210, 255];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  gradient = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

const COPY = [
  "color", "map", "vertexColors", "transparent", "opacity", "alphaTest", "side",
  "depthWrite", "depthTest", "polygonOffset", "polygonOffsetFactor", "polygonOffsetUnits",
  "emissive", "emissiveMap", "emissiveIntensity", "fog", "visible", "name", "alphaMap",
];

const cache = new WeakMap();

export function toToon(mat) {
  if (!mat || mat.isMeshToonMaterial || mat.isMeshBasicMaterial || mat.isShaderMaterial) return mat;
  if (!(mat.isMeshLambertMaterial || mat.isMeshStandardMaterial || mat.isMeshPhongMaterial)) return mat;
  if (cache.has(mat)) return cache.get(mat);
  const t = new THREE.MeshToonMaterial({ gradientMap: toonGradient() });
  for (const k of COPY) {
    if (mat[k] === undefined) continue;
    if (mat[k] && mat[k].isColor) t[k].copy(mat[k]);
    else t[k] = mat[k];
  }
  if (mat.flatShading) t.flatShading = true;
  if (mat.onBeforeCompile && mat.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) {
    t.onBeforeCompile = mat.onBeforeCompile;
    t.customProgramCacheKey = () => mat.onBeforeCompile.toString();
  }
  t.userData = mat.userData;
  cache.set(mat, t);
  return t;
}

// Swap materials across a whole subtree (meshes keep their geometry).
export function toonify(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(toToon) : toToon(o.material);
  });
}
