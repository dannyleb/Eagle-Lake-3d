import * as THREE from "three";
import { wrapAngle } from "./assist.js";
import { railAttach } from "./missions/nav.js";
import { makeWheelTexture, makeGrilleTexture } from "./textures.js";

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const tube = (pts, r, mat, seg = 24) =>
  new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), seg, r, 8), mat);

// ---------------- Green Dog: Sidney's beach cruiser ----------------
// White curved double-tube cruiser frame, red rims and fenders, cream
// balloon tires, swept-back bars, a wire basket with the "FIRE DEPT 1399"
// plate and a little red/blue light on the bars — like the photos.
export function buildBike() {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0xf6f5ef, roughness: 0.35, metalness: 0.25 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd2302a, roughness: 0.35, metalness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0xefe6d2, roughness: 0.85 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.7 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dcdf, roughness: 0.2, metalness: 0.9 });
  const spokes = new THREE.MeshStandardMaterial({
    map: canvasTex(128, 128, (ctx) => {
      ctx.strokeStyle = "#e8e8e8";
      ctx.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(64 + Math.cos(a) * 6, 64 + Math.sin(a + 0.3) * 6);
        ctx.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62);
        ctx.stroke();
      }
      ctx.fillStyle = "#cfcfcf";
      ctx.beginPath();
      ctx.arc(64, 64, 9, 0, Math.PI * 2);
      ctx.fill();
    }),
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    metalness: 0.6,
    roughness: 0.3,
  });

  const wheels = [];
  for (const wz of [0.82, -0.82]) {
    const w = new THREE.Group();
    w.position.set(0, 0.4, wz);
    const spin = new THREE.Group();
    const tireG = new THREE.TorusGeometry(0.37, 0.075, 10, 28);
    tireG.rotateY(Math.PI / 2);
    spin.add(new THREE.Mesh(tireG, tireMat));
    const rimG = new THREE.TorusGeometry(0.31, 0.03, 6, 28);
    rimG.rotateY(Math.PI / 2);
    spin.add(new THREE.Mesh(rimG, red));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.31, 24), spokes);
    disc.rotation.y = Math.PI / 2;
    spin.add(disc);
    w.add(spin);
    const arc = wz > 0 ? 2.1 : 2.5;
    const fG = new THREE.TorusGeometry(0.46, 0.035, 6, 20, arc);
    fG.rotateZ(Math.PI / 2 - arc / 2 + (wz > 0 ? 0.25 : -0.2));
    fG.rotateY(Math.PI / 2);
    const fender = new THREE.Mesh(fG, red);
    fender.scale.set(2.4, 1, 1);
    w.add(fender);
    g.add(w);
    wheels.push(spin);
  }

  // Frame
  g.add(tube([[0, 0.92, 0.66], [0, 0.86, 0.36], [0, 0.69, 0.08], [0, 0.52, -0.12], [0, 0.38, -0.08]], 0.032, frame));
  g.add(tube([[0, 0.76, 0.63], [0, 0.66, 0.38], [0, 0.5, 0.14], [0, 0.36, -0.02]], 0.032, frame));
  g.add(tube([[0, 0.34, -0.06], [0, 0.62, -0.22], [0, 0.92, -0.38]], 0.03, frame, 8));
  g.add(tube([[0, 0.6, 0.62], [0, 0.82, 0.67], [0, 1.0, 0.71]], 0.04, frame, 8));
  for (const sx of [-0.07, 0.07]) {
    g.add(tube([[0, 0.35, -0.06], [sx, 0.38, -0.5], [sx, 0.4, -0.82]], 0.022, frame, 8));
    g.add(tube([[0, 0.86, -0.34], [sx, 0.62, -0.6], [sx, 0.4, -0.82]], 0.022, frame, 8));
    g.add(tube([[0, 0.62, 0.62], [sx, 0.5, 0.74], [sx, 0.4, 0.82]], 0.024, frame, 8));
  }
  // Swept-back cruiser bars + grips
  g.add(tube([[-0.36, 1.06, 0.46], [-0.3, 1.09, 0.6], [0, 1.06, 0.73], [0.3, 1.09, 0.6], [0.36, 1.06, 0.46]], 0.022, chrome, 20));
  for (const sx of [-0.36, 0.36]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), black);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(sx, 1.06, 0.42);
    g.add(grip);
  }
  // Little red/blue light bar and siren, like the real one
  const lightR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0x550000 }));
  lightR.position.set(-0.06, 1.12, 0.74);
  const lightB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x2a5bff, emissive: 0x000a55 }));
  lightB.position.set(0.06, 1.12, 0.74);
  g.add(lightR, lightB);

  // Saddle on springs
  const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8), new THREE.MeshStandardMaterial({ color: 0x2a1e17, roughness: 0.6 }));
  saddle.scale.set(0.36, 0.13, 0.42);
  saddle.position.set(0, 1.0, -0.42);
  g.add(saddle);
  for (const sx of [-0.08, 0.08]) {
    const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 6), chrome);
    spring.position.set(sx, 0.94, -0.5);
    g.add(spring);
  }

  // Chain guard, chainring, cranks
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.66), red);
  guard.position.set(0.1, 0.38, -0.42);
  g.add(guard);
  const crank = new THREE.Group();
  crank.position.set(0, 0.34, -0.06);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 16), chrome);
  ring.rotation.z = Math.PI / 2;
  ring.position.x = 0.08;
  crank.add(ring);
  for (const side of [-1, 1]) {
    const armM = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.17, 0.03), chrome);
    armM.position.set(side * 0.12, side * 0.085, 0);
    crank.add(armM);
    const pedalM = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.08), black);
    pedalM.position.set(side * 0.18, side * 0.17, 0);
    crank.add(pedalM);
  }
  g.add(crank);

  // Wire basket with the fire dept plate and a water bottle
  const wireTex = canvasTex(64, 64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.strokeStyle = "#ececec";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 64; i += 10) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 64); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(64, i); ctx.stroke();
    }
  });
  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.3, 0.36),
    new THREE.MeshStandardMaterial({ map: wireTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 })
  );
  basket.position.set(0, 0.98, 0.95);
  g.add(basket);
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.3),
    new THREE.MeshBasicMaterial({
      map: canvasTex(128, 148, (ctx) => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 128, 148);
        ctx.fillStyle = "#1f3b8a";
        ctx.save();
        ctx.translate(64, 58);
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(-10, -6);
          ctx.lineTo(10, -6);
          ctx.lineTo(24, -44);
          ctx.lineTo(-24, -44);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("FIRE", 64, 54);
        ctx.fillText("DEPT", 64, 68);
        ctx.fillStyle = "#c0392b";
        ctx.font = "bold 30px serif";
        ctx.fillText("1399", 64, 136);
      }),
    })
  );
  plate.position.set(0, 0.98, 1.135);
  g.add(plate);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 10), chrome);
  bottle.position.set(-0.1, 1.12, 0.92);
  g.add(bottle);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.wheels = wheels;
  g.userData.crank = crank;
  // Where the rider sits, in bike-local coordinates.
  g.userData.seat = new THREE.Vector3(0, 0.28, -0.46);
  return g;
}

// ---------------- The '70: a Chevelle-inspired muscle car ----------------
// Built from an extruded side profile (long hood, short semi-fastback deck),
// finished in metallic green with white hood and trunk stripes, dual
// headlights, chrome bumpers, rally wheels and raised white letters. No
// manufacturer badges or logos anywhere.
export function buildCar() {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0x1f5c37, roughness: 0.28, metalness: 0.55 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xf6f4ec, roughness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x223a4e, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe1e4e6, roughness: 0.15, metalness: 0.95 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.8 });
  const interior = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.9 });

  const profile = [
    [-2.55, 0.34], [2.55, 0.34], [2.64, 0.5], [2.6, 0.8], [1.05, 0.9], [0.84, 0.93],
    [0.12, 1.33], [-0.95, 1.35], [-1.55, 1.12], [-1.98, 0.96], [-2.52, 0.93], [-2.64, 0.62],
  ];
  const shape = new THREE.Shape(profile.map(([u, v]) => new THREE.Vector2(u, v)));
  const halfW = 0.89;
  const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: halfW * 2, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.05, bevelSegments: 3, curveSegments: 4 });
  bodyGeo.rotateY(-Math.PI / 2);
  bodyGeo.translate(halfW, 0, 0);
  g.add(new THREE.Mesh(bodyGeo, paint));

  // Side windows
  const winShape = new THREE.Shape([[0.7, 0.96], [0.15, 1.29], [-0.92, 1.31], [-1.42, 1.1], [-1.36, 0.97]].map(([u, v]) => new THREE.Vector2(u, v)));
  for (const side of [-1, 1]) {
    const wg = new THREE.ExtrudeGeometry(winShape, { depth: 0.02, bevelEnabled: false });
    wg.rotateY(-Math.PI / 2);
    const win = new THREE.Mesh(wg, glass);
    win.position.x = side > 0 ? halfW + 0.1 : -halfW - 0.08;
    g.add(win);
  }
  // Windshield and back glass, laid on the profile's slopes
  // a = lower edge, b = upper edge, both as [z, y] on the profile.
  const slopePane = (a, b, w) => {
    const vz = b[0] - a[0], vy = b[1] - a[1];
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, Math.hypot(vz, vy)), glass);
    pane.position.set(0, (a[1] + b[1]) / 2 + 0.02, (a[0] + b[0]) / 2);
    pane.rotation.x = Math.atan2(vz, vy);
    return pane;
  };
  const ws = slopePane([0.84, 0.93], [0.12, 1.33], 1.62);
  ws.position.z += 0.02;
  g.add(ws);
  const rw = slopePane([-1.55, 1.12], [-0.95, 1.35], 1.5);
  rw.rotation.x += Math.PI;
  g.add(rw);

  // SS-style stripes on hood and trunk
  const stripeOn = (a, b) => {
    for (const sx of [-0.3, 0.3]) {
      const dz = a[0] - b[0], dy = a[1] - b[1];
      const len = Math.hypot(dz, dy);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, len), stripe);
      s.position.set(sx, (a[1] + b[1]) / 2 + 0.015, (a[0] + b[0]) / 2);
      s.rotation.x = Math.atan2(-dy, dz);
      g.add(s);
    }
  };
  stripeOn([2.58, 0.8], [0.86, 0.92]);
  stripeOn([-1.98, 0.96], [-2.5, 0.93]);

  // Cowl-induction hood bulge
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 1.1), paint);
  cowl.position.set(0, 0.95, 1.35);
  g.add(cowl);

  // Grille, dual headlights, bumpers, taillights
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), new THREE.MeshStandardMaterial({ map: makeGrilleTexture(), roughness: 0.4, metalness: 0.5 }));
  grille.position.set(0, 0.64, 2.69);
  g.add(grille);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff6d0, emissive: 0x665a20, roughness: 0.1 });
  for (const hx of [-0.72, -0.52, 0.52, 0.72]) {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.09, 14), lampMat);
    lamp.position.set(hx, 0.65, 2.7);
    g.add(lamp);
  }
  for (const [z, w] of [[2.68, 1.98], [-2.7, 1.96]]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(w, 0.17, 0.2), chrome);
    bumper.position.set(0, 0.42, z);
    g.add(bumper);
  }
  const tail = new THREE.MeshStandardMaterial({ color: 0xb3241c, emissive: 0x3a0000 });
  for (const tx of [-0.62, 0.62]) {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.04), tail);
    tl.position.set(tx, 0.42, -2.81);
    g.add(tl);
  }
  for (const side of [-1, 1]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 4.6), chrome);
    trim.position.set(side * (halfW + 0.085), 0.88, 0);
    g.add(trim);
  }
  const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.14), chrome);
  mirror.position.set(halfW + 0.15, 1.0, 0.65);
  g.add(mirror);

  // Interior: bench seat and wheel, visible through the glass
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.55), interior);
  seat.position.set(0, 0.4, -0.45);
  g.add(seat);
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 16), black);
  wheelRim.position.set(0.42, 1.0, 0.25);
  wheelRim.rotation.x = -0.9;
  g.add(wheelRim);

  // Rally wheels with raised white letters
  const rally = new THREE.MeshStandardMaterial({ map: makeWheelTexture(6, "#cfd2d4", "#4a4f55"), roughness: 0.35, metalness: 0.6 });
  const wheels = [];
  for (const [wx, wz] of [[-0.86, 1.62], [0.86, 1.62], [-0.86, -1.45], [0.86, -1.45]]) {
    const w = new THREE.Group();
    w.position.set(wx, 0.4, wz);
    const spin = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 18), black);
    t.rotation.z = Math.PI / 2;
    spin.add(t);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.26, 18), rally);
    face.position.x = Math.sign(wx) * 0.155;
    face.rotation.y = Math.sign(wx) * Math.PI / 2;
    spin.add(face);
    const letters = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.018, 4, 24), stripe);
    letters.position.x = Math.sign(wx) * 0.152;
    letters.rotation.y = Math.PI / 2;
    spin.add(letters);
    w.add(spin);
    g.add(w);
    wheels.push(spin);
  }

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.wheels = wheels;
  g.userData.seat = new THREE.Vector3(0.42, 0.03, -0.38);
  return g;
}

// Vehicles run "on rails": they're locked to the street network and stay
// in the right-hand lane, and they drive themselves. Tap up once and they
// cruise; tap left/right to queue the next turn; tap down to stop (again
// to turn around). On a mission, with no turn queued, they follow the
// route. Dead ends turn you around automatically. Nothing can push you off
// the road, so there's nothing to get stuck on.
export function createVehicle(scene, type, spawn) {
  const group = type === "bike" ? buildBike() : buildCar();
  group.position.set(spawn.x, 0.16, spawn.z);
  group.rotation.y = spawn.heading;
  scene.add(group);

  const isBike = type === "bike";
  const maxSpeed = isBike ? 20 : 52;
  const accel = isBike ? 14 : 24;
  const wheels = group.userData.wheels || [];
  const state = { group, heading: spawn.heading, speed: 0, type, maxSpeed, radius: isBike ? 0.7 : 1.45, lean: 0, boost: 1 };

  let rail = null; // { a, b, s, road, len, ux, uz }
  let turnIntent = 0; // queued turn: -1 left, +1 right, 0 none
  let cruise = false; // rolling on its own after a tap of up
  const railPos = new THREE.Vector3();

  function setRail(a, b, s, road) {
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 0.01;
    rail = { a, b, s, road, len, ux: (b.x - a.x) / len, uz: (b.z - a.z) / len };
  }

  // Lock onto the nearest road (called when Sidney gets on).
  function attach() {
    const r = railAttach(group.position.x, group.position.z, state.heading);
    setRail(r.a, r.b, r.s, r.road);
  }

  const lane = () => Math.min(2.6, (rail.road?.w ?? 9) / 4);

  function railPoint(out) {
    const l = lane();
    // Right-hand side of the direction of travel.
    out.set(rail.a.x + rail.ux * rail.s - rail.uz * l, 0.16, rail.a.z + rail.uz * rail.s + rail.ux * l);
    return out;
  }

  const travelHeading = () => Math.atan2(rail.ux, rail.uz);

  // Which way to leave node b, given where the player wants to go.
  function pickNext(want) {
    const b = rail.b;
    let options = b.edges.filter((e) => e.to !== rail.a);
    if (!options.length) return null; // dead end
    let best = options[0], bestScore = -Infinity;
    for (const e of options) {
      const h = Math.atan2(e.to.x - b.x, e.to.z - b.z);
      const score = Math.cos(wrapAngle(h - want));
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  function turnAround() {
    const { a, b, s, len, road } = rail;
    setRail(b, a, len - s, road);
  }

  // opts.blocked(x, z): true if that spot is closed (lowered crossing gate).
  function update(dt, input, bounds, collision, opts = {}) {
    if (!rail) attach();
    const travel = travelHeading();

    // --- intent (D-pad / WASD taps) ---
    // Up: start cruising. Down: stop; down again when stopped: turn around
    // and go. Left/right: queue a turn for the next intersection (tap the
    // same way again to cancel). Nothing queued: follow the mission route if
    // there is one, else go straight.
    const t = input.taps || {};
    if (t.up) cruise = true;
    if (t.down) {
      if (state.speed > 1.5 && cruise) cruise = false;
      else {
        turnAround();
        state.speed = 0;
        cruise = true;
        turnIntent = 0;
      }
    }
    if (t.left) turnIntent = turnIntent === -1 ? 0 : -1;
    if (t.right) turnIntent = turnIntent === 1 ? 0 : 1;
    if (input.brake) cruise = false;
    let routeWant = null;
    if (!turnIntent && opts.routeDir) routeWant = opts.routeDir(rail.b.x, rail.b.z);
    const want = turnIntent ? travel - turnIntent * (Math.PI / 2) : routeWant ?? travel;
    const throttle = cruise ? 1 : -1;
    state.turnIntent = turnIntent;
    state.cruise = cruise;
    state.followingRoute = !turnIntent && routeWant != null;

    // --- speed ---
    const top = maxSpeed * (input.sprint && !isBike ? 1.3 : 1) * state.boost; // boost: Dr. Pebber can
    let target = Math.max(0, throttle) * top;
    // Park drives and the drive-thru lane are slow zones.
    if (rail.road && rail.road.kind === "spur") target = Math.min(target, 14);
    // Ease off for sharp corners coming up.
    const ahead = rail.len - rail.s;
    if (ahead < 6 + state.speed * 0.7) {
      const nxt = pickNext(want);
      if (nxt) {
        const turn = Math.abs(wrapAngle(Math.atan2(nxt.to.x - rail.b.x, nxt.to.z - rail.b.z) - travelHeading()));
        target = Math.min(target, Math.max(8, top * (1 - 0.55 * (turn / Math.PI))));
      }
    }
    const rate = throttle < 0 ? accel * 3 : accel * state.boost * state.boost;
    const diff = target - state.speed;
    state.speed += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
    state.speed = Math.max(0, state.speed);

    // --- advance along the network ---
    const save = { ...rail };
    let left = state.speed * dt;
    let guard = 0;
    while (left > 0 && guard++ < 8) {
      const room = rail.len - rail.s;
      if (left < room) {
        rail.s += left;
        left = 0;
        break;
      }
      left -= room;
      const nxt = pickNext(want);
      if (!nxt) {
        // Dead end: swing around and keep rolling.
        setRail(rail.b, rail.a, 0, rail.road);
        state.speed *= 0.35;
        turnIntent = 0;
        break;
      }
      const node = rail.b;
      const choices = node.edges.length - 1;
      setRail(node, nxt.to, 0, nxt.road);
      // A queued turn is used up once we actually make it.
      if (turnIntent && choices >= 2 && Math.abs(wrapAngle(travelHeading() - want)) < Math.PI / 4) turnIntent = 0;
    }
    railPoint(railPos);
    if (opts.blocked && opts.blocked(railPos.x, railPos.z)) {
      rail = save;
      state.speed = 0;
      railPoint(railPos);
    }

    // --- move with the road, and ease out any offset (corner lane changes,
    //     hopping on from the curb) so the model never snaps ---
    const p = group.position;
    const k = 1 - Math.exp(-dt * 7);
    const ex = p.x + rail.ux * state.speed * dt, ez = p.z + rail.uz * state.speed * dt;
    const cx = (railPos.x - ex) * k, cz = (railPos.z - ez) * k;
    const maxFix = (6 + state.speed * 0.5) * dt; // cap the slide when far off
    const fl = Math.hypot(cx, cz);
    const f = fl > maxFix ? maxFix / fl : 1;
    p.x = THREE.MathUtils.clamp(ex + cx * f, -bounds, bounds);
    p.z = THREE.MathUtils.clamp(ez + cz * f, -bounds, bounds);
    const prevHeading = state.heading;
    const off = Math.hypot(railPos.x - p.x, railPos.z - p.z);
    const goal = off > 2.5 && state.speed < 4 ? Math.atan2(railPos.x - p.x, railPos.z - p.z) : travelHeading();
    state.heading += wrapAngle(goal - state.heading) * Math.min(1, dt * 7);
    group.rotation.y = state.heading;

    // Lean into turns (the bike leans for real, the car just rolls a touch).
    const yawRate = wrapAngle(state.heading - prevHeading) / Math.max(dt, 1e-4);
    const targetLean = THREE.MathUtils.clamp(yawRate * (isBike ? 0.12 : 0.02) * Math.min(1, state.speed / 8), -0.45, 0.45);
    state.lean += (targetLean - state.lean) * Math.min(1, dt * 6);
    group.rotation.z = state.lean;

    const spin = (state.speed * dt) / 0.4;
    for (const w of wheels) w.rotation.x += spin;
    if (group.userData.crank) group.userData.crank.rotation.x += spin * 0.55;
  }

  return {
    group,
    state,
    update,
    // Drop off the rails (parked); the next update re-attaches wherever it is.
    park() { rail = null; state.speed = 0; cruise = false; turnIntent = 0; },
    // Brake to a stop (used when you reach an objective).
    stop() { cruise = false; turnIntent = 0; },
  };
}
