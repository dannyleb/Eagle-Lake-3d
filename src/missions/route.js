import * as THREE from "three";

// The 3D side of navigation: a strip of scrolling chevrons laid along the
// route on the street, and a beacon (light pillar, bobbing marker, pulsing
// ground ring) over the destination.

const ROUTE_Y = 0.34;
const ROUTE_W = 1.9;
const ARROW_EVERY = 3.2; // world units per chevron

function chevronTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 64, 64);
  // Chevron pointing toward +u (right in texture space).
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(14, 8);
    ctx.lineTo(44, 32);
    ctx.lineTo(14, 56);
    ctx.lineTo(26, 32);
    ctx.closePath();
  };
  ctx.lineJoin = "round";
  ctx.lineWidth = 9;
  ctx.strokeStyle = "rgba(27,16,48,0.9)";
  shape();
  ctx.stroke();
  ctx.fillStyle = "#ffd43b";
  shape();
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function pillarTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 128, 0, 0);
  g.addColorStop(0, "rgba(255,226,90,0.75)");
  g.addColorStop(0.35, "rgba(255,226,90,0.35)");
  g.addColorStop(1, "rgba(255,226,90,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createRouteView(scene) {
  const tex = chevronTexture();
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.visible = false;
  scene.add(mesh);

  // Beacon
  const beacon = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 70, 20, 1, true),
    new THREE.MeshBasicMaterial({ map: pillarTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false })
  );
  pillar.position.y = 35;
  beacon.add(pillar);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd43b });
  const marker = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 4), markerMat);
  cone.rotation.x = Math.PI;
  marker.add(cone);
  const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), new THREE.MeshBasicMaterial({ color: 0xff5d3b }));
  cap.position.y = 1.7;
  marker.add(cap);
  beacon.add(marker);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 1, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = ROUTE_Y + 0.02;
  beacon.add(ring);
  beacon.visible = false;
  scene.add(beacon);
  let ringRadius = 6;

  function setRoute(pts) {
    if (!pts || pts.length < 2) {
      mesh.visible = false;
      return;
    }
    const pos = [], uv = [], idx = [];
    let along = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 0.05) continue;
      const nx = (-(bz - az) / len) * (ROUTE_W / 2), nz = ((bx - ax) / len) * (ROUTE_W / 2);
      const base = pos.length / 3;
      pos.push(ax + nx, ROUTE_Y, az + nz, ax - nx, ROUTE_Y, az - nz, bx + nx, ROUTE_Y, bz + nz, bx - nx, ROUTE_Y, bz - nz);
      const u0 = along / ARROW_EVERY, u1 = (along + len) / ARROW_EVERY;
      uv.push(u0, 1, u0, 0, u1, 1, u1, 0);
      idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
      along += len;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    mesh.geometry.dispose();
    mesh.geometry = g;
    mesh.visible = true;
  }

  function setTarget(t) {
    if (!t) {
      beacon.visible = false;
      return;
    }
    beacon.visible = true;
    beacon.position.set(t.x, 0, t.z);
    ringRadius = t.r || 6;
  }

  function update(dt, time) {
    tex.offset.x -= dt * 1.4; // chevrons march toward the destination
    if (beacon.visible) {
      marker.position.y = 9 + Math.sin(time * 2.4) * 0.8;
      marker.rotation.y += dt * 1.8;
      const pulse = 1 + (time * 0.8) % 1 * 0.25;
      ring.scale.setScalar(ringRadius * pulse);
      ring.material.opacity = 0.9 - ((time * 0.8) % 1) * 0.6;
    }
  }

  return { setRoute, setTarget, update };
}
