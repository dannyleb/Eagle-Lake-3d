import * as THREE from "three";

// A small library of procedurally-drawn canvas textures. Nothing here is a
// photograph or scanned image — every texture is generated at runtime with
// the 2D canvas API, so there are no external image assets to download and
// nothing that could be mistaken for a real photo of a real place or person.

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function tileTexture(tex, repeatX, repeatY) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Sky dome: gradient + soft clouds, equirectangular-ish on a big sphere ---
export function makeSkyTexture() {
  const c = canvas(1024, 512);
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#5fa3d9");
  grad.addColorStop(0.55, "#9fd1e8");
  grad.addColorStop(0.82, "#d9ecf2");
  grad.addColorStop(1, "#e9f3e0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  const rand = mulberry32(7);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 14; i++) {
    const cx = rand() * 1024;
    const cy = 60 + rand() * 160;
    const scale = 0.6 + rand() * 1.3;
    drawCloud(ctx, cx, cy, scale);
    if (cx < 150) drawCloud(ctx, cx + 1024, cy, scale);
    if (cx > 874) drawCloud(ctx, cx - 1024, cy, scale);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A distant treeline/hill silhouette wrapped around a big cylinder at the
// edge of the map, so the horizon isn't just flat ground meeting sky.
export function makeTreelineTexture() {
  const w = 1024, h = 256;
  const c = canvas(w, h);
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#bcd9e8");
  grad.addColorStop(1, "#bcd9e8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const rand = mulberry32(13);
  // Back layer: soft blue-green hills.
  ctx.fillStyle = "#7fa591";
  drawRidge(ctx, w, h, h * 0.55, 60, rand);
  // Front layer: darker tree mass.
  ctx.fillStyle = "#4f7a52";
  drawRidge(ctx, w, h, h * 0.4, 36, rand);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawRidge(ctx, w, h, baseY, bumpiness, rand) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, baseY);
  let x = 0;
  while (x < w + 40) {
    const r = 18 + rand() * bumpiness;
    ctx.quadraticCurveTo(x + 15, baseY - r, x + 30, baseY - r * 0.4);
    x += 30;
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function drawCloud(ctx, x, y, s) {
  const puffs = [
    [0, 0, 26], [22, 4, 20], [-22, 4, 20], [11, -10, 18], [-11, -10, 18], [0, 8, 24],
  ];
  for (const [dx, dy, r] of puffs) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y + dy * s, r * s, r * s * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Ground textures ---
export function makeGrassTexture() {
  const c = canvas(256, 256);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#5f9a4a";
  ctx.fillRect(0, 0, 256, 256);
  const rand = mulberry32(42);
  for (let i = 0; i < 1400; i++) {
    const x = rand() * 256, y = rand() * 256;
    const shade = rand();
    ctx.fillStyle = shade < 0.5 ? "rgba(70,120,55,0.5)" : "rgba(140,180,90,0.35)";
    const l = 2 + rand() * 4;
    ctx.fillRect(x, y, 1.2, l);
  }
  const tex = new THREE.CanvasTexture(c);
  return tileTexture(tex, 48, 48);
}

export function makeAsphaltTexture() {
  const c = canvas(256, 256);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#3a3a3f";
  ctx.fillRect(0, 0, 256, 256);
  const rand = mulberry32(99);
  for (let i = 0; i < 900; i++) {
    const v = rand();
    ctx.fillStyle = v < 0.5 ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.06)";
    ctx.fillRect(rand() * 256, rand() * 256, 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  return tileTexture(tex, 16, 90);
}

export function makeSidewalkTexture() {
  const c = canvas(256, 256);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#c9c2ab";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 254, 254);
  const tex = new THREE.CanvasTexture(c);
  return tileTexture(tex, 10, 10);
}

// --- Building facades ---
const brickCache = new Map();
export function makeBrickTexture(hex) {
  if (brickCache.has(hex)) return brickCache.get(hex);
  const c = canvas(256, 256);
  const ctx = c.getContext("2d");
  const base = new THREE.Color(hex);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);
  const mortar = base.clone().multiplyScalar(0.72);
  ctx.strokeStyle = `#${mortar.getHexString()}`;
  ctx.lineWidth = 3;
  const rowH = 16;
  for (let y = 0; y < 256; y += rowH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
    const offset = (y / rowH) % 2 === 0 ? 0 : 16;
    for (let x = -offset; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tileTexture(tex, 2, 1.4);
  brickCache.set(hex, tex);
  return tex;
}

const sidingCache = new Map();
export function makeSidingTexture(hex) {
  if (sidingCache.has(hex)) return sidingCache.get(hex);
  const c = canvas(256, 256);
  const ctx = c.getContext("2d");
  const base = new THREE.Color(hex);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);
  const shade = base.clone().multiplyScalar(0.85);
  ctx.strokeStyle = `#${shade.getHexString()}`;
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tileTexture(tex, 2, 1.2);
  sidingCache.set(hex, tex);
  return tex;
}

// A full storefront facade: brick/siding base + a grid of windows + a door.
// Baked as one texture per building so it can carry the sign on top as a
// separate plane, same as before.
export function makeFacadeTexture({ base, brick = true, cols = 3, rows = 2, doorCenter = true }) {
  const w = 512, h = 384;
  const c = canvas(w, h);
  const ctx = c.getContext("2d");
  const baseColor = new THREE.Color(base);
  ctx.fillStyle = `#${baseColor.getHexString()}`;
  ctx.fillRect(0, 0, w, h);

  if (brick) {
    const mortar = baseColor.clone().multiplyScalar(0.72);
    ctx.strokeStyle = `#${mortar.getHexString()}`;
    ctx.lineWidth = 2;
    const rowH = 14;
    for (let y = 0; y < h; y += rowH) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      const offset = (y / rowH) % 2 === 0 ? 0 : 14;
      for (let x = -offset; x < w; x += 28) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + rowH); ctx.stroke();
      }
    }
  } else {
    const shade = baseColor.clone().multiplyScalar(0.85);
    ctx.strokeStyle = `#${shade.getHexString()}`;
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 12) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  // Windows
  const glassGrad = ctx.createLinearGradient(0, 0, 0, 1);
  const winW = w / (cols * 1.7);
  const winH = h * 0.26;
  const marginX = w / (cols + 1);
  const rowY = h * 0.14;
  ctx.fillStyle = "#2b3a42";
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 4;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = marginX * (col + 1) - winW / 2;
      const y = rowY + r * (h * 0.32);
      ctx.fillRect(x, y, winW, winH);
      ctx.strokeRect(x, y, winW, winH);
      ctx.beginPath();
      ctx.moveTo(x + winW / 2, y);
      ctx.lineTo(x + winW / 2, y + winH);
      ctx.moveTo(x, y + winH / 2);
      ctx.lineTo(x + winW, y + winH / 2);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 4;
    }
  }

  if (doorCenter) {
    const doorW = w * 0.14;
    const doorH = h * 0.4;
    const dx = w / 2 - doorW / 2;
    const dy = h - doorH;
    ctx.fillStyle = "#2a2015";
    ctx.fillRect(dx, dy, doorW, doorH);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 3;
    ctx.strokeRect(dx, dy, doorW, doorH);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- Faces: baked onto the front face of a box head, flat skin color
// elsewhere, so there's no UV-distortion seam to fight. ---

// Six materials for a BoxGeometry head: the face texture on the front
// (+z) face, flat skin color everywhere else.
export function makeHeadMaterials(faceTexture, skinHex) {
  const skinMat = new THREE.MeshLambertMaterial({ color: skinHex });
  const faceMat = new THREE.MeshLambertMaterial({ map: faceTexture });
  return [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat];
}

// A simple spoked wheel/mag-rim look, applied to the flat end-cap of a
// cylinder wheel so it doesn't read as a plain disc.
export function makeWheelTexture(spokes = 5, hubHex = "#cfcfcf", faceHex = "#1a1a1a") {
  const size = 128;
  const c = canvas(size, size);
  const ctx = c.getContext("2d");
  ctx.fillStyle = faceHex;
  ctx.fillRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  ctx.fillStyle = hubHex;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.lineTo(3, -r);
    ctx.lineTo(-3, -r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A striped canvas awning fabric, the kind strung on poles over a storefront
// sidewalk in small-town Main Street photos.
const awningCache = new Map();
export function makeAwningTexture(hex) {
  if (awningCache.has(hex)) return awningCache.get(hex);
  const c = canvas(128, 64);
  const ctx = c.getContext("2d");
  const base = new THREE.Color(hex);
  const light = base.clone().lerp(new THREE.Color("#f2e9d8"), 0.55);
  for (let x = 0; x < 128; x += 16) {
    ctx.fillStyle = (x / 16) % 2 === 0 ? `#${base.getHexString()}` : `#${light.getHexString()}`;
    ctx.fillRect(x, 0, 16, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tileTexture(tex, 3, 1);
  awningCache.set(hex, tex);
  return tex;
}

// A plain horizontal-slat grille, for the front of the car.
export function makeGrilleTexture() {
  const c = canvas(128, 64);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#15171a";
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = "#4a4f55";
  for (let y = 4; y < 64; y += 8) {
    ctx.fillRect(4, y, 120, 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeFaceTexture(opts) {
  const {
    skin = "#a8754f",
    eyeColor = "#2a1d14",
    browColor = "#1c140d",
    glasses = false,
    sunglasses = false,
    goatee = false,
    mustache = false,
    blush = false,
    stubble = false,
    tattoos = false,
    muttonChops = false,
    hairColor = "#2a2015",
  } = opts;
  const w = 256, h = 256;
  const c = canvas(w, h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, w, h);

  // Soft cheek shading for a little dimensionality.
  const shade = ctx.createRadialGradient(w / 2, h * 0.62, 10, w / 2, h * 0.62, 120);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);

  // Eyes
  const eyeY = h * 0.46;
  for (const sign of [-1, 1]) {
    const ex = w / 2 + sign * w * 0.17;
    ctx.fillStyle = "#f5f0e4";
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 6.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyebrow
    ctx.strokeStyle = browColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(ex - 15, eyeY - 18);
    ctx.lineTo(ex + 15, eyeY - 22);
    ctx.stroke();
  }

  // Nose
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2, eyeY + 6);
  ctx.lineTo(w / 2 - 6, eyeY + 28);
  ctx.lineTo(w / 2 + 4, eyeY + 32);
  ctx.stroke();

  if (blush) {
    ctx.fillStyle = "rgba(200,90,70,0.28)";
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(w / 2 + sign * w * 0.22, eyeY + 28, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (stubble) {
    ctx.fillStyle = "rgba(40,28,20,0.35)";
    for (let i = 0; i < 260; i++) {
      const a = Math.random() * Math.PI;
      const r = 40 + Math.random() * 62;
      ctx.fillRect(w / 2 + Math.cos(a) * r, h * 0.6 + Math.sin(a) * r * 0.55, 2, 2);
    }
  }

  // Mouth
  ctx.strokeStyle = "#5a3a2a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 16, h * 0.68);
  ctx.quadraticCurveTo(w / 2, h * 0.715, w / 2 + 16, h * 0.68);
  ctx.stroke();

  if (mustache || goatee) {
    ctx.fillStyle = "#2a2015";
    if (mustache) {
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.655, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (goatee) {
      ctx.beginPath();
      ctx.moveTo(w / 2 - 16, h * 0.68);
      ctx.quadraticCurveTo(w / 2, h * 0.92, w / 2 + 16, h * 0.68);
      ctx.quadraticCurveTo(w / 2, h * 0.8, w / 2 - 16, h * 0.68);
      ctx.fill();
    }
  }

  if (glasses) {
    ctx.strokeStyle = "#232323";
    ctx.lineWidth = 6;
    for (const sign of [-1, 1]) {
      const ex = w / 2 + sign * w * 0.17;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 24, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(w / 2 - 10, eyeY - 2);
    ctx.lineTo(w / 2 + 10, eyeY - 2);
    ctx.stroke();
  }

  if (muttonChops) {
    // Big mutton-chop sideburns running down the cheeks into the mustache.
    ctx.fillStyle = hairColor;
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + sign * w * 0.47, h * 0.3);
      ctx.lineTo(w / 2 + sign * w * 0.36, h * 0.3);
      ctx.quadraticCurveTo(w / 2 + sign * w * 0.3, h * 0.58, w / 2 + sign * w * 0.12, h * 0.66);
      ctx.lineTo(w / 2 + sign * w * 0.12, h * 0.75);
      ctx.quadraticCurveTo(w / 2 + sign * w * 0.42, h * 0.78, w / 2 + sign * w * 0.5, h * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.655, 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (tattoos) {
    // Face tattoos: teardrop, a pair of stars, forehead script, cheek tribal.
    const ink = "#121a2e";
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    const tx = w / 2 + w * 0.17, ty = eyeY + 26;
    ctx.beginPath();
    ctx.moveTo(tx, ty - 11);
    ctx.quadraticCurveTo(tx + 9, ty + 5, tx, ty + 11);
    ctx.quadraticCurveTo(tx - 9, ty + 5, tx, ty - 11);
    ctx.fill();
    const star = (sx, sy, r) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    };
    star(w / 2 - w * 0.3, eyeY - 4, 15);
    star(w / 2 - w * 0.38, eyeY + 26, 10);
    ctx.font = "italic bold 30px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Eagle Lake", w / 2, h * 0.27);
    ctx.lineWidth = 7;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.62, h * (0.58 + i * 0.07));
      ctx.quadraticCurveTo(w * 0.8, h * (0.52 + i * 0.07), w * 0.94, h * (0.6 + i * 0.07));
      ctx.stroke();
    }
  }

  if (sunglasses) {
    ctx.fillStyle = "#15181a";
    for (const sign of [-1, 1]) {
      const ex = w / 2 + sign * w * 0.17;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 25, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#15181a";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 12, eyeY - 2);
    ctx.lineTo(w / 2 + 12, eyeY - 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
