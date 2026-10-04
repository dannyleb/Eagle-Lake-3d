import * as THREE from "three";

// Pecans, live oaks and the odd cedar, all instanced: thousands of trees in
// three draw calls.
const GREENS = ["#2f8f3a", "#3aa047", "#2b7d36", "#4fae45", "#24702f", "#5bb84a", "#368a3d"];
const CEDARS = ["#1f6b3a", "#277a43", "#1d5f35"];

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
    const roundGeo = new THREE.IcosahedronGeometry(1, 1);
    const coneGeo = new THREE.ConeGeometry(1, 1, 7);
    coneGeo.translate(0, 0.5, 0);
    const all = [...this.round.map((t) => [...t, "round"]), ...this.cone.map((t) => [...t, "cone"])];

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2e, flatShading: true });
    const leafMat = new THREE.MeshLambertMaterial({ flatShading: true });
    // Canopies right in front of the camera dissolve (screen-door dither) so a
    // tree never fills the whole view.
    leafMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        `void main() {
          float camDist = length( vViewPosition );
          if ( camDist < 6.0 ) discard;
          if ( camDist < 13.0 ) {
            vec2 cell = mod( floor( gl_FragCoord.xy ), 2.0 );
            float pattern = cell.x + cell.y * 2.0;
            if ( pattern < ( 13.0 - camDist ) / 7.0 * 4.0 - 0.01 ) discard;
          }`
      );
    };
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, all.length);
    const rounds = new THREE.InstancedMesh(roundGeo, leafMat, Math.max(1, this.round.length));
    const cones = new THREE.InstancedMesh(coneGeo, leafMat, Math.max(1, this.cone.length));
    rounds.count = this.round.length;
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
        rounds.setColorAt(ir, col.set(GREENS[Math.floor(rand() * GREENS.length)]));
        ir++;
      }
    });
    for (const mesh of [trunks, rounds, cones]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      scene.add(mesh);
    }
    return all.length;
  }
}
