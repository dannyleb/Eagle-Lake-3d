# Eagle Lake: Green Dog Run

A lightweight, browser-based 3D free-roam game — think *Simpsons: Hit & Run*
energy, scaled down to a small Texas railroad town. Explore on foot, hop on a
beach cruiser named **Green Dog**, or take the '70 muscle car out for a spin,
all while dodging the train that cuts straight through downtown.

The look is modeled on mid-90s CD-ROM "virtual town" explorers: bright,
saturated pre-rendered-style colors, a high three-quarter camera, puffy
clouds, and a chunky purple "Eagle-Eye View-O-Matic" bezel with a location
readout, compass, speed meter, minimap, and full town map.

Built with [Three.js](https://threejs.org/), no framework, no image assets —
merged low-poly geometry, instanced trees, and procedurally drawn canvas
textures, so a whole town (about 270 houses, 1,700 trees, two rail lines, a
lake, farms, and an airport) loads in a few seconds and runs on a phone.

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

## The Thicker Bradshall

A local musician busks by the pond at Veterans Memorial Park — walk up to
him and press `E` to have him put one of his songs on. He's an original,
stylized tribute (trucker cap, shades, goatee, acoustic guitar), not a
likeness of the real person, in the same style as Sidney himself.

## Controls

**Desktop**
- `WASD` / Arrow keys — move or steer
- `Shift` — sprint (on foot) / boost (car)
- `Space` — brake
- `E` — ride / park / talk / order at the drive-thru window
- `V` — camera (Town View, Bird's Eye, Street View)
- `M` — map (mini map, town map, off)
- `R` — next song

**Mobile**
- On-screen joystick — move or steer
- `RUN` — sprint / boost
- `RIDE` — ride / park / talk / order
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
- The old walk-up/drive-thru beer-and-cigarettes store some longtime
  residents remember is reimagined here as **"Eagle's Nest Drive-Thru"** — a
  fictional, satirical stand-in, not a reproduction of any real, named
  business, past or present.
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
src/world/      world builder (merged geometry, facade atlas, sky, trees, rails)
src/ui/         HUD: location plate, compass, meter, minimap, town map
src/*.js        player, NPC, vehicles, train, camera, audio, controls
public/         the static site that actually ships (index.html, style.css, bundle.js)
build.mjs        esbuild bundler config
.github/workflows/pages.yml   GitHub Pages deploy
```
