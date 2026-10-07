import * as THREE from "three";
import {
  ROADS, LAKE, POND, PITS, GRANNYS_LAKE, AREAS, TOWN, REGIONS,
  distToRail, distToRoad, distToPolyline, pointInPolygon, inRect, RAILS,
} from "../map/layout.js";
import { MeshBuilder, PRIM, offsetPolygon } from "./builder.js";
import { ATLAS, makeFacadeAtlas, makeWallMaterial } from "./atlas.js";
import { buildSky } from "./sky.js";
import { makeDetailTexture, makeGroundMaterial, makeWaterMaterial } from "./surface.js";
import { Forest } from "./trees.js";
import { buildRails } from "./rail.js";
import { makeSignTexture, makeBannerTexture } from "../signage.js";
import { createPoplar, createOak } from "../arborist.js";
import { CollisionWorld } from "../collision.js";
import { BRADSHALL } from "../config.js";
import { seededRandom, makeCanvas, canvasTexture } from "../util.js";

// Ground layer heights (kept apart so distant surfaces don't z-fight).
export const Y = { field: 0, lawn: 0.04, shore: 0.05, water: 0.08, lot: 0.1, walk: 0.12, road: 0.16, bed: 0.18, mark: 0.2, curbwalk: 0.26 };

const PAL = {
  base: "#5f9f44",
  lawn: "#7ccb59",
  fields: ["#86c95c", "#97d46a", "#a9db74", "#77bb52", "#c7d870", "#b8d46a", "#8cc96a", "#6fb24f", "#a2cf62"],
  paddy: "#79c4b0",
  road: { main: "#5a5e67", highway: "#54575f", street: "#62666e", rural: "#6d6f72", spur: "#6d7077" },
  yellow: "#f6c431",
  white: "#f5f5ef",
  walk: "#dcd5c1",
  concrete: "#cbc6b7",
  lot: "#6c7079",
  water: "#2f90e8",
  deep: "#1f6fcf",
  shore: "#ecdba2",
  gravel: "#cdbf98",
};

const HOUSE_WALLS = ["#f6d365", "#f4a259", "#ef7a63", "#7ed6c9", "#a7d86d", "#c9a3e6", "#f7f3e8", "#8ec5f0", "#f7b6c8", "#efe0a8", "#b5e0a2", "#ffd28a", "#f2f2f2"];
const HOUSE_ROOFS = ["#c9372c", "#2f6fca", "#3c8f42", "#7b4a2b", "#5a6170", "#8d48b5", "#2a9d8f", "#d35400", "#a33a3a"];
const STORE_WALLS = ["#e9cf8f", "#dfbd7c", "#f4e7c8", "#f3f1e7", "#e08a66", "#c45f45", "#9fdcbc", "#6ccbc4", "#f5a35b", "#f2d57c", "#d6a3e0", "#8fc9f2", "#e7b97a"];
const TRIMS = ["#ffffff", "#f4e7c8", "#7a3b2e", "#2f4a3a", "#5a3a7a", "#2c5d8a"];
const AWNINGS = ["#c0392b", "#2e86de", "#27ae60", "#f1c40f", "#8e44ad", "#ffffff", "#e67e22", "#16a085"];
const CAR_COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71", "#9b59b6", "#ecf0f1", "#e67e22", "#1abc9c", "#34495e", "#c0392b", "#f39c12", "#ff6fa8"];

const ROT = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };

// Darken (f < 1) or lighten (f > 1) a CSS color.
function shade(hex, f) {
  const c = new THREE.Color(hex);
  if (f < 1) c.multiplyScalar(f);
  else c.lerp(new THREE.Color(1, 1, 1), f - 1);
  return c;
}

function offsetLine(pts, off) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1;
    return [p[0] + (-dz / l) * off, p[1] + (dx / l) * off];
  });
}

export function buildWorld(scene) {
  const rand = seededRandom(1999);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const collision = new CollisionWorld(32);
  const atlas = makeFacadeAtlas();
  const walls = new MeshBuilder({ uv: true });
  const props = new MeshBuilder();
  const ground = new MeshBuilder();
  const water = new MeshBuilder();
  const forest = new Forest();
  const minimap = { buildings: [], landmarks: [] };
  const triggers = [];
  const signMeshes = [];

  // ---------- helpers ----------
  const L = (b, lx, lz) => {
    const c = Math.cos(b.rot), s = Math.sin(b.rot);
    return [b.x + lx * c + lz * s, b.z - lx * s + lz * c];
  };

  function addSign({ x, y, z, rot, w, h, title, sub, bg, fg, twoSided = false }) {
    const tex = makeSignTexture({ title, sub, bg, fg });
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rot;
    scene.add(mesh);
    signMeshes.push(mesh);
    if (twoSided) {
      const back = mesh.clone();
      back.rotation.y = rot + Math.PI;
      back.position.set(x - Math.sin(rot) * 0.02, y, z - Math.cos(rot) * 0.02);
      scene.add(back);
    }
    return mesh;
  }

  function poleSign({ x, z, rot, title, sub, bg, fg, h = 9, w = 6 }) {
    props.prim(PRIM.cyl(8), { x, y: h / 2, z, sx: 0.35, sy: h, sz: 0.35 }, "#9aa0a6");
    props.prim(PRIM.box(), { x, y: h + 1.2, z, sx: w + 0.4, sy: 2.8, sz: 0.3, ry: rot }, "#2b2b2b");
    const fx = Math.sin(rot) * 0.17, fz = Math.cos(rot) * 0.17;
    addSign({ x: x + fx, y: h + 1.2, z: z + fz, rot, w, h: 2.4, title, sub, bg, fg });
    addSign({ x: x - fx, y: h + 1.2, z: z - fz, rot: rot + Math.PI, w, h: 2.4, title, sub, bg, fg });
    collision.add({ type: "circle", x, z, r: 0.5, h });
  }

  // Coping along the parapet edge, rooftop HVAC units, vents and a hatch.
  function flatRoofDetails(b) {
    const y = b.h;
    const cope = shade(b.wall, 0.8);
    const hw = b.w / 2, hd = b.d / 2;
    for (const [lx, lz, sx, sz] of [[0, hd - 0.2, b.w, 0.4], [0, -hd + 0.2, b.w, 0.4], [hw - 0.2, 0, 0.4, b.d], [-hw + 0.2, 0, 0.4, b.d]]) {
      const [x, z] = L(b, lx, lz);
      props.prim(PRIM.box(), { x, y: y + 0.25, z, sx, sy: 0.5, sz, ry: b.rot }, cope);
    }
    if (b.w * b.d < 90) return;
    const units = 1 + Math.floor(rand() * Math.min(3, b.w / 9));
    for (let i = 0; i < units; i++) {
      const [x, z] = L(b, (rand() - 0.5) * (b.w - 5), (rand() - 0.5) * (b.d - 5));
      props.prim(PRIM.box(), { x, y: y + 0.65, z, sx: 2.2, sy: 1.3, sz: 1.6, ry: b.rot }, "#d5d9dd");
      props.prim(PRIM.cyl(10), { x, y: y + 1.33, z, sx: 1.1, sy: 0.08, sz: 1.1 }, "#5d646b");
    }
    for (let i = 0; i < 2; i++) {
      const [x, z] = L(b, (rand() - 0.5) * (b.w - 3), (rand() - 0.5) * (b.d - 3));
      props.prim(PRIM.cyl(8), { x, y: y + 0.5, z, sx: 0.35, sy: 1, sz: 0.35 }, "#9aa1a8");
      props.prim(PRIM.cyl(8), { x, y: y + 1.05, z, sx: 0.55, sy: 0.12, sz: 0.55 }, "#7d848b");
    }
    const [hx, hz] = L(b, hw * 0.5, -hd * 0.4);
    props.prim(PRIM.box(), { x: hx, y: y + 0.2, z: hz, sx: 1.2, sy: 0.4, sz: 1.2, ry: b.rot }, "#8b939a");
  }

  function addBuilding(b) {
    const front = b.front || "plain";
    const faces = {
      pz: { rect: ATLAS[front], segW: b.frontSeg || b.w, segH: b.frontSegH || b.h },
      nz: { rect: ATLAS[b.sides || "plain"], segW: 5.5, segH: 4.2 },
      px: { rect: ATLAS[b.sides || "plain"], segW: 5.5, segH: 4.2 },
      nx: { rect: ATLAS[b.sides || "plain"], segW: 5.5, segH: 4.2 },
    };
    const roofType = b.roofType || "flat";
    walls.box({ x: b.x, z: b.z, y0: 0, w: b.w, h: b.h, d: b.d, rot: b.rot, color: b.wall, faces, top: roofType === "flat", topColor: b.roof || "#8d8f94" });
    if (roofType !== "flat") {
      walls.roof({ x: b.x, z: b.z, y0: b.h, w: b.w, d: b.d, rot: b.rot, rh: b.rh || 2.5, overhang: b.overhang ?? 0.5, color: b.roof, gableColor: b.wall, type: roofType, uvRect: ATLAS.roof, trim: b.trimColor || "#f7f4ea" });
    } else {
      flatRoofDetails(b);
    }
    // Foundation band: a darker plinth along the base of every wall.
    props.prim(PRIM.box(), { x: b.x, y: 0.28, z: b.z, sx: b.w + 0.22, sy: 0.56, sz: b.d + 0.22, ry: b.rot }, shade(b.wall, 0.62));
    collision.add({ type: "box", x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2, rot: b.rot, h: b.h + (roofType === "flat" ? 0 : b.rh || 2.5) });
    minimap.buildings.push({ x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2, rot: b.rot, color: b.wall });
    return b;
  }

  function addStore(b) {
    addBuilding({ ...b, front: b.front || (rand() < 0.45 ? "store2" : "store"), frontSeg: b.w, frontSegH: b.h });
    const trim = b.trim || pick(TRIMS);
    const ph = b.name ? 2.4 : 1.2 + rand() * 0.6;
    // Parapet + cornice
    const [px, pz] = L(b, 0, b.d / 2 - 0.25);
    walls.box({ x: px, z: pz, y0: b.h, w: b.w, h: ph, d: 0.5, rot: b.rot, color: b.wall, faces: { pz: { rect: ATLAS.blank, segW: 6, segH: 3 } }, topColor: trim });
    const style = b.parapet || pick(["stepped", "flat", "triple", "stepped"]);
    if (style !== "flat") {
      walls.box({ x: px, z: pz, y0: b.h + ph, w: b.w * 0.42, h: 0.9, d: 0.5, rot: b.rot, color: b.wall, faces: { pz: { rect: ATLAS.blank, segW: 6, segH: 3 } }, topColor: trim });
      if (style === "triple") walls.box({ x: px, z: pz, y0: b.h + ph + 0.9, w: b.w * 0.18, h: 0.7, d: 0.5, rot: b.rot, color: b.wall, topColor: trim });
    }
    const [cx, cz] = L(b, 0, b.d / 2 + 0.12);
    props.prim(PRIM.box(), { x: cx, y: b.h + ph - 0.2, z: cz, sx: b.w + 0.3, sy: 0.4, sz: 0.5, ry: b.rot }, trim);
    props.prim(PRIM.box(), { x: cx, y: 3.85, z: cz, sx: b.w, sy: 0.28, sz: 0.4, ry: b.rot }, trim);
    // Awning on poles over the sidewalk, like the real Main St.
    if (b.awning !== false && rand() < 0.75) {
      const ac = b.awningColor || pick(AWNINGS);
      const aw = b.w * 0.92;
      const [ax, az] = L(b, 0, b.d / 2 + 1.05);
      props.prim(PRIM.box(), { x: ax, y: 3.45, z: az, sx: aw, sy: 0.14, sz: 2.2, ry: b.rot, rx: 0.2 }, ac);
      const [vx, vz] = L(b, 0, b.d / 2 + 2.12);
      props.prim(PRIM.box(), { x: vx, y: 3.05, z: vz, sx: aw, sy: 0.36, sz: 0.07, ry: b.rot }, ac === "#ffffff" ? "#c0392b" : "#ffffff");
      for (const side of [-1, 1]) {
        const [qx, qz] = L(b, side * (aw / 2 - 0.25), b.d / 2 + 2.0);
        props.prim(PRIM.cyl(6), { x: qx, y: 1.55, z: qz, sx: 0.09, sy: 3.1, sz: 0.09 }, "#e9ecef");
      }
    }
    if (b.name) {
      const [sx, sz] = L(b, 0, b.d / 2 + 0.02);
      addSign({ x: sx, y: b.h + ph / 2, z: sz, rot: b.rot, w: Math.min(b.w * 0.92, 12), h: ph * 0.86, title: b.name, sub: b.sub, bg: b.signBg || "#2b2b2b", fg: b.signFg || "#ffd34d" });
      minimap.landmarks.push({ x: b.x, z: b.z, label: b.name });
    }
  }

  function addHouse(h) {
    addBuilding({ ...h, front: "house", frontSeg: h.w, frontSegH: h.h, roofType: h.roofType, rh: h.rh, overhang: 0.55 });
    if (h.porch) {
      const [px, pz] = L(h, 0, h.d / 2 + 1.1);
      props.prim(PRIM.box(), { x: px, y: 2.7, z: pz, sx: h.w * 0.62, sy: 0.18, sz: 2.4, ry: h.rot }, h.roof);
      for (const side of [-1, 1]) {
        const [qx, qz] = L(h, side * h.w * 0.29, h.d / 2 + 2.1);
        props.prim(PRIM.box(), { x: qx, y: 1.35, z: qz, sx: 0.2, sy: 2.7, sz: 0.2, ry: h.rot }, "#ffffff");
      }
      const [sx, sz] = L(h, 0, h.d / 2 + 1.1);
      props.prim(PRIM.box(), { x: sx, y: 0.2, z: sz, sx: h.w * 0.62, sy: 0.4, sz: 2.4, ry: h.rot }, "#d9d0bd");
    }
    // Front yard: walkway to the street, foundation shrubs with flowers,
    // a mailbox at the curb, and sometimes a white picket fence.
    const yard = 4.4;
    const corners = [[-0.7, h.d / 2], [0.7, h.d / 2], [0.7, h.d / 2 + yard], [-0.7, h.d / 2 + yard]].map(([lx, lz]) => L(h, lx, lz));
    ground.groundQuad(corners, Y.lot, PAL.concrete);
    const BUSH = ["#3f9b3a", "#2f8a3e", "#4caf50", "#3a7d32"];
    for (const side of [-1, 1]) {
      const n = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < n; k++) {
        const lx = side * (1.8 + k * 1.5 + rand() * 0.4);
        if (Math.abs(lx) > h.w / 2 - 0.4) continue;
        if (h.porch && Math.abs(lx) < h.w * 0.31 + 0.7) continue; // not through the porch
        const [x, z] = L(h, lx, h.d / 2 + 0.75);
        const r = 0.7 + rand() * 0.35;
        props.prim(PRIM.sphere(6), { x, y: r * 0.55, z, sx: r * 1.5, sy: r * 1.2, sz: r * 1.3 }, pick(BUSH));
        if (rand() < 0.55) {
          const fc = pick(["#ff5d8f", "#ffd43b", "#ffffff", "#cc5de8", "#ff922b"]);
          for (let f = 0; f < 4; f++) {
            props.prim(PRIM.box(), { x: x + (rand() - 0.5) * r, y: r * 1.05, z: z + (rand() - 0.5) * r * 0.6, sx: 0.2, sy: 0.2, sz: 0.2, ry: rand() * 3 }, fc);
          }
        }
      }
    }
    {
      const [x, z] = L(h, 1.6, h.d / 2 + yard - 0.4);
      props.prim(PRIM.box(), { x, y: 0.55, z, sx: 0.12, sy: 1.1, sz: 0.12, ry: h.rot }, "#6b4a2e");
      props.prim(PRIM.box(), { x, y: 1.18, z, sx: 0.32, sy: 0.32, sz: 0.62, ry: h.rot }, pick(["#2b2b2b", "#c0392b", "#2c5d8a", "#f2f2f2"]));
      const [fx, fz] = L(h, 1.78, h.d / 2 + yard - 0.4);
      props.prim(PRIM.box(), { x: fx, y: 1.4, z: fz, sx: 0.04, sy: 0.3, sz: 0.1, ry: h.rot }, "#e03131");
    }
    if (h.fence) {
      const fz = h.d / 2 + yard - 1.0;
      for (const side of [-1, 1]) {
        const a = 1.0, b = h.w / 2 + 0.1; // stop short of the driveway
        const [mx, mz] = L(h, side * (a + b) / 2, fz);
        for (const y of [0.35, 0.8]) props.prim(PRIM.box(), { x: mx, y, z: mz, sx: b - a, sy: 0.08, sz: 0.06, ry: h.rot }, "#ffffff");
        for (let lx = a; lx <= b; lx += 0.42) {
          const [x, z] = L(h, side * lx, fz);
          props.prim(PRIM.box(), { x, y: 0.55, z, sx: 0.12, sy: 1.1, sz: 0.05, ry: h.rot }, "#ffffff");
        }
      }
    }
    if (h.chimney) {
      const [cx, cz] = L(h, h.w * 0.3, -h.d * 0.15);
      props.prim(PRIM.box(), { x: cx, y: h.h + h.rh * 0.7, z: cz, sx: 0.9, sy: h.rh * 1.4 + 1, sz: 0.9, ry: h.rot }, "#a8503c");
    }
  }

  function addCar(x, z, rot, color) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    props.prim(PRIM.box(), { x, y: 0.62, z, sx: 1.8, sy: 0.62, sz: 4.2, ry: rot }, color);
    const [cx, cz] = P(0, -0.25);
    props.prim(PRIM.box(), { x: cx, y: 1.2, z: cz, sx: 1.6, sy: 0.55, sz: 2.1, ry: rot }, color);
    props.prim(PRIM.box(), { x: cx, y: 1.2, z: cz, sx: 1.64, sy: 0.4, sz: 1.9, ry: rot }, "#2a3d55");
    for (const [wx, wz] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]) {
      const [qx, qz] = P(wx, wz);
      props.prim(PRIM.cyl(8), { x: qx, y: 0.36, z: qz, sx: 0.72, sy: 0.3, sz: 0.72, ry: rot, rz: Math.PI / 2 }, "#1c1c1c");
    }
    collision.add({ type: "box", x, z, hw: 0.95, hd: 2.15, rot, h: 1.5 });
  }

  const freeSpot = (x, z, r) =>
    !collision.hits(x, z, r) && distToRoad(x, z) > r && distToRail(x, z) > r + 4 &&
    !pointInPolygon(x, z, LAKE) && !pointInPolygon(x, z, POND) && !pointInPolygon(x, z, GRANNYS_LAKE) &&
    Math.abs(x) < 815 && Math.abs(z) < 815;

  // Keep the view from the spawn point (fire station apron, looking down
  // McCarty toward downtown) clear of big canopies.
  const spawnView = (x, z) =>
    (x > -48 && x < 14 && z > -124 && z < -40) ||
    (x > -352 && x < -308 && z > -10 && z < 70) || // Eagle Stop lot and lane
    (x > 374 && x < 420 && z > 4 && z < 38) || // Dairy Quake lot
    (x > -27 && x < -7 && z > 70 && z < 86) || // the Treehouse deck
    (x > -415 && x < -375 && z > 64 && z < 92) || // Rawhide & Rhinestones lot
    (x > -16 && x < -2 && z > -24 && z < -8) || // the big oak (keep its ladder clear)
    (x > 276 && x < 300 && z > -194 && z < -168); // where Sidney starts, by Bradshall
  const tree = (x, z, s = 1, kind = "round") => {
    if (!spawnView(x, z) && freeSpot(x, z, 1.4 * s)) {
      forest.add(x, z, s, kind);
      collision.add({ type: "circle", x, z, r: 0.45 * s, h: 0 });
      return true;
    }
    return false;
  };

  // ---------- ground: base, fields, lawns ----------
  const baseMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000),
    new THREE.MeshLambertMaterial({ color: PAL.base })
  );
  baseMesh.rotation.x = -Math.PI / 2;
  baseMesh.position.y = -0.05;
  baseMesh.receiveShadow = true;
  scene.add(baseMesh);

  const T = 64;
  for (let fx = -832; fx < 832; fx += T) {
    for (let fz = -832; fz < 832; fz += T) {
      const cx = fx + T / 2, cz = fz + T / 2;
      if (cx > TOWN.minX - 20 && cx < TOWN.maxX + 20 && cz > TOWN.minZ - 20 && cz < TOWN.maxZ + 20) continue;
      if (inRect(cx, cz, AREAS.airport) || inRect(cx, cz, AREAS.gravel)) continue;
      const col = rand() < 0.14 ? PAL.paddy : pick(PAL.fields);
      const m = 1.6;
      ground.groundQuad([[fx + m, fz + T - m], [fx + T - m, fz + T - m], [fx + T - m, fz + m], [fx + m, fz + m]], Y.field, col);
    }
  }
  ground.groundQuad(
    [[TOWN.minX - 30, TOWN.maxZ + 70], [TOWN.maxX + 30, TOWN.maxZ + 70], [TOWN.maxX + 30, TOWN.minZ - 30], [TOWN.minX - 30, TOWN.minZ - 30]],
    Y.lawn - 0.02, PAL.lawn
  );

  // Golf course, parks, airport grounds, gravel pits
  const rectQuad = (r, y, col) => ground.groundQuad([[r.x0, r.z1], [r.x1, r.z1], [r.x1, r.z0], [r.x0, r.z0]], y, col);
  rectQuad(AREAS.golf, Y.lawn, "#85d063");
  rectQuad(AREAS.vetPark, Y.lawn, "#82ce60");
  rectQuad(AREAS.muniPark, Y.lawn, "#82ce60");
  rectQuad(AREAS.airport, Y.lawn, "#9bd67c");
  rectQuad(AREAS.gravel, Y.lawn, PAL.gravel);
  rectQuad(AREAS.dryers, Y.lot, PAL.concrete);

  // ---------- water ----------
  water.polygon(offsetPolygon(LAKE, 8), Y.shore, PAL.shore);
  water.polygon(LAKE, Y.water, PAL.water);
  water.polygon(offsetPolygon(LAKE, -16), Y.water + 0.01, PAL.deep);
  water.polygon(offsetPolygon(POND, 2.5), Y.shore, "#b9d98a");
  water.polygon(POND, Y.water, PAL.water);
  for (const pit of PITS) {
    water.polygon(offsetPolygon(pit, 4), Y.shore, "#e3d6ad");
    water.polygon(pit, Y.water, "#31c4c2");
  }
  collision.add({ type: "poly", pts: LAKE, h: 0 });
  collision.add({ type: "poly", pts: POND, h: 0 });
  water.polygon(offsetPolygon(GRANNYS_LAKE, 3), Y.shore, "#a9c97a");
  water.polygon(GRANNYS_LAKE, Y.water, PAL.water);
  water.polygon(offsetPolygon(GRANNYS_LAKE, -9), Y.water + 0.01, PAL.deep);
  collision.add({ type: "poly", pts: GRANNYS_LAKE, h: 0 });
  for (const pit of PITS) collision.add({ type: "poly", pts: pit, h: 0 });

  // ---------- roads, markings, sidewalks ----------
  for (const r of ROADS) {
    ground.ribbon(r.pts, r.w, Y.road, PAL.road[r.kind]);
    if (r.kind === "main" || r.kind === "highway") {
      ground.ribbon(offsetLine(r.pts, 0.22), 0.16, Y.mark, PAL.yellow);
      ground.ribbon(offsetLine(r.pts, -0.22), 0.16, Y.mark, PAL.yellow);
    }
    if (r.kind === "highway" || r.kind === "rural") {
      ground.ribbon(offsetLine(r.pts, r.w / 2 - 0.5), 0.16, Y.mark, PAL.white);
      ground.ribbon(offsetLine(r.pts, -(r.w / 2 - 0.5)), 0.16, Y.mark, PAL.white);
    }
  }
  // Raised sidewalks with curbs, broken at every cross street and track.
  const furnitureSpots = [];
  function sidewalk(a, b, off, ownRoad) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len;
    const nx = -uz, nz = ux;
    const cx0 = a[0] + nx * off, cz0 = a[1] + nz * off;
    const blocked = (t) => {
      const x = cx0 + ux * t, z = cz0 + uz * t;
      if (distToRail(x, z) < 4.5) return true;
      return ROADS.some((r) => r.name !== ownRoad && distToPolyline(x, z, r.pts) < r.w / 2 + 2.2);
    };
    const runs = [];
    let start = null;
    for (let t = 0; t <= len; t += 0.5) {
      const bl = blocked(t);
      if (!bl && start === null) start = t;
      if ((bl || t + 0.5 > len) && start !== null) {
        if (t - start > 2) runs.push([start, bl ? t - 0.5 : t]);
        start = null;
      }
    }
    const roadSide = off > 0 ? -1 : 1; // which edge of the walk faces the road
    for (const [t0, t1] of runs) {
      const p0 = [cx0 + ux * t0, cz0 + uz * t0], p1 = [cx0 + ux * t1, cz0 + uz * t1];
      ground.ribbon([p0, p1], 3.2, Y.curbwalk, PAL.walk);
      const rot = Math.atan2(ux, uz);
      const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2;
      for (const side of [roadSide, -roadSide]) {
        const o = side * 1.62;
        props.prim(PRIM.box(), { x: mx + nx * o, y: 0.14, z: mz + nz * o, sx: 0.26, sy: 0.3, sz: t1 - t0 + 3.2, ry: rot }, side === roadSide ? "#e4e0d4" : "#bdb7a6");
      }
      for (let t = t0 + 5; t < t1 - 3; t += 11 + rand() * 6) {
        furnitureSpots.push({ x: cx0 + ux * t + nx * roadSide * 0.85, z: cz0 + uz * t + nz * roadSide * 0.85, rot: rot + (roadSide > 0 ? Math.PI / 2 : -Math.PI / 2) });
      }
    }
  }
  for (const side of [-1, 1]) {
    sidewalk([-30, 0], [242, 0], side * 8.6, "Main St");
    sidewalk([0, -62], [0, 62], side * 7.6, "McCarty Ave");
    sidewalk([0, 60], [142, 60], side * 7.1, "Post Office St");
  }
  // Zebra crosswalks downtown
  for (const [ix, iz] of [[0, 0], [60, 0], [120, 0], [0, 60]]) {
    for (let k = -5; k <= 5; k += 1.4) {
      ground.groundQuad([[ix + k - 0.35, iz + 10.5], [ix + k + 0.35, iz + 10.5], [ix + k + 0.35, iz + 8], [ix + k - 0.35, iz + 8]], Y.mark, PAL.white);
      ground.groundQuad([[ix + k - 0.35, iz - 8], [ix + k + 0.35, iz - 8], [ix + k + 0.35, iz - 10.5], [ix + k - 0.35, iz - 10.5]], Y.mark, PAL.white);
    }
  }

  // ---------- rails ----------
  const railInfo = buildRails(scene, ground, props, collision);

  // ---------- downtown civic landmarks (real addresses) ----------
  // City Hall, 100 E Main (SE corner of Main & McCarty).
  const cityHall = addBuilding({ x: 25, z: 21.4, w: 34, d: 22, h: 9.5, rot: ROT.n, wall: "#f1e3c0", roof: "#8d8f94", front: "office", frontSeg: 8.5, frontSegH: 9.5, sides: "office" });
  addSign({ ...(() => { const [x, z] = L(cityHall, 0, cityHall.d / 2 + 0.06); return { x, z }; })(), y: 8.1, rot: cityHall.rot, w: 12, h: 1.6, title: "City Hall", sub: "EAGLE LAKE • EST. 1856", bg: "#2f4a3a", fg: "#f2e9d8" });
  props.prim(PRIM.cyl(8), { x: 10, y: 6, z: 10, sx: 0.18, sy: 12, sz: 0.18 }, "#e9ecef");
  props.prim(PRIM.box(), { x: 11.2, y: 11, z: 10, sx: 2.2, sy: 1.3, sz: 0.05 }, "#b22234");
  minimap.landmarks.push({ x: 25, z: 21, label: "City Hall" });

  // 1911 Santa Fe depot, 322 E Main, beside the old Santa Fe grade.
  const depot = addBuilding({ x: 149, z: -17.4, w: 32, d: 13, h: 5, rot: ROT.s, wall: "#b8503a", roof: "#5b3b2e", front: "office", frontSeg: 6, frontSegH: 5, roofType: "hip", rh: 2.6, overhang: 1.8 });
  addSign({ ...(() => { const [x, z] = L(depot, 0, depot.d / 2 + 0.06); return { x, z }; })(), y: 4.2, rot: depot.rot, w: 10, h: 1.4, title: "Prairie Depot Museum", sub: "EST. 1911 • RAILROAD HERITAGE", bg: "#f2e9d8", fg: "#3d2a1c" });
  ground.groundQuad([[164, 0], [170, 0], [170, -36], [164, -36]], Y.walk, PAL.concrete);
  minimap.landmarks.push({ x: 149, z: -17, label: "Depot Museum" });
  // A retired caboose on the depot's rusty stretch of track.
  props.prim(PRIM.box(), { x: 172, y: 1.6, z: -20, sx: 2.6, sy: 2.2, sz: 8 }, "#c0392b");
  props.prim(PRIM.box(), { x: 172, y: 3.1, z: -20, sx: 2.0, sy: 1.0, sz: 2.4 }, "#c0392b");
  props.prim(PRIM.box(), { x: 172, y: 2.75, z: -20, sx: 2.8, sy: 0.12, sz: 8.4 }, "#2b2b2b");
  collision.add({ type: "box", x: 172, z: -20, hw: 1.4, hd: 4.1, rot: 0, h: 3.6 });

  // Edge of the Prairie Museum — a converted old auto dealership.
  addStore({ x: 213, z: 22.4, w: 44, d: 24, h: 8.5, rot: ROT.n, wall: "#9fdcbc", trim: "#ffffff", name: "Edge of the Prairie Museum", sub: "LOCAL HISTORY • RICE • RAILS", signBg: "#ffffff", signFg: "#16705a", awningColor: "#16a085" });

  // Public library, 101 N Walnut.
  const library = addBuilding({ x: -73, z: -21, w: 20, d: 16, h: 6.5, rot: ROT.e, wall: "#e9cf8f", roof: "#8d8f94", front: "office", frontSeg: 7, frontSegH: 6.5 });
  addSign({ ...(() => { const [x, z] = L(library, 0, library.d / 2 + 0.06); return { x, z }; })(), y: 5.6, rot: library.rot, w: 9, h: 1.3, title: "Public Library", sub: "101 N WALNUT", bg: "#2c5d8a", fg: "#ffffff" });

  // Police, 200 E Post Office St.
  const police = addBuilding({ x: 82, z: 43.1, w: 22, d: 16, h: 6.5, rot: ROT.s, wall: "#8fc9f2", roof: "#8d8f94", front: "office", frontSeg: 7, frontSegH: 6.5 });
  addSign({ ...(() => { const [x, z] = L(police, 0, police.d / 2 + 0.06); return { x, z }; })(), y: 5.5, rot: police.rot, w: 8, h: 1.3, title: "Police", sub: "EAGLE LAKE P.D.", bg: "#1f3b70", fg: "#ffffff" });

  // Volunteer fire station on N McCarty — Sidney's home base.
  const fire = addBuilding({ x: -27, z: -96, w: 30, d: 22, h: 7.5, rot: ROT.e, wall: "#c0392b", roof: "#4a4a4a", front: "plain", frontSeg: 30, frontSegH: 7.5 });
  for (const lx of [-9.5, 0, 9.5]) {
    const [dx, dz] = L(fire, lx, fire.d / 2 + 0.06);
    props.prim(PRIM.box(), { x: dx, y: 2.6, z: dz, sx: 6.6, sy: 5.2, sz: 0.12, ry: fire.rot }, "#ffffff");
    props.prim(PRIM.box(), { x: dx + Math.sin(fire.rot) * 0.05, y: 2.5, z: dz + Math.cos(fire.rot) * 0.05, sx: 6, sy: 4.9, sz: 0.12, ry: fire.rot }, "#d8dde2");
    for (let k = 0; k < 4; k++) {
      props.prim(PRIM.box(), { x: dx + Math.sin(fire.rot) * 0.1, y: 0.8 + k * 1.2, z: dz + Math.cos(fire.rot) * 0.1, sx: 6, sy: 0.08, sz: 0.1, ry: fire.rot }, "#9aa3ab");
    }
  }
  addSign({ ...(() => { const [x, z] = L(fire, 0, fire.d / 2 + 0.07); return { x, z }; })(), y: 6.4, rot: fire.rot, w: 14, h: 1.5, title: "Eagle Lake Vol. Fire Dept.", sub: "STATION 1 • EST. 1912", bg: "#ffffff", fg: "#b5342c" });
  ground.groundQuad([[-16, -111], [-6, -111], [-6, -81], [-16, -81]].map(([x, z]) => [x, z]).reverse(), Y.lot, PAL.concrete);
  minimap.landmarks.push({ x: -27, z: -96, label: "Fire Station" });
  // Alarm lights on the station's roof edge (blink when the fire alarm sounds).
  const fireLights = [new THREE.MeshBasicMaterial({ color: 0x3a0606 }), new THREE.MeshBasicMaterial({ color: 0x3a0606 })];
  [-11, 11].forEach((lx, i) => {
    const [x, z] = L(fire, lx, fire.d / 2 - 0.5);
    props.prim(PRIM.box(), { x, y: 7.75, z, sx: 1.6, sy: 0.5, sz: 1.2, ry: fire.rot }, "#3a3f45");
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.0), fireLights[i]);
    lamp.position.set(x, 8.4, z);
    lamp.rotation.y = fire.rot;
    scene.add(lamp);
  });

  // ---------- downtown storefront rows ----------
  const DOWNTOWN_NAMES = {
    mainN: [
      { name: "First Prairie Bank", sub: "SINCE 1948", signBg: "#1f6b3a", signFg: "#ffffff" },
      { name: "Main St. Mercantile", sub: "DRY GOODS • GIFTS" },
      { name: "Lone Star Diner", sub: "CHICKEN FRIED STEAK DAILY", signBg: "#7f2f2f", signFg: "#ffffff" },
      { name: "Goose Feather Antiques", sub: "OLD STUFF, FAIR PRICES" },
      { name: "Rice Belt Pharmacy", sub: "SODA FOUNTAIN", signBg: "#2c5d8a", signFg: "#ffffff" },
      { name: "Starch & Steam Cleaners", sub: "SAME DAY" },
    ],
    mainS: [
      { name: "Dial-Up & Done", sub: "INTERNET SERVICES", signBg: "#c0392b", signFg: "#ffffff" },
      { name: "Eagle Eye Optometry", sub: "WE SEE YOU", signBg: "#ffffff", signFg: "#2c5d8a" },
      { name: "Pecan Pie Bakery", sub: "KOLACHES TOO", signBg: "#f4e7c8", signFg: "#7a3b2e" },
      { name: "Colorado Co. Title", sub: "ABSTRACTS • CLOSINGS" },
    ],
    postN: [{ name: "Prairie Pawn & Guitar", sub: "STRINGS • AMPS • TOOLS", signBg: "#5a3a7a", signFg: "#ffd34d" }],
    postS: [{ name: "Goose Hunters Supply", sub: "DECOYS • CALLS • SHELLS", signBg: "#2f4a3a", signFg: "#f2e9d8" }],
    mcW: [{ name: "Buzz's Barber Shop", sub: "WALK-INS WELCOME", signBg: "#ffffff", signFg: "#c0392b" }],
    mcE: [{ name: "Hen House Cafe", sub: "BREAKFAST ALL DAY" }],
  };

  function row({ along, from, to, line, facing, depth, names = [] }) {
    let cursor = from;
    let ni = 0;
    while (cursor < to - 7) {
      const w = Math.min(to - cursor, 10 + rand() * 5);
      const mid = cursor + w / 2;
      cursor += w + 0.15;
      let x, z;
      if (along === "x") {
        x = mid;
        z = facing === "s" ? line - depth / 2 : line + depth / 2;
      } else {
        z = mid;
        x = facing === "e" ? line - depth / 2 : line + depth / 2;
      }
      const b = { x, z, w, d: depth, h: 7.8 + rand() * 3.2, rot: ROT[facing], wall: pick(STORE_WALLS) };
      const r = Math.hypot(w, depth) / 2;
      // Keep the railroad right-of-way and existing buildings clear.
      const corners = [[-w / 2, -depth / 2], [w / 2, -depth / 2], [w / 2, depth / 2], [-w / 2, depth / 2], [0, 0]].map(([lx, lz]) => L(b, lx, lz));
      if (corners.some(([cx, cz]) => distToRail(cx, cz) < 9 || distToRail(cx, cz, "santafe") < 6)) continue;
      if (collision.hits(x, z, r * 0.6)) continue;
      const named = names[ni];
      if (named) ni++;
      addStore({ ...b, ...(named || {}) });
    }
  }
  row({ along: "x", from: 8, to: 129, line: -10.4, facing: "s", depth: 22, names: DOWNTOWN_NAMES.mainN });
  row({ along: "x", from: 177, to: 241, line: -10.4, facing: "s", depth: 22, names: DOWNTOWN_NAMES.mainN.slice(5) });
  row({ along: "x", from: 43, to: 166, line: 10.4, facing: "n", depth: 22, names: DOWNTOWN_NAMES.mainS });
  row({ along: "x", from: -27, to: -8, line: -10.4, facing: "s", depth: 22 });
  row({ along: "x", from: -27, to: -8, line: 10.4, facing: "n", depth: 22 });
  row({ along: "z", from: -55, to: -34, line: -9.4, facing: "e", depth: 20, names: DOWNTOWN_NAMES.mcW });
  // The Ferris Hotel: three stories of brick on N McCarty, with a porch
  // canopy over the entrance where the band sets up.
  const ferris = addBuilding({ x: 19.4, z: -44.5, w: 21, d: 20, h: 13, rot: ROT.w, wall: "#a8452f", roof: "#6d6f74", front: "office", frontSeg: 7, frontSegH: 4.3, sides: "office" });
  {
    const [sx, sz] = L(ferris, 0, ferris.d / 2 + 0.07);
    addSign({ x: sx, y: 11.2, z: sz, rot: ferris.rot, w: 13, h: 1.7, title: "The Ferris Hotel", sub: "EST. 1912 \u2022 LIVE MUSIC FRIDAYS", bg: "#1c2a44", fg: "#ffd34d" });
    const [cx, cz] = L(ferris, 0, ferris.d / 2 + 1.6);
    props.prim(PRIM.box(), { x: cx, y: 3.6, z: cz, sx: 12, sy: 0.2, sz: 3.2, ry: ferris.rot }, "#1c2a44");
    for (const lx of [-5.6, 5.6]) {
      const [px, pz] = L(ferris, lx, ferris.d / 2 + 3.0);
      props.prim(PRIM.cyl(8), { x: px, y: 1.8, z: pz, sx: 0.18, sy: 3.6, sz: 0.18 }, "#e9ecef");
    }
    // Bulb string along the canopy edge.
    for (let k = -5; k <= 5; k++) {
      const [bx, bz] = L(ferris, k * 1.1, ferris.d / 2 + 3.15);
      props.prim(PRIM.sphere(5), { x: bx, y: 3.35 - Math.abs(Math.sin(k * 0.9)) * 0.15, z: bz, sx: 0.2, sy: 0.2, sz: 0.2 }, "#fff2a8");
    }
    // Chalkboard out front.
    const [bx, bz] = L(ferris, -3, ferris.d / 2 + 4.6);
    addSign({ x: bx, y: 0.9, z: bz, rot: ferris.rot, w: 1.2, h: 1.2, title: "TONIGHT", sub: "THE THICKER BRADSHALL", bg: "#2b2b2b", fg: "#ffffff", twoSided: true });
    minimap.landmarks.push({ x: ferris.x, z: ferris.z, label: "Ferris Hotel" });
  }
  const [ferrisFrontX, ferrisFrontZ] = L(ferris, 0, ferris.d / 2 + 3.5);
  row({ along: "x", from: 24, to: 142, line: 51.1, facing: "s", depth: 16, names: DOWNTOWN_NAMES.postN });
  row({ along: "x", from: 24, to: 142, line: 68.9, facing: "n", depth: 16, names: DOWNTOWN_NAMES.postS });

  // Streetlights and diagonal parking along Main St
  for (let x = -20; x <= 240; x += 26) {
    for (const side of [-1, 1]) {
      if (distToRail(x, side * 9.6) < 5) continue;
      const z = side * 9.8;
      // Old-fashioned acorn lamp: fluted base, pole, crossarm, two globes.
      props.prim(PRIM.cyl(8), { x, y: 0.6, z, sx: 0.5, sy: 1.0, sz: 0.5 }, "#24302a");
      props.prim(PRIM.cyl(6), { x, y: 3, z, sx: 0.16, sy: 6, sz: 0.16 }, "#2f3a33");
      props.prim(PRIM.box(), { x, y: 5.5, z, sx: 1.8, sy: 0.12, sz: 0.12 }, "#2f3a33");
      for (const o of [-0.85, 0.85]) {
        props.prim(PRIM.cone(8), { x: x + o, y: 5.25, z, sx: 0.34, sy: 0.4, sz: 0.34, rx: Math.PI }, "#2f3a33");
        props.prim(PRIM.sphere(8), { x: x + o, y: 5.75, z, sx: 0.55, sy: 0.7, sz: 0.55 }, "#fff3c4");
        props.prim(PRIM.cone(8), { x: x + o, y: 6.2, z, sx: 0.4, sy: 0.3, sz: 0.4 }, "#2f3a33");
      }
      props.prim(PRIM.cone(8), { x, y: 6.3, z, sx: 0.22, sy: 0.6, sz: 0.22 }, "#2f3a33");
      collision.add({ type: "circle", x, z, r: 0.35, h: 6 });
    }
  }
  // Street furniture on the downtown sidewalks: benches, trash cans,
  // flower planters, newspaper boxes and the odd hydrant.
  const FLOWERS = ["#ff5d8f", "#ffd43b", "#ff922b", "#cc5de8", "#ffffff", "#f03e3e"];
  furnitureSpots.forEach((f, i) => {
    if (collision.hits(f.x, f.z, 1.1)) return;
    const c = Math.cos(f.rot), sn = Math.sin(f.rot);
    const P = (lx, lz) => [f.x + lx * c + lz * sn, f.z - lx * sn + lz * c];
    const kind = i % 5;
    if (kind === 0 || kind === 3) {
      // Bench (slats on cast-iron ends)
      for (const lx of [-0.8, 0.8]) {
        const [x, z] = P(lx, 0);
        props.prim(PRIM.box(), { x, y: 0.5, z, sx: 0.1, sy: 0.75, sz: 0.6, ry: f.rot }, "#2b2f33");
      }
      for (let k = 0; k < 3; k++) {
        const [x, z] = P(0, -0.15 + k * 0.17);
        props.prim(PRIM.box(), { x, y: 0.62, z, sx: 1.9, sy: 0.07, sz: 0.13, ry: f.rot }, "#8a5a33");
      }
      for (let k = 0; k < 2; k++) {
        const [x, z] = P(0, -0.3);
        props.prim(PRIM.box(), { x, y: 0.85 + k * 0.2, z, sx: 1.9, sy: 0.1, sz: 0.06, ry: f.rot }, "#8a5a33");
      }
      collision.add({ type: "box", x: f.x, z: f.z, hw: 1, hd: 0.4, rot: f.rot, h: 1.1 });
    } else if (kind === 1) {
      // Planter box with flowers
      props.prim(PRIM.box(), { x: f.x, y: 0.42, z: f.z, sx: 1.3, sy: 0.6, sz: 1.3, ry: f.rot }, "#a0522d");
      props.prim(PRIM.box(), { x: f.x, y: 0.74, z: f.z, sx: 1.1, sy: 0.06, sz: 1.1, ry: f.rot }, "#4a3324");
      props.prim(PRIM.sphere(7), { x: f.x, y: 0.95, z: f.z, sx: 1.0, sy: 0.55, sz: 1.0 }, "#3f9b3a");
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + rand();
        props.prim(PRIM.box(), { x: f.x + Math.cos(a) * 0.35, y: 1.15 + rand() * 0.1, z: f.z + Math.sin(a) * 0.35, sx: 0.22, sy: 0.22, sz: 0.22, ry: a }, pick(FLOWERS));
      }
      collision.add({ type: "circle", x: f.x, z: f.z, r: 0.75, h: 1 });
    } else if (kind === 2) {
      // Trash can
      props.prim(PRIM.cyl(10), { x: f.x, y: 0.55, z: f.z, sx: 0.6, sy: 0.95, sz: 0.6 }, "#2e5e3a");
      props.prim(PRIM.cyl(10), { x: f.x, y: 1.06, z: f.z, sx: 0.66, sy: 0.08, sz: 0.66 }, "#24302a");
      collision.add({ type: "circle", x: f.x, z: f.z, r: 0.38, h: 1.1 });
    } else {
      // Newspaper boxes, or a hydrant
      if (rand() < 0.5) {
        for (const [lx, col] of [[-0.35, "#c92a2a"], [0.35, "#1971c2"]]) {
          const [x, z] = P(lx, 0);
          props.prim(PRIM.box(), { x, y: 0.62, z, sx: 0.6, sy: 0.85, sz: 0.5, ry: f.rot }, col);
          props.prim(PRIM.box(), { x, y: 0.72, z: z, sx: 0.44, sy: 0.3, sz: 0.52, ry: f.rot }, "#dbe4ea");
        }
        collision.add({ type: "box", x: f.x, z: f.z, hw: 0.7, hd: 0.3, rot: f.rot, h: 1.1 });
      } else {
        props.prim(PRIM.cyl(8), { x: f.x, y: 0.55, z: f.z, sx: 0.36, sy: 0.75, sz: 0.36 }, "#e03131");
        props.prim(PRIM.hemi(8), { x: f.x, y: 0.92, z: f.z, sx: 0.4, sy: 0.3, sz: 0.4 }, "#e03131");
        props.prim(PRIM.cyl(6), { x: f.x, y: 0.62, z: f.z, sx: 0.62, sy: 0.14, sz: 0.14, rz: Math.PI / 2 }, "#c92a2a");
        collision.add({ type: "circle", x: f.x, z: f.z, r: 0.3, h: 1 });
      }
    }
  });
  for (let x = 10; x < 238; x += 6.2) {
    for (const side of [-1, 1]) {
      if (rand() > 0.45 || distToRail(x, side * 5.8) < 6 || Math.abs(x - 60) < 7 || Math.abs(x - 120) < 7 || Math.abs(x - 172) < 6) continue;
      addCar(x, side * 5.8, side < 0 ? Math.PI * 0.75 : Math.PI * 0.25, pick(CAR_COLORS)); // nosed in at the curb, clear of the lanes
    }
  }

  // ---------- town features ----------
  // School and ballfield
  const school = addBuilding({ x: 104, z: -104.5, w: 64, d: 20, h: 6, rot: ROT.n, wall: "#e9cf8f", roof: "#8d8f94", front: "office", frontSeg: 8, frontSegH: 6, sides: "office" });
  addSign({ ...(() => { const [x, z] = L(school, 0, school.d / 2 + 0.06); return { x, z }; })(), y: 5, rot: school.rot, w: 16, h: 1.4, title: "Prairie Consolidated School", sub: "HOME OF THE GOSLINGS", bg: "#16705a", fg: "#ffd34d" });
  ground.polygon([[104, -70], [118, -84], [104, -98], [90, -84]], Y.lot, "#d9a066");
  props.prim(PRIM.box(), { x: 104, y: 2, z: -68, sx: 12, sy: 4, sz: 0.1 }, "#5a6170");
  minimap.landmarks.push({ x: 104, z: -104, label: "School" });

  // Water tower
  const wt = { x: 100, z: -150 };
  for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
    props.prim(PRIM.cyl(8), { x: wt.x + lx, y: 9, z: wt.z + lz, sx: 0.45, sy: 18, sz: 0.45 }, "#c8ccd0");
  }
  props.prim(PRIM.cyl(8), { x: wt.x, y: 9, z: wt.z, sx: 0.8, sy: 18, sz: 0.8 }, "#c8ccd0");
  props.prim(PRIM.cyl(20), { x: wt.x, y: 21.5, z: wt.z, sx: 11, sy: 6, sz: 11 }, "#e9eef2");
  props.prim(PRIM.hemi(20), { x: wt.x, y: 24.5, z: wt.z, sx: 11, sy: 4.5, sz: 11 }, "#d6dde3");
  props.prim(PRIM.cone(20), { x: wt.x, y: 17.4, z: wt.z, sx: 11, sy: 2.2, sz: 11, rx: Math.PI }, "#c8ccd0");
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(5.56, 5.56, 2.4, 24, 1, true),
    new THREE.MeshBasicMaterial({ map: makeBannerTexture("EAGLE LAKE", "#1f6b3a", "#ffffff"), transparent: true })
  );
  band.position.set(wt.x, 22, wt.z);
  scene.add(band);
  minimap.landmarks.push({ x: wt.x, z: wt.z, label: "Water Tower" });

  // Churches with steeples
  for (const ch of [
    { x: -150, z: 74, w: 12, d: 16, name: "Blue Heron Chapel", wall: "#f7f3e8", roof: "#2f6fca" },
    { x: 150, z: 133, w: 14, d: 18, name: "Lakeside Community Church", wall: "#f4e7c8", roof: "#c9372c" },
  ]) {
    const b = addBuilding({ ...ch, h: 7, rot: ROT.n, front: "plain", roofType: "gable", rh: 4.5, overhang: 0.4 });
    const [tx, tz] = L(b, 0, b.d / 2 - 1.8);
    props.prim(PRIM.box(), { x: tx, y: 9.5, z: tz, sx: 3.2, sy: 7, sz: 3.2, ry: b.rot }, ch.wall);
    props.prim(PRIM.cone(4), { x: tx, y: 16, z: tz, sx: 3.6, sy: 6, sz: 3.6, ry: b.rot + Math.PI / 4 }, ch.roof);
    props.prim(PRIM.box(), { x: tx, y: 19.5, z: tz, sx: 0.15, sy: 1.6, sz: 0.15 }, "#ffd34d");
    props.prim(PRIM.box(), { x: tx, y: 19.7, z: tz, sx: 0.9, sy: 0.15, sz: 0.15, ry: b.rot }, "#ffd34d");
    const [sx, sz] = L(b, 0, b.d / 2 + 0.6);
    addSign({ x: sx, y: 1.2, z: sz, rot: b.rot, w: 5, h: 1.1, title: ch.name, sub: "ALL ARE WELCOME", bg: "#ffffff", fg: "#2f4a3a" });
  }

  // Prairie Medical Center, S Austin Rd
  const med = addBuilding({ x: -292, z: 137.5, w: 40, d: 24, h: 8, rot: ROT.n, wall: "#f3f1e7", roof: "#8d8f94", front: "office", frontSeg: 8, frontSegH: 8, sides: "office" });
  addSign({ ...(() => { const [x, z] = L(med, 0, med.d / 2 + 0.06); return { x, z }; })(), y: 7, rot: med.rot, w: 14, h: 1.5, title: "Prairie Medical Center", sub: "EMERGENCY • CLINIC", bg: "#16a085", fg: "#ffffff" });
  rectQuad({ x0: -312, z0: 125.5, x1: -272, z1: 126 }, Y.lot, PAL.lot);

  // Golf course: fairways, greens, bunkers, flags, clubhouse
  for (const [x, z, rx, rz] of [[-210, 222, 18, 9], [-170, 238, 22, 8], [-120, 220, 20, 10], [-90, 240, 14, 7]]) {
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      pts.push([x + Math.cos(a) * rx, z + Math.sin(a) * rz]);
    }
    ground.polygon(pts, Y.lawn + 0.01, "#a6ec84");
    ground.polygon(pts.map(([px, pz]) => [x + (px - x) * 0.35 + rx * 0.4, z + (pz - z) * 0.5]), Y.lawn + 0.02, "#c3f59a");
    ground.polygon(pts.map(([px, pz]) => [x + (px - x) * 0.25 - rx * 0.5, z + (pz - z) * 0.3 + rz * 0.5]), Y.lawn + 0.02, "#f2e1a4");
    props.prim(PRIM.cyl(6), { x: x + rx * 0.4, y: 1.4, z, sx: 0.08, sy: 2.8, sz: 0.08 }, "#ffffff");
    props.prim(PRIM.box(), { x: x + rx * 0.4 + 0.45, y: 2.5, z, sx: 0.9, sy: 0.6, sz: 0.04 }, "#e74c3c");
  }
  const club = addBuilding({ x: -150, z: 214, w: 16, d: 10, h: 4.5, rot: ROT.n, wall: "#f4e7c8", roof: "#2a9d8f", front: "house", roofType: "hip", rh: 2 });
  addSign({ ...(() => { const [x, z] = L(club, 0, club.d / 2 + 0.6); return { x, z }; })(), y: 1.4, rot: club.rot, w: 6, h: 1.2, title: "Lakeside Golf & Rec", sub: "PUBLIC WELCOME", bg: "#1f6b3a", fg: "#ffffff" });
  minimap.landmarks.push({ x: -150, z: 214, label: "Golf Course" });

  // Municipal park: pavilion, playground, fishing pier
  for (const [lx, lz] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) props.prim(PRIM.box(), { x: 24 + lx, y: 1.6, z: 214 + lz, sx: 0.3, sy: 3.2, sz: 0.3 }, "#ffffff");
  props.roof({ x: 24, z: 214, y0: 3.2, w: 14, d: 10, rh: 2, color: "#2e86de", type: "hip" });
  props.prim(PRIM.box(), { x: 0, y: 0.7, z: 284, sx: 3, sy: 0.25, sz: 50 }, "#a87b4f");
  for (let pz = 262; pz < 308; pz += 5) {
    for (const px of [-1.4, 1.4]) props.prim(PRIM.box(), { x: px, y: 0.3, z: pz, sx: 0.25, sy: 1, sz: 0.25 }, "#7a5a3a");
  }
  props.prim(PRIM.box(), { x: 40, y: 1.5, z: 236, sx: 0.4, sy: 3, sz: 0.4 }, "#e74c3c");
  props.prim(PRIM.box(), { x: 43, y: 1.6, z: 236, sx: 6, sy: 0.25, sz: 1.2, rz: 0.45 }, "#f1c40f");
  props.prim(PRIM.box(), { x: 34, y: 2, z: 240, sx: 5, sy: 0.25, sz: 0.25 }, "#3498db");
  for (const sx of [-2, 2]) props.prim(PRIM.box(), { x: 34 + sx, y: 1, z: 240, sx: 0.2, sy: 2, sz: 0.2 }, "#3498db");
  minimap.landmarks.push({ x: 24, z: 214, label: "Municipal Park" });

  // Veterans Memorial Park: boardwalk over the pond, gazebo, flag
  const walk = [[262, -214], [284, -196], [304, -206], [322, -214], [340, -212]];
  for (let i = 0; i < walk.length - 1; i++) {
    const [ax, az] = walk[i], [bx, bz] = walk[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    props.prim(PRIM.box(), { x: (ax + bx) / 2, y: 0.55, z: (az + bz) / 2, sx: 2.6, sy: 0.18, sz: len + 0.4, ry: Math.atan2(bx - ax, bz - az) }, "#b0855a");
  }
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    props.prim(PRIM.box(), { x: 270 + Math.cos(ang) * 4, y: 1.7, z: -248 + Math.sin(ang) * 4, sx: 0.25, sy: 3.4, sz: 0.25 }, "#ffffff");
  }
  props.prim(PRIM.cone(8), { x: 270, y: 4.4, z: -248, sx: 10, sy: 2.4, sz: 10 }, "#2f6fca");
  props.prim(PRIM.cyl(8), { x: 270, y: 0.25, z: -248, sx: 9, sy: 0.5, sz: 9 }, "#d9d0bd");
  props.prim(PRIM.cyl(6), { x: 292, y: 6, z: -252, sx: 0.15, sy: 12, sz: 0.15 }, "#e9ecef");
  props.prim(PRIM.box(), { x: 293.3, y: 11, z: -252, sx: 2.6, sy: 1.5, sz: 0.04 }, "#b22234");
  props.prim(PRIM.box(), { x: 310, y: 1.1, z: -256, sx: 10, sy: 2.2, sz: 0.8 }, "#3d4148");
  ground.groundQuad([[250, -204], [270, -204], [270, -224], [250, -224]], Y.lot, PAL.lot);
  collision.add({ type: "circle", x: 270, z: -248, r: 4.4, h: 4 });
  minimap.landmarks.push({ x: 300, z: -214, label: "Veterans Memorial Park" });

  // The Thicker Bradshall's busking spot by the pond
  {
    const bx = BRADSHALL.x + 2.2, bz = BRADSHALL.z + 1.2;
    props.prim(PRIM.cyl(6), { x: bx, y: 0.6, z: bz, sx: 0.12, sy: 1.2, sz: 0.12 }, "#5a3f2a");
    addSign({ x: bx, y: 1.45, z: bz + 0.08, rot: 0, w: 2.2, h: 0.7, title: "The Thicker Bradshall", sub: "LIVE AT THE POND • TIPS", bg: "#2f3a2f", fg: "#f2e9d8", twoSided: true });
    props.prim(PRIM.box(), { x: BRADSHALL.x - 1.6, y: 0.12, z: BRADSHALL.z + 1.4, sx: 1.2, sy: 0.24, sz: 0.5, ry: 0.4 }, "#1a1a1a");
    minimap.landmarks.push({ x: BRADSHALL.x, z: BRADSHALL.z, label: "The Thicker Bradshall" });
  }

  // Rice dryers and elevators along the SA&AP line west of FM 102
  const dryer = { x: -150, z: -306 };
  walls.box({ x: dryer.x, z: dryer.z, w: 8, h: 42, d: 8, color: "#d4d9dd", faces: { pz: { rect: ATLAS.plain, segW: 8, segH: 8 }, nz: { rect: ATLAS.plain, segW: 8, segH: 8 }, px: { rect: ATLAS.plain, segW: 8, segH: 8 }, nx: { rect: ATLAS.plain, segW: 8, segH: 8 } }, topColor: "#a7aeb4" });
  walls.box({ x: dryer.x, z: dryer.z, y0: 42, w: 10, h: 5, d: 6, color: "#c0392b", topColor: "#8e2a20" });
  collision.add({ type: "box", x: dryer.x, z: dryer.z, hw: 4, hd: 4, rot: 0, h: 47 });
  addSign({ x: dryer.x, y: 36, z: dryer.z + 4.05, rot: 0, w: 7.5, h: 2.2, title: "Rice Belt Dryer Co.", sub: "SINCE 1947", bg: "#c0392b", fg: "#ffffff" });
  for (const [sx, sz] of [[-200, -314], [-188, -314], [-176, -314], [-200, -298], [-188, -298], [-176, -298]]) {
    props.prim(PRIM.cyl(16), { x: sx, y: 11, z: sz, sx: 11, sy: 22, sz: 11 }, "#e4e8eb");
    props.prim(PRIM.cone(16), { x: sx, y: 23.4, z: sz, sx: 11.6, sy: 2.8, sz: 11.6 }, "#c3c9ce");
    for (let k = 3; k < 22; k += 3) props.prim(PRIM.cyl(16), { x: sx, y: k, z: sz, sx: 11.15, sy: 0.12, sz: 11.15 }, "#b8bfc5");
    collision.add({ type: "circle", x: sx, z: sz, r: 5.6, h: 25 });
    // Conveyor from the headhouse to each silo top
    const dx = sx - dryer.x, dz = sz - dryer.z, dy = 24 - 40;
    const horiz = Math.hypot(dx, dz);
    props.prim(PRIM.box(), { x: (sx + dryer.x) / 2, y: 32, z: (sz + dryer.z) / 2, sx: 0.8, sy: 0.8, sz: Math.hypot(horiz, dy), ry: Math.atan2(dx, dz), rx: -Math.atan2(dy, horiz) }, "#9aa3ab");
  }
  addBuilding({ x: -126, z: -300, w: 14, d: 10, h: 15, rot: ROT.s, wall: "#c9cdd1", roof: "#8a9198", front: "plain" });
  minimap.landmarks.push({ x: -170, z: -306, label: "Rice Dryers" });

  // A smaller elevator out on US 90A east
  for (const [sx, sz] of [[700, -44], [712, -44], [724, -44]]) {
    props.prim(PRIM.cyl(14), { x: sx, y: 9, z: sz, sx: 10, sy: 18, sz: 10 }, "#e4e8eb");
    props.prim(PRIM.cone(14), { x: sx, y: 19.2, z: sz, sx: 10.6, sy: 2.4, sz: 10.6 }, "#c3c9ce");
    collision.add({ type: "circle", x: sx, z: sz, r: 5.1, h: 21 });
  }
  walls.box({ x: 690, z: -44, w: 6, h: 30, d: 6, color: "#d4d9dd", topColor: "#a7aeb4" });
  collision.add({ type: "box", x: 690, z: -44, hw: 3, hd: 3, h: 30 });

  // ---------- the Eagle Stop drive-thru ----------
  buildDriveThru();

  // ---------- highway businesses ----------
  // US 90A East
  addStore({ x: 300, z: 20, w: 14, d: 10, h: 7.8, rot: ROT.n, wall: "#f3f1e7", trim: "#e74c3c", name: "Sputnik Drive-In", sub: "BURGERS • SHAKES • TOTS", signBg: "#e74c3c", signFg: "#ffffff", awningColor: "#e74c3c" });
  for (let k = 0; k < 6; k++) {
    props.prim(PRIM.cyl(6), { x: 312 + k * 5, y: 1.6, z: 26, sx: 0.18, sy: 3.2, sz: 0.18 }, "#16a085");
    props.prim(PRIM.box(), { x: 312 + k * 5, y: 1.4, z: 26.6, sx: 0.8, sy: 1.1, sz: 0.2 }, "#e74c3c");
  }
  props.prim(PRIM.box(), { x: 324.5, y: 3.4, z: 28, sx: 30, sy: 0.3, sz: 6 }, "#16a085");
  rectQuad({ x0: 286, z0: 8, x1: 342, z1: 34 }, Y.lot, PAL.lot);
  poleSign({ x: 290, z: 9, rot: 0, title: "Sputnik", sub: "DRIVE-IN • OPEN LATE", bg: "#16a085", fg: "#ffffff" });

  // Dairy Quake: the burger-and-dip-cone stand east of town (lunch special).
  const dq = { x: 396, z: 22, w: 16, d: 11 };
  rectQuad({ x0: 378, z0: 7, x1: 416, z1: 34 }, Y.lot, PAL.lot);
  addStore({ ...dq, h: 6.2, rot: ROT.n, wall: "#fbfbf8", trim: "#d62839", name: "Dairy Quake", sub: "BASKETS • DIP CONES • SHAKES", signBg: "#d62839", signFg: "#ffffff", awningColor: "#d62839", parapet: "flat" });
  // Red roof band and a blue stripe along the base.
  props.prim(PRIM.box(), { x: dq.x, y: 0.7, z: dq.z - dq.d / 2 - 0.05, sx: dq.w, sy: 0.35, sz: 0.12 }, "#1f5fbf");
  poleSign({ x: 381, z: 9, rot: 0, title: "Dairy Quake", sub: "LUNCH SPECIAL: CHEESE FRIES BASKET", bg: "#d62839", fg: "#ffffff", w: 7 });
  // Picnic tables with red umbrellas out front.
  for (const [tx, tz] of [[409, 12], [409, 18]]) {
    props.prim(PRIM.box(), { x: tx, y: 0.75, z: tz, sx: 1.9, sy: 0.1, sz: 0.9 }, "#d62839");
    for (const o of [-0.75, 0.75]) props.prim(PRIM.box(), { x: tx, y: 0.45, z: tz + o, sx: 1.9, sy: 0.08, sz: 0.3 }, "#d62839");
    props.prim(PRIM.cyl(6), { x: tx, y: 1.4, z: tz, sx: 0.08, sy: 2.4, sz: 0.08 }, "#e9ecef");
    props.prim(PRIM.cone(10), { x: tx, y: 2.75, z: tz, sx: 3, sy: 0.7, sz: 3 }, "#ffffff");
    collision.add({ type: "box", x: tx, z: tz, hw: 1, hd: 0.9, h: 1 });
  }
  const dairy = { x: dq.x, z: dq.z - dq.d / 2 - 4 };

  const motel = addBuilding({ x: 384, z: -22.5, w: 44, d: 9, h: 3.8, rot: ROT.s, wall: "#f7b6c8", roof: "#2a9d8f", front: "house", frontSeg: 5.5, frontSegH: 3.8, roofType: "gable", rh: 1.6 });
  rectQuad({ x0: 360, z0: -16, x1: 408, z1: -7 }, Y.lot, PAL.lot);
  poleSign({ x: 410, z: -9, rot: 0, title: "Goose Inn Motel", sub: "VACANCY • COLOR TV", bg: "#ff6fa8", fg: "#ffffff" });
  minimap.landmarks.push({ x: motel.x, z: motel.z, label: "Goose Inn Motel" });

  // Pump Jack Gas & Go
  props.prim(PRIM.box(), { x: 462, y: 5, z: 18, sx: 18, sy: 0.6, sz: 9 }, "#c23b2e");
  for (const lx of [-7, 7]) props.prim(PRIM.box(), { x: 462 + lx, y: 2.4, z: 18, sx: 0.5, sy: 4.8, sz: 0.5 }, "#e9ecef");
  for (const lx of [-3.5, 3.5]) {
    props.prim(PRIM.box(), { x: 462 + lx, y: 0.85, z: 18, sx: 1.1, sy: 1.7, sz: 0.8 }, "#f4e7c8");
    collision.add({ type: "box", x: 462 + lx, z: 18, hw: 0.7, hd: 0.5, h: 1.8 });
  }
  addStore({ x: 462, z: 32, w: 14, d: 9, h: 7.8, rot: ROT.n, wall: "#d8d3c4", trim: "#c23b2e", name: "Pump Jack Gas & Go", sub: "FILL UP • FISH BAIT • ICE", signBg: "#c23b2e", signFg: "#ffffff", awning: false });
  rectQuad({ x0: 448, z0: 8, x1: 478, z1: 27 }, Y.lot, PAL.lot);

  addBuilding({ x: 540, z: -30, w: 28, d: 18, h: 7, rot: ROT.s, wall: "#d9c37a", roof: "#c0392b", front: "plain", frontSeg: 9, roofType: "gable", rh: 2.4 });
  addSign({ x: 540, y: 6.2, z: -20.9, rot: 0, w: 11, h: 1.6, title: "Prairie Feed & Seed", sub: "HAY • FEED • FARM SUPPLY", bg: "#3a3a2a", fg: "#f2e9d8" });
  addStore({ x: 620, z: 22, w: 24, d: 18, h: 7.8, rot: ROT.n, wall: "#f1c40f", trim: "#1a1a1a", name: "Dollar Dungeon", sub: "EVERYTHING-ISH • $1+", signBg: "#1a1a1a", signFg: "#f1c40f", awning: false });
  rectQuad({ x0: 604, z0: 7, x1: 636, z1: 13 }, Y.lot, PAL.lot);

  // US 90A West
  const tractor = addBuilding({ x: -450, z: 80, w: 30, d: 20, h: 7, rot: ROT.n, wall: "#e9eef2", roof: "#2e7d32", front: "plain", frontSeg: 10, roofType: "gable", rh: 2.2 });
  addSign({ ...(() => { const [x, z] = L(tractor, 0, tractor.d / 2 + 0.06); return { x, z }; })(), y: 6, rot: tractor.rot, w: 12, h: 1.6, title: "Big Wheel Tractor & Implement", sub: "PARTS • SERVICE", bg: "#2e7d32", fg: "#ffd34d" });
  for (const [tx, tc] of [[-470, "#2e7d32"], [-460, "#c0392b"], [-440, "#2e7d32"]]) {
    props.prim(PRIM.box(), { x: tx, y: 1.4, z: 70, sx: 2.2, sy: 1.4, sz: 3.6 }, tc);
    props.prim(PRIM.box(), { x: tx, y: 2.6, z: 69.2, sx: 1.6, sy: 1.2, sz: 1.6 }, "#2b2b2b");
    for (const s of [-1.3, 1.3]) props.prim(PRIM.cyl(10), { x: tx + s, y: 1, z: 71, sx: 2, sy: 0.6, sz: 2, rz: Math.PI / 2 }, "#1c1c1c");
    collision.add({ type: "box", x: tx, z: 70, hw: 1.7, hd: 2, h: 3 });
  }
  addBuilding({ x: -560, z: 43, w: 16, d: 14, h: 5, rot: ROT.s, wall: "#efe0a8", roof: "#7b4a2b", front: "office", frontSeg: 8, roofType: "hip", rh: 1.6 });
  addSign({ x: -560, y: 4.4, z: 50.06, rot: 0, w: 7, h: 1.2, title: "Rice Belt Co-op", sub: "GRAIN • SEED • FUEL", bg: "#2c5d8a", fg: "#ffffff" });

  // FM 102 north
  addStore({ x: 21, z: -300, w: 20, d: 18, h: 7.8, rot: ROT.w, wall: "#e74c3c", trim: "#ffffff", name: "Feed-N-Fix Hardware", sub: "NUTS • BOLTS • PROPANE", signBg: "#ffffff", signFg: "#c0392b", awning: false });

  // Welcome billboards at the edges of town
  for (const [x, z, rot] of [[16, -420, Math.PI], [292, 16, Math.PI / 2], [-292, 76, -Math.PI / 2]]) {
    for (const lx of [-3.6, 3.6]) {
      props.prim(PRIM.box(), { x: x + Math.cos(rot) * lx, y: 2.2, z: z - Math.sin(rot) * lx, sx: 0.3, sy: 4.4, sz: 0.3 }, "#5a3f2a");
    }
    addSign({ x, y: 4.8, z, rot, w: 8, h: 2.6, title: "Welcome to Eagle Lake", sub: "GOOSE HUNTING CAPITAL OF TEXAS", bg: "#1f6b3a", fg: "#ffffff", twoSided: true });
    collision.add({ type: "circle", x, z, r: 1, h: 6 });
  }

  // ---------- airport ----------
  ground.groundQuad([[551, -790], [569, -790], [569, -500], [551, -500]].reverse(), Y.road, "#4a4d54");
  for (let z = -780; z < -510; z += 14) ground.groundQuad([[559.5, z + 7], [560.5, z + 7], [560.5, z], [559.5, z]].reverse(), Y.mark, PAL.white);
  ground.groundQuad([[478, -705], [548, -705], [548, -555], [478, -555]].reverse(), Y.lot, "#83878f");
  for (let i = 0; i < 6; i++) {
    const hz = -690 + i * 24;
    const h = addBuilding({ x: 492, z: hz, w: 18, d: 14, h: 5.5, rot: ROT.e, wall: pick(["#e9eef2", "#8fc9f2", "#f4e7c8", "#f7b6c8", "#9fdcbc"]), roof: pick(["#2f6fca", "#c9372c", "#3c8f42"]), front: "plain", frontSeg: 18, roofType: "gable", rh: 1.4 });
    const [dx, dz] = L(h, 0, h.d / 2 + 0.06);
    props.prim(PRIM.box(), { x: dx, y: 2.2, z: dz, sx: 0.1, sy: 4.3, sz: 15 }, "#c8ccd0");
  }
  addSign({ x: 476, y: 3, z: -612, rot: Math.PI / 2, w: 9, h: 1.6, title: "Eagle Lake Regional Airport", sub: "KELA • RWY 17/35", bg: "#2c5d8a", fg: "#ffffff", twoSided: true });
  props.prim(PRIM.cyl(6), { x: 575, y: 4, z: -640, sx: 0.15, sy: 8, sz: 0.15 }, "#e9ecef");
  props.prim(PRIM.cone(8), { x: 576.5, y: 7.6, z: -640, sx: 1, sy: 3, sz: 1, rz: -Math.PI / 2 }, "#f39c12");
  for (const [px, pz, rot, col] of [[520, -640, 0.4, "#ffffff"], [528, -600, -0.2, "#e74c3c"], [516, -572, 0.9, "#f1c40f"]]) {
    const c = Math.cos(rot), s = Math.sin(rot);
    props.prim(PRIM.cyl(10), { x: px, y: 1.4, z: pz, sx: 1.3, sy: 7, sz: 1.3, ry: rot, rx: Math.PI / 2 }, col);
    props.prim(PRIM.box(), { x: px + s * 0.6, y: 1.9, z: pz + c * 0.6, sx: 10, sy: 0.15, sz: 1.6, ry: rot }, col);
    props.prim(PRIM.box(), { x: px - s * 3.1, y: 2.4, z: pz - c * 3.1, sx: 0.15, sy: 1.6, sz: 1.2, ry: rot }, "#2c5d8a");
    props.prim(PRIM.box(), { x: px - s * 3.1, y: 1.6, z: pz - c * 3.1, sx: 3.6, sy: 0.12, sz: 0.9, ry: rot }, col);
    collision.add({ type: "circle", x: px, z: pz, r: 3, h: 2.5 });
  }
  minimap.landmarks.push({ x: 560, z: -640, label: "Airport" });

  // ---------- farmsteads out in the rice country ----------
  for (const [fx, fz, frot] of [[-620, -420, 0.2], [-380, -700, -0.3], [-700, -250, 1.2], [380, -260, -0.4], [660, -220, 0.3], [330, 620, 0.1], [640, 300, -0.6], [-760, 140, 0.5], [-250, -610, 0], [410, -440, 0.8]]) {
    const barn = addBuilding({ x: fx, z: fz, w: 14, d: 20, h: 6, rot: frot, wall: "#c0392b", roof: "#7f8c8d", front: "plain", roofType: "gable", rh: 4 });
    const [bx, bz] = L(barn, 0, barn.d / 2 + 0.06);
    props.prim(PRIM.box(), { x: bx, y: 2.4, z: bz, sx: 5, sy: 4.6, sz: 0.1, ry: frot }, "#ffffff");
    for (const rz of [0.75, -0.75]) props.prim(PRIM.box(), { x: bx + Math.sin(frot) * 0.06, y: 2.4, z: bz + Math.cos(frot) * 0.06, sx: 6.2, sy: 0.35, sz: 0.1, ry: frot, rz }, "#ffffff");
    const [hx, hz] = L(barn, -22, 4);
    addHouse({ x: hx, z: hz, w: 10, d: 8, h: 3.4, rot: frot, wall: "#f7f3e8", roof: "#2f6fca", roofType: "gable", rh: 2.6, porch: true });
    const [sx, sz] = L(barn, 12, -6);
    props.prim(PRIM.cyl(14), { x: sx, y: 7, z: sz, sx: 6, sy: 14, sz: 6 }, "#d6dde3");
    props.prim(PRIM.hemi(14), { x: sx, y: 14, z: sz, sx: 6, sy: 4, sz: 6 }, "#c0392b");
    collision.add({ type: "circle", x: sx, z: sz, r: 3.1, h: 16 });
    for (let k = 0; k < 8; k++) {
      const [tx, tz] = L(barn, -30 + rand() * 50, -18 - rand() * 14);
      tree(tx, tz, 0.9 + rand() * 0.6);
    }
  }

  // ---------- The Little House: a small house out back of a main house
  // (where the band keeps its gear), on the quiet south end of McCarty ----------
  addBuilding({ x: -21, z: 150, w: 12, d: 10, h: 3.8, rot: ROT.e, wall: "#f2e6c9", roof: "#7b4a2b", front: "house", frontSeg: 12, frontSegH: 3.8, roofType: "gable", rh: 2.6, overhang: 0.55 });
  const gearShed = addBuilding({ x: -38, z: 157, w: 7, d: 6, h: 3, rot: ROT.e, wall: "#9fc6a2", roof: "#5a6170", front: "house", frontSeg: 7, frontSegH: 3, roofType: "gable", rh: 1.6, overhang: 0.4 });
  ground.groundQuad([[-6.5, 165.5], [-6.5, 161.5], [-34.5, 161.5], [-34.5, 165.5]], Y.lot, PAL.gravel);
  {
    // Mailbox at the drive, and a hand-painted sign on the little house.
    props.prim(PRIM.box(), { x: -8.2, y: 0.55, z: 145, sx: 0.12, sy: 1.1, sz: 0.12 }, "#6b4a2e");
    props.prim(PRIM.box(), { x: -8.2, y: 1.18, z: 145, sx: 0.62, sy: 0.32, sz: 0.32 }, "#2b2b2b");
    const [sx, sz] = L(gearShed, 0, gearShed.d / 2 + 0.06);
    addSign({ x: sx, y: 2.4, z: sz, rot: gearShed.rot, w: 3.4, h: 0.8, title: "The Little House", sub: "BAND GEAR • KNOCK FIRST", bg: "#3b2614", fg: "#f2e9d8" });
    minimap.landmarks.push({ x: gearShed.x, z: gearShed.z, label: "The Little House" });
  }
  const [gearDoorX, gearDoorZ] = L(gearShed, 0, gearShed.d / 2 + 1.4);

  // ---------- Gary Jones's jobs ----------
  // The Treehouse: an open-air deck bar on S McCarty with a poplar growing
  // right up through a hole in its roof. Front (and the steps) face McCarty.
  const th = { x: -17, z: 78 };
  props.prim(PRIM.box(), { x: th.x, y: 0.2, z: th.z, sx: 16, sy: 0.4, sz: 12 }, "#8a6a44"); // deck
  for (let k = -7; k <= 7; k += 1) props.prim(PRIM.box(), { x: th.x + k, y: 0.41, z: th.z, sx: 0.05, sy: 0.02, sz: 12 }, "#6b4f31");
  props.prim(PRIM.box(), { x: th.x + 8.4, y: 0.1, z: th.z, sx: 0.9, sy: 0.2, sz: 3 }, "#7a5c3a"); // step
  // Open slatted pergola roof (you can see in from above), with the tree
  // coming up through a gap 1 m west of center.
  const hole = { x: th.x - 1, z: th.z };
  const roofY = 4.3, roofCol = "#5b3f26";
  for (const sz of [-5.8, 5.8]) props.prim(PRIM.box(), { x: th.x, y: roofY, z: th.z + sz, sx: 16.6, sy: 0.35, sz: 0.3 }, roofCol);
  for (const sx of [-8, 8]) props.prim(PRIM.box(), { x: th.x + sx, y: roofY, z: th.z, sx: 0.3, sy: 0.35, sz: 11.9 }, roofCol);
  for (let k = -6.6; k <= 6.7; k += 1.1) {
    if (Math.abs(th.x + k - hole.x) < 1.1) continue; // the gap the poplar grew through
    props.prim(PRIM.box(), { x: th.x + k, y: roofY + 0.25, z: th.z, sx: 0.18, sy: 0.2, sz: 11.9 }, "#7a5c3a");
  }
  for (const [px, pz] of [[-7.6, -5.6], [7.6, -5.6], [-7.6, 5.6], [7.6, 5.6], [0, -5.6], [0, 5.6]]) {
    props.prim(PRIM.box(), { x: th.x + px, y: 2.2, z: th.z + pz, sx: 0.35, sy: 4, sz: 0.35 }, "#4a3220");
    collision.add({ type: "circle", x: th.x + px, z: th.z + pz, r: 0.3, h: 4 });
  }
  // Railings on the back and sides, the bar along the back, stools.
  props.prim(PRIM.box(), { x: th.x - 7.6, y: 1, z: th.z, sx: 0.12, sy: 0.12, sz: 11 }, "#4a3220");
  for (const sz of [-1, 1]) props.prim(PRIM.box(), { x: th.x, y: 1, z: th.z + sz * 5.6, sx: 15, sy: 0.12, sz: 0.12 }, "#4a3220");
  props.prim(PRIM.box(), { x: th.x - 6.2, y: 0.95, z: th.z, sx: 0.9, sy: 1.1, sz: 8 }, "#6e4a2c");
  props.prim(PRIM.box(), { x: th.x - 6.2, y: 1.55, z: th.z, sx: 1.2, sy: 0.1, sz: 8.4 }, "#3b2614");
  collision.add({ type: "box", x: th.x - 6.2, z: th.z, hw: 0.6, hd: 4.2, h: 1.6 });
  for (let k = -3; k <= 3; k += 2) {
    props.prim(PRIM.cyl(8), { x: th.x - 5.2, y: 0.85, z: th.z + k, sx: 0.4, sy: 0.08, sz: 0.4 }, "#c0392b");
    props.prim(PRIM.cyl(6), { x: th.x - 5.2, y: 0.62, z: th.z + k, sx: 0.08, sy: 0.45, sz: 0.08 }, "#9aa0a6");
  }
  for (const k of [-2.5, 2.5]) {
    props.prim(PRIM.cyl(10), { x: th.x + 3.5, y: 1.15, z: th.z + k, sx: 1.2, sy: 0.08, sz: 1.2 }, "#7a5c3a"); // tables
    props.prim(PRIM.cyl(6), { x: th.x + 3.5, y: 0.8, z: th.z + k, sx: 0.12, sy: 0.75, sz: 0.12 }, "#4a3220");
  }
  addSign({ x: th.x + 8.32, y: 3.6, z: th.z, rot: ROT.e, w: 6.5, h: 1.1, title: "The Treehouse", sub: "COLD BEER \u2022 LIVE MUSIC", bg: "#2f4a2a", fg: "#f2d24a" });
  minimap.landmarks.push({ x: th.x, z: th.z, label: "The Treehouse" });
  const treehousePoplar = createPoplar(scene, hole.x, hole.z);
  collision.add({ type: "circle", x: hole.x, z: hole.z, r: 0.55, h: 4 });

  // Rawhide & Rhinestones Western Wear, out on 90A West.
  const ww = addBuilding({ x: -395, z: 84, w: 18, d: 12, h: 5.2, rot: ROT.n, wall: "#c49a6c", roof: "#6b3d22", front: "store", frontSeg: 18, frontSegH: 5.2, roofType: "gable", rh: 2.4 });
  {
    const [sx, sz] = L(ww, 0, ww.d / 2 + 0.06);
    addSign({ x: sx, y: 4.4, z: sz, rot: ww.rot, w: 11, h: 1.5, title: "Rawhide & Rhinestones", sub: "WESTERN WEAR \u2022 BOOTS \u2022 HATS", bg: "#3b2614", fg: "#f2d24a" });
    const [ax, az] = L(ww, 0, ww.d / 2 + 1.1);
    props.prim(PRIM.box(), { x: ax, y: 3.3, z: az, sx: 16, sy: 0.14, sz: 2.2, ry: ww.rot, rx: 0.2 }, "#8a1c1c");
  }
  ground.groundQuad([[-410, 77], [-380, 77], [-380, 66], [-410, 66]], Y.lot, PAL.lot);
  poleSign({ x: -411, z: 70, rot: 0, title: "Boots \u2022 Hats", sub: "PEARL SNAPS \u2022 BUCKLES", bg: "#8a1c1c", fg: "#ffffff", w: 6 });
  minimap.landmarks.push({ x: ww.x, z: ww.z, label: "Rawhide & Rhinestones" });
  const westernWear = { x: -395, z: 76.2 }; // just outside the door

  // The big old oak on the northwest corner of Main and McCarty, with a dead
  // limb hanging out over the street (and a rickety ladder against it).
  const townOak = createOak(scene, -9, -16);
  collision.add({ type: "circle", x: -9, z: -16, r: 0.9, h: 6 });

  // ---------- Granny's Lake: a fishing landing on the north bank, Granny's
  // house, cypress all around (and a 10-foot gator in the water) ----------
  const fishSpot = { x: 362, z: 117.5 };
  props.prim(PRIM.box(), { x: fishSpot.x, y: 0.12, z: fishSpot.z + 0.8, sx: 5, sy: 0.24, sz: 4 }, "#8a6a44"); // plank landing
  for (let k = -2; k <= 2; k++) props.prim(PRIM.box(), { x: fishSpot.x + k, y: 0.25, z: fishSpot.z + 0.8, sx: 0.06, sy: 0.02, sz: 4 }, "#6b4f31");
  props.prim(PRIM.cyl(10), { x: fishSpot.x + 1.9, y: 0.45, z: fishSpot.z + 1.6, sx: 0.5, sy: 0.6, sz: 0.5 }, "#c8ccd0"); // bait bucket
  props.prim(PRIM.box(), { x: fishSpot.x - 1.8, y: 0.55, z: fishSpot.z + 0.2, sx: 0.8, sy: 0.08, sz: 0.8 }, "#2f9e44"); // lawn chair
  props.prim(PRIM.box(), { x: fishSpot.x - 1.8, y: 0.95, z: fishSpot.z - 0.2, sx: 0.8, sy: 0.8, sz: 0.08, rx: -0.25 }, "#2f9e44");
  collision.add({ type: "circle", x: fishSpot.x - 1.8, z: fishSpot.z, r: 0.5, h: 1 });
  props.prim(PRIM.cyl(6), { x: 370, y: 1.1, z: 116, sx: 0.12, sy: 2.2, sz: 0.12 }, "#6b4f31");
  addSign({ x: 370, y: 2.1, z: 116, rot: Math.PI, w: 2.8, h: 0.9, title: "Granny's Lake", sub: "NO SWIMMIN' • GATOR", bg: "#f2e9d8", fg: "#3b2614", twoSided: true });
  const granny = addBuilding({ x: 392, z: 104, w: 10, d: 8, h: 3.4, rot: ROT.w, wall: "#f6d7e3", roof: "#6b7d8c", front: "house", frontSeg: 10, frontSegH: 3.4, roofType: "gable", rh: 2.2, overhang: 0.5 });
  {
    const [gx, gz] = L(granny, 0, granny.d / 2 + 0.05);
    addSign({ x: gx, y: 2.9, z: gz, rot: granny.rot, w: 2.2, h: 0.6, title: "Granny's", sub: "GO FISH", bg: "#ffffff", fg: "#a3445d" });
  }
  minimap.landmarks.push({ x: 363, z: 150, label: "Granny's Lake" });
  const lakeRand = seededRandom(31); // own sequence: leaves the rest of the town as it was
  const grannyShore = offsetPolygon(GRANNYS_LAKE, 6);
  for (let i = 0; i < grannyShore.length; i++) {
    const [ax, az] = grannyShore[i], [bx, bz] = grannyShore[(i + 1) % grannyShore.length];
    const len = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d < len; d += 8) {
      const x = ax + ((bx - ax) * d) / len, z = az + ((bz - az) * d) / len;
      if (z < 126 && x > 346 && x < 382) continue; // keep the landing and the view open
      tree(x + (lakeRand() - 0.5) * 3, z + (lakeRand() - 0.5) * 3, 0.9 + lakeRand() * 0.5, lakeRand() < 0.6 ? "cone" : "round");
    }
  }

  // ---------- residential blocks ----------
  const halfW = (name, fallback) => (ROADS.find((r) => r.name === name)?.w ?? fallback) / 2;
  const ewNames = { "-240": "5th St", "-180": "4th St", "-120": "3rd St", "-60": "2nd St", "0": "Main St", "60": "Post Office St", "120": "A St", "180": "Lakeside Dr" };
  const downtown = REGIONS[0];
  let houses = 0;
  const residences = [];
  for (let bx = -240; bx < 240; bx += 60) {
    for (let bz = -240; bz < 180; bz += 60) {
      for (const side of ["north", "south"]) {
        const streetZ = side === "north" ? bz : bz + 60;
        const hw = halfW(ewNames[String(streetZ)], 9);
        for (let i = 0; i < 4; i++) {
          const cx = bx + 4.5 + 6.375 + 12.75 * i;
          const w = 8 + rand() * 2.5;
          const d = 7.5 + rand() * 2.5;
          const front = side === "north" ? streetZ + hw + 4.5 : streetZ - hw - 4.5;
          const cz = side === "north" ? front + d / 2 : front - d / 2;
          if (inRect(cx, cz, downtown) || inRect(cx, cz, AREAS.school) || Math.hypot(cx - wt.x, cz - wt.z) < 16) continue;
          if (distToRail(cx, cz) < 12 || distToRail(cx, cz, "santafe") < 9) continue;
          if (collision.hits(cx, cz, Math.hypot(w, d) / 2 + 0.5)) continue;
          if (rand() < 0.08) {
            tree(cx, cz, 1.2);
            continue;
          }
          const twoStory = rand() < 0.16;
          const h = {
            x: cx, z: cz, w, d, h: twoStory ? 6.2 : 3.3 + rand() * 0.5, rot: side === "north" ? ROT.n : ROT.s,
            wall: pick(HOUSE_WALLS), roof: pick(HOUSE_ROOFS), roofType: rand() < 0.62 ? "gable" : "hip",
            rh: 2 + rand() * 1.4, porch: rand() < 0.35, chimney: rand() < 0.22, fence: rand() < 0.3,
          };
          addHouse(h);
          residences.push(h);
          houses++;
          // Driveway and maybe a car out front
          if (w < 9.2 && rand() < 0.6) {
            const dside = rand() < 0.5 ? -1 : 1;
            const dxw = cx + dside * (w / 2 + 1.7);
            const z0 = side === "north" ? streetZ + hw : cz;
            const z1 = side === "north" ? cz : streetZ - hw;
            ground.groundQuad([[dxw - 1.4, Math.max(z0, z1)], [dxw + 1.4, Math.max(z0, z1)], [dxw + 1.4, Math.min(z0, z1)], [dxw - 1.4, Math.min(z0, z1)]], Y.lot, PAL.concrete);
            if (rand() < 0.55) addCar(dxw, (z0 + z1) / 2, rand() < 0.5 ? 0 : Math.PI, pick(CAR_COLORS));
          }
          // Backyard trees
          const back = side === "north" ? 1 : -1;
          const nt = 1 + Math.floor(rand() * 2);
          for (let t = 0; t < nt; t++) {
            tree(cx + (rand() - 0.5) * 9, cz + back * (d / 2 + 4 + rand() * 6), 0.85 + rand() * 0.5, rand() < 0.12 ? "cone" : "round");
          }
        }
      }
    }
  }

  // ---------- Sidney's house (northeast side, off Boothe Dr) ----------
  // The house nearest this spot becomes his: yard sign, a satellite dish
  // for wrestling night, and a flag out front.
  const home = residences.reduce((best, h) => (Math.hypot(h.x - 165, h.z + 150) < Math.hypot(best.x - 165, best.z + 150) ? h : best), residences[0]);
  {
    const h = home;
    const [sx, sz] = L(h, -2.4, h.d / 2 + 3.2);
    props.prim(PRIM.box(), { x: sx, y: 0.7, z: sz, sx: 0.12, sy: 1.4, sz: 0.12 }, "#6b4a2e");
    addSign({ x: sx, y: 1.55, z: sz, rot: h.rot, w: 2.6, h: 1.1, title: "SIDNEY'S", sub: "WRESTLING NIGHT HQ", bg: "#ffd43b", fg: "#2b1450", twoSided: true });
    const [dx, dz] = L(h, h.w * 0.25, -h.d * 0.12);
    const dy = h.h + h.rh * 0.62;
    props.prim(PRIM.cyl(6), { x: dx, y: dy, z: dz, sx: 0.1, sy: 0.8, sz: 0.1 }, "#c9ced3");
    props.prim(PRIM.hemi(12), { x: dx, y: dy + 0.5, z: dz, sx: 1.4, sy: 0.5, sz: 1.4, rx: -1.1, ry: h.rot }, "#eef1f3");
    const [fx, fz] = L(h, h.w / 2 + 1.0, h.d / 2 + 2.0);
    props.prim(PRIM.cyl(6), { x: fx, y: 3, z: fz, sx: 0.1, sy: 6, sz: 0.1 }, "#d9dde0");
    props.prim(PRIM.box(), { x: fx + 0.75, y: 5.4, z: fz, sx: 1.4, sy: 0.9, sz: 0.04 }, "#c0392b");
    props.prim(PRIM.box(), { x: fx + 0.5, y: 5.6, z: fz + 0.01, sx: 0.5, sy: 0.45, sz: 0.05 }, "#1f3b70");
    minimap.landmarks.push({ x: h.x, z: h.z, label: "Sidney's House" });
  }
  const [homeX, homeZ] = L(home, 0, home.d / 2 + 4.6); // end of the front walk, clear of the porch
  const sidneyHouse = { x: homeX, z: homeZ, houseX: home.x, houseZ: home.z };

  // ---------- street details: stop signs, stop bars, manholes ----------
  const nsStreets = ROADS.filter((r) => r.kind === "street" && r.pts[0][0] === r.pts[1][0]);
  const ewStreets = ROADS.filter((r) => (r.kind === "street" || r.kind === "main") && r.pts[0][1] === r.pts[1][1]);
  for (const ns of nsStreets) {
    const x = ns.pts[0][0];
    for (const ew of ewStreets) {
      const z = ew.pts[0][1];
      const zMin = Math.min(ns.pts[0][1], ns.pts[1][1]), zMax = Math.max(ns.pts[0][1], ns.pts[1][1]);
      const xMin = Math.min(ew.pts[0][0], ew.pts[1][0]), xMax = Math.max(ew.pts[0][0], ew.pts[1][0]);
      if (z <= zMin || z >= zMax || x < xMin || x > xMax) continue;
      if (inRect(x, z, downtown) || distToRail(x, z) < 14) continue;
      for (const dir of [-1, 1]) {
        // dir 1: northbound traffic arriving from the south (heading -z), whose
        // right-hand side is east (+x). dir -1: southbound, right side is west.
        const sz = z + dir * (ew.w / 2 + 1.6);
        const sx = x + dir * (ns.w / 2 + 1.2);
        props.prim(PRIM.cyl(6), { x: sx, y: 1.3, z: sz, sx: 0.1, sy: 2.6, sz: 0.1 }, "#c9ced3");
        // Octagon: spin about its own axis for a flat top, then stand it up
        // facing the approaching traffic (a red face, a white ring, red again).
        for (const [dz, size, thick, col] of [[0, 0.9, 0.06, "#d32f2f"], [0.035, 0.72, 0.02, "#ffffff"], [0.045, 0.64, 0.02, "#d32f2f"]]) {
          const m = new THREE.Matrix4().makeTranslation(sx, 2.7, sz + dir * dz)
            .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
            .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 8))
            .multiply(new THREE.Matrix4().makeScale(size, thick, size));
          props.geom(PRIM.cyl(8), m, col);
        }
        collision.add({ type: "circle", x: sx, z: sz, r: 0.2, h: 3 });
        const bz = z + dir * (ew.w / 2 + 0.6);
        ground.groundQuad([[x + dir * ns.w / 2, bz - 0.25], [x, bz - 0.25], [x, bz + 0.25], [x + dir * ns.w / 2, bz + 0.25]], Y.mark, PAL.white);
      }
      if (rand() < 0.5) ground.polygon(Array.from({ length: 10 }, (_, k) => [x + 1.6 + Math.cos((k / 10) * Math.PI * 2) * 0.55, z + 22 + Math.sin((k / 10) * Math.PI * 2) * 0.55]), Y.mark, "#3d3f45");
    }
  }

  // ---------- trees everywhere else ----------
  // Lake shore belt
  const shore = offsetPolygon(LAKE, 18);
  for (let i = 0; i < shore.length; i++) {
    const [ax, az] = shore[i], [bx, bz] = shore[(i + 1) % shore.length];
    const len = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d < len; d += 6) {
      const t = d / len;
      const off = (rand() - 0.3) * 24;
      const [nx, nz] = [-(bz - az) / len, (bx - ax) / len];
      const x = ax + (bx - ax) * t + nx * off, z = az + (bz - az) * t + nz * off;
      if (inRect(x, z, AREAS.golf) || inRect(x, z, AREAS.muniPark)) continue;
      tree(x, z, 0.9 + rand() * 0.7, rand() < 0.15 ? "cone" : "round");
    }
  }
  // Windbreaks along the county roads and highways
  for (const r of ROADS.filter((r) => r.kind === "rural" || r.kind === "highway")) {
    for (const side of [-1, 1]) {
      const line = offsetLine(r.pts, side * (r.w / 2 + 7));
      for (let i = 0; i < line.length - 1; i++) {
        const [ax, az] = line[i], [bx, bz] = line[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        for (let d = 0; d < len; d += 7 + rand() * 6) {
          if (rand() < 0.35) continue;
          const t = d / len;
          const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
          if (x > TOWN.minX && x < TOWN.maxX && z > TOWN.minZ && z < TOWN.maxZ) continue;
          tree(x, z, 0.8 + rand() * 0.6, rand() < 0.2 ? "cone" : "round");
        }
      }
    }
  }
  // Pecan mottes scattered through the fields
  for (let m = 0; m < 70; m++) {
    const x = (rand() - 0.5) * 1580, z = (rand() - 0.5) * 1580;
    if (x > TOWN.minX - 20 && x < TOWN.maxX + 20 && z > TOWN.minZ - 20 && z < TOWN.maxZ + 20) continue;
    if (inRect(x, z, AREAS.airport)) continue;
    const n = 4 + Math.floor(rand() * 9);
    for (let k = 0; k < n; k++) tree(x + (rand() - 0.5) * 30, z + (rand() - 0.5) * 30, 0.9 + rand() * 0.8);
  }
  // Parks and town edges
  for (let k = 0; k < 60; k++) tree(AREAS.vetPark.x0 + rand() * 96, AREAS.vetPark.z0 + rand() * 86, 1 + rand() * 0.5);
  for (let k = 0; k < 30; k++) tree(AREAS.muniPark.x0 + rand() * 107, AREAS.muniPark.z0 + rand() * 78, 1 + rand() * 0.5);
  for (let k = 0; k < 40; k++) tree(AREAS.golf.x0 + rand() * 164, AREAS.golf.z0 + rand() * 72, 0.9 + rand() * 0.5);
  for (let k = 0; k < 140; k++) {
    const x = TOWN.minX + rand() * (TOWN.maxX - TOWN.minX), z = TOWN.minZ + rand() * (TOWN.maxZ - TOWN.minZ);
    if (inRect(x, z, downtown)) continue;
    tree(x, z, 0.9 + rand() * 0.6);
  }

  // ---------- power poles and lines along the highways ----------
  const wires = [];
  for (const r of ROADS.filter((r) => r.kind === "highway")) {
    const line = offsetLine(r.pts, r.w / 2 + 3.2);
    let prev = null;
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const rot = Math.atan2(bx - ax, bz - az);
      for (let d = 0; d < len; d += 42) {
        const x = ax + ((bx - ax) * d) / len, z = az + ((bz - az) * d) / len;
        if (collision.hits(x, z, 1) || distToRail(x, z) < 4) { prev = null; continue; }
        props.prim(PRIM.cyl(6), { x, y: 5, z, sx: 0.32, sy: 10, sz: 0.32 }, "#7a5a3a");
        props.prim(PRIM.box(), { x, y: 9.4, z, sx: 2.6, sy: 0.18, sz: 0.18, ry: rot }, "#7a5a3a");
        collision.add({ type: "circle", x, z, r: 0.3, h: 10 });
        const ends = [-1.1, 1.1].map((o) => [x + Math.cos(rot) * o, 9.5, z - Math.sin(rot) * o]);
        if (prev) {
          for (let w = 0; w < 2; w++) {
            const a = prev[w], b = ends[w];
            let last = a;
            for (let k = 1; k <= 4; k++) {
              const t = k / 4;
              const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * 0.9, a[2] + (b[2] - a[2]) * t];
              wires.push(...last, ...p);
              last = p;
            }
          }
        }
        prev = ends;
      }
    }
  }
  const wireGeo = new THREE.BufferGeometry();
  wireGeo.setAttribute("position", new THREE.Float32BufferAttribute(wires, 3));
  scene.add(new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x2b2b2b })));

  // ---------- commit merged meshes ----------
  const detail = makeDetailTexture();
  const timeUniform = { value: 0 };
  const groundMesh = new THREE.Mesh(ground.build(), makeGroundMaterial(detail));
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  const waterMesh = new THREE.Mesh(water.build(), makeWaterMaterial(detail, timeUniform));
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);
  const wallMesh = new THREE.Mesh(walls.build(), makeWallMaterial(atlas));
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);
  const propMesh = new THREE.Mesh(props.build(), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  propMesh.castShadow = true;
  propMesh.receiveShadow = true;
  scene.add(propMesh);
  const treeCount = forest.build(scene, rand);
  const sky = buildSky(scene);

  minimap.roads = ROADS;
  minimap.rails = RAILS;
  minimap.lake = LAKE;
  minimap.pond = POND;
  minimap.pits = PITS;
  minimap.ponds = [GRANNYS_LAKE];
  minimap.areas = AREAS;

  return {
    collision,
    fireLights,
    sidneyHouse,
    ferris: { x: ferrisFrontX, z: ferrisFrontZ },
    dairy,
    gearHouse: { x: gearDoorX, z: gearDoorZ },
    gearLot: { x: -6, z: 150 },
    grannysLake: { spot: fishSpot, cast: { x: 362, z: 133 }, lake: GRANNYS_LAKE },
    treehouse: { tree: treehousePoplar, spot: { x: hole.x + 1.7, z: hole.z }, street: { x: th.x + 9.5, z: th.z } },
    westernWear,
    townOak,
    crossings: railInfo.crossings,
    lampMats: railInfo.lampMats,
    triggers,
    sky,
    minimap,
    update(time) {
      timeUniform.value = time;
    },
    stats: { houses, trees: treeCount, obstacles: collision.count },
  };

  // ---------- local: Eagle Stop drive-thru ----------
  function buildDriveThru() {
    const cx = -330, cz = 32;
    const roomW = 8, depth = 32, h = 5;
    for (const side of [-1, 1]) {
      const x = cx + side * 8;
      walls.box({ x, z: cz, w: roomW, h, d: depth, color: "#cf8a3a", faces: { pz: { rect: ATLAS.plain, segW: 8, segH: 5 }, nz: { rect: ATLAS.plain, segW: 8, segH: 5 }, px: { rect: ATLAS.plain, segW: 10, segH: 5 }, nx: { rect: ATLAS.plain, segW: 10, segH: 5 } }, top: false });
      collision.add({ type: "box", x, z: cz, hw: roomW / 2, hd: depth / 2, rot: 0, h: h + 1 });
    }
    // One roof over both rooms and the drive-through bay
    props.prim(PRIM.box(), { x: cx, y: h + 0.3, z: cz, sx: 25, sy: 0.6, sz: depth + 2 }, "#a8553e");
    props.prim(PRIM.box(), { x: cx, y: h + 1.4, z: cz + depth / 2 + 0.2, sx: 25, sy: 2.2, sz: 0.4 }, "#cf8a3a");
    addSign({ x: cx, y: h + 1.45, z: cz + depth / 2 + 0.42, rot: 0, w: 15, h: 2, title: "Eagle Stop", sub: "DRIVE-THRU • BEER • ICE • BAIT", bg: "#2b2b2b", fg: "#ffd34d" });
    addSign({ x: cx + 8, y: 2.6, z: cz + depth / 2 + 0.06, rot: 0, w: 4.2, h: 1.6, title: "Open", sub: "COLD BEER • ICE • BAIT", bg: "#ffffff", fg: "#2e7d32" });
    // Inside the bay: the cashier's window on one wall, glass coolers on the other.
    const cashier = new THREE.Mesh(new THREE.PlaneGeometry(depth - 2, h - 0.4), new THREE.MeshLambertMaterial({ map: driveThruWallTexture("cashier") }));
    cashier.position.set(cx - 3.98, h / 2, cz);
    cashier.rotation.y = Math.PI / 2;
    scene.add(cashier);
    const cooler = new THREE.Mesh(new THREE.PlaneGeometry(depth - 2, h - 0.4), new THREE.MeshLambertMaterial({ map: driveThruWallTexture("cooler") }));
    cooler.position.set(cx + 3.98, h / 2, cz);
    cooler.rotation.y = -Math.PI / 2;
    scene.add(cooler);
    ground.groundQuad([[cx - 4, 54], [cx + 4, 54], [cx + 4, 0], [cx - 4, 0]].reverse(), Y.lot, "#a9a49a");
    ground.groundQuad([[cx - 16, 14], [cx + 16, 14], [cx + 16, -4], [cx - 16, -4]].reverse(), Y.lot, "#b9ae92");
    props.prim(PRIM.cyl(10), { x: cx - 13, y: 0.6, z: 52, sx: 0.9, sy: 1.2, sz: 0.9 }, "#2e6b3a");
    props.prim(PRIM.box(), { x: cx + 13, y: 0.6, z: 52, sx: 1.6, sy: 1.2, sz: 1 }, "#e9eef2");
    triggers.push({
      x0: cx - 3.5, z0: cz - depth / 2, x1: cx + 3.5, z1: cz + depth / 2,
      text: "The Eagle Stop drive-thru. Pull up to the cashier's window in the car or on the bike.",
    });
    minimap.landmarks.push({ x: cx, z: cz, label: "Eagle Stop" });
  }
}

function driveThruWallTexture(kind) {
  const c = makeCanvas(1024, 192);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#cf8a3a";
  ctx.fillRect(0, 0, 1024, 192);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let y = 0; y < 192; y += 14) ctx.fillRect(0, y, 1024, 3);
  if (kind === "cashier") {
    ctx.fillStyle = "#3b2a1c";
    ctx.fillRect(420, 40, 200, 110);
    ctx.fillStyle = "#8fb8cc";
    ctx.fillRect(432, 50, 176, 74);
    ctx.fillStyle = "#6b4a2e";
    ctx.fillRect(400, 124, 240, 22);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAY HERE", 520, 30);
    ctx.fillStyle = "#ffd34d";
    ctx.fillRect(140, 60, 160, 60);
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("ICE COLD", 220, 88);
    ctx.fillText("$1.99", 220, 110);
  } else {
    for (let i = 0; i < 8; i++) {
      const x = 40 + i * 120;
      ctx.fillStyle = "#cfd6db";
      ctx.fillRect(x, 26, 104, 150);
      ctx.fillStyle = "#2a3d55";
      ctx.fillRect(x + 8, 34, 88, 134);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(x + 14, 40, 18, 120);
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("COLD BEER • SODA • ICE", 512, 20);
  }
  const t = canvasTexture(c);
  return t;
}
