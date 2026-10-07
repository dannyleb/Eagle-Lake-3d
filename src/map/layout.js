// Eagle Lake, Texas — the town's real layout, reconstructed from public
// sources: street addresses (City Hall at 100 E Main, the 1911 Santa Fe depot
// at 322 E Main, police at 200 E Post Office, library at 101 N Walnut,
// medical center on S Austin Rd), the published FM 102 / US 90A route through
// town, and railroad history (the Sunset Route running NW-SE through downtown,
// the old SA&AP line crossing it at the Tower 115 junction west of town, and
// the abandoned Santa Fe grade by the depot). The lake sits on the south side
// of town, the golf course on its shore, gravel pits west of it, the regional
// airport a mile northeast, and rice fields everywhere else.
//
// Distances are compressed (~0.6x) so the town is fun to drive. Units are
// meters-ish. x = east, z = south (north is -z). Origin: Main St x McCarty Ave.

export const TOWN = { minX: -268, maxX: 268, minZ: -268, maxZ: 196 };

// Tower 115 site: where the Sunset Route and the old SA&AP line cross.
export const JUNCTION = [-292, -329];

export const ROADS = [
  // North-south grid
  { name: "Austin Rd", kind: "street", w: 9, pts: [[-240, -240], [-240, 180]] },
  { name: "Alamo St", kind: "street", w: 9, pts: [[-180, -240], [-180, 180]] },
  { name: "Allen St", kind: "street", w: 9, pts: [[-120, -240], [-120, 180]] },
  { name: "Walnut Ave", kind: "street", w: 9, pts: [[-60, -240], [-60, 180]] },
  { name: "McCarty Ave", kind: "main", w: 12, pts: [[0, -240], [0, 180]] },
  { name: "FM 102", kind: "highway", w: 11, pts: [[0, -830], [0, -240]] },
  { name: "Ash St", kind: "street", w: 9, pts: [[60, -240], [60, 180]] },
  { name: "Commerce St", kind: "street", w: 9, pts: [[120, -240], [120, 180]] },
  { name: "Boothe Dr", kind: "street", w: 9, pts: [[180, -240], [180, 180]] },
  { name: "Airline Ave", kind: "street", w: 9, pts: [[240, -240], [240, 180]] },
  { name: "Airport Rd", kind: "rural", w: 9, pts: [[240, -240], [240, -560], [470, -612]] },
  // East-west grid
  { name: "5th St", kind: "street", w: 9, pts: [[-240, -240], [240, -240]] },
  { name: "4th St", kind: "street", w: 9, pts: [[-240, -180], [240, -180]] },
  { name: "3rd St", kind: "street", w: 9, pts: [[-240, -120], [240, -120]] },
  { name: "2nd St", kind: "street", w: 9, pts: [[-240, -60], [240, -60]] },
  { name: "Main St", kind: "main", w: 14, pts: [[-240, 0], [240, 0]] },
  { name: "US 90A East", kind: "highway", w: 12, pts: [[240, 0], [830, 0]] },
  { name: "Post Office St", kind: "main", w: 11, pts: [[-240, 60], [240, 60]] },
  { name: "US 90A West", kind: "highway", w: 12, pts: [[-830, 60], [-240, 60]] },
  { name: "A St", kind: "street", w: 9, pts: [[-330, 120], [240, 120]] },
  { name: "Lakeside Dr", kind: "street", w: 9, pts: [[-240, 180], [240, 180]] },
  // Spurs and county roads
  { name: "Golf Rd", kind: "spur", w: 7, pts: [[-150, 180], [-150, 204]] },
  { name: "Park Rd", kind: "spur", w: 7, pts: [[0, 180], [0, 236]] },
  { name: "Memorial Park Rd", kind: "spur", w: 7, pts: [[240, -214], [262, -214]] },
  { name: "Veterans Park Dr", kind: "spur", w: 7, pts: [[240, -174], [290, -174]] },
  { name: "Eagle Stop Drive-Thru", kind: "spur", w: 6, pts: [[-330, 60], [-330, 6]] },
  { name: "Granny's Lake Rd", kind: "spur", w: 7, pts: [[360, 0], [360, 110]] },
  { name: "CR 140", kind: "rural", w: 8, pts: [[-500, -830], [-500, 60]] },
  { name: "CR 106", kind: "rural", w: 8, pts: [[-830, -560], [0, -560]] },
];

export const RAILS = {
  // Active main line (ex-Southern Pacific Sunset Route, now freight): enters
  // from the northwest, crosses Main St one block west of McCarty, then bends
  // east toward Houston.
  sunset: {
    name: "Sunset Route",
    active: true,
    pts: [[-660, -795], JUNCTION, [-32, 0], [110, 180], [240, 345], [520, 440], [840, 500]],
  },
  // Ex-SA&AP line: west toward Altair, east toward Houston via Bellaire.
  saap: {
    name: "Bellaire Branch",
    active: true,
    pts: [[-840, -118], JUNCTION, [840, -401]],
  },
  // The Santa Fe line that served the 1911 depot, abandoned in 1991.
  santafe: {
    name: "Old Santa Fe Grade",
    active: false,
    pts: [[172, -362], [172, 196]],
  },
};

// Eagle Lake itself — about the size of the town, on its south side.
export const LAKE = [
  [-640, 330], [-540, 268], [-380, 258], [-220, 262], [-80, 268], [40, 272],
  [95, 310], [92, 430], [40, 570], [-80, 690], [-270, 770], [-470, 770],
  [-610, 670], [-690, 510],
];

// Veterans Memorial Park pond (boardwalk nature trail).
export const POND = [
  [276, -234], [312, -240], [334, -224], [336, -200], [316, -186], [286, -188], [272, -206],
];

// Granny's Lake: a stock-tank-sized lake in the rice fields off US 90A East,
// at the end of Granny's Lake Rd. A 10-foot gator lives in it.
export const GRANNYS_LAKE = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2;
  const wobble = 1 + 0.07 * Math.sin(a * 3 + 0.6) + 0.04 * Math.sin(a * 5 + 1.9);
  return [363 + Math.sin(a) * 33 * wobble, 151 - Math.cos(a) * 28 * wobble];
});

// Gravel pits west of the lake.
export const PITS = [
  [[-800, 300], [-722, 290], [-706, 352], [-760, 384], [-806, 352]],
  [[-790, 432], [-716, 420], [-702, 498], [-772, 522]],
];

export const AREAS = {
  golf: { x0: -232, z0: 186, x1: -68, z1: 258 },
  muniPark: { x0: -45, z0: 186, x1: 62, z1: 264 },
  vetPark: { x0: 248, z0: -262, x1: 344, z1: -176 },
  airport: { x0: 470, z0: -800, x1: 640, z1: -470 },
  gravel: { x0: -830, z0: 250, x1: -686, z1: 560 },
  dryers: { x0: -228, z0: -324, x1: -112, z1: -284 },
  school: { x0: 66, z0: -114, x1: 164, z1: -66 },
};

// Named regions for the location readout, checked in order.
export const REGIONS = [
  { name: "DOWNTOWN", x0: -36, z0: -64, x1: 245, z1: 92 },
  { name: "MUNICIPAL PARK", ...AREAS.muniPark },
  { name: "GOLF COURSE", ...AREAS.golf },
  { name: "VETERANS MEMORIAL PARK", ...AREAS.vetPark },
  { name: "RICE DRYERS", x0: -232, z0: -330, x1: -108, z1: -280 },
  { name: "TOWER 115 JUNCTION", x0: -332, z0: -370, x1: -252, z1: -290 },
  { name: "REGIONAL AIRPORT", ...AREAS.airport },
  { name: "GRAVEL PITS", ...AREAS.gravel },
  { name: "PRAIRIE MEDICAL", x0: -330, z0: 120, x1: -252, z1: 180 },
  { name: "GRANNY'S LAKE", x0: 315, z0: 95, x1: 415, z1: 195 },
  { name: "HWY 90A EAST", x0: 245, z0: -45, x1: 830, z1: 45 },
  { name: "HWY 90A WEST", x0: -830, z0: 15, x1: -245, z1: 105 },
  { name: "FM 102 NORTH", x0: -45, z0: -830, x1: 45, z1: -245 },
  { name: "NORTHSIDE", x0: -268, z0: -268, x1: 268, z1: -64 },
  { name: "SOUTHSIDE", x0: -268, z0: 92, x1: 268, z1: 196 },
  { name: "WEST END", x0: -268, z0: -64, x1: -36, z1: 92 },
  { name: "EAST END", x0: 245, z0: -268, x1: 268, z1: 196 },
];

// --- Geometry helpers shared by the world builder, collision, and HUD ---

export function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + dx * t, cz = az + dz * t;
  return Math.hypot(px - cx, pz - cz);
}

export function distToPolyline(px, pz, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSegment(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (d < best) best = d;
  }
  return best;
}

export function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function inRect(x, z, r) {
  return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
}

// Distance from a point to the nearest rail centerline (active or not).
export function distToRail(x, z, which = null) {
  let best = Infinity;
  for (const [key, rail] of Object.entries(RAILS)) {
    if (which && which !== key) continue;
    best = Math.min(best, distToPolyline(x, z, rail.pts));
  }
  return best;
}

export function distToRoad(x, z) {
  let best = Infinity;
  for (const r of ROADS) best = Math.min(best, distToPolyline(x, z, r.pts) - r.w / 2);
  return best;
}

// How close a car or bike in the far lane can get to (x, z): the distance
// to the nearest road's centerline plus a lane (vehicles ride the lanes).
export function laneReach(x, z) {
  let best = Infinity;
  for (const r of ROADS) best = Math.min(best, distToPolyline(x, z, r.pts) + Math.min(2.6, r.w / 4));
  return best;
}

export function nearestRoad(x, z, maxDist = 8) {
  let best = null;
  let bestD = maxDist;
  for (const r of ROADS) {
    const d = distToPolyline(x, z, r.pts) - r.w / 2;
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

export function locate(x, z) {
  const road = nearestRoad(x, z, 6);
  let region = "RICE COUNTRY";
  if (pointInPolygon(x, z, LAKE)) region = "EAGLE LAKE (THE LAKE)";
  else {
    for (const r of REGIONS) {
      if (inRect(x, z, r)) {
        region = r.name;
        break;
      }
    }
  }
  return road ? `${road.name.toUpperCase()} · ${region}` : region;
}
