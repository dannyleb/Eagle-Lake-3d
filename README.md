# Eagle Lake: Green Dog Run

A browser-based 3D free-roam game built with Three.js. It's a fully static
site with no framework and no server code, and it's built to load in a few
seconds and run smoothly on a phone.

## Tech stack

| Area | Choice |
|---|---|
| Rendering | [Three.js](https://threejs.org/) r186 (WebGL) |
| Language | Plain JavaScript (ES modules), no framework |
| Bundler | esbuild 0.24: one IIFE bundle targeting ES2019 |
| Linting | ESLint 9 (flat config, `eslint.config.js`) |
| Audio | Web Audio API plus `<audio>` / `<video>` media elements |
| Storage | `localStorage` (saved games) |
| Hosting | GitHub Pages, deployed by GitHub Actions |
| Runtime | Node 20+ (build only) |

The only runtime dependency is `three`.

## Running locally

```bash
npm install
npm run dev       # dev server at http://localhost:8080, rebuilds on reload
npm run build     # production build into dist/
npm run lint      # ESLint over src/ and the build script
```

Edits to `public/` need a dev server restart. `dist/` is generated and
not committed.

## Build and deploy

`build.mjs` does the whole build:

1. Wipes `dist/` and copies `public/` (page, styles, audio, video) into it.
2. Bundles `src/main.js` with esbuild into `dist/bundle.js` (minified for
   production, with sourcemaps in dev).
3. Stamps content hashes onto the script and stylesheet links
   (`bundle.js?v=<hash>`), so a browser never pairs a fresh `index.html`
   with a stale cached bundle. The same hash shows on the start screen as
   the build number.

`.github/workflows/pages.yml` runs on every push to the deploy branches:
`npm ci`, then lint, then build, then upload `dist/` and deploy to Pages.
A lint error fails the deploy.

## Rendering

- **Cel shading:** every lit material is swapped at load for a
  `MeshToonMaterial` that bands the light into a few flat steps
  (`src/render/toon.js`).
- **Ink outlines in one pass:** the scene renders to a 4x multisampled
  offscreen target with a depth texture. A full-screen shader takes the
  screen-space Laplacian of `1/viewZ`, which is zero on flat surfaces and
  spikes at silhouettes and creases. That draws both outer contours and
  inner fold lines with no extra geometry pass. The same pass applies a
  color grade (saturation, contrast, warm lift) and a vignette
  (`src/render/post.js`).
- **Anti-aliasing:** comes from the multisampled render target.
- **Adaptive resolution:** pixel ratio starts at up to 1.5 on touch
  devices and 2 on desktop. If the frame time averages worse than 40 fps,
  it steps down by 0.25 at a time, to no lower than 1.

## World building and performance

The town is roughly 275 buildings, 1,700 trees, two rail lines, a lake,
farmland and an airport. It stays fast through:

- **Merged geometry:** `src/world/builder.js` gathers flat-shaded,
  vertex-colored triangles from thousands of small pieces and emits one
  `BufferGeometry`. The town renders in a handful of draw calls.
- **Instancing:** trees, pickups, gators, rail ties and geese use
  `InstancedMesh` (all trees take three draw calls).
- **One facade atlas:** every wall in town samples a single procedurally
  drawn 1536x1024 atlas. RGB carries light and shadow detail, and alpha
  marks window glass, which a small shader patch turns into colored walls
  with glass (`src/world/atlas.js`).
- **One surface texture:** ground and water share a seamless 512px
  texture, one detail layer per channel: grass (R), asphalt (G),
  concrete (B), water ripples (A) (`src/world/surface.js`).
- **Canopy cut-away:** tree fragments between the camera and the player
  are discarded in the shader, so foliage never hides the player.
- **Distance culling:** NPCs more than 150 m away aren't drawn.
- **Spatial grid collision:** static obstacles (boxes, circles, polygons)
  are bucketed in a uniform grid, so movement and camera checks only test
  what's nearby (`src/collision.js`).

## Assets

- **No image files.** Every texture, sign, face and logo is drawn at
  runtime on a `<canvas>` (`src/textures.js`, `src/signage.js`,
  `src/faces.js`).
- **Audio** lives in `public/audio/` as MP3: songs, voice clips and the
  soundtrack for the one video clip. Songs are lazy-loaded, fetched only
  when playback starts, so they don't add to the initial page load.
- **Video:** `public/media/` holds one H.264 Main-profile MP4 (480x270,
  yuv420p, faststart). It's fetched only when the scene that uses it starts.

## Map and navigation

- **Layout data** (`src/map/layout.js`) defines roads as polylines with
  widths, rail lines, the lake polygon, named regions, and helpers
  (`distToRoad`, `nearestRoad`, `laneReach`, `locate`).
- **Street routing** (`src/missions/nav.js`): the road polylines become a
  graph, with nodes at every intersection, T-junction and road end and
  edges along the roads. A route is the shortest path between the network
  points nearest the start and the destination.
- **Route display** (`src/missions/route.js`): scrolling chevrons along
  the street, a beacon over the destination, and the same route drawn on
  the minimap and full map.

## Movement and vehicles

- **On foot:** free movement against the collision grid. Walking assists
  (`src/assist.js`) bend the path around obstacles with feelers and pop
  the player free if stuck.
- **Vehicles on rails:** bikes and cars lock to the road graph in the
  right-hand lane (lane offset `min(2.6, road width / 4)`), so nothing can
  push them off the street. Input queues the next turn, cruise, stop and
  turn-around. With nothing queued, a vehicle follows the active route.
- **Arrival:** a vehicle "arrives" when it's within reach of a target from
  its lane, plus its current stopping distance, so it brakes in time
  instead of overshooting. Arrival braking is twice the normal rate.
- **Cameras:** three views (low chase, elevated three-quarter, overhead)
  with per-vehicle distances (`src/camera.js`).
- **Trains:** each car is positioned by its two trucks along a rail
  polyline, so it bends through curves (`src/train.js`).

## Input

`src/controls.js` merges keyboard, an on-screen D-pad and bezel buttons
into one per-frame `poll()` result: analog axes for walking, one-shot taps
for riding, and named actions (interact, view, map, radio).

| Action | Desktop | Phone |
|---|---|---|
| Move / steer | WASD or arrow keys | D-pad |
| Interact | E | E button |
| Sprint / boost | Shift | RUN button |
| Brake | Space | D-pad down |
| Camera | V | VIEW button |
| Map | M | MAP button |
| Radio play/pause, next | P, R | top-right buttons |
| Main menu | Esc | MENU button |

## Mission engine

Missions are data, not code paths (`src/missions/index.js`). Each one is
an object with an id, a story card, a list of steps, an achievement, and
optional `setup`, `cleanup` and `onComplete` hooks.

| Step type | What it does |
|---|---|
| `goto` | Reach a point. Can be timed, and can require being on foot |
| `defeat` | Clear a group of enemies |
| `perform` | Hold position while something plays out |
| `job` | A hands-on interaction run by a job controller |

- **Job controllers** share one interface: `spot`, `facing`, `begin()`,
  `press()`, `prompt()`, `status()` returning `{ sub, meter }`,
  `update(dt, time)`, `end()`, `active`, `done`. Fishing, sawing,
  climbing and shopping all plug in this way.
- **Quest lines:** each playable character has a list of missions,
  followed by a shared list that any character added later inherits.
- **Debug skip-ahead:** `?debug&mission=N` starts partway through the
  list.

## Saved games

`src/save.js` stores one slot per character in `localStorage` under
`eagle-lake-save-v1`:

```js
{ slots: { <character>: { done: [missionId, ...], x, z, heading, savedAt } }, last }
```

- **When it saves:** the moment a mission is won, every few seconds while
  playing, and when the page is hidden or closed.
- **Missions are recorded by id**, not by position in the list, so
  missions added later just show up as the next ones to play.
- **Resuming** replays each finished mission's `onComplete` to restore
  lasting rewards.
- **No storage available** (private browsing): the game plays without
  saving.

## Audio architecture

`src/audio/`, re-exported from `index.js`:

| Module | Role |
|---|---|
| `engine.js` | Shared `AudioContext`, unlock-on-gesture, tones, noise, tweens, media channels |
| `sfx.js` | Procedural sound effects (oscillators and noise, no files) |
| `radio.js` | Station playlist and volume mix: theme duck, voice duck, talk window |
| `theme.js` | Title theme, game-intro handoff, achievement stingers |
| `voices.js` | Voice lines and phone calls, with a phone-line filter (band-pass) |
| `crowd.js` | Synthesized crowd noise |

- **Phone autoplay rules:** sound can only start inside a real gesture
  (click, touchend or keydown, not touchstart or pointerdown). The first
  tap resumes the `AudioContext` and plays a silent buffer to unlock it.
  `navigator.audioSession.type = "playback"` lets iOS play through the
  silent switch.
- **iOS volume:** Safari ignores `.volume` on media elements, so media
  routes through `MediaElementSource → GainNode` for fades and ducking.
- **Video with sound on phones** (`src/ui/failcam.js`): the `<video>`
  plays muted, which is always allowed. Its soundtrack is a separate MP3
  decoded into an `AudioBuffer` and played through the already-unlocked
  context. It restarts at `video.currentTime` on every `playing` event and
  stops on `waiting`, so it stays in sync through buffering. If the video
  can't decode, the clip is skipped.
- **Timing:** voice and call scheduling uses wall-clock time, not game
  time, so slow frames don't stretch it.
- **Synthesized voice clips** were made with
  [Piper](https://github.com/rhasspy/piper) text-to-speech, "ryan" voice
  (CC BY-NC-SA 4.0, non-commercial), then pitch-shifted.

## Project structure

```
src/main.js          game loop and wiring: input, rides, interactions, trains, saves
src/config.js        spawn points and world constants
src/util.js          shared helpers (seeded random, angles, canvas textures)
src/save.js          saved games (localStorage)
src/controls.js      keyboard, D-pad and button input
src/collision.js     uniform-grid static collision
src/assist.js        walking assists (obstacle feelers, unstick)
src/camera.js        chase / three-quarter / overhead cameras
src/vehicles.js      on-rails vehicles, lane following, braking
src/train.js         trains along rail polylines
src/textures.js      procedural canvas textures
src/signage.js       procedural signs
src/faces.js         procedural face textures
src/map/             layout data: roads, rails, lake, regions, geometry helpers
src/world/           world builder: merged geometry, facade atlas, surfaces, sky, trees, rails
src/render/          toon materials and the ink-outline / color-grade post pass
src/missions/        mission engine and data, street routing, route display, mission UI
src/audio/           audio engine, sfx, radio, theme, voices, crowd
src/ui/              HUD and minimap, start screen, menu, cards, video overlay, confetti
src/*.js             characters, NPCs, pickups, job controllers and other gameplay modules
public/              static files: index.html, style.css, audio/, media/
build.mjs            esbuild build and dev server; cache-busting hashes
eslint.config.js     lint rules
.github/workflows/pages.yml   lint, build, deploy to GitHub Pages
```
