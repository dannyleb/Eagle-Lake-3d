import * as THREE from "three";
import { buildChainsaw } from "./gary.js";
import { toonify } from "./render/toon.js";
import {
  startChainsaw, stopChainsaw, revChainsaw, playTimber, playThud, playLadderCreak, playOof,
} from "./audio/index.js";

// Gary Jones's tree work: the trees themselves (the poplar growing through
// the Treehouse bar, the big oak downtown with a dead limb), and the two
// jobs the missions run on them:
//
//   createSawJob     fire up the chainsaw, tap E to cut, the tree falls
//   createLadderJob  tap E to climb a rickety ladder (he might fall: try
//                    again, it gets kinder each time), then saw the limb
//
// Jobs share an interface with fishing (see missions "job" step): spot,
// facing, begin(), press(), prompt(), status(), update(dt, time), end(),
// active, done.

const GROUND_Y = 0.16; // where people's feet are
const BARK = 0x6b4f35, LEAF = 0x3f8f3a, LEAF2 = 0x4ea34a, DEAD = 0x8a7a66;

function mesh(geo, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// A tall, skinny poplar. cut() drops it (toward `yaw`); after it lands it's
// hauled off, leaving the stump.
export function createPoplar(scene, x, z) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.add(mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.55, 12), BARK, 0, 0.27, 0)); // stump
  const tree = new THREE.Group();
  const lean = new THREE.Group();
  lean.position.y = 0.55;
  tree.add(lean);
  lean.add(mesh(new THREE.CylinderGeometry(0.28, 0.45, 15, 10), BARK, 0, 7.5, 0));
  for (let i = 0; i < 6; i++) {
    const r = 1.5 + Math.sin(i * 1.7) * 0.35 + (i < 3 ? i * 0.25 : (5 - i) * 0.25);
    const blob = mesh(new THREE.SphereGeometry(1, 10, 8), i % 2 ? LEAF : LEAF2, Math.sin(i * 2.3) * 0.3, 6.8 + i * 1.75, Math.cos(i * 2.3) * 0.3);
    blob.scale.set(r, 1.5, r);
    lean.add(blob);
  }
  root.add(tree);
  scene.add(root);

  let state = "standing", angle = 0, vel = 0, t = 0;
  function cut(yaw = 0, immediate = false) {
    tree.rotation.y = yaw;
    if (immediate) {
      root.remove(tree);
      state = "gone";
      return;
    }
    state = "falling";
    vel = 0.15;
  }
  function update(dt) {
    if (state === "falling") {
      vel += dt * 2.2 * Math.sin(angle + 0.2); // tips over faster as it goes
      angle += vel * dt;
      if (angle >= Math.PI / 2 - 0.05) {
        angle = Math.PI / 2 - 0.05;
        vel = -vel * 0.25;
        if (Math.abs(vel) < 0.05) {
          state = "down";
          t = 0;
          playThud(true);
        }
      }
      lean.rotation.x = angle;
    } else if (state === "down") {
      t += dt;
      if (t > 9) cut(tree.rotation.y, true); // hauled off
    }
  }
  return {
    root, cut, update,
    get fallen() { return state === "down" || state === "gone"; },
    get standing() { return state === "standing"; },
  };
}

// The big old oak: wide canopy, a dead limb out over the street, and a
// rickety ladder leaned on the street side. Ladder base and rung positions
// are for the climbing job.
export function createOak(scene, x, z) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.add(mesh(new THREE.CylinderGeometry(0.6, 0.85, 7.4, 12), BARK, 0, 3.7, 0));
  const canopy = [];
  for (const [bx, by, bz, r] of [[0, 9.2, 0, 3.6], [-2.4, 8.4, 1.6, 2.8], [1.4, 8.6, -2.4, 2.9], [-1.8, 8.8, -1.8, 2.6], [1.6, 10.6, 1.2, 2.6], [-0.6, 11.2, -0.4, 2.4]]) {
    const b = mesh(new THREE.SphereGeometry(1, 12, 9), r > 3 ? LEAF : LEAF2, bx, by, bz);
    b.scale.set(r, r * 0.72, r);
    root.add(b);
    canopy.push(b);
  }
  // While Gary's up the ladder the leaves go see-through, so the camera
  // (up above) can see him and the limb.
  function seeThrough(on) {
    for (const b of canopy) {
      b.material.transparent = on;
      b.material.opacity = on ? 0.3 : 1;
      b.material.depthWrite = !on;
      b.castShadow = !on;
    }
  }
  // The dead limb, out east over McCarty: a pivot at the trunk.
  const limb = new THREE.Group();
  limb.position.set(0.5, 6.2, 0);
  const wood = mesh(new THREE.CylinderGeometry(0.14, 0.3, 5.2, 8), DEAD, 0, 2.6, 0);
  limb.add(wood);
  for (const [ty, s] of [[3.2, 1], [4.4, -1]]) {
    const twig = mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.4, 6), DEAD, 0.4 * s, ty, 0);
    twig.rotation.z = -0.8 * s;
    limb.add(twig);
  }
  limb.rotation.z = -1.2; // reaching out (+x) and a little up
  root.add(limb);

  // Rickety ladder: weathered rails, uneven rungs, leaning on the trunk.
  const base = { x: 2.6, z: 0 }, topY = 6.0, topX = 0.85;
  const len = Math.hypot(base.x - topX, topY);
  const ladder = new THREE.Group();
  ladder.position.set(base.x, 0, base.z);
  ladder.rotation.z = Math.atan2(base.x - topX, topY);
  const rails = 0x9b8a6c;
  for (const s of [-1, 1]) ladder.add(mesh(new THREE.BoxGeometry(0.09, len, 0.09), rails, 0, len / 2, s * 0.28));
  const RUNGS = 7;
  for (let i = 1; i <= RUNGS; i++) {
    const r = mesh(new THREE.BoxGeometry(0.07, 0.07, 0.56), i === 4 ? 0x7a6a50 : rails, 0, (i * len) / (RUNGS + 1), 0);
    r.rotation.x = Math.sin(i * 3.1) * 0.06; // none of them quite level
    ladder.add(r);
  }
  root.add(ladder);
  scene.add(root);

  let limbState = "on", fallVel = 0, groundT = 0;
  const limbWorld = new THREE.Vector3();
  function dropLimb(immediate = false) {
    if (immediate) {
      root.remove(limb);
      limbState = "gone";
      return;
    }
    limbState = "falling";
    fallVel = 0;
    limb.getWorldPosition(limbWorld);
  }
  function update(dt) {
    if (limbState === "falling") {
      fallVel += 9.8 * dt;
      limb.position.y -= fallVel * dt;
      limb.rotation.z += dt * 1.2; // swings down as it drops
      if (limb.position.y <= 0.25) {
        limb.position.y = 0.25;
        limb.rotation.z = -Math.PI / 2;
        limbState = "down";
        groundT = 0;
        playThud(true);
      }
    } else if (limbState === "down") {
      groundT += dt;
      if (groundT > 9) dropLimb(true); // hauled off
    }
  }
  // Where Gary stands on rung k (0 = ground), world coordinates.
  function rungPos(k, out) {
    const f = Math.min(1, (k * len) / (RUNGS + 1) / len);
    return out.set(x + base.x + (topX - base.x) * f + 0.45, GROUND_Y + topY * f * 0.92, z + base.z);
  }
  return {
    root, ladder, update, dropLimb, rungPos, seeThrough, rungs: RUNGS,
    spot: { x: x + base.x + 0.45, z: z + base.z },
    get limbDown() { return limbState === "down" || limbState === "gone"; },
    get limbOn() { return limbState === "on"; },
  };
}

// Sawdust: little chips spraying off the cut.
function createSawdust(scene) {
  const n = 40;
  const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xe8c48a }), n);
  m.frustumCulled = false;
  scene.add(m);
  const bits = Array.from({ length: n }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() }));
  const M = new THREE.Matrix4(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  let next = 0;
  return {
    spray(at, count = 6) {
      for (let i = 0; i < count; i++) {
        const b = bits[next++ % n];
        b.life = 0.8;
        b.p.copy(at);
        b.v.set((Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3);
      }
    },
    update(dt) {
      bits.forEach((b, i) => {
        if (b.life <= 0) return m.setMatrixAt(i, ZERO);
        b.life -= dt;
        b.v.y -= 9 * dt;
        b.p.addScaledVector(b.v, dt);
        m.setMatrixAt(i, b.life > 0 ? M.makeTranslation(b.p.x, Math.max(0.03, b.p.y), b.p.z) : ZERO);
      });
      m.instanceMatrix.needsUpdate = true;
    },
    dispose() { scene.remove(m); },
  };
}

// Shared chainsaw handling for both jobs: tap E to cut, the saw revs and
// sprays sawdust, the arm jiggles. Returns progress 0..1.
function createSawing(player, cutAt, taps) {
  let progress = 0, revT = 0, angle = -1.0;
  return {
    press() {
      progress = Math.min(1, progress + 1 / taps);
      revT = 0.35;
      revChainsaw(true);
    },
    update(dt, time, dust) {
      revT -= dt;
      if (revT <= 0) revChainsaw(false);
      angle = -1.0 + (revT > 0 ? Math.sin(time * 60) * 0.04 : 0);
      player.toolArm(angle);
      if (revT > 0 && Math.random() < dt * 30) dust.spray(cutAt, 3);
    },
    get progress() { return progress; },
  };
}

// The Treehouse: walk up to the poplar, saw it down.
export function createSawJob({ scene, player, tree, spot, say }) {
  const saw = buildChainsaw();
  saw.rotation.x = 1.0; // cancels the arm's tilt: bar level, pointing at the trunk
  toonify(saw);
  const dust = createSawdust(scene);
  const facing = Math.atan2(tree.root.position.x - spot.x, tree.root.position.z - spot.z);
  const cutAt = new THREE.Vector3(tree.root.position.x, 0.9, tree.root.position.z);
  let state = "idle", sawing = null, t = 0;

  return {
    spot,
    facing,
    begin() {
      player.holdTool(saw);
      state = "ready";
    },
    press() {
      if (state === "ready") {
        startChainsaw();
        say("BRRRAAAP! Tap E to cut!", 1600);
        sawing = createSawing(player, cutAt, 12);
        state = "sawing";
      } else if (state === "sawing") {
        sawing.press();
        if (sawing.progress >= 1) {
          stopChainsaw();
          playTimber();
          say("TIMBER!", 2000);
          tree.cut(facing + Math.PI * 0.75); // away from Gary and the street
          state = "falling";
          t = 0;
        }
      }
    },
    prompt() {
      if (state === "ready") return { text: "Fire up the chainsaw", action: "SAW" };
      if (state === "sawing") return { text: "Tap fast to cut!", action: "CUT" };
      return null;
    },
    status() {
      if (state === "ready") return { sub: "Tap E to start the saw", meter: null };
      if (state === "sawing") return { sub: `Cutting... ${Math.round(sawing.progress * 100)}%`, meter: { frac: sawing.progress, label: "CUT! TAP E!", hot: false } };
      return { sub: "TIMBER!", meter: null };
    },
    update(dt, time) {
      if (state === "sawing") sawing.update(dt, time, dust);
      else if (state !== "idle") player.toolArm(-1.0);
      tree.update(dt);
      dust.update(dt);
      if (state === "falling" && tree.fallen) {
        t += dt;
        if (t > 0.6) state = "done";
      }
    },
    end() {
      stopChainsaw();
      player.holdTool(null);
      dust.dispose();
      state = "idle";
    },
    get active() { return state !== "idle"; },
    get done() { return state === "done"; },
  };
}

// The big oak downtown: climb the rickety ladder (tap E per rung; it might
// buck him off), saw off the dead limb at the top, climb back down.
export function createLadderJob({ scene, player, oak, say }) {
  const saw = buildChainsaw();
  saw.rotation.x = 1.0;
  toonify(saw);
  const dust = createSawdust(scene);
  const facing = -Math.PI / 2; // facing the trunk (west)
  const cutAt = new THREE.Vector3(oak.root.position.x + 0.7, 6.3, oak.root.position.z);
  const pos = new THREE.Vector3(), from = new THREE.Vector3();
  let state = "idle", rung = 0, t = 0, falls = 0, sawing = null, wobble = 0;

  // Chance of the ladder bucking him off on rung k: worse higher up, and
  // kinder after every fall; from the fourth try on he always makes it.
  const fallChance = (k) => (falls >= 3 ? 0 : (0.07 + 0.025 * k) * Math.pow(0.6, falls));

  function place(k) {
    oak.rungPos(k, pos);
    player.group.position.set(pos.x, pos.y, pos.z);
    player.group.rotation.set(0, facing, 0);
    player.state.heading = facing;
  }

  return {
    spot: oak.spot,
    facing,
    begin() {
      state = "base";
      rung = 0;
      place(0);
      oak.seeThrough(true);
    },
    press() {
      if (state === "base" || state === "holding") {
        // Up one rung.
        playLadderCreak();
        wobble = 0.5;
        if (Math.random() < fallChance(rung + 1)) {
          state = "falling";
          t = 0;
          from.copy(player.group.position);
          falls++;
          return;
        }
        oak.rungPos(rung, from);
        rung++;
        state = "climbing";
        t = 0;
      } else if (state === "top") {
        startChainsaw();
        say("BRRRAAAP! Tap E to cut the limb!", 1600);
        sawing = createSawing(player, cutAt, 10);
        state = "sawing";
      } else if (state === "sawing") {
        sawing.press();
        if (sawing.progress >= 1) {
          stopChainsaw();
          playTimber();
          say("Look out below!", 1800);
          oak.dropLimb();
          state = "dropping";
          t = 0;
        }
      }
    },
    prompt() {
      if (state === "base") return { text: rung === 0 ? "Climb the rickety ladder" : "Keep climbing", action: "CLIMB" };
      if (state === "holding") return { text: "Keep climbing", action: "CLIMB" };
      if (state === "top") return { text: "Fire up the chainsaw", action: "SAW" };
      if (state === "sawing") return { text: "Tap fast to cut the limb!", action: "CUT" };
      return null;
    },
    status() {
      const tries = falls ? ` · falls: ${falls}` : "";
      switch (state) {
        case "base": case "holding": case "climbing":
          return { sub: `Tap E to climb · rung ${rung} of ${oak.rungs}${tries}`, meter: { frac: rung / oak.rungs, label: "CLIMB! TAP E", hot: false } };
        case "falling": return { sub: "Whoa-oh-oh!", meter: null };
        case "down": return { sub: "Ow. Shake it off...", meter: null };
        case "dropping": return { sub: "Look out below!", meter: null };
        case "descending": return { sub: "Climbing back down...", meter: null };
        case "top": return { sub: "At the top. Tap E to start the saw", meter: null };
        case "sawing": return { sub: `Cutting the limb... ${Math.round(sawing.progress * 100)}%`, meter: { frac: sawing.progress, label: "CUT! TAP E!", hot: false } };
        default: return { sub: "Got it!", meter: null };
      }
    },
    update(dt, time) {
      t += dt;
      wobble = Math.max(0, wobble - dt * 1.5);
      oak.ladder.rotation.x = Math.sin(time * 25) * 0.05 * wobble; // rickety
      if (state === "climbing") {
        const k = Math.min(1, t / 0.35);
        oak.rungPos(rung, pos);
        player.group.position.lerpVectors(from, pos, k);
        if (k >= 1) {
          if (rung >= oak.rungs) {
            state = "top";
            player.holdTool(saw);
            player.toolArm(-1.0);
            say("Made it! Now cut that limb.", 1600);
          } else state = "holding";
        }
      } else if (state === "falling") {
        // The ladder bucks; he goes over backwards and lands hard.
        oak.ladder.rotation.x = Math.sin(t * 30) * 0.15 * Math.max(0, 1 - t);
        const k = Math.min(1, t / 0.6);
        player.group.position.set(from.x + k * 1.2, GROUND_Y + (from.y - GROUND_Y) * (1 - k * k), from.z);
        player.group.rotation.set(-k * 1.2, facing, 0);
        if (k >= 1) {
          playThud(false);
          playOof();
          say(falls >= 3 ? "OOF! That ladder's out to get you. One more go: you've got this." : "OOF! The rickety old ladder bucked you off. Climb back up!", 2400);
          state = "down";
          t = 0;
        }
      } else if (state === "down") {
        if (t > 1) {
          rung = 0;
          place(0);
          state = "base";
        }
      } else if (state === "sawing") {
        sawing.update(dt, time, dust);
      } else if (state === "dropping") {
        if (oak.limbDown) {
          // Climb back down.
          state = "descending";
          t = 0;
          from.copy(player.group.position);
          player.holdTool(null);
        }
      } else if (state === "descending") {
        const k = Math.min(1, t / 1.2);
        oak.rungPos(0, pos);
        player.group.position.lerpVectors(from, pos, k);
        if (k >= 1) state = "done";
      }
      oak.update(dt);
      dust.update(dt);
    },
    end() {
      stopChainsaw();
      player.holdTool(null);
      player.group.position.y = GROUND_Y;
      player.group.rotation.set(0, player.state.heading, 0);
      oak.seeThrough(false);
      dust.dispose();
      state = "idle";
    },
    get active() { return state !== "idle"; },
    get done() { return state === "done"; },
  };
}
