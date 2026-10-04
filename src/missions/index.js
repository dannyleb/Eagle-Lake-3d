import { findRoute, routeLength } from "./nav.js";
import { createRouteView } from "./route.js";
import { createMissionUI } from "./ui.js";
import { createNinjaGang } from "../ninja.js";
import {
  startSiren, stopSiren, setSirenVolume, duckRadio,
  playFanfare, playObjective, playHit, playPoof, playOof,
} from "../audio.js";

// ---------------------------------------------------------------------------
// Missions. Each one is a story card, a list of steps, and an achievement.
// Step types:
//   goto   { label, x, z, r }            reach a spot (route + waypoint shown)
//   defeat { label, gang }               knock out every ninja in a gang
// To add a mission, append to MISSIONS.
// ---------------------------------------------------------------------------

const FIRE_STATION = { x: -9, z: -96, r: 8 };
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
      step = { ...s, resolve };
      playObjective();
      routePts = null;
      routeFrom = null;
      if (s.type === "goto") route.setTarget(s);
      else route.setTarget(null);
      route.setRoute(null);
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
    for (const s of m.steps) await runStep(s);
    step = null;
    route.setTarget(null);
    route.setRoute(null);
    ui.setObjective(null);
    if (alarmOn) {
      alarmOn = false;
      ui.setAlarm(null);
      stopSiren();
      duckRadio(false);
    }
    if (m.onComplete) m.onComplete(ctx);
    playFanfare();
    await ui.achievement(m.achievement.title, m.achievement.text);
    mission = null;
  }

  async function run() {
    await wait(3.5);
    for (const m of MISSIONS) {
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
      ui.setObjective(step.label, `${Math.round(remaining)} m`, !!alarmOn);
      ui.waypoint({ x: step.x, y: 10, z: step.z }, ctx.camera, remaining);
      if (d < step.r) step.resolve();
    } else if (step.type === "defeat") {
      const g = state[step.gang];
      ui.setObjective(step.label, `${g.defeated} / ${g.total} down`, true);
      ui.waypoint(null);
      if (g.remaining === 0) step.resolve();
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

  return {
    start: run,
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
