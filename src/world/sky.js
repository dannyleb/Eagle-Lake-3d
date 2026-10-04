import * as THREE from "three";

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bright, saturated 90s-CG sky: deep blue overhead fading to pale cyan.
function skyTexture() {
  const c = canvas(16, 512);
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#1f63d8");
  g.addColorStop(0.35, "#3d8ff0");
  g.addColorStop(0.47, "#7fc3f5");
  g.addColorStop(0.5, "#c9ecf7");
  g.addColorStop(1, "#c9ecf7");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A puffy cartoon cumulus: white tops, soft lavender-gray undersides.
function cloudTexture(seed) {
  const c = canvas(512, 256);
  const ctx = c.getContext("2d");
  const r = rng(seed);
  const puffs = [];
  const n = 7 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    puffs.push([90 + r() * 330, 120 + (r() - 0.5) * 50, 38 + r() * 46]);
  }
  for (const [x, y, rad] of puffs) {
    ctx.fillStyle = "#d9d6ee";
    ctx.beginPath();
    ctx.arc(x, y + 10, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, y, rad] of puffs) {
    const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.4, rad * 0.2, x, y, rad);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.75, "#f6f7ff");
    g.addColorStop(1, "rgba(246,247,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  // Flat bottom, the way cartoon clouds sit on an invisible shelf.
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillRect(0, 168, 512, 88);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Flat Texas horizon: hazy tree belts, a far water tower and grain
// elevators, all pre-tinted toward the sky so it blends with the fog.
function horizonTexture() {
  const c = canvas(2048, 256);
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 2048, 256);
  const r = rng(21);
  const layer = (base, color, bump, step) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(0, base);
    for (let x = 0; x <= 2048; x += step) {
      const h = bump * (0.4 + r() * 0.8);
      ctx.quadraticCurveTo(x + step / 2, base - h, x + step, base - h * 0.3);
    }
    ctx.lineTo(2048, 256);
    ctx.closePath();
    ctx.fill();
  };
  layer(214, "#9fc9b4", 16, 26);
  // Far landmarks
  ctx.fillStyle = "#9cc2b5";
  for (const x of [300, 1380]) {
    ctx.fillRect(x, 150, 4, 60);
    ctx.fillRect(x + 22, 150, 4, 60);
    ctx.beginPath();
    ctx.ellipse(x + 13, 146, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const x of [820, 1720]) {
    ctx.fillRect(x, 130, 26, 84);
    ctx.fillRect(x + 30, 150, 18, 64);
    ctx.fillRect(x + 52, 142, 18, 72);
  }
  layer(226, "#86bba0", 20, 34);
  layer(238, "#6fae86", 14, 22);
  ctx.fillStyle = "#6aaa7e";
  ctx.fillRect(0, 238, 2048, 18);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

export function buildSky(scene) {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2600, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false })
  );
  dome.renderOrder = -2;
  scene.add(dome);

  const horizon = new THREE.Mesh(
    new THREE.CylinderGeometry(1700, 1700, 170, 64, 1, true),
    new THREE.MeshBasicMaterial({ map: horizonTexture(), side: THREE.BackSide, transparent: true, fog: false, depthWrite: false })
  );
  horizon.position.y = 70;
  horizon.renderOrder = -1;
  scene.add(horizon);

  const clouds = new THREE.Group();
  const r = rng(5);
  const textures = [1, 2, 3, 4].map(cloudTexture);
  for (let i = 0; i < 22; i++) {
    const mat = new THREE.SpriteMaterial({ map: textures[i % textures.length], fog: false, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const a = r() * Math.PI * 2;
    const d = 900 + r() * 900;
    s.position.set(Math.cos(a) * d, 260 + r() * 340, Math.sin(a) * d);
    const size = 320 + r() * 380;
    s.scale.set(size, size * 0.5, 1);
    s.renderOrder = -1;
    clouds.add(s);
  }
  scene.add(clouds);

  // Everything sky-related follows the camera so it reads as infinitely far.
  return {
    follow(camera, dt) {
      dome.position.set(camera.position.x, 0, camera.position.z);
      horizon.position.x = camera.position.x;
      horizon.position.z = camera.position.z;
      clouds.position.x = camera.position.x * 0.92;
      clouds.position.z = camera.position.z * 0.92;
      clouds.rotation.y += dt * 0.003;
    },
  };
}
