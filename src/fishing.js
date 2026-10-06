import * as THREE from "three";
import { buildGatorModel } from "./gators.js";
import { toonify } from "./render/toon.js";
import { playCast, playPlop, playSplash, playReelClick, playLineSnap, playSnap } from "./audio/index.js";

// Fishing for the 10-foot gator in Granny's Lake.
//
//   ready    rod in hand, T-bone steak dangling       E: cast
//   waiting  bobber out on the water, nibbles         E: reel in empty
//   bite     the gator takes it (a short window)      E: set the hook
//   reeling  tug-of-war: each E reels him closer, he pulls back
//   landing  he comes up out of the lake onto the bank, then `landed`
//
// Miss the bite and he steals the steak; let the line go slack and it
// snaps. Either way a fresh T-bone goes on and you cast again.

const WATER_Y = 0.06;
const GATOR_SCALE = 1.6; // the 10-footer
const MOUTH = 2.35; // snout tip, in gator lengths ahead of its center
const BITE_WINDOW = 1.8;
const REEL_PER_TAP = 0.075;
const REEL_DECAY = 0.07; // per second, while he fights
const ROD_LEN = 2.0;

function buildRod() {
  const rod = new THREE.Group();
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), new THREE.MeshLambertMaterial({ color: 0xc69c6d }));
  cork.position.y = 0.1;
  const blank = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.024, ROD_LEN - 0.3, 6), new THREE.MeshLambertMaterial({ color: 0x1f2a44 }));
  blank.position.y = 0.3 + (ROD_LEN - 0.3) / 2;
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), new THREE.MeshLambertMaterial({ color: 0xb8bec6 }));
  reel.rotation.z = Math.PI / 2;
  reel.position.set(0, 0.32, 0.06);
  const tip = new THREE.Object3D();
  tip.position.y = ROD_LEN;
  rod.add(cork, blank, reel, tip);
  // Held in the right hand, angled up and out from the arm.
  rod.position.set(0, -0.6, 0);
  rod.rotation.x = 2.13;
  return { rod, tip };
}

// A T-bone: a red-brown slab with the white T of bone and a fat rim.
function buildSteak() {
  const g = new THREE.Group();
  const meat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 12), new THREE.MeshLambertMaterial({ color: 0x9c3b2e }));
  meat.scale.set(1, 1, 0.75);
  const fat = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 4, 16), new THREE.MeshLambertMaterial({ color: 0xf2e6c9 }));
  fat.rotation.x = Math.PI / 2;
  fat.scale.set(1.05, 0.78, 1);
  const boneMat = new THREE.MeshLambertMaterial({ color: 0xfafaf0 });
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.3), boneMat);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.04), boneMat);
  bar.position.z = -0.13;
  g.add(meat, fat, stem, bar);
  g.rotation.x = Math.PI / 2; // hangs flat-face out
  return g;
}

function buildBobber() {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe03131 }));
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  g.add(top, bottom);
  return g;
}

// player: the player object (holdRod / rodArm). spot: { x, z } on the bank;
// cast: { x, z } where the bait lands. say(text, ms): a toast.
export function createFishing({ scene, player, spot, cast, say }) {
  const root = new THREE.Group();
  scene.add(root);
  const { rod, tip } = buildRod();
  const steak = buildSteak();
  const bobber = buildBobber();
  const gator = buildGatorModel();
  gator.group.scale.setScalar(GATOR_SCALE);
  gator.group.visible = false;
  root.add(steak, bobber, gator.group);

  // Fishing line: a sagging curve from the rod tip to the bait.
  const LINE_PTS = 16;
  const linePos = new Float32Array(LINE_PTS * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x20242a }));
  line.frustumCulled = false;
  root.add(line);

  // Ripple rings on the water.
  const ringGeo = new THREE.RingGeometry(0.8, 1, 24);
  const ripples = Array.from({ length: 8 }, () => {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    root.add(m);
    return { m, t: 1, size: 1 };
  });
  let nextRipple = 0;
  function ripple(x, z, size = 1) {
    const r = ripples[nextRipple++ % ripples.length];
    r.t = 0;
    r.size = size;
    r.m.position.set(x, WATER_Y + 0.02, z);
    r.m.visible = true;
  }

  toonify(root);
  toonify(rod);

  let state = "idle";
  let t = 0; // time in the current state
  let wait = 0; // waiting: until the bite
  let nibble = 0; // waiting: next fake-out twitch
  let tugIn = 0; // reeling: next hard pull
  let hot = 0; // reeling: flash the meter after a pull
  let progress = 0;
  let armAngle = -1.15;
  let castFrom = new THREE.Vector3();
  const target = new THREE.Vector3();
  const bait = new THREE.Vector3();
  const tipPos = new THREE.Vector3();
  const towardWater = Math.atan2(cast.x - spot.x, cast.z - spot.z);
  const dirX = Math.sin(towardWater), dirZ = Math.cos(towardWater);
  let gatorPos = new THREE.Vector3();
  let landFrom = new THREE.Vector3();

  function setState(s) {
    state = s;
    t = 0;
  }

  function readyNewSteak(msg) {
    if (msg) say(msg, 2400);
    gator.group.visible = false;
    setState("ready");
  }

  // ---- public ----
  function begin() {
    player.group.position.x = spot.x;
    player.group.position.z = spot.z;
    player.state.heading = towardWater;
    player.group.rotation.y = towardWater;
    player.holdRod(rod);
    root.visible = true;
    readyNewSteak();
  }

  function press() {
    if (state === "ready") {
      playCast();
      castFrom.copy(tipPos);
      target.set(cast.x + (Math.random() - 0.5) * 4, WATER_Y, cast.z + (Math.random() - 0.5) * 3);
      setState("casting");
    } else if (state === "waiting") {
      say("Nothing on it yet. Cast again.", 1800);
      setState("ready");
    } else if (state === "bite") {
      playSplash(true);
      say("HOOKED HIM! Tap E to reel him in!", 2200);
      progress = 0.3;
      tugIn = 1 + Math.random();
      setState("reeling");
    } else if (state === "reeling") {
      playReelClick();
      progress += REEL_PER_TAP;
      armAngle -= 0.12; // a yank on the rod
      if (progress >= 1) {
        progress = 1;
        playSplash(true);
        landFrom.copy(gatorPos);
        say("Here he comes!", 1600);
        setState("landing");
      }
    }
  }

  function prompt() {
    switch (state) {
      case "ready": return { text: "Cast the T-bone out", action: "CAST" };
      case "waiting": return { text: "Wait for a bite... (E reels in)", action: "REEL" };
      case "bite": return { text: "BITE! Set the hook!", action: "HOOK" };
      case "reeling": return { text: "Tap fast to reel him in!", action: "REEL" };
      default: return null;
    }
  }

  // Objective sub-line and reel meter for the mission UI.
  function status() {
    switch (state) {
      case "ready": return { sub: "Tap E to cast", meter: null };
      case "casting": return { sub: "Casting...", meter: null };
      case "waiting": return { sub: "Waiting for a bite...", meter: null };
      case "bite": return { sub: "BITE! Tap E!", meter: { frac: 1 - t / BITE_WINDOW, label: "BITE! TAP E!", hot: true } };
      case "reeling": return { sub: `Reel him in! ${Math.round(progress * 100)}%`, meter: { frac: progress, label: hot > 0 ? "HE'S PULLING!" : "REEL! TAP E!", hot: hot > 0 } };
      case "landing": case "landed": return { sub: "Got him!", meter: { frac: 1, label: "GOT HIM!", hot: false } };
      default: return { sub: "", meter: null };
    }
  }

  function placeGator(mouthX, mouthZ, y, yaw) {
    // Center sits behind the mouth along its facing.
    const back = MOUTH * GATOR_SCALE;
    gatorPos.set(mouthX - Math.sin(yaw) * back, y, mouthZ - Math.cos(yaw) * back);
    gator.group.position.copy(gatorPos);
    gator.group.rotation.y = yaw;
  }

  function update(dt, time) {
    if (state === "idle") return;
    t += dt;
    tip.getWorldPosition(tipPos);
    const facePlayer = Math.atan2(spot.x - target.x, spot.z - target.z);

    let slack = 0.6; // how much the line sags
    switch (state) {
      case "ready": {
        armAngle += (-1.15 - armAngle) * Math.min(1, dt * 6);
        bait.set(tipPos.x, tipPos.y - 0.9 + Math.sin(time * 3) * 0.03, tipPos.z);
        slack = 0;
        break;
      }
      case "casting": {
        const k = Math.min(1, t / 0.75);
        // Rod whips back, then forward.
        armAngle = k < 0.3 ? -1.15 - (k / 0.3) * 1.0 : -2.15 + ((k - 0.3) / 0.7) * 1.25;
        bait.lerpVectors(castFrom, target, k);
        bait.y = castFrom.y + (target.y - castFrom.y) * k + Math.sin(k * Math.PI) * 4;
        slack = 0.2;
        if (k >= 1) {
          playPlop();
          ripple(target.x, target.z, 1);
          wait = 2.5 + Math.random() * 5; // he bites when he feels like it
          nibble = 0.8 + Math.random() * 1.5;
          setState("waiting");
        }
        break;
      }
      case "waiting": {
        armAngle += (-0.95 - armAngle) * Math.min(1, dt * 4);
        nibble -= dt;
        let dip = 0;
        if (nibble < 0) {
          // A fake-out twitch: something's down there...
          dip = Math.max(0, Math.sin((-nibble / 0.35) * Math.PI)) * 0.08;
          if (nibble < -0.35) {
            ripple(target.x, target.z, 0.5);
            nibble = 1 + Math.random() * 2;
          }
        }
        bait.set(target.x, WATER_Y + Math.sin(time * 2.4) * 0.02 - dip, target.z);
        if (t > wait) {
          playSplash();
          playSnap();
          ripple(target.x, target.z, 1.6);
          gator.group.visible = true;
          setState("bite");
        }
        break;
      }
      case "bite": {
        // Bobber yanked under, the gator's head breaks the surface.
        bait.set(target.x + Math.sin(time * 30) * 0.06, WATER_Y - 0.25, target.z);
        placeGator(target.x, target.z, -0.55 * GATOR_SCALE + Math.min(1, t * 3) * 0.3, facePlayer);
        gator.jaw.rotation.x = Math.max(0, Math.sin(t * 9)) * 0.7;
        gator.tail.rotation.y = Math.sin(t * 8) * 0.5;
        if (t > BITE_WINDOW) {
          playSplash();
          ripple(target.x, target.z, 1.4);
          readyNewSteak("He stole the steak! New T-bone on. Cast again.");
        }
        break;
      }
      case "reeling": {
        // He fights: steady pull plus the occasional hard tug.
        progress -= REEL_DECAY * dt;
        tugIn -= dt;
        hot -= dt;
        if (tugIn <= 0) {
          progress -= 0.06 + Math.random() * 0.05;
          tugIn = 1.2 + Math.random() * 1.3;
          hot = 0.45;
          playSplash(true);
          ripple(gatorPos.x, gatorPos.z, 2.2);
          armAngle = -0.6; // rod bends toward the water
        }
        armAngle += (-1.05 - armAngle) * Math.min(1, dt * 5);
        if (progress <= 0) {
          playLineSnap();
          playSplash(true);
          ripple(gatorPos.x, gatorPos.z, 2.4);
          readyNewSteak("SNAP! He broke the line. New steak on. Cast again.");
          break;
        }
        // From the cast point toward the bank as you win.
        const k = progress * 0.85;
        const mx = target.x + (spot.x + dirX * 3.4 - target.x) * k;
        const mz = target.z + (spot.z + dirZ * 3.4 - target.z) * k;
        const thrash = Math.sin(time * 7) * 0.55 + Math.sin(time * 13) * 0.2;
        placeGator(mx, mz, -0.32 * GATOR_SCALE + Math.sin(time * 5) * 0.08, facePlayer + thrash);
        gator.jaw.rotation.x = Math.max(0, Math.sin(time * 6)) * 0.5;
        gator.tail.rotation.y = Math.sin(time * 11) * 0.7;
        bait.set(mx, WATER_Y + 0.2, mz);
        slack = 0;
        if (Math.random() < dt * 3) ripple(mx + (Math.random() - 0.5) * 2, mz + (Math.random() - 0.5) * 2, 1 + Math.random());
        break;
      }
      case "landing": {
        // Up and out of Granny's Lake, flopping onto the bank.
        const k = Math.min(1, t / 1.3);
        const mouthX = spot.x + dirX * 1.9, mouthZ = spot.z + dirZ * 1.9;
        const yaw = towardWater + Math.PI; // facing the player
        const back = MOUTH * GATOR_SCALE;
        const endX = mouthX - Math.sin(yaw) * back, endZ = mouthZ - Math.cos(yaw) * back;
        gatorPos.set(
          landFrom.x + (endX - landFrom.x) * k,
          landFrom.y + (0.02 - landFrom.y) * k + Math.sin(k * Math.PI) * 1.6,
          landFrom.z + (endZ - landFrom.z) * k,
        );
        gator.group.position.copy(gatorPos);
        gator.group.rotation.y = yaw + Math.sin(t * 10) * 0.3 * (1 - k);
        gator.tail.rotation.y = Math.sin(t * 12) * 0.8;
        gator.jaw.rotation.x = 0.6;
        armAngle += (-1.9 - armAngle) * Math.min(1, dt * 8); // hauling back on the rod
        bait.set(mouthX, 0.5, mouthZ);
        slack = 0;
        if (k >= 1) {
          playSplash(true);
          setState("landed");
        }
        break;
      }
      case "landed": {
        // Lying on the bank, chomping and swishing.
        gator.jaw.rotation.x = Math.max(0, Math.sin(t * 4)) * 0.8;
        gator.tail.rotation.y = Math.sin(t * 3) * 0.4;
        armAngle += (-1.2 - armAngle) * Math.min(1, dt * 4);
        bait.set(spot.x + dirX * 1.9, 0.5, spot.z + dirZ * 1.9);
        slack = 0.3;
        break;
      }
    }

    player.rodArm(armAngle);
    // The bait: the steak dangling and flying out, then the bobber on the
    // water until he takes it.
    steak.visible = state === "ready" || state === "casting";
    steak.position.copy(bait);
    bobber.visible = state === "waiting" || state === "bite";
    bobber.position.copy(bait);
    for (let i = 0; i < LINE_PTS; i++) {
      const u = i / (LINE_PTS - 1);
      linePos[i * 3] = tipPos.x + (bait.x - tipPos.x) * u;
      linePos[i * 3 + 1] = tipPos.y + (bait.y - tipPos.y) * u - Math.sin(u * Math.PI) * slack;
      linePos[i * 3 + 2] = tipPos.z + (bait.z - tipPos.z) * u;
    }
    lineGeo.attributes.position.needsUpdate = true;

    for (const r of ripples) {
      if (r.t >= 1) continue;
      r.t += dt / 1.2;
      const s = r.size * (0.4 + r.t * 2.2);
      r.m.scale.set(s, s, s);
      r.m.material.opacity = 0.55 * (1 - r.t);
      if (r.t >= 1) r.m.visible = false;
    }
  }

  // Put the rod away; the gator stays on the bank for a while, then goes.
  function end() {
    player.holdRod(null);
    for (const o of [steak, bobber, line]) o.visible = false;
    setState("idle");
    setTimeout(() => scene.remove(root), 12000);
  }

  return {
    begin, press, prompt, status, update, end,
    get state() { return state; },
    get landed() { return state === "landed"; },
    get active() { return state !== "idle"; },
  };
}
