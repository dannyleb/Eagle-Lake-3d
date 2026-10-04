import * as THREE from "three";
import { RAILS, ROADS } from "../map/layout.js";
import { MeshBuilder, PRIM } from "./builder.js";

export function pathLengths(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return acc;
}

function segIntersect(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1];
  const sx = d[0] - c[0], sz = d[1] - c[1];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = c[0] - a[0], qz = c[1] - a[1];
  const t = (qx * sz - qz * sx) / den;
  const u = (qx * rz - qz * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, u, x: a[0] + t * rx, z: a[1] + t * rz };
}

export function findCrossings() {
  const out = [];
  for (const [key, rail] of Object.entries(RAILS)) {
    if (!rail.active) continue;
    const acc = pathLengths(rail.pts);
    for (let i = 0; i < rail.pts.length - 1; i++) {
      const a = rail.pts[i], b = rail.pts[i + 1];
      const segLen = acc[i + 1] - acc[i];
      const td = [(b[0] - a[0]) / segLen, (b[1] - a[1]) / segLen];
      for (const road of ROADS) {
        for (let j = 0; j < road.pts.length - 1; j++) {
          const c = road.pts[j], d = road.pts[j + 1];
          const hit = segIntersect(a, b, c, d);
          if (!hit) continue;
          const rl = Math.hypot(d[0] - c[0], d[1] - c[1]);
          const rd = [(d[0] - c[0]) / rl, (d[1] - c[1]) / rl];
          if (out.some((o) => Math.hypot(o.x - hit.x, o.z - hit.z) < 2)) continue;
          out.push({
            x: hit.x,
            z: hit.z,
            rail: key,
            s: acc[i] + hit.t * segLen,
            td,
            rd,
            road,
            gated: road.kind === "main" || road.kind === "highway",
            amount: 0,
            gates: [],
          });
        }
      }
    }
  }
  return out;
}

function approachPlacement(cr, k) {
  const sinA = Math.abs(cr.rd[0] * cr.td[1] - cr.rd[1] * cr.td[0]) || 1;
  const off = 4.6 / sinA + 1.6;
  const v = [-k * cr.rd[0], -k * cr.rd[1]]; // travel direction toward the track
  const right = [-v[1], v[0]];
  const lat = cr.road.w / 2 + 1.1;
  return {
    x: cr.x + k * cr.rd[0] * off + right[0] * lat,
    z: cr.z + k * cr.rd[1] * off + right[1] * lat,
    rot: Math.atan2(right[1], -right[0]),
    armLen: cr.road.w / 2 + 0.4,
  };
}

function buildGate(place, lampMats) {
  const g = new THREE.Group();
  g.position.set(place.x, 0, place.z);
  g.rotation.y = place.rot;
  const metal = new THREE.MeshLambertMaterial({ color: 0xd9dde0, flatShading: true });
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 4.2, 8), metal);
  mast.position.y = 2.1;
  g.add(mast);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), new THREE.MeshLambertMaterial({ color: 0x8a8f94 }));
  base.position.y = 0.25;
  g.add(base);
  const signMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  for (const rz of [0.62, -0.62]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.06), signMat);
    b.position.y = 3.8;
    b.rotation.z = rz;
    g.add(b);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.14), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  bar.position.y = 2.9;
  g.add(bar);
  const lamps = [];
  for (const [i, lx] of [[0, -0.55], [1, 0.55]]) {
    const backing = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 14), new THREE.MeshLambertMaterial({ color: 0x111111 }));
    backing.rotation.x = Math.PI / 2;
    backing.position.set(lx, 2.9, 0);
    g.add(backing);
    for (const side of [0.06, -0.06]) {
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), lampMats[i]);
      lamp.position.set(lx, 2.9, side);
      if (side < 0) lamp.rotation.y = Math.PI;
      g.add(lamp);
    }
    lamps.push(i);
  }
  const pivot = new THREE.Group();
  pivot.position.set(0.35, 1.25, 0);
  const arm = new MeshBuilder();
  const segs = Math.ceil(place.armLen / 0.6);
  for (let i = 0; i < segs; i++) {
    arm.prim(PRIM.box(), { y: 0.3 + i * 0.6, sx: 0.16, sy: 0.6, sz: 0.1 }, i % 2 === 0 ? "#e6262a" : "#ffffff");
  }
  arm.prim(PRIM.box(), { x: -0.45, y: -0.1, sx: 0.6, sy: 0.4, sz: 0.3 }, "#5a5f66");
  const armMesh = new THREE.Mesh(arm.build(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  pivot.add(armMesh);
  g.add(pivot);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, pivot };
}

export function buildRails(scene, ground, props, collision) {
  const tieGeo = new THREE.BoxGeometry(2.7, 0.16, 0.42);
  const ties = [];
  for (const rail of Object.values(RAILS)) {
    const pts = rail.pts;
    const bedColor = rail.active ? "#a99f89" : "#b9b28f";
    ground.ribbon(pts, rail.active ? 5.4 : 4.2, 0.07, bedColor);
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz);
      const rot = Math.atan2(dx, dz);
      const c = Math.cos(rot), s = Math.sin(rot);
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      // The abandoned Santa Fe grade only keeps a short rusty stretch by the depot.
      const keepRails = rail.active;
      if (keepRails) {
        for (const o of [-0.76, 0.76]) {
          props.prim(PRIM.box(), { x: mx + c * o, y: 0.24, z: mz - s * o, sx: 0.13, sy: 0.16, sz: len + 0.4, ry: rot }, "#8a9099");
        }
        for (let d = 0.5; d < len; d += 1.05) {
          ties.push([ax + (dx / len) * d, az + (dz / len) * d, rot]);
        }
      } else {
        for (let zz = -38; zz < 22; zz += 1.05) ties.push([172, zz, 0]);
        for (const o of [-0.76, 0.76]) {
          props.prim(PRIM.box(), { x: 172 + o, y: 0.2, z: -8, sx: 0.12, sy: 0.14, sz: 60, ry: 0 }, "#8b5a3c");
        }
      }
    }
  }
  const tieMesh = new THREE.InstancedMesh(tieGeo, new THREE.MeshLambertMaterial({ color: 0x5a3f2a }), ties.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  ties.forEach(([x, z, rot], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    m.compose(new THREE.Vector3(x, 0.1, z), q, new THREE.Vector3(1, 1, 1));
    tieMesh.setMatrixAt(i, m);
  });
  tieMesh.receiveShadow = true;
  tieMesh.instanceMatrix.needsUpdate = true;
  tieMesh.computeBoundingSphere();
  scene.add(tieMesh);

  const crossings = findCrossings();
  const lampMats = [
    new THREE.MeshBasicMaterial({ color: 0x3a0606 }),
    new THREE.MeshBasicMaterial({ color: 0x3a0606 }),
  ];
  for (const cr of crossings) {
    // Each gated crossing blinks on its own, only when its train is near.
    cr.lamps = cr.gated
      ? [new THREE.MeshBasicMaterial({ color: 0x3a0606 }), new THREE.MeshBasicMaterial({ color: 0x3a0606 })]
      : null;
    // Grade crossing planks over the road.
    const along = Math.atan2(cr.td[0], cr.td[1]);
    const sinA = Math.abs(cr.rd[0] * cr.td[1] - cr.rd[1] * cr.td[0]) || 1;
    props.prim(PRIM.box(), { x: cr.x, y: 0.09, z: cr.z, sx: 3.2, sy: 0.12, sz: cr.road.w / sinA + 1, ry: along }, "#7d6a55");
    for (const k of [1, -1]) {
      const p = approachPlacement(cr, k);
      if (cr.gated) {
        const gate = buildGate(p, cr.lamps);
        scene.add(gate.group);
        cr.gates.push(gate);
      } else {
        props.prim(PRIM.cyl(8), { x: p.x, y: 1.9, z: p.z, sx: 0.2, sy: 3.8, sz: 0.2 }, "#e9ecef");
        for (const rz of [0.62, -0.62]) {
          props.prim(PRIM.box(), { x: p.x, y: 3.5, z: p.z, sx: 2.2, sy: 0.3, sz: 0.07, ry: p.rot, rz }, "#ffffff");
        }
      }
      collision.add({ type: "circle", x: p.x, z: p.z, r: 0.35, h: 4 });
    }
  }
  return { crossings, lampMats };
}

// Is (x, z) inside the crossing's danger box (the strip of road over the
// tracks)? Used to keep vehicles out while the gates are down.
export function inCrossingZone(cr, x, z) {
  const dx = x - cr.x, dz = z - cr.z;
  const alongTrack = dx * cr.td[0] + dz * cr.td[1];
  const acrossTrack = dx * -cr.td[1] + dz * cr.td[0];
  const sinA = Math.abs(cr.rd[0] * cr.td[1] - cr.rd[1] * cr.td[0]) || 1;
  return Math.abs(acrossTrack) < 4.2 && Math.abs(alongTrack) < cr.road.w / 2 / sinA + 1.5;
}
