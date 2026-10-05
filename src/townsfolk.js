import * as THREE from "three";
import { makeFaceTexture, makeHeadMaterials } from "./textures.js";
import { toonify } from "./render/toon.js";
import { railAttach } from "./missions/nav.js";
import { TOWN } from "./map/layout.js";

// Townsfolk: named locals who stroll the sidewalks, turning at random
// corners, with a name tag over their heads. Walk up and press E to chat.
// They hop out of the way of the bike and the car.
//
// To add someone, append to PEOPLE: a name, where they start, a look, and
// a few lines.

// A line is plain text, or [character, text] for one only that character
// hears. "{you}" becomes the player's name.
export const PEOPLE = [
  {
    name: "Brian Weed",
    start: [-30, 2],
    look: {
      skin: "#e0b08a", shirt: 0xb83a2e, plaid: true, pants: 0x3b5a86, shoes: 0x5b3a22,
      hat: "cap", hatColor: 0x2f4f2f, hair: 0x5a3b22, face: { beard: true, browColor: "#4a3018" },
    },
    lines: [
      "{you}! You seen my truck keys anywhere?",
      "Hot one today, {you}. Hot one.",
      "Train's runnin' late again. Set your watch by it, my foot.",
      "You fixin' to ride that bike all the way to Columbus?",
    ],
  },
  {
    name: "Greg Bradbury",
    start: [64, 58],
    look: {
      skin: "#f0c29d", shirt: 0x3d8fd6, pants: 0xc9b48a, shoes: 0x2b2b2b,
      hat: null, hair: 0x8a8a86, shadesOnHead: true, face: { mustache: true, browColor: "#6b6b66" },
    },
    lines: [
      "Mornin', {you}. Big game Friday, you comin'?",
      "They finally patched that pothole on Main. Only took three years.",
      ["sidney", "Tell Bradshall to play the one about peelin'."],
      ["bradshall", "Play the one about peelin' tonight, would ya?"],
      "Goose season's comin'. Better get your blind ready.",
    ],
  },
  {
    name: "Tattoo Face Man",
    start: [118, -62],
    look: {
      skin: "#d2a07a", shirt: 0xf2f2ee, tank: true, pants: 0x2b2b30, shoes: 0x1b1b1b,
      hat: null, hair: null, earring: true, armInk: true, face: { tattoos: true, goatee: true, browColor: "#2a1d14" },
    },
    lines: [
      "Don't stare, {you}. It's art.",
      "Got a new one this week. Guess where.",
      "Stay off that lake shore. Them gators don't play.",
      "Ninjas at the Eagle Stop? Wild town, man.",
    ],
  },
  // Everyday locals (made up).
  {
    name: "Miss Darlene",
    start: [30, -4],
    look: { skin: "#f1c6a4", shirt: 0xe86a9a, pants: 0x34495e, shoes: 0xf2f2f2, hair: 0xd9a441, longHair: true, face: { blush: true, browColor: "#a7782c" } },
    lines: [
      "Lunch special at the Dairy Quake is cheese fries, hon. Don't miss it.",
      "I've poured coffee in this town for thirty-one years, {you}.",
      "You look thirsty. Grab one of them floatin' Dr. Pebbers.",
    ],
  },
  {
    name: "Coach Pete",
    start: [120, -90],
    look: { skin: "#c98f62", shirt: 0x6a1b9a, pants: 0x9e9e9e, shoes: 0xf2f2f2, hat: "cap", hatColor: 0x6a1b9a, face: { mustache: true, sunglasses: true } },
    lines: [
      "Two-a-days start Monday. Tell the boys.",
      "Hustle, {you}! Hustle!",
      "We'll take district this year. Write it down.",
    ],
  },
  {
    name: "Pastor Ray",
    start: [-60, -40],
    look: { skin: "#8d5a3b", shirt: 0xf2f2ee, pants: 0x23272e, shoes: 0x1b1b1b, hair: 0x2b2b2b, face: { glasses: true } },
    lines: [
      "Potluck Sunday, {you}. Bring the good potato salad.",
      "Bless your heart. And your bicycle.",
      "Choir could use a voice like yours.",
    ],
  },
  {
    name: "Old Man Wendel",
    start: [180, 30],
    look: { skin: "#e6b996", shirt: 0x8d6e63, plaid: true, pants: 0x4e5b31, shoes: 0x3e2723, hat: "cowboy", hatColor: 0xd8c39a, hair: 0xe0e0e0, face: { mustache: true, glasses: true, browColor: "#cfcfcf" } },
    lines: [
      "Back in my day the train stopped right here on Main.",
      "That lake used to be bigger. Or I was smaller.",
      "Kids these days and their bicycles.",
    ],
  },
  {
    name: "Rhonda",
    start: [90, 2],
    look: { skin: "#6d4127", shirt: 0x00897b, pants: 0x212121, shoes: 0x7b1fa2, hair: 0x1b1b1b, longHair: true, earring: true, face: { browColor: "#1b1b1b" } },
    lines: [
      "The bank closes at three, {you}. Three.",
      "Did you see the price of rice this year? Lord.",
      "My cousin swears she saw a ninja behind the Feed & Seed.",
    ],
  },
  {
    name: "Duck Dale",
    start: [-120, 60],
    look: { skin: "#d9a57c", shirt: 0x556b2f, plaid: true, pants: 0x5d4037, shoes: 0x3e2723, hat: "cap", hatColor: 0x8d6e63, face: { beard: true, browColor: "#5a3b22" } },
    lines: [
      "Snow geese are thick out past the dryers this year.",
      "You hear that? Specklebellies.",
      "I got a blind out by the gravel pits. Don't tell nobody.",
    ],
  },
  {
    name: "Big Earl",
    start: [-180, -60],
    look: { skin: "#f0c29d", shirt: 0xc62828, pants: 0x1a237e, shoes: 0x212121, hat: "cowboy", hatColor: 0x2b2b2b, face: { goatee: true, browColor: "#3a2a1c" } },
    lines: [
      "I could eat a whole cheese fry basket by myself. I have.",
      "That '70 of yours sounds mean, {you}.",
      "Somebody's gotta fix the stop sign on 3rd.",
    ],
  },
  {
    name: "Tripp",
    start: [0, 90],
    look: { skin: "#f6d0b0", shirt: 0x1e88e5, pants: 0x90a4ae, shoes: 0xff5722, hat: "cap", hatColor: 0xff5722, face: { blush: true } },
    lines: [
      "Summer's so boring here. Wanna race?",
      "I drank three Dr. Pebbers and I can see sounds.",
      "Is it true there's gators in the lake? Like, real ones?",
    ],
  },
  {
    name: "Nurse Patrice",
    start: [-240, 150],
    look: { skin: "#9c6644", shirt: 0x4fc3f7, pants: 0x4fc3f7, shoes: 0xf2f2f2, hair: 0x2b1d14, longHair: true, face: { glasses: true } },
    lines: [
      "Wear a helmet on that bike, {you}. I mean it.",
      "Twelve-hour shift. Don't talk to me till the Dairy Quake.",
      "Drink some water between them sodas.",
    ],
  },
  {
    name: "Farmer Gus",
    start: [-240, -150],
    look: { skin: "#d39b6c", shirt: 0xf5f5f5, pants: 0x1565c0, shoes: 0x5d4037, hat: "cowboy", hatColor: 0xf0e2b6, face: { stubble: true, browColor: "#6b4a2a" } },
    lines: [
      "Rice is lookin' good if the rain holds off.",
      "Water's up in the canals. Good year.",
      "Seen my dog? Brown, answers to Biscuit.",
    ],
  },
  {
    name: "Aunt Bev",
    start: [240, 90],
    look: { skin: "#f3c9a8", shirt: 0xab47bc, pants: 0xeceff1, shoes: 0xf2f2f2, hair: 0xb0bec5, longHair: true, face: { glasses: true, blush: true, browColor: "#9e9e9e" } },
    lines: [
      "You eatin' enough, {you}? You look thin.",
      "Come by for pie. Pecan. Don't argue.",
      ["sidney", "That Bradshall boy sure can sing."],
      ["bradshall", "You sure can sing, honey. Your mama'd be proud."],
    ],
  },
  {
    name: "Deputy Doug",
    start: [60, -150],
    look: { skin: "#c58c5c", shirt: 0x8d7b5a, pants: 0x3e3326, shoes: 0x1b1b1b, hat: "cowboy", hatColor: 0x6d5a3c, face: { sunglasses: true, mustache: true } },
    lines: [
      "Speed limit's thirty in town, {you}. Even on a soda buzz.",
      "Keep it clean out there.",
      "Nothin' ever happens here. Except ninjas, apparently.",
    ],
  },
  {
    name: "Tammy Jo",
    start: [150, 120],
    look: { skin: "#f6c9a3", shirt: 0xffb300, pants: 0x3949ab, shoes: 0xe91e63, hair: 0x6d3a1e, longHair: true, face: { blush: true, browColor: "#5a2f17" } },
    lines: [
      "Car wash fundraiser Saturday! Bring the '70.",
      "I love your hat. Well, I love somebody's hat.",
      "The Ferris Hotel's got live music Fridays, y'all.",
    ],
  },
  {
    name: "Hector",
    start: [-120, -120],
    look: { skin: "#a86e45", shirt: 0x37474f, pants: 0x263238, shoes: 0x1b1b1b, hat: "cap", hatColor: 0xd32f2f, hair: 0x1b1b1b, face: { mustache: true } },
    lines: [
      "That '70 needs a tune-up. Bring it by the shop.",
      "Green Dog's chain's lookin' dry, {you}.",
      "Busy week. Everybody hit a pothole on Main.",
    ],
  },
  {
    name: "Lou Ellen",
    start: [210, -30],
    look: { skin: "#7a4a2c", shirt: 0x43a047, pants: 0x5d4037, shoes: 0x3e2723, hair: 0xbdbdbd, face: { glasses: true } },
    lines: [
      "The museum's free on Thursdays. Nobody comes.",
      "Eagle Lake: Goose Hunting Capital of the World. Says so on the sign.",
      "I remember when the Santa Fe still ran.",
    ],
  },
];

function nameTag(text) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = "bold 44px Trebuchet MS, sans-serif";
  const w = Math.ceil(ctx.measureText(text).width) + 48;
  c.width = w;
  c.height = 72;
  ctx.font = "bold 44px Trebuchet MS, sans-serif";
  ctx.fillStyle = "rgba(27,15,46,0.88)";
  ctx.strokeStyle = "#ffd43b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(3, 3, w - 6, 66, 30);
  else ctx.rect(3, 3, w - 6, 66);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  const h = 1.05;
  s.scale.set((h * w) / 72, h, 1);
  s.renderOrder = 3;
  return s;
}

function plaidTexture(base) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#" + base.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  for (let i = 0; i < 64; i += 16) {
    ctx.fillRect(i, 0, 6, 64);
    ctx.fillRect(0, i, 64, 6);
  }
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  for (let i = 8; i < 64; i += 16) {
    ctx.fillRect(i, 0, 2, 64);
    ctx.fillRect(0, i, 64, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

export function buildPerson(look) {
  const group = new THREE.Group();
  const skinHex = new THREE.Color(look.skin).getHex();
  const skin = new THREE.MeshLambertMaterial({ color: skinHex });
  const shirt = new THREE.MeshLambertMaterial(look.plaid ? { map: plaidTexture(look.shirt) } : { color: look.shirt });
  const pants = new THREE.MeshLambertMaterial({ color: look.pants });
  const shoes = new THREE.MeshLambertMaterial({ color: look.shoes });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
  const ink = new THREE.MeshLambertMaterial({ color: 0x2c3a52 });

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  group.add(hips);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.32, 6, 12), shirt);
  torso.scale.set(1.08, 1, 0.82);
  torso.position.y = 0.43;
  hips.add(torso);
  if (look.tank) {
    // Bare shoulders and a tank top cut.
    for (const sx of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), skin);
      sh.position.set(sx * 0.3, 0.7, 0);
      hips.add(sh);
    }
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.12, 10), skin);
  neck.position.y = 0.9;
  hips.add(neck);

  const f = look.face || {};
  const faceTex = makeFaceTexture({ skin: look.skin, ...f, stubble: f.beard || f.stubble });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.42), makeHeadMaterials(faceTex, skinHex));
  head.position.y = 1.18;
  hips.add(head);
  if (f.beard) {
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.2, 0.2), new THREE.MeshLambertMaterial({ color: look.hair ?? 0x3a2a1c }));
    beard.position.set(0, 1.0, 0.13);
    hips.add(beard);
  }
  if (look.hair != null) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: look.hair }));
    hair.scale.set(0.52, 0.3, 0.48);
    hair.position.set(0, 1.4, -0.02);
    hips.add(hair);
  }
  if (look.longHair) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.14), new THREE.MeshLambertMaterial({ color: look.hair }));
    back.position.set(0, 1.08, -0.24);
    hips.add(back);
  }
  if (look.hat === "cowboy") {
    const hm = new THREE.MeshLambertMaterial({ color: look.hatColor });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.035, 20), hm);
    brim.scale.set(1, 1, 0.85);
    brim.position.y = 1.45;
    hips.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.25, 0.26, 14), hm);
    crown.scale.set(1, 1, 1.15);
    crown.position.y = 1.58;
    hips.add(crown);
  }
  if (look.hat === "cap") {
    const capMat = new THREE.MeshLambertMaterial({ color: look.hatColor });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    cap.scale.set(0.52, 0.34, 0.5);
    cap.position.set(0, 1.4, 0);
    hips.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.24), capMat);
    brim.position.set(0, 1.43, 0.31);
    brim.rotation.x = 0.12;
    hips.add(brim);
  }
  if (look.shadesOnHead) {
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.05), dark);
    shades.position.set(0, 1.47, 0.2);
    shades.rotation.x = -0.4;
    hips.add(shades);
  }
  for (const sx of [-0.24, 0.24]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin);
    ear.position.set(sx, 1.17, 0);
    hips.add(ear);
    if (look.earring && sx > 0) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12), new THREE.MeshLambertMaterial({ color: 0xe6c34a }));
      ring.position.set(sx + 0.02, 1.1, 0);
      hips.add(ring);
    }
  }

  function arm(sign) {
    const g = new THREE.Group();
    g.position.set(sign * 0.4, 0.74, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.12, 4, 8), look.tank ? skin : shirt);
    upper.position.y = -0.12;
    g.add(upper);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.28, 4, 8), skin);
    fore.position.y = -0.4;
    g.add(fore);
    if (look.armInk) {
      for (let k = 0; k < 3; k++) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.086, 0.04, 10), ink);
        band.position.y = -0.3 - k * 0.09;
        g.add(band);
      }
    }
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), skin);
    hand.position.y = -0.6;
    g.add(hand);
    return g;
  }
  const armL = arm(1), armR = arm(-1);
  hips.add(armL, armR);
  function leg(sign) {
    const g = new THREE.Group();
    g.position.set(sign * 0.15, 0.02, 0);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.84, 0.26), pants);
    p.position.y = -0.42;
    g.add(p);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.34), shoes);
    s.position.set(0, -0.9, 0.05);
    g.add(s);
    return g;
  }
  const legL = leg(1), legR = leg(-1);
  hips.add(legL, legR);

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  group.scale.setScalar(0.8);
  toonify(group);
  return { group, parts: { hips, armL, armR, legL, legR } };
}

const WALK = 1.5; // m/s, an easy stroll
const inTown = (n) => n.x > TOWN.minX - 2 && n.x < TOWN.maxX + 2 && n.z > TOWN.minZ - 2 && n.z < TOWN.maxZ + 2;
const walkable = (e) => e.road && ["main", "street", "spur"].includes(e.road.kind) && inTown(e.to);

export function createTownsfolk(scene, collision, people = PEOPLE) {
  const tmp = new THREE.Vector3();
  const folks = people.map((p, i) => {
    const { group, parts } = buildPerson(p.look);
    const tag = nameTag(p.name);
    tag.position.y = 2.75;
    group.add(tag);
    const r = railAttach(p.start[0], p.start[1], i * 1.7);
    const f = { ...p, group, parts, tag, side: i % 2 ? 1 : -1, t: Math.random() * 10, pause: 0, hop: 0, lineIdx: Math.floor(Math.random() * p.lines.length) };
    setEdge(f, r.a, r.b, r.s, r.road);
    const pt = target(f);
    group.position.set(pt.x, 0.16, pt.z);
    scene.add(group);
    return f;
  });

  function setEdge(f, a, b, s, road) {
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 0.01;
    f.e = { a, b, s, road, len, ux: (b.x - a.x) / len, uz: (b.z - a.z) / len };
  }

  // Point on the sidewalk: off the road edge on this person's side,
  // nudged around anything solid.
  function target(f) {
    const e = f.e;
    const base = (e.road?.w ?? 9) / 2 + 1.6;
    const cx = e.a.x + e.ux * e.s, cz = e.a.z + e.uz * e.s;
    const rx = -e.uz * f.side, rz = e.ux * f.side;
    for (const off of [base, base + 1.2, base - 0.7, base + 2.2]) {
      const x = cx + rx * off, z = cz + rz * off;
      if (!collision.hits(x, z, 0.35)) return tmp.set(x, 0, z);
    }
    return tmp.set(cx + rx * base, 0, cz + rz * base);
  }

  function nextEdge(f) {
    const { a, b } = f.e;
    let opts = b.edges.filter((e) => e.to !== a && walkable(e));
    if (!opts.length) opts = b.edges.filter((e) => e.to === a);
    const pick = opts[Math.floor(Math.random() * opts.length)];
    setEdge(f, b, pick.to, 0, pick.road);
    if (Math.random() < 0.25) f.side *= -1; // cross the street now and then
  }

  // ctx: { px, pz, vehicle: {x,z,speed}|null, onDodge(f), onGreet(f) }
  let greetCd = 6;
  function update(dt, ctx) {
    greetCd -= dt;
    for (const f of folks) {
      f.t += dt;
      const p = f.group.position;
      const dPlayer = Math.hypot(ctx.px - p.x, ctx.pz - p.z);
      // Out of the way of traffic!
      if (ctx.vehicle && f.hop <= 0) {
        const v = ctx.vehicle;
        if (Math.hypot(v.x - p.x, v.z - p.z) < 3.2 && Math.abs(v.speed) > 3) {
          f.hop = 0.55;
          const ax = p.x - v.x, az = p.z - v.z, l = Math.hypot(ax, az) || 1;
          f.dodge = { x: (ax / l) * 3.2, z: (az / l) * 3.2 };
          ctx.onDodge(f);
        }
      }
      let moving = false;
      if (f.hop > 0) {
        f.hop -= dt;
        p.x += f.dodge.x * dt * 1.8;
        p.z += f.dodge.z * dt * 1.8;
        p.y = 0.16 + Math.sin((1 - Math.max(0, f.hop) / 0.55) * Math.PI) * 0.8;
      } else if (f.pause > 0) {
        f.pause -= dt;
        p.y = 0.16;
        // Turn to face Sidney while chatting.
        const want = Math.atan2(ctx.px - p.x, ctx.pz - p.z);
        let d = want - f.group.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        f.group.rotation.y += d * Math.min(1, dt * 6);
      } else {
        p.y = 0.16;
        f.e.s += WALK * dt;
        let guard = 0;
        while (f.e.s > f.e.len && guard++ < 4) {
          const over = f.e.s - f.e.len;
          nextEdge(f);
          f.e.s = over;
        }
        const tgt = target(f);
        const dx = tgt.x - p.x, dz = tgt.z - p.z;
        const d = Math.hypot(dx, dz);
        const step = Math.min(d, (WALK + d * 1.5) * dt);
        if (d > 0.001) {
          p.x += (dx / d) * step;
          p.z += (dz / d) * step;
          let want = Math.atan2(dx, dz);
          let dd = want - f.group.rotation.y;
          while (dd > Math.PI) dd -= Math.PI * 2;
          while (dd < -Math.PI) dd += Math.PI * 2;
          f.group.rotation.y += dd * Math.min(1, dt * 5);
        }
        moving = true;
      }
      // Walk cycle
      const P = f.parts;
      if (moving) {
        const s = Math.sin(f.t * 6.5);
        P.legL.rotation.x = s * 0.5;
        P.legR.rotation.x = -s * 0.5;
        P.armL.rotation.x = -s * 0.4;
        P.armR.rotation.x = s * 0.4;
        P.hips.position.y = 0.95 + Math.abs(s) * 0.03;
      } else {
        for (const q of [P.legL, P.legR, P.armL, P.armR]) q.rotation.x *= 0.85;
        if (f.pause > 0) P.armR.rotation.z = -0.3 + Math.sin(f.t * 5) * 0.2; // gesturing while talking
      }
      // Say hi when you pass close by (now and then, so it doesn't nag).
      f.greetCd = (f.greetCd ?? 0) - dt;
      if (ctx.onGreet && dPlayer < 7 && f.greetCd <= 0 && greetCd <= 0 && f.hop <= 0 && !(ctx.vehicle && Math.abs(ctx.vehicle.speed) > 12)) {
        f.greetCd = 60;
        greetCd = 9;
        ctx.onGreet(f);
      }
      f.tag.visible = dPlayer < 45;
      // Far away: keep walking, skip drawing (saves draw calls on phones).
      f.group.visible = dPlayer < 150;
    }
  }

  function nearest(x, z, range = 3.2) {
    let best = null, bd = range;
    for (const f of folks) {
      const d = Math.hypot(f.group.position.x - x, f.group.position.z - z);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }

  // Next line from this person (cycles through their lines), for whoever
  // you're playing: { id, short }.
  function talk(f, who = { id: "sidney", short: "Sidney" }) {
    f.pause = 4.5;
    for (let k = 0; k < f.lines.length; k++) {
      f.lineIdx = (f.lineIdx + 1) % f.lines.length;
      const l = f.lines[f.lineIdx];
      if (typeof l === "string") return l.replaceAll("{you}", who.short);
      if (l[0] === who.id) return l[1].replaceAll("{you}", who.short);
    }
    return "Hey there.";
  }

  return { update, nearest, talk, list: folks };
}
