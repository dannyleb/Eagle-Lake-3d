import * as THREE from "three";
import { MeshBuilder, PRIM, offsetPolygon } from "./world/builder.js";
import { LAKE } from "./map/layout.js";

// Alligators sunning on the lake shore. Three instanced meshes (body, a
// hinged lower jaw, a swaying tail) keep two dozen of them cheap. They
// lie still and yawn now and then; get close and they swing their heads
// toward you and hiss with jaws wide open; get too close and they snap.

const OLIVE = "#4f6b2a", DARK = "#36491d", BELLY = "#b9b27a", EYE = "#ffd23f", TOOTH = "#fffbe8", MOUTH = "#e98a8a";
const HINGE = new THREE.Vector3(0, 0.34, 1.05);
const TAIL = new THREE.Vector3(0, 0.3, -1.25);

function bodyGeometry() {
  const b = new MeshBuilder();
  b.prim(PRIM.sphere(10), { y: 0.36, sx: 1.15, sy: 0.55, sz: 2.6 }, OLIVE);
  b.prim(PRIM.sphere(10), { y: 0.24, sx: 1.05, sy: 0.32, sz: 2.4 }, BELLY);
  // Head and upper jaw (snout), tapering to the nose
  b.prim(PRIM.box(), { y: 0.42, z: 1.15, sx: 0.78, sy: 0.32, sz: 0.7 }, OLIVE);
  b.prim(PRIM.box(), { y: 0.4, z: 1.75, sx: 0.58, sy: 0.22, sz: 1.0 }, OLIVE);
  b.prim(PRIM.box(), { y: 0.39, z: 2.28, sx: 0.44, sy: 0.2, sz: 0.3 }, OLIVE);
  for (const s of [-1, 1]) {
    // Eye bumps with yellow eyes and slit pupils, nostrils
    b.prim(PRIM.sphere(7), { x: s * 0.22, y: 0.62, z: 1.05, sx: 0.24, sy: 0.2, sz: 0.24 }, OLIVE);
    b.prim(PRIM.sphere(6), { x: s * 0.27, y: 0.66, z: 1.11, sx: 0.12, sy: 0.12, sz: 0.1 }, EYE);
    b.prim(PRIM.box(), { x: s * 0.29, y: 0.66, z: 1.15, sx: 0.02, sy: 0.1, sz: 0.02 }, "#111111");
    b.prim(PRIM.sphere(5), { x: s * 0.1, y: 0.51, z: 2.32, sx: 0.08, sy: 0.06, sz: 0.08 }, DARK);
    // Upper teeth along the snout
    for (let k = 0; k < 5; k++) {
      b.prim(PRIM.cone(4), { x: s * 0.27, y: 0.26, z: 1.35 + k * 0.22, sx: 0.06, sy: 0.12, sz: 0.06, rx: Math.PI }, TOOTH);
    }
    // Splayed legs with toes
    for (const lz of [0.75, -0.7]) {
      b.prim(PRIM.box(), { x: s * 0.72, y: 0.16, z: lz, sx: 0.55, sy: 0.2, sz: 0.28, ry: s * (lz > 0 ? 0.5 : -0.5) }, OLIVE);
      b.prim(PRIM.box(), { x: s * 0.98, y: 0.07, z: lz + (lz > 0 ? 0.12 : -0.12), sx: 0.24, sy: 0.08, sz: 0.36 }, DARK);
    }
  }
  // Two rows of bony scutes down the back
  for (let k = 0; k < 9; k++) {
    for (const s of [-1, 1]) {
      b.prim(PRIM.cone(4), { x: s * 0.24, y: 0.66, z: 0.75 - k * 0.24, sx: 0.12, sy: 0.16, sz: 0.16 }, DARK);
    }
  }
  return b.build();
}

// Lower jaw, built with its hinge at the origin so it can pivot open.
function jawGeometry() {
  const b = new MeshBuilder();
  b.prim(PRIM.box(), { y: -0.06, z: 0.62, sx: 0.66, sy: 0.14, sz: 1.3 }, OLIVE);
  b.prim(PRIM.box(), { y: 0.015, z: 0.64, sx: 0.5, sy: 0.02, sz: 1.15 }, MOUTH);
  b.prim(PRIM.box(), { y: -0.1, z: 0.6, sx: 0.6, sy: 0.08, sz: 1.2 }, BELLY);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) b.prim(PRIM.cone(4), { x: s * 0.26, y: 0.07, z: 0.3 + k * 0.22, sx: 0.06, sy: 0.12, sz: 0.06 }, TOOTH);
  }
  return b.build();
}

// Tail, built from its base (origin) back along -z.
function tailGeometry() {
  const b = new MeshBuilder();
  const segs = 6;
  for (let k = 0; k < segs; k++) {
    const t = k / segs;
    const w = 0.85 * (1 - t) + 0.12;
    b.prim(PRIM.box(), { y: 0.02 - t * 0.12, z: -0.25 - k * 0.42, sx: w, sy: 0.36 * (1 - t) + 0.08, sz: 0.46 }, OLIVE);
    b.prim(PRIM.cone(4), { y: 0.25 - t * 0.2, z: -0.25 - k * 0.42, sx: 0.1, sy: 0.18 * (1 - t) + 0.06, sz: 0.2 }, DARK);
  }
  return b.build();
}

// One gator as a regular mesh group (for the big one in Granny's Lake):
// { group, jaw, tail } where jaw.rotation.x opens the mouth (positive drops
// the jaw) and tail.rotation.y swings the tail.
export function buildGatorModel() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(bodyGeometry(), mat));
  const jaw = new THREE.Group();
  jaw.position.copy(HINGE);
  jaw.add(new THREE.Mesh(jawGeometry(), mat));
  const tail = new THREE.Group();
  tail.position.copy(TAIL);
  tail.add(new THREE.Mesh(tailGeometry(), mat));
  group.add(jaw, tail);
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, jaw, tail };
}

export function createGators(scene, collision, { count = 24, seed = 7 } = {}) {
  let r = seed;
  const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);

  // Spots along the shore, facing the water (snouts dipping in).
  const out = offsetPolygon(LAKE, 2.2);
  const edges = [];
  let total = 0;
  for (let i = 0; i < LAKE.length; i++) {
    const a = out[i], b = out[(i + 1) % out.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    edges.push({ a, b, len, la: LAKE[i], lb: LAKE[(i + 1) % LAKE.length] });
    total += len;
  }
  const gators = [];
  let tries = 0;
  while (gators.length < count && tries++ < count * 20) {
    let s = rand() * total, e = edges[0];
    for (const ed of edges) {
      if (s <= ed.len) { e = ed; break; }
      s -= ed.len;
    }
    const t = s / e.len;
    const x = e.a[0] + (e.b[0] - e.a[0]) * t, z = e.a[1] + (e.b[1] - e.a[1]) * t;
    const wx = e.la[0] + (e.lb[0] - e.la[0]) * t, wz = e.la[1] + (e.lb[1] - e.la[1]) * t;
    if (gators.some((g) => Math.hypot(g.x - x, g.z - z) < 14)) continue;
    if (collision.hits(x - (wx - x) * 0.5, z - (wz - z) * 0.5, 2)) continue;
    const towardWater = Math.atan2(wx - x, wz - z);
    const yaw = towardWater + (rand() - 0.5) * 1.4;
    gators.push({
      x, z, baseYaw: yaw, yaw, scale: 1.35 + rand() * 0.5,
      jaw: 0, tail: rand() * 6, yawn: 4 + rand() * 14, lunge: 0, hissCd: 0, snapCd: 0,
    });
  }

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const body = new THREE.InstancedMesh(bodyGeometry(), mat, gators.length);
  const jaw = new THREE.InstancedMesh(jawGeometry(), mat, gators.length);
  const tail = new THREE.InstancedMesh(tailGeometry(), mat, gators.length);
  for (const m of [body, jaw, tail]) {
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }

  const M = new THREE.Matrix4(), J = new THREE.Matrix4(), T = new THREE.Matrix4(), R = new THREE.Matrix4();
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), scl = new THREE.Vector3();
  function place(i, g) {
    const fx = Math.sin(g.yaw), fz = Math.cos(g.yaw);
    pos.set(g.x + fx * g.lunge, 0.06, g.z + fz * g.lunge);
    q.setFromAxisAngle(up, g.yaw);
    M.compose(pos, q, scl.setScalar(g.scale));
    body.setMatrixAt(i, M);
    J.copy(M).multiply(T.makeTranslation(HINGE.x, HINGE.y, HINGE.z)).multiply(R.makeRotationX(g.jaw)); // positive angle drops the jaw
    jaw.setMatrixAt(i, J);
    J.copy(M).multiply(T.makeTranslation(TAIL.x, TAIL.y, TAIL.z)).multiply(R.makeRotationY(Math.sin(g.tail) * 0.35));
    tail.setMatrixAt(i, J);
  }
  gators.forEach((g, i) => {
    place(i, g);
    // Body and head are solid; you can't walk through a gator.
    collision.add({ type: "circle", x: g.x, z: g.z, r: 1.15 * g.scale, h: 1 });
    collision.add({ type: "circle", x: g.x + Math.sin(g.yaw) * 1.6 * g.scale, z: g.z + Math.cos(g.yaw) * 1.6 * g.scale, r: 0.7 * g.scale, h: 1 });
  });
  for (const m of [body, jaw, tail]) {
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }

  // ctx: { px, pz, onFoot, hiss(), snap(dirX, dirZ) }
  function update(dt, ctx) {
    let dirty = false;
    gators.forEach((g, i) => {
      const d = Math.hypot(ctx.px - g.x, ctx.pz - g.z);
      if (d > 140) return;
      dirty = true;
      g.tail += dt * (d < 10 ? 5 : 0.9);
      g.hissCd -= dt;
      g.snapCd -= dt;
      let wantJaw = 0, wantYaw = g.baseYaw;
      if (d < 10) {
        // Head toward the intruder (within reason) and gape.
        const toward = Math.atan2(ctx.px - g.x, ctx.pz - g.z);
        let off = toward - g.baseYaw;
        while (off > Math.PI) off -= Math.PI * 2;
        while (off < -Math.PI) off += Math.PI * 2;
        wantYaw = g.baseYaw + Math.max(-0.7, Math.min(0.7, off));
        wantJaw = 0.75;
        if (g.hissCd <= 0) {
          g.hissCd = 6;
          ctx.hiss();
        }
        if (d < 3.6 * g.scale + 0.8 && g.snapCd <= 0 && ctx.onFoot) {
          g.snapCd = 2.2;
          g.lunge = 0.7;
          g.jaw = 0;
          ctx.snap(ctx.px - g.x, ctx.pz - g.z);
        }
      } else {
        // The occasional lazy yawn.
        g.yawn -= dt;
        if (g.yawn < 0) {
          wantJaw = 0.6;
          if (g.yawn < -1.6) g.yawn = 6 + Math.random() * 16;
        }
      }
      g.yaw += (wantYaw - g.yaw) * Math.min(1, dt * 3);
      g.jaw += (wantJaw - g.jaw) * Math.min(1, dt * (wantJaw > g.jaw ? 6 : 14));
      g.lunge *= Math.pow(0.02, dt);
      place(i, g);
    });
    if (dirty) {
      for (const m of [body, jaw, tail]) m.instanceMatrix.needsUpdate = true;
    }
  }

  return { update, count: gators.length, list: gators };
}
