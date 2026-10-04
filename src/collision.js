import { pointInPolygon, distToSegment } from "./map/layout.js";

// Static obstacles bucketed in a uniform grid so movement and camera checks
// only look at what's nearby, even with hundreds of buildings in town.
// Types: box {x,z,hw,hd,rot,h}, circle {x,z,r,h}, poly {pts,h:0} (water).
export class CollisionWorld {
  constructor(cell = 32) {
    this.cell = cell;
    this.grid = new Map();
    this.stamp = 0;
    this.count = 0;
  }

  key(ix, iz) {
    return ix * 100003 + iz;
  }

  aabb(o) {
    if (o.type === "circle") return [o.x - o.r, o.z - o.r, o.x + o.r, o.z + o.r];
    if (o.type === "poly") {
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (const [x, z] of o.pts) {
        x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z);
      }
      return [x0, z0, x1, z1];
    }
    const r = Math.hypot(o.hw, o.hd);
    return [o.x - r, o.z - r, o.x + r, o.z + r];
  }

  add(o) {
    if (o.type === "box") {
      o.rot = o.rot || 0;
      o.c = Math.cos(o.rot);
      o.s = Math.sin(o.rot);
    }
    o.h = o.h ?? 4;
    o._s = 0;
    const [x0, z0, x1, z1] = this.aabb(o);
    for (let ix = Math.floor(x0 / this.cell); ix <= Math.floor(x1 / this.cell); ix++) {
      for (let iz = Math.floor(z0 / this.cell); iz <= Math.floor(z1 / this.cell); iz++) {
        const k = this.key(ix, iz);
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(o);
      }
    }
    this.count++;
    return o;
  }

  forEachNear(x0, z0, x1, z1, cb) {
    this.stamp++;
    for (let ix = Math.floor(x0 / this.cell); ix <= Math.floor(x1 / this.cell); ix++) {
      for (let iz = Math.floor(z0 / this.cell); iz <= Math.floor(z1 / this.cell); iz++) {
        const list = this.grid.get(this.key(ix, iz));
        if (!list) continue;
        for (const o of list) {
          if (o._s === this.stamp) continue;
          o._s = this.stamp;
          if (cb(o) === true) return true;
        }
      }
    }
    return false;
  }

  static circleHits(o, x, z, r) {
    if (o.type === "circle") {
      const dx = x - o.x, dz = z - o.z, rr = o.r + r;
      return dx * dx + dz * dz < rr * rr;
    }
    if (o.type === "poly") {
      if (pointInPolygon(x, z, o.pts)) return true;
      const p = o.pts;
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        if (distToSegment(x, z, a[0], a[1], b[0], b[1]) < r) return true;
      }
      return false;
    }
    // Rotated box: move the point into the box's local frame.
    const dx = x - o.x, dz = z - o.z;
    const lx = dx * o.c - dz * o.s;
    const lz = dx * o.s + dz * o.c;
    const cx = Math.max(-o.hw, Math.min(lx, o.hw));
    const cz = Math.max(-o.hd, Math.min(lz, o.hd));
    const ex = lx - cx, ez = lz - cz;
    return ex * ex + ez * ez < r * r;
  }

  hits(x, z, r, filter = null) {
    return this.forEachNear(x - r, z - r, x + r, z + r, (o) => {
      if (filter && !filter(o)) return false;
      return CollisionWorld.circleHits(o, x, z, r);
    });
  }

  // Axis-separated sliding, and never trapping something that already
  // overlaps (it can always move back out).
  resolveMove(oldX, oldZ, newX, newZ, r) {
    let x = newX;
    if (this.hits(x, oldZ, r) && !this.hits(oldX, oldZ, r)) x = oldX;
    let z = newZ;
    if (this.hits(x, z, r) && !this.hits(x, oldZ, r)) z = oldZ;
    return { x, z };
  }

  // Camera ray from (ox, oy, oz) along XZ direction (dx, dz) for `dist`
  // units, climbing linearly to height ey. Returns the distance at which
  // something tall enough blocks it, or `dist` if the view is clear.
  rayClear(ox, oy, oz, dx, dz, dist, ey) {
    const tx = ox + dx * dist, tz = oz + dz * dist;
    let best = dist;
    this.forEachNear(Math.min(ox, tx), Math.min(oz, tz), Math.max(ox, tx), Math.max(oz, tz), (o) => {
      if (o.type !== "box" || o.h <= 0) return false;
      // Into the box's local frame.
      const rx = ox - o.x, rz = oz - o.z;
      const lox = rx * o.c - rz * o.s, loz = rx * o.s + rz * o.c;
      const ldx = dx * o.c - dz * o.s, ldz = dx * o.s + dz * o.c;
      let tmin = 0, tmax = dist;
      for (const [p, d, lim] of [[lox, ldx, o.hw], [loz, ldz, o.hd]]) {
        if (Math.abs(d) < 1e-6) {
          if (p < -lim || p > lim) return false;
        } else {
          let t1 = (-lim - p) / d, t2 = (lim - p) / d;
          if (t1 > t2) [t1, t2] = [t2, t1];
          tmin = Math.max(tmin, t1);
          tmax = Math.min(tmax, t2);
          if (tmin > tmax) return false;
        }
      }
      // Height of the ray where it enters the box; ignore if it passes over.
      const yAt = oy + (ey - oy) * (tmin / dist);
      if (yAt > o.h + 0.6) return false;
      if (tmin < best) best = tmin;
      return false;
    });
    return best;
  }
}
