export const GAME_TITLE = "Eagle Lake: Green Dog Run";

export const WORLD = { bounds: 805, fogNear: 340, fogFar: 1550, fogColor: 0xc4e6ee };

// Sidney starts on the apron of the volunteer fire station on N McCarty,
// facing south down McCarty toward downtown and the tracks.
export const SPAWN = {
  player: { x: -10, z: -90, heading: 0 },
  bike: { x: -12.2, z: -88.2, heading: 0 },
  car: { x: -11, z: -103, heading: Math.PI / 2 },
};

// The Thicker Bradshall busks at the Veterans Memorial Park pond — the same
// spot as one of the photos of him.
export const BRADSHALL = { x: 282, z: -180, heading: 2.5 };
