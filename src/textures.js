import * as THREE from "three";
import { makeCanvas as canvas, canvasTexture } from "./util.js";

// A small library of procedurally-drawn canvas textures. Nothing here is a
// photograph or scanned image — every texture is generated at runtime with
// the 2D canvas API, so there are no external image assets to download and
// nothing that could be mistaken for a real photo of a real place or person.

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
  const tex = canvasTexture(c);
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
  const tex = canvasTexture(c);
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
    bigMustache = null, // color of a full, wide mustache down to the mouth corners
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

  if (bigMustache) {
    ctx.fillStyle = bigMustache;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.625);
    ctx.quadraticCurveTo(w / 2 + 30, h * 0.6, w / 2 + 40, h * 0.69);
    ctx.quadraticCurveTo(w / 2 + 34, h * 0.71, w / 2 + 24, h * 0.685);
    ctx.quadraticCurveTo(w / 2, h * 0.675, w / 2 - 24, h * 0.685);
    ctx.quadraticCurveTo(w / 2 - 34, h * 0.71, w / 2 - 40, h * 0.69);
    ctx.quadraticCurveTo(w / 2 - 30, h * 0.6, w / 2, h * 0.625);
    ctx.fill();
    // A few lighter strands for the gray coming in.
    ctx.strokeStyle = "rgba(220,215,205,0.45)";
    ctx.lineWidth = 2;
    for (let i = -30; i <= 30; i += 9) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i, h * 0.635);
      ctx.lineTo(w / 2 + i * 1.12, h * 0.675);
      ctx.stroke();
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

  const tex = canvasTexture(c);
  return tex;
}
