import * as THREE from "three";
import { toonify } from "./render/toon.js";
import { turnToward } from "./util.js";

// Cartoon ninjas for the Eagle Stop takeover: black gi, red headband with
// trailing tails, a sword on the back, big white eyes in the mask slit.
// They taunt until Sidney gets close, then circle him, dart in for kicks,
// and leap out of the way of anything with wheels. One good hit (a
// takedown on foot, or a vehicle at speed) sends a ninja flying into a
// puff of smoke.

const GROUND_Y = 0.16;
const GRAVITY = 26;

function buildNinja() {
  const group = new THREE.Group();
  const gi = new THREE.MeshLambertMaterial({ color: 0x1f1d2b });
  const giDark = new THREE.MeshLambertMaterial({ color: 0x15131d });
  const red = new THREE.MeshLambertMaterial({ color: 0xd62828 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc68e62 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const steel = new THREE.MeshLambertMaterial({ color: 0x8d6e4a });

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  group.add(hips);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.32, 6, 12), gi);
  torso.scale.set(1.05, 1, 0.8);
  torso.position.y = 0.42;
  hips.add(torso);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12), red);
  belt.scale.z = 0.82;
  belt.position.y = 0.12;
  hips.add(belt);
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.05), red);
  knot.position.set(0.12, 0.0, 0.24);
  knot.rotation.z = 0.3;
  hips.add(knot);

  // Head: hooded mask with an eye slit
  const head = new THREE.Group();
  head.position.y = 1.18;
  hips.add(head);
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.5, 0.44), gi));
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.02), skin);
  slit.position.set(0, 0.04, 0.225);
  head.add(slit);
  for (const sx of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.02), white);
    eye.position.set(sx, 0.04, 0.235);
    head.add(eye);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), black);
    pupil.position.set(sx + (sx > 0 ? -0.015 : 0.015), 0.035, 0.245);
    head.add(pupil);
    // Angry brows
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.02), black);
    brow.position.set(sx, 0.11, 0.24);
    brow.rotation.z = sx > 0 ? 0.35 : -0.35;
    head.add(brow);
  }
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.46), red);
  band.position.y = 0.17;
  head.add(band);
  const tails = [];
  for (const s of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.42), red);
    tail.geometry.translate(0, 0, -0.21);
    tail.position.set(s * 0.05, 0.16, -0.23);
    tail.rotation.set(-0.3, s * 0.25, 0);
    head.add(tail);
    tails.push(tail);
  }

  // Sword on the back
  const sword = new THREE.Group();
  const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.06), giDark);
  sword.add(sheath);
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), steel);
  hilt.position.y = 0.62;
  sword.add(hilt);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.12), new THREE.MeshLambertMaterial({ color: 0xd4a017 }));
  guard.position.y = 0.47;
  sword.add(guard);
  sword.position.set(0, 0.5, -0.27);
  sword.rotation.z = 0.7;
  hips.add(sword);

  function limb(len, r, mat) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), mat);
    m.position.y = -len / 2 - r;
    g.add(m);
    return g;
  }
  const armL = limb(0.42, 0.085, gi), armR = limb(0.42, 0.085, gi);
  armL.position.set(0.38, 0.72, 0);
  armR.position.set(-0.38, 0.72, 0);
  for (const a of [armL, armR]) {
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 8), giDark);
    wrap.position.y = -0.5;
    a.add(wrap);
    hips.add(a);
  }
  const legL = limb(0.62, 0.1, gi), legR = limb(0.62, 0.1, gi);
  legL.position.set(0.15, 0.02, 0);
  legR.position.set(-0.15, 0.02, 0);
  for (const l of [legL, legR]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.3), giDark);
    foot.position.set(0, -0.86, 0.05);
    l.add(foot);
    hips.add(l);
  }

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  group.scale.setScalar(0.8);
  toonify(group);
  return { group, parts: { hips, head, armL, armR, legL, legR, tails } };
}

// Smoke puff: a handful of expanding, fading toon-white balls.
function makePoof(scene, x, y, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xf2f0ff, transparent: true, opacity: 0.95, depthWrite: false });
  const balls = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), mat);
    const a = (i / 9) * Math.PI * 2;
    m.userData.v = new THREE.Vector3(Math.cos(a) * 2.2, 1.2 + Math.random() * 1.6, Math.sin(a) * 2.2);
    g.add(m);
    balls.push(m);
  }
  g.position.set(x, y, z);
  scene.add(g);
  let t = 0;
  return {
    update(dt) {
      t += dt;
      for (const b of balls) {
        b.position.addScaledVector(b.userData.v, dt);
        b.userData.v.multiplyScalar(0.9);
        b.scale.setScalar(1 + t * 2.4);
      }
      mat.opacity = Math.max(0, 0.95 - t * 1.6);
      if (t > 0.65) {
        scene.remove(g);
        g.traverse((o) => o.geometry && o.geometry.dispose());
        mat.dispose();
        return false;
      }
      return true;
    },
  };
}

export function createNinjaGang(scene, collision, spots) {
  const ninjas = spots.map((s, i) => {
    const { group, parts } = buildNinja();
    group.position.set(s.x, s.y ?? GROUND_Y, s.z);
    group.rotation.y = s.heading ?? 0;
    scene.add(group);
    return {
      i, group, parts,
      state: "idle", // idle | engage | dash | leap | hit | gone
      t: Math.random() * 10,
      timer: 2 + Math.random() * 3,
      vel: new THREE.Vector3(),
      angle: (i / spots.length) * Math.PI * 2,
      onRoof: (s.y ?? 0) > 1,
      cooldown: 0,
    };
  });
  const poofs = [];
  let defeated = 0;

  function face(n, x, z, dt, rate = 8) {
    turnToward(n.group, Math.atan2(x - n.group.position.x, z - n.group.position.z), dt * rate);
  }

  function moveToward(n, x, z, speed, dt) {
    const p = n.group.position;
    const dx = x - p.x, dz = z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return 0;
    const step = Math.min(d, speed * dt);
    const r = collision.resolveMove(p.x, p.z, p.x + (dx / d) * step, p.z + (dz / d) * step, 0.4);
    p.x = r.x;
    p.z = r.z;
    return step / dt;
  }

  // free: fly over everything (jumping off the roof); otherwise walls stop it.
  function leap(n, x, z, height = 5, free = false) {
    const p = n.group.position;
    const flight = 0.9;
    n.vel.set((x - p.x) / flight, (GROUND_Y - p.y) / flight + 0.5 * GRAVITY * flight, (z - p.z) / flight);
    n.vel.y = Math.max(n.vel.y, Math.sqrt(2 * GRAVITY * height) * 0.6);
    n.state = "leap";
    n.free = free;
  }

  function hit(n, dirX, dirZ, power = 1) {
    if (n.state === "hit" || n.state === "gone") return false;
    const l = Math.hypot(dirX, dirZ) || 1;
    n.vel.set((dirX / l) * 13 * power, 10 + 4 * power, (dirZ / l) * 13 * power);
    n.state = "hit";
    n.timer = 1.0;
    return true;
  }

  // Pose helpers
  function animate(n, dt, moving) {
    const P = n.parts;
    n.t += dt * (moving ? 12 : 3);
    if (n.state === "hit") {
      P.armL.rotation.set(-2.6, 0, 0.4);
      P.armR.rotation.set(-2.6, 0, -0.4);
      P.legL.rotation.x = 0.9;
      P.legR.rotation.x = -0.9;
      return;
    }
    if (n.state === "leap") {
      P.legL.rotation.x = -1.2;
      P.legR.rotation.x = -0.4;
      P.armL.rotation.set(-0.6, 0, 1.0);
      P.armR.rotation.set(-0.6, 0, -1.0);
      return;
    }
    if (moving) {
      const s = Math.sin(n.t);
      P.legL.rotation.x = s * 0.9;
      P.legR.rotation.x = -s * 0.9;
      // Classic ninja run: arms swept back.
      P.armL.rotation.set(0.9, 0, 0.25);
      P.armR.rotation.set(0.9, 0, -0.25);
      P.hips.rotation.x = 0.35;
    } else {
      // Fighting stance with a little bounce; taunting when idle.
      P.hips.rotation.x = 0.1;
      P.legL.rotation.x = -0.35;
      P.legR.rotation.x = 0.35;
      P.armL.rotation.set(-1.3, 0, -0.3 + Math.sin(n.t * 2) * 0.15);
      P.armR.rotation.set(-0.9, 0, 0.5);
      P.hips.position.y = 0.95 + Math.abs(Math.sin(n.t * 2)) * 0.06;
    }
    for (const tail of P.tails) tail.rotation.x = -0.3 + Math.sin(n.t * 1.7 + tail.position.x * 20) * 0.25;
  }

  // ctx: { px, pz, onFoot, vehicle: { x, z, speed, radius } | null, kickPlayer(dirX, dirZ), onDefeat(n) }
  function update(dt, ctx) {
    for (let i = poofs.length - 1; i >= 0; i--) if (!poofs[i].update(dt)) poofs.splice(i, 1);
    for (const n of ninjas) {
      if (n.state === "gone") continue;
      const p = n.group.position;
      const dPlayer = Math.hypot(ctx.px - p.x, ctx.pz - p.z);
      let moving = false;

      // Vehicles: dodge sometimes, otherwise get run down.
      if (ctx.vehicle && n.state !== "hit") {
        const v = ctx.vehicle;
        const dv = Math.hypot(v.x - p.x, v.z - p.z);
        if (dv < v.radius + 0.75 && Math.abs(v.speed) > 3.5) {
          if (hit(n, p.x - v.x, p.z - v.z, 1.15)) ctx.onHit(n, "ram");
        } else if (n.state !== "leap" && dv < 7 && Math.abs(v.speed) > 6 && n.cooldown <= 0) {
          n.cooldown = 2.5;
          if (Math.random() < 0.45) {
            // Flip sideways out of the way.
            const ax = -(v.z - p.z) / (dv || 1), az = (v.x - p.x) / (dv || 1);
            const s = Math.random() < 0.5 ? 1 : -1;
            leap(n, p.x + ax * s * 5, p.z + az * s * 5, 3);
          }
        }
      }
      n.cooldown -= dt;

      switch (n.state) {
        case "idle":
          face(n, ctx.px, ctx.pz, dt, 2);
          if (dPlayer < 34) {
            if (n.onRoof) {
              const a = n.angle;
              leap(n, ctx.px + Math.cos(a) * 6, ctx.pz + Math.sin(a) * 6, 4, true);
              n.onRoof = false;
            } else n.state = "engage";
          }
          break;
        case "engage": {
          n.angle += dt * 0.5;
          const r = 5.5 + Math.sin(n.t * 0.3 + n.i) * 1.2;
          const tx = ctx.px + Math.cos(n.angle) * r, tz = ctx.pz + Math.sin(n.angle) * r;
          moving = moveToward(n, tx, tz, 6.5, dt) > 1;
          face(n, ctx.px, ctx.pz, dt);
          n.timer -= dt;
          if (n.timer <= 0 && ctx.onFoot && dPlayer < 12) {
            n.state = "dash";
            n.timer = 0.7;
          } else if (n.timer <= 0) n.timer = 1 + Math.random() * 2;
          break;
        }
        case "dash":
          moving = true;
          moveToward(n, ctx.px, ctx.pz, 12, dt);
          face(n, ctx.px, ctx.pz, dt, 14);
          n.timer -= dt;
          if (ctx.onFoot && dPlayer < 1.3) {
            ctx.kickPlayer(ctx.px - p.x, ctx.pz - p.z);
            n.state = "engage";
            n.timer = 3 + Math.random() * 3;
            n.angle += Math.PI; // retreat to the far side
          } else if (n.timer <= 0) {
            n.state = "engage";
            n.timer = 2 + Math.random() * 3;
          }
          break;
        case "leap":
        case "hit": {
          n.vel.y -= GRAVITY * dt;
          const nx = p.x + n.vel.x * dt, nz = p.z + n.vel.z * dt;
          const r = n.state === "hit" || n.free ? { x: nx, z: nz } : collision.resolveMove(p.x, p.z, nx, nz, 0.4);
          p.x = r.x;
          p.z = r.z;
          p.y += n.vel.y * dt;
          if (n.state === "hit") {
            n.group.rotation.x += dt * 9;
            n.group.rotation.z += dt * 5;
            n.timer -= dt;
            if (n.timer <= 0 || (p.y <= GROUND_Y && n.vel.y < 0)) {
              poofs.push(makePoof(scene, p.x, Math.max(1, p.y + 0.8), p.z));
              scene.remove(n.group);
              n.state = "gone";
              defeated++;
              ctx.onDefeat(n);
            }
          } else if (p.y <= GROUND_Y && n.vel.y < 0) {
            p.y = GROUND_Y;
            n.state = "engage";
            n.timer = 1.5 + Math.random() * 2;
          }
          break;
        }
      }
      animate(n, dt, moving);
    }
  }

  // Nearest ninja that can be taken down from (x, z) within range.
  function nearest(x, z, range = 2.9) {
    let best = null, bd = range;
    for (const n of ninjas) {
      if (n.state === "gone" || n.state === "hit" || n.onRoof) continue;
      const d = Math.hypot(n.group.position.x - x, n.group.position.z - z);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  return {
    update,
    hit,
    nearest,
    get total() { return ninjas.length; },
    get defeated() { return defeated; },
    get remaining() { return ninjas.length - defeated; },
    positions() {
      return ninjas.filter((n) => n.state !== "gone").map((n) => n.group.position);
    },
    dispose() {
      for (const n of ninjas) scene.remove(n.group);
    },
  };
}
