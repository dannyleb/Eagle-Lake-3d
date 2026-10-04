import * as THREE from "three";

// Surface detail for the merged ground and water meshes, all from one
// procedurally generated, seamlessly tiling 512px texture:
//   R  grass: blade strokes and clumps
//   G  asphalt: grain, speckle and a few cracks
//   B  concrete: slab joints and a little per-slab tint
//   A  water: wavy ripple bands
// The ground shader samples it in world space and picks the channel by the
// surface's own vertex color (green = grass, dark gray = asphalt, light gray
// = concrete), so no extra UVs or draw calls are needed.

const N = 512;

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

// Periodic value noise on a cells x cells lattice (tiles across N).
function periodicNoise(cells, seed) {
  const r = rng(seed);
  const lat = new Float32Array(cells * cells).map(() => r());
  const out = new Float32Array(N * N);
  const s = cells / N;
  const fade = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < N; y++) {
    const fy = y * s, y0 = Math.floor(fy), ty = fade(fy - y0);
    const y1 = (y0 + 1) % cells;
    for (let x = 0; x < N; x++) {
      const fx = x * s, x0 = Math.floor(fx), tx = fade(fx - x0);
      const x1 = (x0 + 1) % cells;
      const a = lat[y0 * cells + x0], b = lat[y0 * cells + x1];
      const c = lat[y1 * cells + x0], d = lat[y1 * cells + x1];
      out[y * N + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty - 0.5;
    }
  }
  return out;
}

export function makeDetailTexture() {
  const r = rng(77);
  const R = new Float32Array(N * N), G = new Float32Array(N * N), B = new Float32Array(N * N), A = new Float32Array(N * N);
  const n8 = periodicNoise(8, 1), n16 = periodicNoise(16, 2), n32 = periodicNoise(32, 3), n64 = periodicNoise(64, 4), n128 = periodicNoise(128, 5);
  const wrap = (v) => ((v % N) + N) % N;
  const idx = (x, y) => wrap(y) * N + wrap(x);

  for (let i = 0; i < N * N; i++) {
    R[i] = 0.55 + n16[i] * 0.35 + n64[i] * 0.25;
    G[i] = 0.55 + n128[i] * 0.22 + n32[i] * 0.12 + (r() - 0.5) * 0.12;
    B[i] = 0.62 + n32[i] * 0.1 + (r() - 0.5) * 0.06;
  }
  // Grass blades: short slanted strokes, some light, some dark.
  for (let k = 0; k < 9000; k++) {
    const x = Math.floor(r() * N), y = Math.floor(r() * N);
    const len = 4 + Math.floor(r() * 7);
    const v = r() < 0.55 ? 0.28 : -0.24;
    const lean = (r() - 0.5) * 0.8;
    for (let j = 0; j < len; j++) R[idx(Math.round(x + lean * j), y - j)] += v * (1 - j / len);
  }
  // Clover / weed clumps
  for (let k = 0; k < 60; k++) {
    const x = r() * N, y = r() * N, rad = 3 + r() * 6;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy <= rad * rad) R[idx(Math.round(x + dx), Math.round(y + dy))] -= 0.12;
    }
  }
  // Asphalt speckle (aggregate) and cracks
  for (let k = 0; k < 16000; k++) G[idx(Math.floor(r() * N), Math.floor(r() * N))] += r() < 0.5 ? 0.22 : -0.18;
  for (let k = 0; k < 7; k++) {
    let x = r() * N, y = r() * N, a = r() * Math.PI * 2;
    const steps = 60 + r() * 140;
    for (let j = 0; j < steps; j++) {
      a += (r() - 0.5) * 0.7;
      x += Math.cos(a) * 1.4;
      y += Math.sin(a) * 1.4;
      G[idx(Math.round(x), Math.round(y))] -= 0.38;
      G[idx(Math.round(x) + 1, Math.round(y))] -= 0.15;
    }
  }
  // Concrete slabs: joints every 128px, per-slab tint, a few stains
  const tint = [];
  for (let k = 0; k < 16; k++) tint.push((r() - 0.5) * 0.08);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    B[i] += tint[Math.floor(y / 128) * 4 + Math.floor(x / 128)];
    if (x % 128 < 3 || y % 128 < 3) B[i] -= 0.34;
    else if (x % 128 < 5 || y % 128 < 5) B[i] += 0.08;
  }
  for (let k = 0; k < 14; k++) {
    const x = r() * N, y = r() * N, rad = 4 + r() * 12;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy <= rad * rad) B[idx(Math.round(x + dx), Math.round(y + dy))] -= 0.06;
    }
  }
  // Water ripples: wavy bands warped by noise (periodic in both axes).
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    const warp = n8[i] * 2.4 + n32[i] * 0.8;
    A[i] = 0.5 + 0.5 * Math.sin(((y / N) * 12 + warp) * Math.PI * 2) * (0.6 + n16[i]);
  }

  const data = new Uint8Array(N * N * 4);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = c(R[i]);
    data[i * 4 + 1] = c(G[i]);
    data[i * 4 + 2] = c(B[i]);
    data[i * 4 + 3] = c(A[i]);
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

const worldPosVertex = (shader) => {
  shader.vertexShader = shader.vertexShader
    .replace("void main() {", "varying vec3 vGroundPos;\nvoid main() {")
    .replace("#include <project_vertex>", "#include <project_vertex>\n  vGroundPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
  shader.fragmentShader = shader.fragmentShader.replace(
    "void main() {",
    "uniform sampler2D detailMap;\nuniform float uTime;\nvarying vec3 vGroundPos;\nvoid main() {"
  );
};

export function makeGroundMaterial(detail) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.detailMap = { value: detail };
    shader.uniforms.uTime = { value: 0 };
    worldPosVertex(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      {
        vec3 sc = pow( max( vColor.rgb, 0.0 ), vec3( 0.4545 ) );
        float mx = max( sc.r, max( sc.g, sc.b ) ), mn = min( sc.r, min( sc.g, sc.b ) );
        float sat = mx - mn;
        float lum = dot( sc, vec3( 0.299, 0.587, 0.114 ) );
        vec2 wp = vGroundPos.xz;
        vec4 fine = texture2D( detailMap, wp / 9.0 );
        vec4 broad = texture2D( detailMap, wp / 83.0 + 0.37 );
        float grass = smoothstep( 0.02, 0.08, sc.g - max( sc.r, sc.b ) );
        float asphalt = ( 1.0 - smoothstep( 0.06, 0.12, sat ) ) * ( 1.0 - smoothstep( 0.44, 0.56, lum ) );
        float concrete = ( 1.0 - smoothstep( 0.11, 0.17, sat ) ) * smoothstep( 0.56, 0.68, lum ) * ( 1.0 - smoothstep( 0.9, 0.95, lum ) );
        float other = clamp( 1.0 - grass - asphalt - concrete, 0.0, 1.0 );
        float m = 1.0;
        m *= mix( 1.0, ( 0.74 + 0.5 * fine.r ) * ( 0.84 + 0.32 * broad.r ), grass );
        m *= mix( 1.0, 0.72 + 0.56 * fine.g, asphalt );
        m *= mix( 1.0, 0.7 + 0.5 * fine.b, concrete );
        m *= mix( 1.0, 0.86 + 0.28 * fine.g, other );
        diffuseColor.rgb *= m;
      }`
    );
  };
  return mat;
}

// Water: the same vertex colors, with two scrolling ripple layers that
// snap to a crisp toon highlight, plus a lighter band near the surface tint.
export function makeWaterMaterial(detail, timeUniform) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.detailMap = { value: detail };
    shader.uniforms.uTime = timeUniform;
    worldPosVertex(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      {
        vec3 sc = pow( max( vColor.rgb, 0.0 ), vec3( 0.4545 ) );
        float isWater = smoothstep( 0.05, 0.15, sc.b - sc.r );
        vec2 wp = vGroundPos.xz;
        float w1 = texture2D( detailMap, wp / 34.0 + vec2( uTime * 0.011, uTime * 0.006 ) ).a;
        float w2 = texture2D( detailMap, wp.yx / 51.0 - vec2( uTime * 0.008, -uTime * 0.005 ) ).a;
        float w = ( w1 + w2 ) * 0.5;
        float crest = smoothstep( 0.8, 0.84, w );
        float trough = 1.0 - smoothstep( 0.18, 0.24, w );
        vec3 col = diffuseColor.rgb;
        col = mix( col, col * 0.82, trough * 0.6 );
        col = mix( col, vec3( 0.86, 0.96, 1.0 ), crest * 0.75 );
        diffuseColor.rgb = mix( diffuseColor.rgb, col, isWater );
      }`
    );
  };
  return mat;
}
