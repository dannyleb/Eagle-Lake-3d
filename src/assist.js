// Driving and walking assists, so steering on a phone is "point the stick
// where you want to go" instead of tank controls:
//   - stickToHeading: joystick direction -> world heading, relative to a
//     camera reference that is captured when you push the stick and held
//     while you keep pushing (so holding "right" never turns into circles)
//   - clearHeading: feelers that bend the path around walls, trees and
//     parked cars instead of stopping dead against them
//   - createStuckWatch: if you're pushing but not getting anywhere, pop
//     the player to the nearest open spot

export const wrapAngle = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

const DEAD = 0.18;

export function createStickSteer() {
  let ref = null;
  return {
    // stick: { x, y } in [-1, 1] (y up = forward). Returns null when idle.
    heading(stick, cameraYaw) {
      const mag = Math.min(1, Math.hypot(stick.x, stick.y));
      if (mag < DEAD) {
        ref = null;
        return null;
      }
      if (ref === null) ref = cameraYaw;
      // Very long holds slowly re-sync with the camera.
      ref += wrapAngle(cameraYaw - ref) * 0.004;
      return { dir: wrapAngle(ref - Math.atan2(stick.x, stick.y)), mag: (mag - DEAD) / (1 - DEAD) };
    },
  };
}

const STEPS = [0.3, 0.6, 0.95, 1.3, 1.65];

// The heading closest to `heading` whose path `look` units ahead is clear
// for a body of radius r. `bias` (+1 / -1) tries that side first on ties.
// Returns null if every feeler is blocked.
export function clearHeading(collision, x, z, heading, r, look, bias = 1) {
  const sb = bias < 0 ? -1 : 1;
  const order = [0];
  for (const m of STEPS) order.push(m * sb, -m * sb);
  for (const o of order) {
    const h = heading + o;
    const sx = Math.sin(h), sz = Math.cos(h);
    if (collision.hits(x + sx * look, z + sz * look, r) || collision.hits(x + sx * look * 0.5, z + sz * look * 0.5, r)) continue;
    return h;
  }
  return null;
}

// Watches for "pushing but not moving" and frees the player.
export function createStuckWatch() {
  let t = 0, ax = 0, az = 0;
  return {
    update(dt, pushing, pos, collision, radius, wantHeading) {
      if (!pushing) {
        t = 0;
        ax = pos.x;
        az = pos.z;
        return false;
      }
      t += dt;
      if (t < 0.8) return false;
      const moved = Math.hypot(pos.x - ax, pos.z - az);
      t = 0;
      ax = pos.x;
      az = pos.z;
      if (moved > 0.6) return false;
      // Nearest open spot, preferring the direction you're pushing.
      for (const dist of [1.5, 2.5, 3.5, 5]) {
        for (let k = 0; k < 16; k++) {
          const o = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
          const h = wantHeading + o;
          const x = pos.x + Math.sin(h) * dist, z = pos.z + Math.cos(h) * dist;
          if (!collision.hits(x, z, radius)) {
            pos.x = x;
            pos.z = z;
            ax = x;
            az = z;
            return true;
          }
        }
      }
      return false;
    },
  };
}
