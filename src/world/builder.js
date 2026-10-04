import * as THREE from "three";

// Accumulates flat-shaded, vertex-colored triangles from many small pieces
// and emits one BufferGeometry, so the whole town renders in a handful of
// draw calls instead of thousands — the difference between smooth and
// unplayable on a phone.

const _v = new THREE.Vector3();
const _col = new THREE.Color();
const geoCache = new Map();

function cachedNonIndexed(key, make) {
  if (!geoCache.has(key)) {
    const g = make();
    geoCache.set(key, g.index ? g.toNonIndexed() : g);
  }
  return geoCache.get(key);
}

export const PRIM = {
  box: () => cachedNonIndexed("box", () => new THREE.BoxGeometry(1, 1, 1)),
  cyl: (seg = 10) => cachedNonIndexed(`cyl${seg}`, () => new THREE.CylinderGeometry(0.5, 0.5, 1, seg)),
  cone: (seg = 8) => cachedNonIndexed(`cone${seg}`, () => new THREE.ConeGeometry(0.5, 1, seg)),
  sphere: (seg = 10) => cachedNonIndexed(`sph${seg}`, () => new THREE.SphereGeometry(0.5, seg, Math.max(4, seg - 3))),
  hemi: (seg = 12) => cachedNonIndexed(`hemi${seg}`, () => new THREE.SphereGeometry(0.5, seg, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
};

function toColor(c) {
  if (c && c.isColor) return c;
  return _col.set(c);
}

export class MeshBuilder {
  constructor({ uv = false } = {}) {
    this.pos = [];
    this.col = [];
    this.uv = uv ? [] : null;
  }

  vert(x, y, z, c, u = 0.25, v = 0.25) {
    this.pos.push(x, y, z);
    this.col.push(c.r, c.g, c.b);
    if (this.uv) this.uv.push(u, v);
  }

  tri(a, b, c, color) {
    const col = toColor(color).clone();
    this.vert(a[0], a[1], a[2], col);
    this.vert(b[0], b[1], b[2], col);
    this.vert(c[0], c[1], c[2], col);
  }

  // a,b,c,d counter-clockwise as seen from the visible side.
  quad(a, b, c, d, color, uvRect = null) {
    const col = toColor(color).clone();
    const r = uvRect || [0.24, 0.24, 0.26, 0.26];
    this.vert(a[0], a[1], a[2], col, r[0], r[1]);
    this.vert(b[0], b[1], b[2], col, r[2], r[1]);
    this.vert(c[0], c[1], c[2], col, r[2], r[3]);
    this.vert(a[0], a[1], a[2], col, r[0], r[1]);
    this.vert(c[0], c[1], c[2], col, r[2], r[3]);
    this.vert(d[0], d[1], d[2], col, r[0], r[3]);
  }

  // Flat quad on the ground (y), axis-free: four XZ points CCW from above.
  groundQuad(pts, y, color) {
    const [a, b, c, d] = orderCCW(pts);
    this.quad([a[0], y, a[1]], [b[0], y, b[1]], [c[0], y, c[1]], [d[0], y, d[1]], color);
  }

  // A ribbon of width w along an XZ polyline, lying flat at height y.
  ribbon(pts, w, y, color) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      const nx = (-dz / len) * (w / 2), nz = (dx / len) * (w / 2);
      // Extend each segment a little so joints overlap instead of leaving gaps.
      const ex = (dx / len) * (w / 2), ez = (dz / len) * (w / 2);
      const a0 = [ax - ex + nx, az - ez + nz], a1 = [ax - ex - nx, az - ez - nz];
      const b0 = [bx + ex + nx, bz + ez + nz], b1 = [bx + ex - nx, bz + ez - nz];
      this.groundQuad(orderCCW([a1, b1, b0, a0]), y, color);
    }
  }

  // A filled flat polygon (fan from centroid — fine for the blob shapes here).
  polygon(pts, y, color) {
    let cx = 0, cz = 0;
    for (const p of pts) { cx += p[0]; cz += p[1]; }
    cx /= pts.length; cz /= pts.length;
    const col = toColor(color).clone();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      const cross = (p[0] - cx) * (q[1] - cz) - (p[1] - cz) * (q[0] - cx);
      // Wind so the face points up (+y) regardless of input order.
      if (cross < 0) {
        this.vert(cx, y, cz, col); this.vert(p[0], y, p[1], col); this.vert(q[0], y, q[1], col);
      } else {
        this.vert(cx, y, cz, col); this.vert(q[0], y, q[1], col); this.vert(p[0], y, p[1], col);
      }
    }
  }

  // Any primitive geometry, transformed by a Matrix4, in a single color.
  geom(geometry, matrix, color) {
    const col = toColor(color).clone();
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(matrix);
      this.vert(_v.x, _v.y, _v.z, col);
    }
  }

  // Convenience: primitive placed by position / rotation(Y,X,Z order) / scale.
  prim(geometry, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0 }, color) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")),
      new THREE.Vector3(sx, sy, sz)
    );
    this.geom(geometry, m, color);
  }

  // A rotated box with optional per-face atlas regions (walls), sitting on y0.
  // faces: { pz, nz, px, nx } -> { rect: [u0,v0,u1,v1], segW, segH }
  box({ x, z, y0 = 0, w, h, d, rot = 0, color, topColor = null, faces = null, top = true }) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const P = (lx, y, lz) => [x + lx * c + lz * s, y, z - lx * s + lz * c];
    const hw = w / 2, hd = d / 2, y1 = y0 + h;
    const sideCol = toColor(color).clone();
    const corners = {
      pz: [[-hw, hd], [hw, hd], w],
      nz: [[hw, -hd], [-hw, -hd], w],
      px: [[hw, hd], [hw, -hd], d],
      nx: [[-hw, -hd], [-hw, hd], d],
    };
    for (const [key, [[ax, az], [bx, bz], span]] of Object.entries(corners)) {
      const f = faces && faces[key];
      if (f && f.rect) {
        const nu = Math.max(1, Math.round(span / (f.segW || span)));
        const nv = Math.max(1, Math.round(h / (f.segH || h)));
        for (let i = 0; i < nu; i++) {
          const t0 = i / nu, t1 = (i + 1) / nu;
          const sx0 = ax + (bx - ax) * t0, sz0 = az + (bz - az) * t0;
          const sx1 = ax + (bx - ax) * t1, sz1 = az + (bz - az) * t1;
          for (let j = 0; j < nv; j++) {
            const ya = y0 + (h * j) / nv, yb = y0 + (h * (j + 1)) / nv;
            this.quad(P(sx0, ya, sz0), P(sx1, ya, sz1), P(sx1, yb, sz1), P(sx0, yb, sz0), sideCol, f.rect);
          }
        }
      } else {
        this.quad(P(ax, y0, az), P(bx, y0, bz), P(bx, y1, bz), P(ax, y1, az), sideCol);
      }
    }
    if (top) {
      this.quad(P(-hw, y1, hd), P(hw, y1, hd), P(hw, y1, -hd), P(-hw, y1, -hd), topColor || sideCol);
    }
  }

  // Pitched roof over a w x d footprint (ridge along local x). type: gable | hip
  roof({ x, z, y0, w, d, rot = 0, rh, overhang = 0.5, color, gableColor, type = "gable" }) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const P = (lx, y, lz) => [x + lx * c + lz * s, y, z - lx * s + lz * c];
    const hw = w / 2 + overhang, hd = d / 2 + overhang, y1 = y0 + rh;
    const inset = type === "hip" ? Math.min(d / 2, w / 2 - 0.1) : 0;
    const rl = -w / 2 + inset, rr = w / 2 - inset;
    this.quad(P(-hw, y0, hd), P(hw, y0, hd), P(rr, y1, 0), P(rl, y1, 0), color);
    this.quad(P(hw, y0, -hd), P(-hw, y0, -hd), P(rl, y1, 0), P(rr, y1, 0), color);
    if (type === "hip") {
      this.tri(P(hw, y0, hd), P(hw, y0, -hd), P(rr, y1, 0), color);
      this.tri(P(-hw, y0, -hd), P(-hw, y0, hd), P(rl, y1, 0), color);
    } else {
      const g = gableColor || color;
      this.tri(P(w / 2, y0, d / 2), P(w / 2, y0, -d / 2), P(w / 2, y1, 0), g);
      this.tri(P(-w / 2, y0, -d / 2), P(-w / 2, y0, d / 2), P(-w / 2, y1, 0), g);
    }
  }

  get empty() {
    return this.pos.length === 0;
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    if (this.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

function orderCCW(pts) {
  // Ensure the four XZ points wind counter-clockwise when seen from above
  // (+y looking down, x right, z toward the viewer), i.e. signed area < 0
  // in plain (x, z) coordinates.
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  return area > 0 ? pts.slice().reverse() : pts;
}

export function offsetPolygon(pts, dist) {
  const n = pts.length;
  // Signed area (x,z) to know which way is "outward".
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    area += p[0] * q[1] - q[0] * p[1];
  }
  const sign = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
    const e1 = norm([p[0] - prev[0], p[1] - prev[1]]);
    const e2 = norm([next[0] - p[0], next[1] - p[1]]);
    const n1 = [e1[1] * sign, -e1[0] * sign];
    const n2 = [e2[1] * sign, -e2[0] * sign];
    const nx = n1[0] + n2[0], nz = n1[1] + n2[1];
    const l = Math.hypot(nx, nz) || 1;
    return [p[0] + (nx / l) * dist, p[1] + (nz / l) * dist];
  });
}

function norm(v) {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
}
