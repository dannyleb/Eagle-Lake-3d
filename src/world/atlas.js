import * as THREE from "three";

// One 1024x1024 facade atlas for every wall in town, drawn procedurally.
// RGB = light/shadow detail (multiplied by each building's vertex color), and
// alpha marks glass: alpha >= 0.5 is wall, alpha < 0.5 is window glass whose
// brightness is the alpha value. A small shader patch below turns that into
// colorful walls with bluish glass, all in a single draw call.

export const ATLAS = {
  store: [0, 0.5, 0.5, 1],
  house: [0.5, 0.5, 1, 1],
  plain: [0, 0, 0.5, 0.5],
  office: [0.5, 0, 1, 0.5],
  blank: [0.02, 0.44, 0.18, 0.49], // a strip of the plain tile with no window
};

const S = 512;

function glassRect(ctx, x, y, w, h) {
  ctx.clearRect(x, y, w, h);
  const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  g.addColorStop(0, "rgba(255,255,255,0.46)");
  g.addColorStop(0.45, "rgba(255,255,255,0.22)");
  g.addColorStop(1, "rgba(255,255,255,0.06)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function glassArch(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + w / 2);
  ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.clip();
  glassRect(ctx, x, y, w, h);
  ctx.restore();
}

function wallFill(ctx, ox, oy, shade = 245) {
  ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
  ctx.fillRect(ox, oy, S, S);
}

function brickLines(ctx, ox, oy, y0, y1, alpha = 0.1) {
  ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
  ctx.lineWidth = 2;
  for (let y = y0; y < y1; y += 12) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + y);
    ctx.lineTo(ox + S, oy + y);
    ctx.stroke();
    const off = (y / 12) % 2 === 0 ? 0 : 14;
    for (let x = off; x < S; x += 28) {
      ctx.beginPath();
      ctx.moveTo(ox + x, oy + y);
      ctx.lineTo(ox + x, oy + y + 12);
      ctx.stroke();
    }
  }
}

function frame(ctx, x, y, w, h, shade = 255, lw = 8) {
  ctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
}

// Two-story Main St storefront: cornice, arched upper windows, display glass.
function drawStore(ctx, ox, oy) {
  wallFill(ctx, ox, oy, 240);
  brickLines(ctx, ox, oy, 48, 300, 0.08);
  // Cornice + dentil band
  ctx.fillStyle = "rgb(200,200,200)";
  ctx.fillRect(ox, oy, S, 30);
  ctx.fillStyle = "rgb(225,225,225)";
  for (let x = 6; x < S; x += 22) ctx.fillRect(ox + x, oy + 30, 12, 12);
  // Upper floor: three arched windows with sills and hoods
  for (let i = 0; i < 3; i++) {
    const wx = ox + 52 + i * 150, wy = oy + 72;
    ctx.fillStyle = "rgb(205,205,205)";
    ctx.beginPath();
    ctx.arc(wx + 50, wy + 50, 62, Math.PI, 0);
    ctx.fill();
    glassArch(ctx, wx, wy, 100, 168);
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.fillRect(wx + 47, wy + 10, 6, 158);
    ctx.fillRect(wx, wy + 96, 100, 6);
    ctx.fillStyle = "rgb(200,200,200)";
    ctx.fillRect(wx - 10, wy + 168, 120, 12);
  }
  // Belt course between floors
  ctx.fillStyle = "rgb(190,190,190)";
  ctx.fillRect(ox, oy + 284, S, 20);
  // Ground floor: transom strip, two display windows, recessed door
  glassRect(ctx, ox + 18, oy + 314, S - 36, 34);
  ctx.fillStyle = "rgb(250,250,250)";
  for (let x = 18; x < S - 18; x += 60) ctx.fillRect(ox + x, oy + 314, 5, 34);
  glassRect(ctx, ox + 18, oy + 358, 176, 118);
  glassRect(ctx, ox + S - 194, oy + 358, 176, 118);
  frame(ctx, ox + 18, oy + 358, 176, 118, 255, 7);
  frame(ctx, ox + S - 194, oy + 358, 176, 118, 255, 7);
  // Door
  ctx.fillStyle = "rgb(110,110,110)";
  ctx.fillRect(ox + 212, oy + 352, 88, 160);
  glassRect(ctx, ox + 226, oy + 364, 60, 92);
  ctx.fillStyle = "rgb(150,150,150)";
  ctx.fillRect(ox + 18, oy + 476, 176, 36);
  ctx.fillRect(ox + S - 194, oy + 476, 176, 36);
}

// Wood-sided house front: two windows with shutters and a door.
function drawHouse(ctx, ox, oy) {
  wallFill(ctx, ox, oy, 248);
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  for (let y = 0; y < S; y += 18) ctx.fillRect(ox, oy + y, S, 4);
  // Trim at corners and top
  ctx.fillStyle = "rgb(255,255,255)";
  ctx.fillRect(ox, oy, 14, S);
  ctx.fillRect(ox + S - 14, oy, 14, S);
  ctx.fillRect(ox, oy, S, 16);
  // Windows (tall, since the wall gets squashed wider in 3D)
  for (const wx of [56, 352]) {
    ctx.fillStyle = "rgb(150,150,150)";
    ctx.fillRect(ox + wx - 22, oy + 120, 20, 230);
    ctx.fillRect(ox + wx + 104, oy + 120, 20, 230);
    glassRect(ctx, ox + wx, oy + 120, 102, 230);
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.fillRect(ox + wx + 48, oy + 120, 6, 230);
    ctx.fillRect(ox + wx, oy + 232, 102, 6);
    frame(ctx, ox + wx, oy + 120, 102, 230, 255, 9);
  }
  // Door
  ctx.fillStyle = "rgb(120,120,120)";
  ctx.fillRect(ox + 210, oy + 150, 92, 362);
  glassRect(ctx, ox + 232, oy + 176, 48, 90);
  frame(ctx, ox + 206, oy + 146, 100, 366, 255, 8);
}

// Plain side wall: stucco/brick texture and one small high window.
function drawPlain(ctx, ox, oy) {
  wallFill(ctx, ox, oy, 236);
  brickLines(ctx, ox, oy, 0, S, 0.06);
  // One tall double-hung window with a sill, centered in each bay.
  glassRect(ctx, ox + 176, oy + 120, 160, 230);
  ctx.fillStyle = "rgb(255,255,255)";
  ctx.fillRect(ox + 176, oy + 228, 160, 12);
  ctx.fillRect(ox + 250, oy + 120, 10, 230);
  frame(ctx, ox + 176, oy + 120, 160, 230, 255, 10);
  ctx.fillStyle = "rgb(205,205,205)";
  ctx.fillRect(ox + 164, oy + 352, 184, 16);
}

// Civic/office: a grid of windows with spandrel bands.
function drawOffice(ctx, ox, oy) {
  wallFill(ctx, ox, oy, 242);
  for (let r = 0; r < 3; r++) {
    const y = oy + 30 + r * 165;
    ctx.fillStyle = "rgb(214,214,214)";
    ctx.fillRect(ox, y - 14, S, 10);
    for (let c = 0; c < 4; c++) {
      const x = ox + 22 + c * 124;
      glassRect(ctx, x, y, 96, 120);
      ctx.fillStyle = "rgb(255,255,255)";
      ctx.fillRect(x + 45, y, 6, 120);
      frame(ctx, x, y, 96, 120, 255, 6);
    }
  }
}

export function makeFacadeAtlas() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext("2d");
  drawStore(ctx, 0, 0);
  drawHouse(ctx, S, 0);
  drawPlain(ctx, 0, S);
  drawOffice(ctx, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeWallMaterial(atlas) {
  const mat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true, flatShading: true });
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <map_fragment>", "")
      .replace(
        "#include <color_fragment>",
        `
        vec4 atlasTexel = texture2D( map, vMapUv );
        float wallMask = step( 0.5, atlasTexel.a );
        float sheen = clamp( atlasTexel.a * 2.0, 0.0, 1.0 );
        vec3 glassCol = mix( vec3( 0.03, 0.08, 0.16 ), vec3( 0.40, 0.66, 0.88 ), sheen );
        diffuseColor.rgb *= mix( glassCol, atlasTexel.rgb * vColor.rgb, wallMask );
        `
      );
  };
  return mat;
}
