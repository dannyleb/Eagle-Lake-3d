export const GAME_TITLE = "Eagle Lake: Green Dog Run";

export const WORLD = { bounds: 805, fogNear: 340, fogFar: 1550, fogColor: 0xc4e6ee };

// Sidney starts at Veterans Memorial Park, listening to The Thicker
// Bradshall busk by the pond, with Green Dog parked beside him. The '70
// waits at the fire station on N McCarty (his first objective).
export const SPAWN = {
  player: { x: 291, z: -183, heading: -Math.PI / 2 },
  bike: { x: 292.2, z: -181.0, heading: -Math.PI / 2 },
  car: { x: -11, z: -103, heading: Math.PI / 2 },
};

// The Thicker Bradshall busks at the Veterans Memorial Park pond — the same
// spot as one of the photos of him.
export const BRADSHALL = { x: 282, z: -180, heading: 2.5 };
