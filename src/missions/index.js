import { findRoute, routeLength } from "./nav.js";
import { createRouteView } from "./route.js";
import { createMissionUI } from "./ui.js";
import { createNinjaGang } from "../ninja.js";
import {
  startSiren, stopSiren, setSirenVolume, duckRadio,
  playFanfare, playPop, playObjective, playHit, playPoof, playOof, playTick, playFail,
} from "../audio.js";

// ---------------------------------------------------------------------------
// Missions. Each one is a story card, a list of steps, and an achievement.
// Step types:
//   goto   { label, x, z, r }            reach a spot (route + waypoint shown)
//          { at: (ctx) => ({ x, z }) }   ...or a spot looked up at run time
//          { timed: true }               ...against the clock (see failStory)
//   defeat { label, gang }               knock out every ninja in a gang
// To add a mission, append to MISSIONS.
// ---------------------------------------------------------------------------

const FIRE_STATION = { x: -9, z: -96, r: 14 }; // reaches both lanes of McCarty
const EAGLE_STOP = { x: -330, z: 44, r: 24 };

const EAGLE_STOP_NINJAS = [
  { x: -330, z: 24, heading: 0 },
  { x: -331, z: 40, heading: 0 },
  { x: -340, z: 52, heading: 0.4 },
  { x: -320, z: 54, heading: -0.4 },
  { x: -338, z: 28, y: 5.62, heading: 0 }, // on the roof
  { x: -322, z: 38, y: 5.62, heading: 0 },
];

export const MISSIONS = [
  {
    id: "fire-alarm",
    alarm: "FIRE ALARM — STATION 1",
    story: {
      kicker: "MISSION 1 · FIRE ALARM",
      title: "THERE'S A FIRE!",
      body:
        "The siren at Station 1 just went off. There's a fire somewhere in Eagle Lake, " +
        "and the engine can't roll without you. Drop everything, Sidney — get to the " +
        "fire station on McCarty Avenue. Follow the yellow arrows.",
      go: "ON MY WAY",
    },
    steps: [{ type: "goto", label: "Get to the Fire Station", ...FIRE_STATION }],
    achievement: {
      title: "FIRE CHIEF",
      text: "You beat everybody to Station 1. The volunteers took one look and voted on the spot: Chief Sidney. Nice helmet.",
    },
    onComplete: (ctx) => ctx.player.setChief(true),
  },
  {
    id: "eagle-stop-ninjas",
    story: {
      kicker: "MISSION 2 · THE EAGLE STOP",
      title: "NINJAS TOOK THE EAGLE STOP!",
      body:
        "Chief, we've got a situation out on 90A West. A gang of ninjas has taken over the " +
        "Eagle Stop. They locked the cashier in the beer cooler and they're eating all the " +
        "boiled peanuts. Get out there and defeat them. On foot, get close and hit E — " +
        "or bring Green Dog and run them down.",
      go: "LET'S ROLL",
    },
    setup: (ctx) => ({ gang: createNinjaGang(ctx.scene, ctx.collision, EAGLE_STOP_NINJAS) }),
    steps: [
      { type: "goto", label: "Get to the Eagle Stop", ...EAGLE_STOP },
      { type: "defeat", label: "Defeat the ninjas", gang: "gang" },
    ],
    achievement: {
      title: "HEAD OF SECURITY",
      text: "The Eagle Stop is ninja-free and the cashier is out of the cooler. You've been named Head of Security. The pay is one free six-pack a week.",
    },
  },
  {
    id: "wrestling-night",
    story: {
      kicker: "MISSION 3 \u00b7 WRESTLING NIGHT",
      title: "IT'S WRESTLING NIGHT!",
      body:
        "Saturday Night Slamtown is about to start, and tonight it's the title match: " +
        "Hacksaw Hank \u201cThe Rice Belt Rumbler\u201d versus El Gallo Grande. Get home to " +
        "your recliner before the opening bell, Chief. The clock is ticking.",
      go: "TO THE RECLINER",
    },
    steps: [{ type: "goto", label: "Get home before the bell", at: (ctx) => ctx.world.sidneyHouse, r: 8, timed: true }],
    failStory: {
      kicker: "MISSION 3 \u00b7 WRESTLING NIGHT",
      title: "YOU MISSED THE BELL!",
      body: "You heard the crowd pop from three blocks away. Good news: Channel 4 runs the replay in a minute. Run it back!",
      go: "TRY AGAIN",
    },
    achievement: {
      title: "CHAMPIONSHIP BELT",
      text: "You hit the recliner just as the bell rang. Hacksaw Hank took the title, and somehow you went home with the belt. Wear it proud, Champ.",
    },
    onComplete: (ctx) => ctx.player.setBelt(true),
  },
];

// ctx: { scene, camera, viewport, collision, hud, player, getMode, getPos,
//        getVehicle, punch, kickPlayer, world }
export function createMissions(ctx) {
  const ui = createMissionUI(ctx.viewport);
  const route = createRouteView(ctx.scene);
  let step = null; // { type, ..., resolve }
  let mission = null;
  let state = {}; // per-mission objects from setup()
  let routePts = null, routeFrom = null, routeTimer = 0, routeLen = 0;
  let alarmOn = false;

  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));

  function runStep(s) {
    return new Promise((resolve) => {
      const spot = s.at ? s.at(ctx) : s;
      step = { ...s, x: spot.x, z: spot.z, resolve };
      playObjective();
      routePts = null;
      routeFrom = null;
      if (s.type === "goto") route.setTarget(step);
      else route.setTarget(null);
      route.setRoute(null);
      if (s.timed) {
        // Enough time to run it on foot along the streets, with a little slack.
        const p = ctx.getPos();
        const len = routeLength(findRoute(p.x, p.z, step.x, step.z));
        step.timeLeft = Math.max(25, Math.ceil(len / 9 + 12)); // a brisk run; the bike or car makes it easy
        step.lastTick = Math.ceil(step.timeLeft);
      }
    });
  }

  async function runMission(m) {
    mission = m;
    if (m.alarm) {
      alarmOn = true;
      ui.setAlarm(m.alarm);
      startSiren();
      duckRadio(true);
    }
    await ui.story(m.story);
    state = m.setup ? m.setup(ctx) : {};
    for (const s of m.steps) {
      // Timed steps can be failed; show the miss card and go again.
      while ((await runStep(s)) === "failed") {
        step = null;
        route.setTarget(null);
        route.setRoute(null);
        ui.setObjective(null);
        ui.setTimer(null);
        playFail();
        await ui.story(m.failStory);
      }
    }
    step = null;
    ui.setTimer(null);
    route.setTarget(null);
    route.setRoute(null);
    ui.setObjective(null);
    if (alarmOn) {
      alarmOn = false;
      ui.setAlarm(null);
      stopSiren();
      duckRadio(false);
    }
    if (ctx.arrive) ctx.arrive();
    if (m.onComplete) m.onComplete(ctx);
    playPop();
    playFanfare();
    await ui.achievement(m.achievement.title, m.achievement.text);
    mission = null;
  }

  // from: mission index to start at (debug builds can skip ahead).
  async function run(from = 0) {
    await wait(3.5);
    for (const m of MISSIONS.slice(from)) {
      await runMission(m);
      await wait(2.5);
    }
    ui.setObjective("Free roam", "More missions coming soon");
    await wait(8);
    ui.setObjective(null);
  }

  // --- per-frame ---
  function update(dt, time) {
    route.update(dt, time);
    const pos = ctx.getPos();
    const mode = ctx.getMode();

    // Station lights and siren level follow the alarm.
    const lights = ctx.world.fireLights;
    if (lights) {
      const on = alarmOn && Math.floor(time * 3) % 2 === 0;
      lights[0].color.setHex(alarmOn ? (on ? 0xff2a1a : 0x3a0606) : 0x3a0606);
      lights[1].color.setHex(alarmOn ? (!on ? 0xff2a1a : 0x3a0606) : 0x3a0606);
    }
    if (alarmOn) {
      const d = Math.hypot(pos.x - FIRE_STATION.x, pos.z - FIRE_STATION.z);
      setSirenVolume(0.025 + 0.055 * (1 - Math.min(d, 450) / 450));
    }

    // Ninjas run whenever a gang exists, even before Sidney arrives.
    const gang = state.gang;
    if (gang) {
      gang.update(dt, {
        px: pos.x,
        pz: pos.z,
        onFoot: mode === "walk",
        vehicle: ctx.getVehicle(),
        kickPlayer: (dx, dz) => {
          ctx.kickPlayer(dx, dz);
          playOof();
          ctx.hud.toast("Ninja kick! Get back in there.", 1400);
        },
        onHit: (n, how) => {
          playHit();
          if (how === "ram") ctx.hud.toast("Run down!", 900);
        },
        onDefeat: () => playPoof(),
      });
    }

    if (!step || ui.storyOpen) {
      ui.waypoint(null);
      return;
    }

    if (step.type === "goto") {
      const d = Math.hypot(pos.x - step.x, pos.z - step.z);
      routeTimer -= dt;
      const moved = !routeFrom || Math.hypot(pos.x - routeFrom[0], pos.z - routeFrom[1]) > 4;
      if (routeTimer <= 0 && moved) {
        routeTimer = 0.5;
        routeFrom = [pos.x, pos.z];
        routePts = findRoute(pos.x, pos.z, step.x, step.z);
        routeLen = routeLength(routePts);
        route.setRoute(d > step.r ? routePts : null);
      }
      // Distance along the streets (straight-line once you're off the network).
      const sinceRoute = routeFrom ? Math.hypot(pos.x - routeFrom[0], pos.z - routeFrom[1]) : 0;
      const remaining = routePts ? Math.max(d, routeLen - sinceRoute) : d;
      ui.setObjective(step.label, `${Math.round(remaining)} m`, !!alarmOn || !!step.timed);
      ui.waypoint({ x: step.x, y: 10, z: step.z }, ctx.camera, remaining);
      if (d < step.r) {
        if (ctx.arrive) ctx.arrive(); // brake and hop off the bike / out of the car
        step.resolve("done");
        return;
      }
      if (step.timed) {
        step.timeLeft -= dt;
        ui.setTimer(step.timeLeft);
        const sec = Math.ceil(step.timeLeft);
        if (sec < step.lastTick) {
          step.lastTick = sec;
          if (sec <= 10 && sec > 0) playTick(sec <= 5);
        }
        if (step.timeLeft <= 0) step.resolve("failed");
      }
    } else if (step.type === "defeat") {
      const g = state[step.gang];
      ui.setObjective(step.label, `${g.defeated} / ${g.total} down`, true);
      ui.waypoint(null);
      if (g.remaining === 0) step.resolve("done");
    }
  }

  // E pressed: dismiss a story card, or take down a ninja on foot.
  function interact() {
    if (ui.storyOpen) {
      ui.dismissStory();
      return true;
    }
    const gang = state.gang;
    if (gang && ctx.getMode() === "walk") {
      const p = ctx.getPos();
      const n = gang.nearest(p.x, p.z);
      if (n) {
        ctx.punch(n.group.position);
        gang.hit(n, n.group.position.x - p.x, n.group.position.z - p.z);
        playHit();
        return true;
      }
      // Ninjas still around: E is always a punch (a whiff if none in reach),
      // never a call for the bike mid-fight.
      if (gang.remaining > 0) {
        ctx.punch(null);
        return true;
      }
    }
    return false;
  }

  function prompt() {
    if (ui.storyOpen) return null;
    const gang = state.gang;
    if (gang && ctx.getMode() === "walk") {
      const p = ctx.getPos();
      if (gang.nearest(p.x, p.z)) return { text: "Take down the ninja", action: "FIGHT" };
    }
    return null;
  }

  // Which way the mission route leaves the intersection at (x, z), as a
  // heading, or null with no destination. Routed from the intersection
  // itself (cached per intersection), so it doesn't matter which street the
  // rider happens to be closest to.
  let dirCache = { key: "", dir: null };
  function routeDirAt(x, z) {
    if (!step || step.type !== "goto") return null;
    const key = `${x},${z},${step.x},${step.z}`;
    if (dirCache.key === key) return dirCache.dir;
    const pts = findRoute(x, z, step.x, step.z);
    let dir = null;
    for (const [qx, qz] of pts) {
      if (Math.hypot(qx - x, qz - z) > 0.5) {
        dir = Math.atan2(qx - x, qz - z);
        break;
      }
    }
    dirCache = { key, dir };
    return dir;
  }

  return {
    start: run,
    routeDirAt,
    // Testing: set the countdown on a timed step.
    debugSetTime(t) {
      if (step && step.timed) step.timeLeft = t;
    },
    update,
    interact,
    prompt,
    get blocking() {
      return ui.storyOpen;
    },
    // For the minimap
    get route() {
      return step && step.type === "goto" ? routePts : null;
    },
    get target() {
      return step && step.type === "goto" ? step : null;
    },
    get enemies() {
      return state.gang ? state.gang.positions() : [];
    },
  };
}
