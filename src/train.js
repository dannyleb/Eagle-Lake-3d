import * as THREE from "three";
import { MeshBuilder, PRIM } from "./world/builder.js";
import { pathLengths } from "./world/rail.js";

// A freight train that follows a real rail polyline. Each car is placed by
// its two trucks so it bends naturally through curves; trains run the line
// in one direction, wait off-map, then come back the other way.

const CAR_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

function carMesh(kind, color) {
  const b = new MeshBuilder();
  const len = kind === "loco" ? 18 : kind === "tank" ? 14 : 15;
  const truck = (z) => {
    b.prim(PRIM.box(), { y: 0.55, z, sx: 2.4, sy: 0.6, sz: 2.6 }, "#2b2b2b");
    for (const dz of [-0.8, 0.8]) for (const dx of [-1.05, 1.05]) b.prim(PRIM.cyl(10), { x: dx, y: 0.5, z: z + dz, sx: 0.95, sy: 0.25, sz: 0.95, rz: Math.PI / 2 }, "#1a1a1a");
  };
  truck(len / 2 - 2.6);
  truck(-len / 2 + 2.6);
  b.prim(PRIM.box(), { y: 1.05, sx: 2.9, sy: 0.3, sz: len }, "#2f2f2f");
  if (kind === "loco") {
    b.prim(PRIM.box(), { y: 2.6, z: -1.5, sx: 2.8, sy: 2.8, sz: len - 5 }, color);
    b.prim(PRIM.box(), { y: 3.0, z: len / 2 - 2.6, sx: 3.0, sy: 3.6, sz: 3.6 }, color);
    b.prim(PRIM.box(), { y: 3.7, z: len / 2 - 0.82, sx: 2.6, sy: 1.0, sz: 0.1 }, "#26394f");
    b.prim(PRIM.box(), { y: 1.8, z: len / 2 - 0.8, sx: 2.9, sy: 0.9, sz: 0.2 }, "#f5f5ef");
    b.prim(PRIM.box(), { y: 2.2, z: -1.5, sx: 2.84, sy: 0.4, sz: len - 5 }, "#f5f5ef");
    b.prim(PRIM.box(), { y: 4.15, z: -2, sx: 2.2, sy: 0.4, sz: 6 }, "#555b62");
    b.prim(PRIM.sphere(8), { y: 4.2, z: len / 2 - 0.85, sx: 0.4, sy: 0.4, sz: 0.2 }, "#fff4c2");
  } else if (kind === "box") {
    b.prim(PRIM.box(), { y: 3.0, sx: 3.0, sy: 3.6, sz: len - 0.6 }, color);
    b.prim(PRIM.box(), { y: 2.8, sx: 3.06, sy: 3.0, sz: 2.6 }, "#2b2b2b");
  } else if (kind === "hopper") {
    b.prim(PRIM.box(), { y: 2.9, sx: 3.0, sy: 3.4, sz: len - 0.6 }, color);
    for (const z of [-4, 0, 4]) b.prim(PRIM.cone(4), { y: 1.2, z, sx: 2.6, sy: 1.2, sz: 2.6, rx: Math.PI, ry: Math.PI / 4 }, color);
    for (let z = -6; z <= 6; z += 1.5) b.prim(PRIM.box(), { y: 2.9, z, sx: 3.08, sy: 3.3, sz: 0.12 }, "#9aa0a6");
  } else if (kind === "tank") {
    b.prim(PRIM.cyl(14), { y: 2.6, sx: 2.9, sy: len - 1.4, sz: 2.9, rx: Math.PI / 2 }, color);
    b.prim(PRIM.cyl(10), { y: 4.1, sx: 0.9, sy: 0.6, sz: 0.9 }, color);
  } else {
    b.prim(PRIM.box(), { y: 2.0, sx: 3.0, sy: 1.6, sz: len - 0.6 }, color);
  }
  const mesh = new THREE.Mesh(b.build(), CAR_MAT);
  mesh.castShadow = true;
  return { mesh, len };
}

const FREIGHT = [
  ["box", "#a8452f"], ["hopper", "#d9d2c3"], ["hopper", "#c9c2b3"], ["box", "#2f6fca"],
  ["tank", "#1f1f1f"], ["hopper", "#e0d9c8"], ["box", "#d35400"], ["gondola", "#5a6170"],
  ["box", "#27ae60"], ["hopper", "#d9d2c3"], ["tank", "#ecf0f1"], ["box", "#8e44ad"],
];

export function createTrain(scene, { path, cars = 10, speed = 18, locoColor = "#e8562a", firstDelay = 6, seed = 1 }) {
  const acc = pathLengths(path);
  const total = acc[acc.length - 1];
  const units = [];
  const loco = carMesh("loco", locoColor);
  units.push(loco);
  let r = seed;
  for (let i = 0; i < cars; i++) {
    r = (r * 9301 + 49297) % 233280;
    const [kind, col] = FREIGHT[(i + seed * 3 + Math.floor((r / 233280) * 4)) % FREIGHT.length];
    units.push(carMesh(kind, col));
  }
  if (cars > 6) units.push(carMesh("loco", locoColor));
  const gap = 0.9;
  const offsets = [];
  let o = 0;
  for (const u of units) {
    offsets.push(o + u.len / 2);
    o += u.len + gap;
    u.mesh.visible = false;
    scene.add(u.mesh);
  }
  const trainLen = o;

  // Point at arc length s, extrapolating straight past either end.
  const tmp = { x: 0, z: 0 };
  function at(s) {
    let i = 0;
    if (s <= 0) i = 0;
    else if (s >= total) i = acc.length - 2;
    else while (i < acc.length - 2 && acc[i + 1] < s) i++;
    const a = path[i], b = path[i + 1];
    const segLen = acc[i + 1] - acc[i];
    const t = (s - acc[i]) / segLen;
    tmp.x = a[0] + (b[0] - a[0]) * t;
    tmp.z = a[1] + (b[1] - a[1]) * t;
    return tmp;
  }

  const margin = 120;
  const state = { head: -margin, dir: 1, wait: firstDelay, speed };

  function place() {
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      const center = state.head - state.dir * offsets[i];
      const f = at(center + state.dir * u.len * 0.36);
      const fx = f.x, fz = f.z;
      const bk = at(center - state.dir * u.len * 0.36);
      u.mesh.position.set((fx + bk.x) / 2, 0.2, (fz + bk.z) / 2);
      u.mesh.rotation.y = Math.atan2(fx - bk.x, fz - bk.z);
      u.mesh.visible = true;
    }
  }

  function update(dt) {
    if (state.wait > 0) {
      state.wait -= dt;
      if (state.wait <= 0) {
        state.head = state.dir > 0 ? -margin : total + margin;
        place();
      }
      return;
    }
    state.head += state.dir * state.speed * dt;
    const tail = state.head - state.dir * trainLen;
    const gone = state.dir > 0 ? tail > total + margin : tail < -margin;
    if (gone) {
      state.dir *= -1;
      state.wait = 14 + Math.random() * 22;
      state.speed = speed * (0.85 + Math.random() * 0.3);
      for (const u of units) u.mesh.visible = false;
      return;
    }
    place();
  }

  // Is the train within warning distance of (or occupying) arc length s?
  function approaching(s, warn = 70) {
    if (state.wait > 0) return false;
    const tail = state.head - state.dir * trainLen;
    const lo = Math.min(state.head, tail), hi = Math.max(state.head, tail);
    if (state.dir > 0) return s >= lo - 3 && s <= hi + warn;
    return s >= lo - warn && s <= hi + 3;
  }

  function headPos() {
    return at(state.head);
  }

  return {
    update,
    approaching,
    headPos,
    get moving() {
      return state.wait <= 0;
    },
  };
}
