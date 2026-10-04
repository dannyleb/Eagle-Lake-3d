# Eagle Lake: Green Dog Run

A lightweight, browser-based 3D free-roam game — think *Simpsons: Hit & Run*
energy, scaled down to a small Texas railroad town. Explore on foot, hop on a
beach cruiser named **Green Dog**, or take the '70 muscle car out for a spin,
all while dodging the train that cuts straight through downtown.

Built with [Three.js](https://threejs.org/), no framework, no heavy assets —
just procedurally generated low-poly geometry and canvas-drawn signage, so it
loads fast and runs smoothly on a phone browser.

## Play it

Open `public/index.html` after building (see below), or visit the GitHub
Pages deployment once it's live.

## Controls

**Desktop**
- `WASD` / Arrow keys — move or steer
- `Shift` — sprint (on foot) / boost (car)
- `E` — get on/off a nearby vehicle
- `Space` — brake

**Mobile**
- On-screen joystick — move or steer
- `RUN` button — sprint
- `●` button — get on/off a nearby vehicle

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
src/            ES module source (world, player, vehicles, train, controls)
public/         the static site that actually ships (index.html, style.css, bundle.js)
build.mjs        esbuild bundler config
.github/workflows/pages.yml   GitHub Pages deploy
```
