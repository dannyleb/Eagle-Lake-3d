import { findRoute, routeLength } from "./nav.js";
import { createRouteView } from "./route.js";
import { laneReach } from "../map/layout.js";
import { createMissionUI } from "./ui.js";
import { createNinjaGang } from "../ninja.js";
import { createFishing } from "../fishing.js";
import { createSawJob, createLadderJob } from "../arborist.js";
import { createShopJob, SHOPPING_LIST } from "../shop.js";
import { failCam } from "../ui/failcam.js";
import {
  startSiren, stopSiren, setSirenVolume, duckRadio,
  playAchievementTheme, playPop, playObjective, playHit, playPoof, playOof, playTick, playFail,
  playTrack, playCheer, startCrowd, endShowSong, SHOW_TRACK,
} from "../audio/index.js";

// ---------------------------------------------------------------------------
// Missions. Each one is a story card, a list of steps, and an achievement.
// Step types:
//   goto   { label, x, z, r }            reach a spot (route + waypoint shown)
//          { at: (ctx) => ({ x, z }) }   ...or a spot looked up at run time
//          { timed: true }               ...against the clock (see failStory)
//          { onFoot: true }              ...r holds in a car too (no drive-by)
//   defeat { label, gang }               knock out every ninja in a gang
//   perform { label, seconds, track }    play a show on the spot (Bradshall)
//   job    { label, job, approach }      a hands-on job at a spot: fishing,
//                                        sawing, climbing, shopping. state[job]
//                                        is its controller (spot, facing,
//                                        begin, press, prompt, status, update,
//                                        end, active, done)
// Each mission: { id, name, story, steps, achievement } (+ optional alarm,
// setup, cleanup, onComplete, failStory). id is what saved games record.
// To add a mission, append to MISSIONS (Sidney), BRADSHALL_MISSIONS,
// GARY_MISSIONS, or
// SHARED_MISSIONS (every character, after their own). Optional hooks:
// setup(ctx) -> state objects, cleanup(state, ctx) after the last step.
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
    name: "Fire Alarm",
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
    name: "The Eagle Stop",
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
    name: "Wrestling Night",
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

// The Thicker Bradshall's missions (when you pick him at the start).
export const BRADSHALL_MISSIONS = [
  {
    id: "ferris-gig",
    name: "Gig at the Ferris Hotel",
    story: {
      kicker: "BRADSHALL \u00b7 MISSION 1",
      title: "GIG AT THE FERRIS HOTEL",
      body:
        "The Ferris Hotel on McCarty booked you for tonight, and the room's already filling up. " +
        "Tune up, grab a ride and get downtown. Play 'em a good one.",
      go: "LET'S PICK",
    },
    steps: [
      { type: "goto", label: "Get to the Ferris Hotel", at: (ctx) => ctx.world.ferris, r: 10 },
      { type: "perform", label: "Play the show!", seconds: 30, track: SHOW_TRACK },
    ],
    achievement: {
      title: "PAID: $50",
      text: "The crowd stomped for an encore and the manager peeled off a fifty. Rent's covered. Mostly.",
    },
  },
  {
    id: "gear-run",
    name: "Go Get the Gear",
    story: {
      kicker: "BRADSHALL \u00b7 MISSION 2",
      title: "GO GET THE GEAR",
      body:
        "Next weekend's a bigger room, and the amp and the good mic are out at The Little House, " +
        "just south of town. Head down there and haul it out.",
      go: "ON IT",
    },
    steps: [
      { type: "goto", label: "Get to The Little House", at: (ctx) => ctx.world.gearLot, r: 16 },
      { type: "goto", label: "Grab the gear from The Little House", at: (ctx) => ctx.world.gearHouse, r: 3, onFoot: true },
    ],
    achievement: {
      title: "DR. PEBBER",
      text: "Gear's loaded, and there was a cold can of Dr. Pebber in the mini fridge. 24 flavors \u2014 one more than the other guy.",
    },
  },
];

// Gary Jones's missions: new clothes first, then the tree work.
export const GARY_MISSIONS = [
  {
    id: "gary-new-duds",
    name: "New Duds",
    story: {
      kicker: "GARY JONES \u00b7 MISSION 1",
      title: "$1,500 OF NEW DUDS",
      body:
        "Your denim's so faded it's practically white. Get out to Rawhide & Rhinestones Western Wear on 90A West " +
        "and get the whole list: boots, jeans, a belt, a pearl snap and a cowboy hat. Budget: fifteen hundred dollars. Exactly.",
      go: "SADDLE UP",
    },
    setup: (ctx) => ({ shop: createShopJob({ player: ctx.player, spot: ctx.world.westernWear, say: (t, ms) => ctx.hud.toast(t, ms) }) }),
    steps: [
      { type: "goto", label: "Get to Rawhide & Rhinestones", at: (ctx) => ctx.world.westernWear, r: 10 },
      { type: "job", label: "Buy the whole list", job: "shop", approach: "Walk in to the counter" },
    ],
    cleanup: (state) => state.shop.end(),
    onComplete: (ctx) => SHOPPING_LIST.forEach((item) => ctx.player.dress(item.id)),
    achievement: {
      title: "$1,500 OF NEW DUDS",
      text: "Boots, jeans, a tooled belt with a buckle the size of a dinner plate, a pearl snap and a 10X hat. Still all denim. All Gary.",
    },
  },
  {
    id: "gary-treehouse",
    name: "Save the Treehouse",
    story: {
      kicker: "GARY JONES \u00b7 MISSION 2",
      title: "A TREE GREW THROUGH THE TREEHOUSE",
      body:
        "The Treehouse bar on S McCarty has a problem: a poplar grew right up through the middle of it and out the roof. " +
        "The health inspector's coming Friday. Grab the chainsaw and save the business.",
      go: "FIRE IT UP",
    },
    setup: (ctx) => ({
      saw: createSawJob({ scene: ctx.scene, player: ctx.player, tree: ctx.world.treehouse.tree, spot: ctx.world.treehouse.spot, say: (t, ms) => ctx.hud.toast(t, ms) }),
    }),
    steps: [
      { type: "goto", label: "Get to the Treehouse", at: (ctx) => ctx.world.treehouse.street, r: 12 },
      { type: "job", label: "Cut down the poplar", job: "saw", approach: "Walk in to the tree", hold: 2.5 },
    ],
    cleanup: (state) => state.saw.end(),
    onComplete: (ctx) => { if (ctx.world.treehouse.tree.standing) ctx.world.treehouse.tree.cut(0, true); },
    achievement: {
      title: "PAID: $50",
      text: "The poplar's out, the roof's (mostly) fine, and the Treehouse is open for business. The owner paid you fifty bucks and a cold one.",
    },
  },
  {
    id: "gary-big-oak",
    name: "The Big Oak",
    story: {
      kicker: "GARY JONES \u00b7 MISSION 3",
      title: "THE BIG OAK DOWNTOWN",
      body:
        "The big old oak at Main and McCarty has a dead limb hanging right over the street. All you've got is a rickety old ladder. " +
        "Tap E to climb, one rung at a time, and try not to fall off. Then cut that limb down.",
      go: "HOLD MY HAT",
    },
    setup: (ctx) => ({
      ladder: createLadderJob({ scene: ctx.scene, player: ctx.player, oak: ctx.world.townOak, say: (t, ms) => ctx.hud.toast(t, ms), clip: failCam() }),
    }),
    steps: [
      { type: "goto", label: "Get to the big oak", at: (ctx) => ctx.world.townOak.spot, r: 10 },
      { type: "job", label: "Climb up and cut the dead limb", job: "ladder", approach: "Walk up to the ladder" },
    ],
    cleanup: (state) => state.ladder.end(),
    onComplete: (ctx) => { if (ctx.world.townOak.limbOn) ctx.world.townOak.dropLimb(true); },
    achievement: {
      title: "NEW CHAINSAW BLADE & NEW LADDER",
      text: "The dead limb's down and nobody got bonked. The city sprang for a brand-new chainsaw blade and a ladder that doesn't wobble.",
    },
  },
];

// ---------------------------------------------------------------------------
// Shared quest line: every character plays these after their own missions
// (any character added later gets them too).
// ---------------------------------------------------------------------------

// The lunch special at the Dairy Quake on 90A East.
const LUNCH_SPECIAL = {
  id: "lunch-special",
  name: "The Lunch Special",
  story: {
    kicker: "LUNCH TIME",
    title: "THE LUNCH SPECIAL!",
    body:
      "It's a minute to two, and the Dairy Quake out on 90A East ends the lunch special at two sharp: " +
      "a cheese fries basket, a dip cone and a sweet tea for $5.99. Get there before they flip the sign. " +
      "Floating Dr. Pebbers on the road give you a burst of speed.",
    go: "I'M STARVING",
  },
  steps: [{ type: "goto", label: "Get to the Dairy Quake", at: (ctx) => ctx.world.dairy, r: 10, timed: true }],
  failStory: {
    kicker: "LUNCH TIME",
    title: "SPECIAL'S OVER!",
    body: "They flipped the sign right as you pulled in. The manager says they'll run it one more time if you hurry back out and come in again. Go!",
    go: "ONE MORE TRY",
  },
  achievement: {
    title: "CHEESE FRIES BASKET",
    text: "Made it with seconds to spare. One red plastic basket, extra cheese, extra crispy. Worth it.",
  },
};
// A 10-foot gator in Granny's Lake: fish him out with a T-bone steak.
const GRANNYS_GATOR = {
  id: "grannys-gator",
  name: "Granny's Gator",
  story: {
    kicker: "GRANNY'S LAKE",
    title: "THERE'S A 10-FOOT ALLIGATOR IN GRANNY'S LAKE!",
    body:
      "Granny called. Something big ate her ducks, her lawn flamingo and half her dock. " +
      "She left a fishing rod and a T-bone steak down at the landing. Get out to Granny's Lake " +
      "off 90A East and fish that gator out. Tap E to cast, wait for the bite, then tap E like crazy to reel him in.",
    go: "GET THE ROD",
  },
  setup: (ctx) => ({
    fishing: createFishing({
      scene: ctx.scene,
      player: ctx.player,
      spot: ctx.world.grannysLake.spot,
      cast: ctx.world.grannysLake.cast,
      say: (text, ms) => ctx.hud.toast(text, ms),
    }),
  }),
  steps: [
    { type: "goto", label: "Get to Granny's Lake", at: (ctx) => ctx.world.grannysLake.spot, r: 10 },
    { type: "job", label: "Fish out the 10-foot gator", job: "fishing", approach: "Walk down to the landing" },
  ],
  cleanup: (state) => state.fishing.end(),
  achievement: {
    title: "DEEP-FRIED GATOR BALLS",
    text: "Granny hauled out the fryer. One big plate of deep-fried gator balls, extra ranch, still sizzling. You earned every one.",
  },
};

export const SHARED_MISSIONS = [LUNCH_SPECIAL, GRANNYS_GATOR];

const MISSION_SETS = { sidney: MISSIONS, bradshall: BRADSHALL_MISSIONS, gary: GARY_MISSIONS };
// A character's whole quest line: their own missions, then the shared ones.
export const questLine = (character) => [...(MISSION_SETS[character] || MISSIONS), ...SHARED_MISSIONS];

// ctx: { scene, camera, viewport, collision, hud, player, getMode, getPos,
//        getVehicle, punch, kickPlayer, world, arrive, onMissionDone(id) }
export function createMissions(ctx) {
  const ui = createMissionUI(ctx.viewport);
  const route = createRouteView(ctx.scene);
  let step = null; // { type, ..., resolve }
  let state = {}; // per-mission objects from setup()
  let routePts = null, routeFrom = null, routeTimer = 0, routeLen = 0;
  let alarmOn = false;

  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));

  function runStep(s) {
    return new Promise((resolve) => {
      const spot = s.at ? s.at(ctx) : s;
      step = { ...s, x: spot.x, z: spot.z, resolve };
      // Spots set back from the street (a store, a lake) are out of reach of
      // a car or bike on its rails, so riding past counts as arriving.
      if (s.type === "goto") step.rideR = s.onFoot ? s.r : Math.max(s.r, laneReach(step.x, step.z) + 4);
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
    ui.setReel(null);
    route.setTarget(null);
    route.setRoute(null);
    ui.setObjective(null);
    if (m.cleanup) m.cleanup(state, ctx);
    if (alarmOn) {
      alarmOn = false;
      ui.setAlarm(null);
      stopSiren();
      duckRadio(false);
    }
    if (ctx.arrive) ctx.arrive();
    if (m.onComplete) m.onComplete(ctx);
    playPop();
    playAchievementTheme(); // theme fades in over the radio, then tunes back
    await ui.achievement(m.achievement.title, m.achievement.text);
  }

  // done: ids of missions already finished (a saved game) - skipped, but
  // their lasting rewards (helmet, belt) come back. from: index into what's
  // left to start at (debug builds can skip ahead).
  async function run({ done = [], from = 0 } = {}) {
    const line = questLine(ctx.character);
    for (const m of line) if (done.includes(m.id) && m.onComplete) m.onComplete(ctx);
    await wait(3.5);
    for (const m of line.filter((m) => !done.includes(m.id)).slice(from)) {
      await runMission(m);
      if (ctx.onMissionDone) ctx.onMissionDone(m.id);
      await wait(2.5);
    }
    ui.setObjective("Free roam", "More missions coming soon");
    await wait(8);
    ui.setObjective(null);
  }

  // --- per-frame ---
  function update(dt, time) {
    const pos = ctx.getPos();
    route.update(dt, time, step && step.type === "goto" ? Math.hypot(pos.x - step.x, pos.z - step.z) : Infinity);
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
      // Riding, start braking early enough to stop by the door, not past it.
      const veh = mode === "walk" ? null : ctx.getVehicle();
      const reach = veh ? Math.hypot(step.rideR, veh.stopDist) : step.r;
      routeTimer -= dt;
      const moved = !routeFrom || Math.hypot(pos.x - routeFrom[0], pos.z - routeFrom[1]) > 4;
      if (routeTimer <= 0 && moved) {
        routeTimer = 0.5;
        routeFrom = [pos.x, pos.z];
        routePts = findRoute(pos.x, pos.z, step.x, step.z);
        routeLen = routeLength(routePts);
        route.setRoute(d > reach ? routePts : null);
      }
      // Distance along the streets (straight-line once you're off the network).
      const sinceRoute = routeFrom ? Math.hypot(pos.x - routeFrom[0], pos.z - routeFrom[1]) : 0;
      // Close in (or off the street, like a back yard), straight-line is what you want to see.
      const remaining = routePts && d > 25 ? Math.max(d, routeLen - sinceRoute) : d;
      ui.setObjective(step.label, `${Math.round(remaining)} m`, !!alarmOn || !!step.timed);
      ui.waypoint({ x: step.x, y: 10, z: step.z }, ctx.camera, remaining);
      if (d < reach) {
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
    } else if (step.type === "perform") {
      if (step.left == null && ctx.getMode() !== "walk") {
        // Wait until he's off the bike / out of the car before the set.
        ui.setObjective(step.label, "Setting up...", true);
        ui.waypoint(null);
        return;
      }
      if (step.left == null) {
        // Counted on the wall clock so the set stays in step with the song
        // even when frames drop.
        step.endAt = performance.now() + step.seconds * 1000;
        step.left = step.seconds;
        ctx.player.perform(true);
        if (step.track != null) playTrack(step.track);
        startCrowd();
        ctx.hud.toast("\u266B The room goes quiet... one, two, three, four!", 2600);
      }
      step.left = (step.endAt - performance.now()) / 1000;
      ui.setObjective(step.label, `${Math.max(0, Math.ceil(step.left))} s left in the set`, true);
      ui.waypoint(null);
      if (step.left <= 0) {
        ctx.player.perform(false);
        playCheer();
        endShowSong();
        step.resolve("done");
      }
    } else if (step.type === "job") {
      const job = state[step.job];
      if (!job.active) {
        // Off the bike / out of the car, then walk up to the spot.
        const d = Math.hypot(pos.x - job.spot.x, pos.z - job.spot.z);
        if (ctx.getMode() !== "walk" || d > 3) {
          ui.setObjective(step.label, ctx.getMode() !== "walk" ? "Hop off" : step.approach || "Walk up to it", true);
          ui.waypoint(ctx.getMode() === "walk" ? { x: job.spot.x, y: 2, z: job.spot.z } : null, ctx.camera, d);
          return;
        }
        ui.waypoint(null);
        const p = ctx.player;
        p.group.position.set(job.spot.x, p.group.position.y, job.spot.z);
        p.state.heading = job.facing;
        p.group.rotation.y = job.facing;
        job.begin();
      }
      job.update(dt, time);
      const st = job.status();
      ui.setObjective(step.label, st.sub, true);
      ui.setReel(st.meter ? st.meter.frac : null, st.meter ? st.meter.label : "", st.meter ? st.meter.hot : false);
      if (job.done) {
        step.doneFor = (step.doneFor || 0) + dt;
        if (step.doneFor > (step.hold ?? 1.6)) step.resolve("done");
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
    const job = currentJob();
    if (job) {
      job.press();
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

  // The job controller, once a job step has begun (rod / saw in hand, at
  // the ladder, at the counter); E goes to it and the player holds still.
  function currentJob() {
    const job = step && step.type === "job" ? state[step.job] : null;
    return job && job.active ? job : null;
  }

  function prompt() {
    if (ui.storyOpen) return null;
    const job = currentJob();
    if (job) return job.prompt();
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
    setCharacter(c) {
      ctx.character = c;
    },
    routeDirAt,
    // Testing: set the countdown on a timed step.
    debugSetTime(t) {
      if (step && step.timed) step.timeLeft = t;
    },
    update,
    interact,
    prompt,
    // Story cards and jobs hold the player still (E still works).
    get blocking() {
      return ui.storyOpen || !!currentJob();
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
