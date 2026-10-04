import { ROADS } from "../map/layout.js";

// Street navigation: the road polylines become a graph (nodes at every
// intersection, T-junction and road end; edges along the roads), and a
// route is the shortest path on it between the points on the network
// nearest the start and the destination.

const key = (x, z) => `${Math.round(x * 2) / 2},${Math.round(z * 2) / 2}`;

function segIntersect(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1];
  const sx = d[0] - c[0], sz = d[1] - c[1];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = c[0] - a[0], qz = c[1] - a[1];
  const t = (qx * sz - qz * sx) / den;
  const u = (qx * rz - qz * rx) / den;
  const e = 1e-6;
  if (t < -e || t > 1 + e || u < -e || u > 1 + e) return null;
  return t;
}

function buildGraph() {
  const segs = [];
  for (const r of ROADS) {
    for (let i = 0; i < r.pts.length - 1; i++) segs.push({ a: r.pts[i], b: r.pts[i + 1], ts: [0, 1], road: r });
  }
  for (let i = 0; i < segs.length; i++) {
    for (let j = 0; j < segs.length; j++) {
      if (i === j) continue;
      const t = segIntersect(segs[i].a, segs[i].b, segs[j].a, segs[j].b);
      if (t !== null) segs[i].ts.push(Math.min(1, Math.max(0, t)));
    }
  }
  const nodes = new Map(); // key -> { x, z, edges: [{ to, w }] }
  const node = (x, z) => {
    const k = key(x, z);
    if (!nodes.has(k)) nodes.set(k, { k, x, z, edges: [] });
    return nodes.get(k);
  };
  const link = (p, q, road) => {
    if (p === q || p.edges.some((e) => e.to === q)) return;
    const w = Math.hypot(q.x - p.x, q.z - p.z);
    if (w < 0.01) return;
    p.edges.push({ to: q, w, road });
    q.edges.push({ to: p, w, road });
  };
  for (const s of segs) {
    s.ts.sort((x, y) => x - y);
    s.nodes = s.ts.map((t) => node(s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t));
    for (let i = 0; i < s.nodes.length - 1; i++) link(s.nodes[i], s.nodes[i + 1], s.road);
  }
  return { segs, nodes };
}

let graph = null;

// Closest point on the network: which segment, how far along it, and where.
function snap(x, z) {
  let best = null;
  for (const s of graph.segs) {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1];
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / l2));
    const px = s.a[0] + dx * t, pz = s.a[1] + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { s, t, x: px, z: pz, d };
  }
  return best;
}

// Neighbors of a snapped point: the split nodes just before and after it.
function attach(p) {
  const { s, t } = p;
  let i = 0;
  while (i < s.ts.length - 2 && s.ts[i + 1] < t) i++;
  return [s.nodes[i], s.nodes[i + 1]];
}

// Returns [[x, z], ...] from (sx, sz) to (tx, tz) along the streets.
export function findRoute(sx, sz, tx, tz) {
  if (!graph) graph = buildGraph();
  const A = snap(sx, sz), B = snap(tx, tz);
  // Same stretch of road: no need for the graph.
  if (A.s === B.s) return [[sx, sz], [A.x, A.z], [B.x, B.z], [tx, tz]];
  const startEnds = attach(A), goalEnds = attach(B);
  const dist = new Map(), prev = new Map(), done = new Set();
  const queue = [];
  for (const n of startEnds) {
    const w = Math.hypot(n.x - A.x, n.z - A.z);
    if (!dist.has(n.k) || w < dist.get(n.k)) {
      dist.set(n.k, w);
      queue.push(n);
    }
  }
  const goalCost = new Map(goalEnds.map((n) => [n.k, Math.hypot(n.x - B.x, n.z - B.z)]));
  let bestGoal = null, bestTotal = Infinity;
  while (queue.length) {
    queue.sort((p, q) => dist.get(p.k) - dist.get(q.k));
    const n = queue.shift();
    if (done.has(n.k)) continue;
    done.add(n.k);
    const dn = dist.get(n.k);
    if (dn >= bestTotal) break;
    if (goalCost.has(n.k) && dn + goalCost.get(n.k) < bestTotal) {
      bestTotal = dn + goalCost.get(n.k);
      bestGoal = n;
    }
    for (const e of n.edges) {
      const nd = dn + e.w;
      if (!dist.has(e.to.k) || nd < dist.get(e.to.k)) {
        dist.set(e.to.k, nd);
        prev.set(e.to.k, n);
        queue.push(e.to);
      }
    }
  }
  const path = [];
  for (let n = bestGoal; n; n = prev.get(n.k)) path.unshift([n.x, n.z]);
  return [[sx, sz], [A.x, A.z], ...path, [B.x, B.z], [tx, tz]];
}

export function routeLength(pts) {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return l;
}

// For vehicles on rails: the closest stretch of road to (x, z), oriented
// to match `heading`. Returns { a, b, s, road }: travelling from node a
// toward node b, s units past a.
export function railAttach(x, z, heading) {
  if (!graph) graph = buildGraph();
  const p = snap(x, z);
  let [n0, n1] = attach(p);
  if (n0 === n1) [n0, n1] = [n0, n0.edges[0].to];
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const forward = (n1.x - n0.x) * fx + (n1.z - n0.z) * fz >= 0;
  const a = forward ? n0 : n1, b = forward ? n1 : n0;
  return { a, b, s: Math.hypot(p.x - a.x, p.z - a.z), road: p.s.road };
}
