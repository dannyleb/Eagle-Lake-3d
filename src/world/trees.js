import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Pecans, live oaks and the odd cedar, all instanced: thousands of trees in
// three draw calls.
const GREENS = ["#2e7d32", "#388e3c", "#2a6f2f", "#43903a", "#26662c", "#4a9a3f", "#33803a", "#5a8f2e"];
const CEDARS = ["#1f6b3a", "#277a43", "#1d5f35"];

// View-space position of whoever the camera follows. Canopy fragments that
// sit between the camera and that point, inside a small cone around it, are
// cut away, so trees never hide the player.
export const treeFocus = { value: new THREE.Vector3(0, 0, 1e6) };

export class Forest {
  constructor() {
    this.round = [];
    this.cone = [];
  }

  add(x, z, scale = 1, kind = "round") {
    (kind === "cone" ? this.cone : this.round).push([x, z, scale]);
  }

  build(scene, rand) {
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 1, 6);
    trunkGeo.translate(0, 0.5, 0);
    // A canopy is a big smooth puff with two smaller ones bulging out of it,
    // so cel shading gives it the round, layered look of a cartoon tree.
    const puff = (r, w, h, x, y, z) => new THREE.SphereGeometry(r, w, h).translate(x, y, z);
    const roundGeo = mergeGeometries([
      puff(1, 8, 6, 0, 0, 0),
      puff(0.62, 6, 4, 0.6, 0.18, 0.22),
      puff(0.56, 6, 4, -0.52, 0.12, -0.3),
    ]);
    const coneGeo = new THREE.ConeGeometry(1, 1, 7);
    coneGeo.translate(0, 0.5, 0);
    const all = [...this.round.map((t) => [...t, "round"]), ...this.cone.map((t) => [...t, "cone"])];

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2e, flatShading: true });
    const leafMat = new THREE.MeshLambertMaterial();
    leafMat.onBeforeCompile = (shader) => {
      shader.uniforms.uFocus = treeFocus;
      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        `uniform vec3 uFocus;
        void main() {
          vec3 fragView = -vViewPosition;
          float fragDist = length( fragView );
          if ( fragDist < 4.0 ) discard;
          float focusDist = length( uFocus );
          float cosAng = dot( fragView / fragDist, uFocus / max( focusDist, 1e-4 ) );
          // About a 3.5-unit-wide window at the player's distance.
          float cone = cos( atan( 3.5 / max( focusDist, 1.0 ) ) );
          if ( fragDist < focusDist - 1.5 && cosAng > cone ) discard;`
      );
    };
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, all.length);
    const rounds = new THREE.InstancedMesh(roundGeo, leafMat, Math.max(1, this.round.length));
    const cones = new THREE.InstancedMesh(coneGeo, leafMat, Math.max(1, this.cone.length));
    rounds.count = this.round.length;
    // Shadows come from a cheap 20-triangle stand-in that only the sun's
    // shadow camera sees (layer 1), not the detailed canopy.
    const shadowRounds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.1, 0), new THREE.MeshBasicMaterial(), Math.max(1, this.round.length));
    shadowRounds.count = this.round.length;
    shadowRounds.layers.set(1);
    cones.count = this.cone.length;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();
    let ir = 0, ic = 0;
    all.forEach(([x, z, s, kind], i) => {
      const trunkH = kind === "cone" ? 1.6 * s : 3.2 * s;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
      m.compose(pos.set(x, 0, z), q, scl.set(s, trunkH, s));
      trunks.setMatrixAt(i, m);
      if (kind === "cone") {
        m.compose(pos.set(x, trunkH * 0.6, z), q, scl.set(2.4 * s, 8 * s, 2.4 * s));
        cones.setMatrixAt(ic, m);
        cones.setColorAt(ic, col.set(CEDARS[Math.floor(rand() * CEDARS.length)]));
        ic++;
      } else {
        const w = (3.4 + rand() * 1.4) * s;
        m.compose(pos.set(x, trunkH + w * 0.55, z), q, scl.set(w, w * (0.72 + rand() * 0.2), w));
        rounds.setMatrixAt(ir, m);
        shadowRounds.setMatrixAt(ir, m);
        rounds.setColorAt(ir, col.set(GREENS[Math.floor(rand() * GREENS.length)]));
        ir++;
      }
    });
    for (const mesh of [trunks, rounds, cones, shadowRounds]) {
      mesh.castShadow = mesh !== rounds;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
    }
    return all.length;
  }
}
