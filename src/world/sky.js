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

// A cel-shaded cartoon cumulus: flat white body, a scalloped lavender
// belly, and a hand-inked outline, sitting on a flat base.
function cloudTexture(seed) {
  const c = canvas(512, 256);
  const ctx = c.getContext("2d");
  const r = rng(seed);
  const puffs = [];
  const n = 6 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const x = 100 + r() * 312;
    const big = 1 - Math.abs(x - 256) / 256;
    puffs.push([x, 150 - big * 40 - r() * 26, 34 + big * 40 + r() * 18]);
  }
  const base = 176;
  const shape = (grow) => {
    ctx.beginPath();
    for (const [x, y, rad] of puffs) {
      ctx.moveTo(x + rad + grow, y);
      ctx.arc(x, y, rad + grow, 0, Math.PI * 2);
    }
    const xs = puffs.map((p) => p[0]);
    ctx.rect(Math.min(...xs) - grow, base - 40, Math.max(...xs) - Math.min(...xs) + grow * 2, 40 + grow);
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 512, base + 6);
  ctx.clip();
  ctx.fillStyle = "#3b3566";
  shape(6);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 512, base);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  shape(0);
  ctx.fill();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "#d4cdf2";
  for (const [x, y, rad] of puffs) {
    ctx.beginPath();
    ctx.arc(x + rad * 0.2, y + rad * 0.75, rad * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#b9b0e6";
  ctx.fillRect(0, base - 12, 512, 12);
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Cartoon sun: inked disc with a pale ring and a soft halo.
function sunTexture() {
  const c = canvas(256, 256);
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
  g.addColorStop(0, "rgba(255,248,200,0.9)");
  g.addColorStop(0.45, "rgba(255,240,170,0.35)");
  g.addColorStop(1, "rgba(255,240,170,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#ffe9a0";
  ctx.beginPath();
  ctx.arc(128, 128, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fffbe6";
  ctx.beginPath();
  ctx.arc(128, 128, 40, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A goose silhouette: body, neck and two wings; aWing marks how far each
// vertex sits out along a wing so the shader can flap it.
function gooseGeometry() {
  const pos = [], wing = [];
  const tri = (a, b, c, wa = 0, wb = 0, wc = 0) => {
    pos.push(...a, ...b, ...c);
    wing.push(wa, wb, wc);
  };
  // Body (diamond, pointing +z) and neck
  tri([0, 0, 1.6], [-0.25, 0, 0], [0.25, 0, 0]);
  tri([0.25, 0, 0], [-0.25, 0, 0], [0, 0, -1.2]);
  tri([0.08, 0, 1.4], [-0.08, 0, 1.4], [0, 0, 2.5]);
  // Wings, swept back
  for (const s of [-1, 1]) {
    tri([0, 0, 0.6], [s * 2.6, 0, -0.5], [0, 0, -0.2], 0, 1, 0);
    tri([s * 2.6, 0, -0.5], [s * 1.2, 0, 0.35], [0, 0, 0.6], 1, 0.45, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aWing", new THREE.Float32BufferAttribute(wing, 1));
  return g;
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

export function buildSky(scene, sunDir = new THREE.Vector3(-0.42, 0.78, 0.33)) {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2600, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false })
  );
  dome.renderOrder = -3;
  scene.add(dome);

  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture(), fog: false, depthWrite: false, transparent: true }));
  sun.scale.set(420, 420, 1);
  sun.renderOrder = -2;
  scene.add(sun);
  const sunPos = sunDir.clone().normalize().multiplyScalar(2200);

  const horizon = new THREE.Mesh(
    new THREE.CylinderGeometry(1700, 1700, 170, 64, 1, true),
    new THREE.MeshBasicMaterial({ map: horizonTexture(), side: THREE.BackSide, transparent: true, fog: false, depthWrite: false })
  );
  horizon.position.y = 70;
  horizon.renderOrder = -1;
  scene.add(horizon);

  const clouds = new THREE.Group();
  const r = rng(5);
  const textures = [1, 2, 3, 4, 5, 6].map(cloudTexture);
  for (let i = 0; i < 26; i++) {
    const mat = new THREE.SpriteMaterial({ map: textures[i % textures.length], fog: false, depthWrite: false, transparent: true });
    const s = new THREE.Sprite(mat);
    const a = r() * Math.PI * 2;
    const d = 800 + r() * 1000;
    s.position.set(Math.cos(a) * d, 230 + r() * 360, Math.sin(a) * d);
    const size = 300 + r() * 420;
    s.scale.set(size, size * 0.5, 1);
    s.renderOrder = -1;
    clouds.add(s);
  }
  scene.add(clouds);

  // Geese in V formation, crossing the sky over town.
  const FLOCKS = 3, PER = 9;
  const geese = new THREE.InstancedMesh(
    gooseGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x2a2633, side: THREE.DoubleSide }),
    FLOCKS * PER
  );
  const flap = { value: 0 };
  geese.material.onBeforeCompile = (shader) => {
    shader.uniforms.uFlap = flap;
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "attribute float aWing;\nuniform float uFlap;\nvoid main() {")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float phase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
        transformed.y += sin( uFlap * 7.0 + phase ) * aWing * 1.3;`
      );
  };
  geese.frustumCulled = false;
  scene.add(geese);
  const flocks = [];
  for (let f = 0; f < FLOCKS; f++) {
    const heading = r() * Math.PI * 2;
    flocks.push({ heading, offset: (r() - 0.5) * 500, alt: 70 + r() * 50, speed: 13 + r() * 5, t: r() * 1400, n: 6 + Math.floor(r() * 4) });
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let time = 0;

  function updateGeese(cx, cz, dt) {
    time += dt;
    flap.value = time;
    let k = 0;
    for (const fl of flocks) {
      fl.t += fl.speed * dt;
      if (fl.t > 1400) {
        fl.t = 0;
        fl.heading += 1 + r() * 2;
        fl.offset = (r() - 0.5) * 500;
      }
      const fx = Math.sin(fl.heading), fz = Math.cos(fl.heading);
      // Path passes the player's area, entering 700 units out.
      const along = fl.t - 700;
      const lx = cx + fx * along + fz * fl.offset, lz = cz + fz * along - fx * fl.offset;
      q.setFromAxisAngle(up, fl.heading);
      for (let i = 0; i < PER; i++) {
        if (i >= fl.n) {
          m.makeScale(0, 0, 0);
          geese.setMatrixAt(k++, m);
          continue;
        }
        const rank = Math.ceil(i / 2), side = i % 2 === 0 ? 1 : -1;
        const bx = -fx * rank * 6 + fz * side * rank * 5.5;
        const bz = -fz * rank * 6 - fx * side * rank * 5.5;
        p.set(lx + bx, fl.alt + Math.sin(time * 0.6 + i) * 0.8, lz + bz);
        m.compose(p, q, sc.set(1.3, 1.3, 1.3));
        geese.setMatrixAt(k++, m);
      }
    }
    geese.instanceMatrix.needsUpdate = true;
  }

  // Everything sky-related follows the camera so it reads as infinitely far.
  return {
    follow(camera, dt) {
      dome.position.set(camera.position.x, 0, camera.position.z);
      sun.position.set(camera.position.x + sunPos.x, sunPos.y, camera.position.z + sunPos.z);
      horizon.position.x = camera.position.x;
      horizon.position.z = camera.position.z;
      clouds.position.x = camera.position.x * 0.92;
      clouds.position.z = camera.position.z * 0.92;
      clouds.rotation.y += dt * 0.003;
      updateGeese(camera.position.x, camera.position.z, dt);
    },
  };
}
