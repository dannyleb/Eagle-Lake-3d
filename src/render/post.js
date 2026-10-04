import * as THREE from "three";

// Ink outlines for the cel-shaded look, in one full-screen pass.
//
// The scene renders into an offscreen target with a depth texture. For a
// perspective camera, 1/viewZ varies linearly across any flat surface, so
// its screen-space Laplacian is zero on planes and spikes at silhouettes
// and creases. That single measure draws both outer contours and the
// inner fold lines of buildings, roofs, cars and characters, with no extra
// geometry pass. The target is 4x multisampled (that is the game's
// anti-aliasing; three resolves the depth buffer too). A light color grade (saturation, contrast, warm lift) and
// a soft vignette finish the frame.

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const frag = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform float near;
uniform float far;
uniform float thickness;
uniform vec3 inkColor;
uniform float strength;
uniform float debug;
uniform float creaseLo;
varying vec2 vUv;

float invZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  // Perspective depth -> 1 / view distance (linear across planes).
  float z = (near * far) / ((far - near) * d - far);
  return -1.0 / z;
}

vec3 grade(vec3 c) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, 1.08);              // saturation
  c = (c - 0.18) * 1.06 + 0.18;           // contrast around mid-gray (linear)
  c *= vec3(1.03, 1.0, 0.97);             // warm afternoon
  return max(c, 0.0);
}

void main() {
  vec4 col = texture2D(tColor, vUv);
  vec2 o = texel * thickness;
  float c = invZ(vUv);
  float l = invZ(vUv - vec2(o.x, 0.0));
  float r = invZ(vUv + vec2(o.x, 0.0));
  float u = invZ(vUv + vec2(0.0, o.y));
  float d = invZ(vUv - vec2(0.0, o.y));
  float ic = 1.0 / max(c, 1e-6);
  // Creases: second difference along each axis (zero on any flat plane).
  float crease = max(abs(l + r - 2.0 * c), abs(u + d - 2.0 * c)) * ic;
  // Silhouettes: a big jump to something farther away on either side.
  float jump = max(max(abs(l - c), abs(r - c)), max(abs(u - c), abs(d - c))) * ic;
  float dist = ic;
  float creaseEdge = smoothstep(creaseLo, creaseLo * 3.0, crease) * (1.0 - smoothstep(70.0, 220.0, dist));
  float edge = max(creaseEdge, smoothstep(0.06, 0.18, jump));
  // Thin out lines in the far distance so the horizon stays clean.
  edge *= 1.0 - smoothstep(300.0, 1100.0, dist);
  vec3 g = grade(col.rgb);
  g = mix(g, inkColor, edge * strength);
  vec2 q = vUv - 0.5;
  g *= 1.0 - dot(q, q) * 0.32;
  gl_FragColor = vec4(g, 1.0);
  if (debug > 0.5) gl_FragColor = vec4(vec3(edge), 1.0);
  if (debug > 1.5) gl_FragColor = vec4(vec3(fract(dist / 50.0)), 1.0);
  #include <colorspace_fragment>
}`;

export function createPost(renderer) {
  const size = new THREE.Vector2();
  const depthTexture = new THREE.DepthTexture(1, 1);
  depthTexture.type = THREE.UnsignedIntType;
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthTexture,
    samples: 4,
  });
  const material = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      tColor: { value: target.texture },
      tDepth: { value: depthTexture },
      texel: { value: new THREE.Vector2() },
      near: { value: 0.3 },
      far: { value: 3000 },
      thickness: { value: 1 },
      inkColor: { value: new THREE.Color(0x1b1030) },
      strength: { value: 0.92 },
      debug: { value: 0 },
      creaseLo: { value: 0.0016 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const postScene = new THREE.Scene();
  postScene.add(quad);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let enabled = true;

  function setSize(w, h) {
    renderer.getDrawingBufferSize(size);
    target.setSize(size.x, size.y);
    material.uniforms.texel.value.set(1 / size.x, 1 / size.y);
    // Keep lines about the same visual weight on phones and 4K screens.
    material.uniforms.thickness.value = Math.max(1.5, Math.min(3.2, size.y / 320));
  }

  function render(scene, camera) {
    if (!enabled) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      return;
    }
    material.uniforms.near.value = camera.near;
    material.uniforms.far.value = camera.far;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  }

  return {
    setSize,
    render,
    set enabled(v) { enabled = v; },
    get enabled() { return enabled; },
    uniforms: material.uniforms,
  };
}
