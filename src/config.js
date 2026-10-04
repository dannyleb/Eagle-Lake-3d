// Tunable constants and world layout data for Eagle Lake: Green Dog Run.
// All business names below are original, satirical inventions inspired by the
// general flavor of a small Texas railroad town — none reproduce any real
// business name, logo, or trade dress.

export const GAME_TITLE = "Eagle Lake: Green Dog Run";

export const COLORS = {
  sky: 0x9fd1e8,
  fog: 0xaad4e6,
  ground: 0x6b9b4f,
  road: 0x3a3a3f,
  roadLine: 0xe8e2c8,
  sidewalk: 0xc9c2ab,
  water: 0x3f7f9f,
};

export const WORLD = {
  halfSize: 220, // ground plane extends from -halfSize to +halfSize
  fogNear: 60,
  fogFar: 260,
};

// Street centerlines, used to lay down road meshes + sidewalks.
// Horizontal streets run along X, vertical streets run along Z.
export const STREETS = {
  horizontal: [
    { name: "Post Office St", z: 34, width: 9 },
    { name: "Main St", z: 0, width: 11 },
    { name: "Commerce St", z: -34, width: 9 },
    { name: "Heron Row", z: -68, width: 8 },
  ],
  vertical: [
    { name: "McCarty Ave", x: -70, width: 9 },
    { name: "Depot Ave", x: -8, width: 8 }, // runs just west of the rail line
    { name: "Yegua St", x: 46, width: 8 },
    { name: "Lakeshore Dr", x: 90, width: 8 },
  ],
};

// The rail line runs north-south through downtown, crossing Main St.
export const RAIL = {
  x: 0,
  zMin: -150,
  zMax: 150,
  gateZOffset: 7, // distance from Main St centerline where crossing gates sit
};

// Buildings: satirical, original names/placements loosely inspired by the
// real Eagle Lake Commercial Historic District layout (Main St / Commerce St
// grid, a historic depot, a railroad crossing through downtown) without
// copying any real signage, logos, or exact addresses.
export const BUILDINGS = [
  {
    name: "Eagle's Nest Drive-Thru",
    sub: "BEER • ICE • SMOKES (CLOSED)",
    x: 16, z: 10, w: 11, d: 9, h: 6,
    color: 0xcf8a3a, roof: 0x7a3b2e, signColor: "#2b2b2b", textColor: "#ffd34d",
    kind: "driveThru",
  },
  {
    name: "Prairie Depot Museum",
    sub: "EST. 1911 • RAILROAD HERITAGE",
    x: -22, z: 22, w: 14, d: 8, h: 6.5,
    color: 0x8c3b32, roof: 0x3d3d3d, signColor: "#f2e9d8", textColor: "#3d2a1c",
  },
  {
    name: "Lone Star Diner",
    sub: "CHICKEN FRIED STEAK DAILY",
    x: 40, z: 9, w: 10, d: 9, h: 6,
    color: 0xe3e3df, roof: 0x7f2f2f, signColor: "#7f2f2f", textColor: "#ffffff",
  },
  {
    name: "Commerce St. Feed & Seed",
    sub: "HAY • FEED • FARM SUPPLY",
    x: -40, z: -42, w: 13, d: 10, h: 6,
    color: 0xb7a26a, roof: 0x4a4a3a, signColor: "#3a3a2a", textColor: "#f2e9d8",
  },
  {
    name: "First Prairie Bank",
    sub: "SINCE 1948",
    x: 4, z: 9, w: 9, d: 9, h: 7.5,
    color: 0xcfc8b4, roof: 0x5a5a5a, signColor: "#2f4a3a", textColor: "#f2e9d8",
  },
  {
    name: "Eagle Lake Vol. Fire Co. No. 3",
    sub: "SIDNEY'S STATION",
    x: -40, z: 9, w: 13, d: 10, h: 7,
    color: 0xb5342c, roof: 0x2b2b2b, signColor: "#ffffff", textColor: "#b5342c",
    kind: "firehouse",
  },
  {
    name: "County Seat Hardware",
    sub: "NUTS • BOLTS • PROPANE",
    x: 58, z: -9, w: 11, d: 9, h: 6,
    color: 0x6f7a6f, roof: 0x3a3a3a, signColor: "#1f2a1f", textColor: "#e8e2c8",
  },
  {
    name: "Blue Heron Chapel",
    sub: "ALL ARE WELCOME",
    x: 70, z: 20, w: 11, d: 14, h: 8, steeple: true,
    color: 0xf2efe6, roof: 0x5a6b7a, signColor: "#5a6b7a", textColor: "#ffffff",
  },
  {
    name: "Pump Jack Gas & Go",
    sub: "FILL UP • FISH BAIT • ICE",
    x: -60, z: -9, w: 10, d: 8, h: 5.5,
    color: 0xd8d3c4, roof: 0xc23b2e, signColor: "#c23b2e", textColor: "#ffffff",
    kind: "gasStation",
  },
  {
    name: "Prairie County Annex",
    sub: "CITY HALL",
    x: 20, z: -44, w: 14, d: 10, h: 7.5,
    color: 0xe7e2d2, roof: 0x4a4a4a, signColor: "#2f4a3a", textColor: "#f2e9d8",
  },
];

export const HOUSES = [
  { x: -94, z: 34, color: 0xd8c3a5, roof: 0x6b4a3a },
  { x: -110, z: 34, color: 0xc9d8c3, roof: 0x4a3a3a },
  { x: -94, z: 52, color: 0xb9c9d8, roof: 0x3a3a4a },
  { x: -110, z: 52, color: 0xe0d6b8, roof: 0x5a4a3a },
  { x: 70, z: 50, color: 0xd8c3a5, roof: 0x6b4a3a },
  { x: 88, z: 50, color: 0xc9d8c3, roof: 0x4a3a3a },
  { x: 70, z: 66, color: 0xe0d6b8, roof: 0x5a4a3a },
  { x: 118, z: 50, color: 0xb9c9d8, roof: 0x3a3a4a },
  { x: 118, z: 66, color: 0xd8c3a5, roof: 0x6b4a3a },
  { x: -94, z: -60, color: 0xc9d8c3, roof: 0x4a3a3a },
  { x: -110, z: -60, color: 0xe0d6b8, roof: 0x5a4a3a },
];

export const WATER_TOWER = { x: 110, z: -40 };

export const LAKE = { x: -40, z: 120, rx: 70, rz: 50 };

export const SIGNAGE = {
  goose: { x: 10, z: 46, text: "EAGLE LAKE\nGOOSE HUNTING CAPITAL OF TEXAS" },
};

// Starting transform for Sidney (outside the firehouse) and the vehicles.
// Heading PI faces south, down toward Main St and the downtown crossing.
export const SPAWN = {
  player: { x: -40, z: 17, heading: Math.PI },
  bike: { x: -37, z: 17, heading: Math.PI },
  car: { x: -44, z: 18, heading: Math.PI },
};
