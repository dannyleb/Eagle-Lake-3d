import * as THREE from "three";
import { ROADS } from "./map/layout.js";
import { makeCanvas, canvasTexture } from "./util.js";

// Dr. Pebber cans floating over the streets. Ride, drive or walk through one
// and it pops: a few seconds of extra speed. Each can comes back a little
// while after it's grabbed.
//
// Cans sit on the road's center line at mid-block, so a vehicle in either
// lane runs through them. Every other block on the grid gets one (the
// pattern alternates street to street), and the highways get one every
// ~110 m out to the edge of the map.

export const BOOST_SECONDS = 5;
export const BOOST_MULT = 1.6;
const RESPAWN = 25; // seconds
const SPACING = { main: 120, street: 120, highway: 110 };

function labelTexture() {
  const c = makeCanvas(256, 128);
  const g = c.getContext("2d");
  g.fillStyle = "#7a1424";
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#4e0c17";
  g.fillRect(0, 0, 256, 14);
  g.fillRect(0, 114, 256, 14);
  g.fillStyle = "#ffffff";
  g.font = "italic bold 40px Georgia, serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  // Twice around the can so it reads from any side.
  g.fillText("Dr Pebber", 64, 62);
  g.fillText("Dr Pebber", 192, 62);
  g.fillStyle = "#e6c34a";
  g.font = "bold 13px Trebuchet MS, sans-serif";
  g.fillText("24 FLAVORS", 64, 96);
  g.fillText("24 FLAVORS", 192, 96);
  const t = canvasTexture(c);
  return t;
}

export function createPickups(scene) {
  const spots = [];
  ROADS.forEach((r, ri) => {
    const step = SPACING[r.kind];
    if (!step) return;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const ux = (bx - ax) / len, uz = (bz - az) / len;
      // Mid-block on the 60 m grid, alternating which blocks per street.
      const first = r.kind === "highway" ? 70 : 30 + (ri % 2) * 60;
      for (let s = first; s < len - 12; s += step) {
        spots.push({ x: ax + ux * s, z: az + uz * s, phase: Math.random() * 6.28, gone: 0 });
      }
    }
  });

  const n = spots.length;
  const can = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.68, 0.68, 1.75, 16),
    [new THREE.MeshLambertMaterial({ map: labelTexture() }), new THREE.MeshLambertMaterial({ color: 0xd9dde2 }), new THREE.MeshLambertMaterial({ color: 0xb8bec6 })],
    n,
  );
  const ring = new THREE.InstancedMesh(
    new THREE.TorusGeometry(1.25, 0.1, 6, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd43b }),
    n,
  );
  const glow = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1.6, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.35, depthWrite: false }),
    n,
  );
  can.castShadow = true;
  for (const m of [can, ring, glow]) {
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(m);
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  // pos: the player or their ride; radius: how close counts as a grab.
  // Returns the number of cans grabbed this frame.
  function update(dt, time, pos, radius) {
    let got = 0;
    for (let i = 0; i < n; i++) {
      const s = spots[i];
      if (s.gone > 0) {
        s.gone -= dt;
        // Pop in with a little overshoot when it comes back.
        if (s.gone > 0) {
          can.setMatrixAt(i, ZERO);
          ring.setMatrixAt(i, ZERO);
          glow.setMatrixAt(i, ZERO);
          continue;
        }
      }
      if (Math.abs(pos.x - s.x) < radius && Math.abs(pos.z - s.z) < radius && Math.hypot(pos.x - s.x, pos.z - s.z) < radius) {
        s.gone = RESPAWN;
        got++;
        continue;
      }
      const y = 1.9 + Math.sin(time * 2.2 + s.phase) * 0.22;
      e.set(0.18, time * 2.4 + s.phase, 0);
      can.setMatrixAt(i, m4.compose(v.set(s.x, y, s.z), q.setFromEuler(e), sc.set(1, 1, 1)));
      e.set(Math.PI / 2, 0, time * 1.5 + s.phase);
      const pulse = 1 + Math.sin(time * 4 + s.phase) * 0.06;
      ring.setMatrixAt(i, m4.compose(v.set(s.x, 0.3, s.z), q.setFromEuler(e), sc.set(pulse, pulse, pulse)));
      e.set(-Math.PI / 2, 0, 0);
      glow.setMatrixAt(i, m4.compose(v.set(s.x, 0.22, s.z), q.setFromEuler(e), sc.set(1, 1, 1)));
    }
    can.instanceMatrix.needsUpdate = true;
    ring.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
    return got;
  }

  return { update, spots };
}
