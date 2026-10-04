import * as THREE from "three";

// All signage is drawn procedurally onto a <canvas> at runtime — no external
// image assets, logos, or scanned photographs are used anywhere in the game.
function makeCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

export function makeSignTexture({ title, sub, bg = "#2b2b2b", fg = "#ffd34d" }) {
  const canvas = makeCanvas(512, 160);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 46px 'Arial Narrow', sans-serif";
  wrapText(ctx, title.toUpperCase(), canvas.width / 2, 58, 460, 50);

  if (sub) {
    ctx.font = "26px sans-serif";
    ctx.fillText(sub, canvas.width / 2, 120, 460);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeBannerTexture(text, bg = "#1f3d2e", fg = "#ffffff") {
  const canvas = makeCanvas(768, 192);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = text.split("\n");
  ctx.font = "bold 54px sans-serif";
  ctx.fillText(lines[0], canvas.width / 2, 68);
  if (lines[1]) {
    ctx.font = "30px sans-serif";
    ctx.fillText(lines[1], canvas.width / 2, 130);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  const lines = [];
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}
