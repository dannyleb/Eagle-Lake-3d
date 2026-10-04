# Eagle Lake: Green Dog Run

A lightweight, browser-based 3D free-roam game — think *Simpsons: Hit & Run*
energy, scaled down to a small Texas railroad town. Explore on foot, hop on a
beach cruiser named **Green Dog**, or take the '70 muscle car out for a spin,
all while dodging the train that cuts straight through downtown.

The look is modeled on mid-90s CD-ROM "virtual town" explorers: bright,
saturated pre-rendered-style colors, a high three-quarter camera, puffy
clouds, and a chunky purple "Eagle-Eye View-O-Matic" bezel with a location
readout, compass, speed meter, minimap, and full town map.

Rendering is cel-shaded: every lit surface uses banded toon lighting, and a
single full-screen pass draws ink outlines from the depth buffer (silhouettes
plus creases), with a light color grade on top. Surfaces get procedural
detail in world space (grass blades, asphalt grain and cracks, sidewalk slab
joints, animated water ripples), roofs are shingled with fascia and ridge
caps, and the town is dressed with rooftop units, curbs, benches, planters,
hydrants, stop signs, picket fences, mailboxes and flower beds. Geese fly
over in V formation.

Built with [Three.js](https://threejs.org/), no framework, no image assets —
merged low-poly geometry, instanced trees, and procedurally generated
textures, so a whole town (about 275 houses, 1,700 trees, two rail lines, a
lake, farms, and an airport) loads in a few seconds and runs on a phone. On
slower devices the render resolution steps down automatically.

## Missions

The game opens at Veterans Memorial Park, with Sidney listening to The
Thicker Bradshall busk by the pond and Green Dog parked beside him. A few
seconds in, the missions start:

1. **Fire Alarm.** The siren at Station 1 goes off, a flashing alarm
   banner appears, and the station's roof lights start blinking. Get to the
   fire station on McCarty Avenue. Unlocks **FIRE CHIEF** (and a white
   chief's helmet).
2. **The Eagle Stop.** Ninjas have taken over the Eagle Stop drive-thru on
   90A West. Get there and defeat all six: press E to take one down on
   foot, or run them down on the bike or in the car. They circle, dart in
   for flying kicks, and flip out of the way of traffic. Unlocks **HEAD OF
   SECURITY**.
3. **Wrestling Night.** The title match is about to start. Get home to
   Sidney's house (northeast side, yellow "SIDNEY'S" yard sign) before the
   countdown hits zero. Miss it and you get another shot. Unlocks the
   **CHAMPIONSHIP BELT**, which he wears from then on.

Watch the lake shore: alligators sun themselves all the way around it.
They'll hiss with jaws wide open if you get close, and snap if you get
closer.

Every objective gets a story card, an objective tracker, an on-screen
waypoint with distance, yellow arrows painted along the shortest street
route, and the same route on the minimap and town map. New missions are a
few lines each in `src/missions/index.js`.

## The map

The street grid, rail lines, and landmark positions follow the real town,
compressed to about 60% scale: Main St (east-west) crossing McCarty Ave /
FM 102 (north-south), the old Sunset Route freight line cutting diagonally
through downtown, the second line meeting it at a junction west of town,
the abandoned Santa Fe grade by the depot, the lake on the south side, the
rice dryers, Veterans Memorial Park, the golf course, and the airport to the
northeast. The layout was reconstructed from public sources (addresses,
historic-district boundaries, highway route descriptions, rail history), so
it is approximate; exact street geometry from OpenStreetMap can be dropped
in later.

## Play it

Open `public/index.html` after building (see below), or visit the GitHub
Pages deployment once it's live.

## The radio

A local station plays continuously from the moment you tap or press any key —
on foot, on the bike, in the car, doesn't matter:

- **"I'll Take It Back"** by Blake — built from Sidney's own voice
- **"Peel On"** by The Thicker Bradshall — a friend of Sidney's from Eagle Lake
- **"Nananananana"** by The Thicker Bradshall

It loops through the station automatically; press `R` any time to skip to
the next track. All three songs are lazy-loaded (only fetched once playback
actually starts), so they never add weight to the initial page load.

## Sidney's voice

Every 8 to 13 seconds Sidney pipes up with a short line (none longer than
two seconds) cut from his real voicemails, picked at random without
repeats. A radio-call card pops up in the lower right with his face and a
caption of what he's saying, and the music ducks way down under him, then
swells back. Pause the radio any time to hear him clearly.

## The Thicker Bradshall

A local musician busks by the pond at Veterans Memorial Park — walk up to
him and press `E` to have him put one of his songs on. He's an original,
stylized tribute (trucker cap, shades, goatee, acoustic guitar), not a
likeness of the real person, in the same style as Sidney himself.

## Controls

**Desktop**
- `WASD` / Arrow keys — walk
- Riding: `W` to start rolling (it keeps going on its own), `A` / `D` to
  pick your next turn, `S` to stop (`S` again turns around)
- `Shift` — sprint (on foot) / boost (car)
- `Space` — brake
- `E` — ride / park / talk / order at the drive-thru window; with nothing
  nearby, it calls Green Dog to you and you hop on
- `F` — call the '70 to you and get in
- `V` — camera (Town View, Bird's Eye, Street View)
- `M` — map (mini map, town map, off)
- `P` — pause / play the radio · `R` — next song

**Mobile**
- D-pad — on foot it works from Sidney's point of view: ▲ walks the way
  he's facing, ◀ ▶ turn him, ▼ backs up (he steers himself around walls
  and trees and pops free if he's stuck)
- Riding — tap ▲ once and Green Dog or the '70 rides itself along the
  streets in the right-hand lane. Tap ◀ or ▶ before an intersection to
  queue your next turn (it takes it automatically); tap ▼ to stop, ▼ again
  to turn around. On a mission, with no turn queued, it follows the yellow
  route on its own
- `RUN` — sprint / boost
- `E` button — ride / park / talk / order (the label changes to match);
  anywhere else it calls Green Dog to you
- `CAR` — calls the '70 to you and you get in
- `RADIO` — pause / play (▶▶ next to it skips the song)
- `VIEW`, `MAP`, `RADIO` — same as the keys above

## Running locally

```bash
npm install
npm run build     # bundles src/ -> public/bundle.js with esbuild
npm run dev        # serves public/ at http://localhost:8080
```

There's no framework and no server-side code — `public/` is a fully static
site, so it deploys as-is to GitHub Pages (see
`.github/workflows/pages.yml`).

## About the setting — and why none of it is real

This game is a personal, satirical tribute to Eagle Lake, Texas — a real
small town with a genuine railroad heritage (the restored 1911 Santa Fe
Depot), a historic Main Street / Commerce Street downtown grid, and a
well-earned reputation as a goose-hunting destination. Those general,
publicly documented facts about the town's geography and history shaped the
*layout* of the map.

Everything placed on top of that layout is invented:

- **Every business name, sign, and logo in the game is original and
  fictional**, generated at runtime from drawn text on a `<canvas>` — there
  are no scanned photos, no real logos, and no copied signage anywhere in
  the game.
- The old drive-thru beer-and-cigarettes store some longtime residents
  remember appears as the **Eagle Stop**, by request, with an original
  drawn sign and no logos. Everything that happens there (ninjas included)
  is fiction.
- **Sidney** is an original stylized character — stocky build, glasses, a
  work shirt, a shoulder radio — inspired by the general silhouette of a
  small-town volunteer firefighter. It is a low-poly game-art tribute, not a
  likeness, scan, or photo of any real person.
- The '70-era muscle car is a deliberately abstracted, generic low-poly
  silhouette finished in green with white stripes. It carries no
  manufacturer badges, logos, or licensed body panels — any resemblance is
  limited to the general shape and color scheme of a classic American
  muscle car, used as inspiration.
- The water tower, the goose-hunting banner, the depot museum, the chapel,
  the feed store, and every house on every side street are generic small-
  town set dressing invented for this game.

If you're a Eagle Lake local and recognize the *spirit* of a place here —
that's the idea. If you think something cuts a little too close to a real,
still-operating business, open an issue and it'll get changed.

## Project structure

```
src/main.js     game loop: wiring, trains/gates, mounting, interactions
src/map/        town layout: roads, rails, lake, areas, location names
src/world/      world builder (merged geometry, facade atlas, surfaces, sky, trees, rails)
src/render/     cel shading: toon materials and the ink-outline post pass
src/ui/         HUD: location plate, compass, meter, minimap, town map
src/missions/   mission engine, street routing, route arrows, mission UI
src/*.js        player, NPC, vehicles, train, camera, audio, controls
public/         the static site that actually ships (index.html, style.css, bundle.js)
build.mjs        esbuild bundler config
.github/workflows/pages.yml   GitHub Pages deploy
```
