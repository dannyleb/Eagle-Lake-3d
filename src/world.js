import * as THREE from "three";
import { COLORS, WORLD, STREETS, RAIL, BUILDINGS, HOUSES, HOUSE_SIZE, WATER_TOWER, LAKE, SIGNAGE, BRADSHALL } from "./config.js";
import { makeSignTexture, makeBannerTexture } from "./signage.js";

const box = new THREE.BoxGeometry(1, 1, 1);

function addBox(group, { x, y = 0, z, w, h, d, color, name }) {
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(box, mat);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (name) mesh.name = name;
  group.add(mesh);
  return mesh;
}

function buildGround(scene) {
  const geo = new THREE.PlaneGeometry(WORLD.halfSize * 2, WORLD.halfSize * 2);
  const mat = new THREE.MeshLambertMaterial({ color: COLORS.ground });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function buildLake(scene) {
  const geo = new THREE.CircleGeometry(1, 48);
  const mat = new THREE.MeshLambertMaterial({ color: COLORS.water, transparent: true, opacity: 0.92 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(LAKE.rx, LAKE.rz, 1);
  mesh.position.set(LAKE.x, 0.05, LAKE.z);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function buildRoads(group) {
  const roadMat = new THREE.MeshLambertMaterial({ color: COLORS.road });
  const lineMat = new THREE.MeshBasicMaterial({ color: COLORS.roadLine });
  const span = WORLD.halfSize * 2;

  for (const s of STREETS.horizontal) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(span, s.width), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, s.z);
    road.receiveShadow = true;
    group.add(road);

    const line = new THREE.Mesh(new THREE.PlaneGeometry(span, 0.3), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.03, s.z);
    group.add(line);
  }

  for (const s of STREETS.vertical) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(s.width, span), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(s.x, 0.02, 0);
    road.receiveShadow = true;
    group.add(road);

    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, span), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(s.x, 0.03, 0);
    group.add(line);
  }
}

function buildRailLine(group) {
  const bedMat = new THREE.MeshLambertMaterial({ color: 0x7a6a52 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });
  const length = RAIL.zMax - RAIL.zMin;
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(5.5, length), bedMat);
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(RAIL.x, 0.04, (RAIL.zMax + RAIL.zMin) / 2);
  group.add(bed);

  for (const offset of [-1.3, 1.3]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, length), railMat);
    rail.position.set(RAIL.x + offset, 0.13, (RAIL.zMax + RAIL.zMin) / 2);
    group.add(rail);
  }

  // Railroad ties
  const tieMat = new THREE.MeshLambertMaterial({ color: 0x3a2d22 });
  const tieGeo = new THREE.BoxGeometry(3.4, 0.14, 0.4);
  const tieCount = Math.floor(length / 2.2);
  const tieMesh = new THREE.InstancedMesh(tieGeo, tieMat, tieCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < tieCount; i++) {
    dummy.position.set(RAIL.x, 0.07, RAIL.zMin + i * 2.2);
    dummy.updateMatrix();
    tieMesh.setMatrixAt(i, dummy.matrix);
  }
  group.add(tieMesh);
}

function buildCrossingGates(scene) {
  const gates = [];
  const postMat = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });
  const armMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x440000 });

  for (const side of [-1, 1]) {
    const z = side * RAIL.gateZOffset;
    const postX = RAIL.x - side * 3.2;
    const group = new THREE.Group();
    group.position.set(postX, 0, z);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.2, 8), postMat);
    post.position.y = 1.6;
    group.add(post);

    const armPivot = new THREE.Group();
    armPivot.position.set(0, 3.0, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 0.3), armMat);
    arm.position.x = side * 2.1;
    armPivot.add(arm);
    group.add(armPivot);

    const light1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lightMat.clone());
    light1.position.set(0, 3.5, 0.3);
    const light2 = light1.clone();
    light2.position.z = -0.3;
    group.add(light1, light2);

    scene.add(group);
    gates.push({ armPivot, closedRot: side * -Math.PI * 0.42, lights: [light1, light2] });
  }
  return gates;
}

function buildCrossbuck(scene) {
  for (const side of [-1, 1]) {
    const group = new THREE.Group();
    group.position.set(RAIL.x + side * 2.6, 0, 0);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 3.4, 6),
      new THREE.MeshLambertMaterial({ color: 0xe8e2c8 })
    );
    post.position.y = 1.7;
    group.add(post);
    for (const rot of [0.52, -0.52]) {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.35, 0.08),
        new THREE.MeshLambertMaterial({ color: 0xe8e2c8 })
      );
      sign.position.y = 3.1;
      sign.rotation.z = rot;
      group.add(sign);
    }
    scene.add(group);
  }
}

function buildTree(x, z, scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.26, 2.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x5a4330 })
  );
  trunk.position.y = 1.1;
  group.add(trunk);
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0x3f7a3a })
  );
  leaves.position.y = 2.7;
  leaves.scale.set(1.1, 0.9, 1.1);
  group.add(leaves);
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}

function buildBuilding(scene, def) {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);

  addBox(group, { x: 0, z: 0, w: def.w, h: def.h, d: def.d, color: def.color });
  // Roof cap
  addBox(group, { x: 0, y: def.h, z: 0, w: def.w + 0.6, h: 0.5, d: def.d + 0.6, color: def.roof });

  if (def.steeple) {
    const steeple = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 4, 4),
      new THREE.MeshLambertMaterial({ color: def.roof })
    );
    steeple.position.set(0, def.h + 2.5, 0);
    steeple.rotation.y = Math.PI / 4;
    steeple.castShadow = true;
    group.add(steeple);
  }

  if (def.kind === "driveThru") {
    // A pull-up canopy + window nodding to the old walk-up/drive-thru beer
    // store Sidney remembers — reimagined and renamed, not reproduced.
    const canopy = addBox(group, { x: def.w / 2 + 3.2, y: def.h - 1.2, z: 0, w: 6.4, h: 0.4, d: 6, color: def.roof });
    canopy.position.y = def.h - 1.0;
    for (const cx of [-2.6, 2.6]) {
      addBox(group, { x: def.w / 2 + 3.2 + cx, y: 0, z: 2.6, w: 0.3, h: def.h - 1.2, d: 0.3, color: 0x2b2b2b });
    }
  }

  if (def.kind === "firehouse") {
    addBox(group, { x: 0, y: 0, z: def.d / 2 + 0.05, w: def.w * 0.55, h: def.h * 0.78, d: 0.1, color: 0x1a1a1a });
  }

  if (def.kind === "gasStation") {
    const canopy = addBox(group, { x: 0, y: def.h + 1.6, z: def.d / 2 + 5, w: def.w + 2, h: 0.4, d: 6, color: 0xc23b2e });
    for (const cx of [-def.w / 2, def.w / 2]) {
      addBox(group, { x: cx, y: 0, z: def.d / 2 + 5, w: 0.3, h: def.h + 1.4, d: 0.3, color: 0xcfcfcf });
    }
    const pump = addBox(group, { x: 0, y: 0, z: def.d / 2 + 5, w: 1, h: 1.6, d: 0.8, color: 0xe8e2c8 });
  }

  const signTex = makeSignTexture({ title: def.name, sub: def.sub, bg: def.signColor, fg: def.textColor });
  const signGeo = new THREE.PlaneGeometry(Math.min(def.w * 0.9, 9), 1.8);
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, def.h * 0.62, def.d / 2 + 0.06);
  group.add(sign);
  const signBack = sign.clone();
  signBack.position.z = -(def.d / 2 + 0.06);
  signBack.rotation.y = Math.PI;
  group.add(signBack);

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.userData.label = def.name;
  scene.add(group);
  return group;
}

function buildHouse(scene, def) {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  addBox(group, { w: HOUSE_SIZE.w, h: 3.2, d: HOUSE_SIZE.d, color: def.color });
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(5.6, 2.4, 4),
    new THREE.MeshLambertMaterial({ color: def.roof })
  );
  roof.position.y = 3.2 + 1.2;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);
  group.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  scene.add(group);
}

function buildWaterTower(scene) {
  const group = new THREE.Group();
  group.position.set(WATER_TOWER.x, 0, WATER_TOWER.z);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x8a8f94 });
  const legOffsets = [
    [-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4],
  ];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 14, 6), legMat);
    leg.position.set(lx, 7, lz);
    leg.castShadow = true;
    group.add(leg);
  }
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 5, 16),
    new THREE.MeshLambertMaterial({ color: 0xd8dadb })
  );
  tank.position.y = 16.5;
  tank.castShadow = true;
  group.add(tank);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(5.3, 1.8, 16), new THREE.MeshLambertMaterial({ color: 0x9aa0a4 }));
  cap.position.y = 19.9;
  group.add(cap);

  const tex = makeBannerTexture("EAGLE LAKE", "#1f3d2e", "#ffffff");
  const band = new THREE.Mesh(new THREE.CylinderGeometry(5.05, 5.05, 1.6, 16, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  band.position.y = 16.5;
  group.add(band);

  scene.add(group);
}

function buildGooseSign(scene) {
  const s = SIGNAGE.goose;
  const tex = makeBannerTexture(s.text.split("\n")[0], "#1f3d2e", "#ffffff");
  // Rebuild with both lines properly via config text split
  const [l1, l2] = s.text.split("\n");
  const canvas = document.createElement("canvas");
  canvas.width = 768; canvas.height = 192;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1f3d2e"; ctx.fillRect(0, 0, 768, 192);
  ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 56px sans-serif"; ctx.fillText(l1, 384, 68);
  ctx.font = "28px sans-serif"; ctx.fillText(l2, 384, 130);
  const t = new THREE.CanvasTexture(canvas);

  const group = new THREE.Group();
  group.position.set(s.x, 0, s.z);
  for (const px of [-3.4, 3.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.4, 6), new THREE.MeshLambertMaterial({ color: 0x3a2d22 }));
    post.position.set(px, 1.7, 0);
    group.add(post);
  }
  const board = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: t }));
  board.position.set(0, 3.0, 0);
  group.add(board);
  const boardBack = board.clone();
  boardBack.rotation.y = Math.PI;
  group.add(boardBack);
  scene.add(group);
}

function buildBuskingSign(scene) {
  const tex = makeSignTexture({
    title: "The Thicker Bradshall",
    sub: "LIVE ON THE SIDEWALK • TIPS WELCOME",
    bg: "#2f3a2f",
    fg: "#f2e9d8",
  });
  const group = new THREE.Group();
  group.position.set(BRADSHALL.x, 0, BRADSHALL.z + 1.4);
  group.rotation.y = BRADSHALL.heading;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), new THREE.MeshLambertMaterial({ color: 0x3a2d22 }));
  post.position.y = 0.55;
  group.add(post);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshBasicMaterial({ map: tex }));
  board.position.set(0, 1.15, 0);
  group.add(board);
  const guitarCase = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.1, 0.22),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  );
  guitarCase.position.set(-0.6, 0.05, 0.3);
  guitarCase.rotation.y = 0.3;
  group.add(guitarCase);
  scene.add(group);
}

export function buildWorld(scene) {
  buildGround(scene);
  buildLake(scene);

  const roadGroup = new THREE.Group();
  buildRoads(roadGroup);
  scene.add(roadGroup);

  const railGroup = new THREE.Group();
  buildRailLine(railGroup);
  scene.add(railGroup);
  buildCrossbuck(scene);
  const gates = buildCrossingGates(scene);

  for (const def of BUILDINGS) buildBuilding(scene, def);
  for (const def of HOUSES) buildHouse(scene, def);
  buildWaterTower(scene);
  buildGooseSign(scene);
  buildBuskingSign(scene);

  const treeGroup = new THREE.Group();
  const treeSpots = [
    [-10, 42], [-4, 44], [30, 40], [36, 44], [-60, 30], [-66, 32],
    [80, 10], [86, 14], [-20, -30], [-14, -32], [50, -40], [56, -36],
    [0, 70], [20, 80], [-50, 90], [-20, 60], [100, 60], [110, 40],
    [-90, -20], [-100, 0], [10, -60], [-30, 10], [60, 60], [-130, 10],
  ];
  for (const [x, z] of treeSpots) treeGroup.add(buildTree(x, z, 0.9 + Math.random() * 0.5));
  scene.add(treeGroup);

  return { gates };
}
