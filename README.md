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

The start screen asks you to pick a character: **Sidney** (volunteer
firefighter), **The Thicker Bradshall** (country musician) or **Gary
Jones** (cowboy arborist). Arrow keys or 1 / 2 / 3 pick on a keyboard; tap
a card on a phone. Each character has his own mission chain, then the
shared one.

### Sidney

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

### The Thicker Bradshall

1. **Gig at the Ferris Hotel.** Ride downtown to the Ferris Hotel on
   McCarty (red brick, "LIVE MUSIC FRIDAYS", his name on the chalkboard
   under the canopy). Once he's off the bike he swings the guitar around
   and plays a 30-second set of "I Got Drunk with the Crowd" while the
   room whoops, whistles and claps along, then a big roar and applause
   as the song fades out. Unlocks **PAID: $50**.
2. **Go Get the Gear.** The band gear is at **The Little House**, out
   back of a main house a little south of town. Ride out, walk up to it,
   and grab it. Unlocks a can of
   **DR. PEBBER** (24 flavors, one more than the other guy).

Both locations are placed approximately and are easy to move in
`src/world/index.js`.

### Gary Jones

A cowboy in denim from head to toe, with a great big handlebar mustache, a
chainsaw, and a red-and-white square-body pickup with a ladder rack (he
drives it instead of the '70, and starts out right beside it at the fire
station). Brian Weed calls him now and then.

1. **$1,500 of New Duds.** Ride out to **Rawhide & Rhinestones Western
   Wear** on 90A West and walk up to the counter. The shopping list comes
   up: cowboy boots ($475), jeans ($135), a tooled belt with a big silver
   buckle ($165), a denim pearl snap ($125) and a 10X cowboy hat ($600):
   $1,500 exactly. Tap a line (or E for the next one) to buy it, and Gary
   changes into it on the spot, faded old denim to sharp new denim. Then
   check out. Unlocks **$1,500 OF NEW DUDS**.
2. **Save the Treehouse.** A poplar grew right up through **The
   Treehouse**, the open-air deck bar on S McCarty, and out the roof. Walk
   in to the trunk, tap E to fire up the chainsaw, then tap fast to cut.
   TIMBER! Unlocks **PAID: $50**.
3. **The Big Oak.** The big old oak on the northwest corner of Main and
   McCarty has a dead limb hanging over the street, and all Gary's got is
   a rickety old ladder. Tap E to climb, one rung at a time. Each rung, the
   ladder might buck him off (more likely higher up); climb back up and
   try again. It gets kinder after every fall, and from the fourth try on
   he always makes it. At the top, saw the limb off and climb down.
   Unlocks a **NEW CHAINSAW BLADE & NEW LADDER**.

### Everybody: the shared quest line

After their own missions, every character (including any added later)
plays the shared missions in `SHARED_MISSIONS`:

1. **The Lunch Special.** The **Dairy Quake** out on 90A East ends its
   lunch special at two o'clock sharp. Beat the clock (miss it and you get
   another try) for the **CHEESE FRIES BASKET**.
2. **There's a 10-Foot Alligator in Granny's Lake!** Ride out to Granny's
   Lake (Granny's Lake Rd, off 90A East between the Sputnik and the Dairy
   Quake) and walk down to the landing, where a rod with a T-bone steak on
   the line is waiting.
   - **Tap E to cast.** The steak flies out and the bobber sits on the
     water. Little nibbles twitch it, but the gator bites when he feels
     like it.
   - **BITE! Tap E** within a second or two to set the hook. Too slow and
     he steals the steak (a new T-bone goes on; cast again).
   - **Tap E fast to reel him in.** The meter fills with every tap and he
     pulls back, harder now and then; let it run dry and the line snaps.
   - Fill it and he comes up out of the lake onto the bank. Unlocks a big
     plate of **DEEP-FRIED GATOR BALLS**.

## Dr. Pebber cans

About 80 cans of Dr. Pebber float over the streets: mid-block on every
other block in town, and every ~110 m out the highways (red dots on the
minimap). Ride, drive or walk through one for a **Dr. Pebber Rush**: 1.6x
speed for 5 seconds, with a fizz, a wider view and a countdown bar. Grab
another to reset the clock. Each can comes back 25 seconds after it's
taken. Tuning lives at the top of `src/pickups.js`.

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

Visit the GitHub Pages deployment, or run it locally (see below).

## The theme song

The title screen opens on **PRESS START** (any key or tap; browsers only
allow sound after one), which brings up the game's theme song, "Back to
School", looping under the character picker. Picking a character starts the game
with the theme still playing for about five seconds; then it fades out as
the radio station comes up with the in-game songs.

The **MENU** button (top left, or `Esc`) asks to confirm, then takes you
back to the title screen to pick a character again; missions start over.

## Saved games

Progress is saved in the browser (localStorage), one slot per character:
every finished mission ("Progress saved" pops up after the achievement)
and where you are, every few seconds and whenever you leave the page.
After PRESS START, if there's a save:

- **CONTINUE** picks up the last character played, on the spot you left,
  at the next unfinished mission (with the chief's helmet and the
  championship belt back on if you'd earned them). With saves for more
  than one character it asks which one.
- **NEW GAME** goes to the character picker; picking a character starts
  them over (a card says so if they have a save). Other characters' saves
  are kept.

Saves record missions by id, so missions added later simply show up as
the next ones to play. A browser that blocks storage (private browsing)
just plays without saving. The code is in `src/save.js`.

Every mission achievement, for every character, brings the theme back: a
slice of it fades in over the confetti while the radio tunes away, holds
for about five seconds, then fades out with a bit of dial static as the
radio station tunes back in, right where its song left off. Each
achievement picks up a different strong spot in the song. A second theme
track can be added to `THEME_TRACKS` in `src/audio.js`; achievements then
alternate between them.

## The radio

A local station plays continuously from the moment you tap or press any key —
on foot, on the bike, in the car, doesn't matter:

- **"I'll Take It Back"** by Blake — built from Sidney's own voice
- **"Peel On"** by The Thicker Bradshall — a friend of Sidney's from Eagle Lake
- **"Nananananana"** by The Thicker Bradshall
- **"I Got Drunk with the Crowd"** by Blake (also the song at the Ferris Hotel show)

It loops through the station automatically; press `R` any time to skip to
the next track. All the songs are lazy-loaded (only fetched once playback
actually starts), so they never add weight to the initial page load.

## Voices and phone calls

**Playing Sidney:** every 8 to 13 seconds Sid pipes up with a short line
(none longer than two seconds) cut from his real voicemails, picked at
random without repeats. A card pops up in the lower right with his face
and a caption, and the music ducks way down under him, then swells back.

**Phone calls:** the phone rings (two rings, an INCOMING CALL card with
the caller's face shaking), then the caller talks through a phone-line
filter with captions, then hangs up.
- Playing **The Thicker Bradshall**, Sid calls him every half minute or
  so with the same voicemail clips ("Hey, Blakey Boy..." then "Give me a
  call back. Bye."), mixed in with calls from Brian Weed.
- Playing any character, **Brian Weed** calls (about once a minute as
  Sidney) about Dr. Pebber, hamburgers, and how bad he'd beat his arch
  nemesis **Billy Powell** in a wrestling match.

There are no recordings of Brian, so his twelve lines are synthesized:
[Piper](https://github.com/rhasspy/piper) text-to-speech with the "ryan"
voice (CC BY-NC-SA 4.0, non-commercial), pitched down and slowed a touch
for a big-guy drawl. Lines and captions live in `BRIAN_LINES` in
`src/audio.js`; the clips are in `public/audio/brian/`.

Pause the radio any time to hear the voices clearly.

## Townsfolk

Eighteen locals stroll the sidewalks around town, turning at random
corners, each with a name tag: **Brian Weed**, **Greg Bradbury** and
**Tattoo Face Man**, plus a cast of made-up regulars (Miss Darlene, Coach
Pete, Pastor Ray, Old Man Wendel, Rhonda, Duck Dale, Big Earl, Tripp,
Nurse Patrice, Farmer Gus, Aunt Bev, Deputy Doug, Tammy Jo, Hector and Lou
Ellen). They call out a hello as you pass; walk up and press E to chat.
Lines know who you're playing. They'll jump out of the way if you come
through on the bike or in the car. Anyone more than 150 m away isn't drawn,
to keep phones fast. Brian Weed is modeled on his photos (a stylized tribute: big build, black
cap, full mustache, gray ballpark "CHAMPS" tee); the others' looks are
placeholders until there are photos to go from. Adding someone is one entry in `PEOPLE` in `src/townsfolk.js`.

## The Thicker Bradshall

A local country musician. Playing as Sidney, he busks by the pond at
Veterans Memorial Park; walk up and press `E` to have him put one of his
songs on. Playing as him, the guitar rides slung across his back until
showtime. He's an original, stylized tribute (cowboy hat, big mutton
chops, pearl-snap western shirt, buckle, boots, stickered acoustic guitar),
not a likeness of the real person, in the same style as Sidney himself.

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
- `❚❚` / `▶` (top right) — pause / play the radio; `▶▶` next to it skips
  to the next song (works while paused too: it turns the radio back on)
- `VIEW`, `MAP`, `RADIO` — same as the keys above

## Running locally

```bash
npm install
npm run dev       # dev server at http://localhost:8080, rebuilds on reload
npm run build     # production build into dist/ (what GitHub Pages serves)
npm run lint      # ESLint over src/ and the build script
```

There's no framework and no server-side code: the build bundles `src/`
with esbuild and copies the static files in `public/` next to it in
`dist/`, a fully static site. Pushing to the deploy branch runs
`.github/workflows/pages.yml` (lint, build, deploy). `dist/` is not
committed.

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
src/main.js          game loop and wiring: rides, interactions, trains and gates
src/config.js        spawn points and world constants
src/util.js          shared helpers (seeded random, angles, canvas textures)
src/faces.js         face presets for the named characters
src/save.js          saved games (localStorage, one slot per character)
src/map/             town layout: roads, rails, lake, areas, location names
src/world/           world builder (merged geometry, facade atlas, surfaces, sky, trees, rails)
src/render/          cel shading: toon materials and the ink-outline post pass
src/missions/        mission engine and mission list, street routing, route arrows, mission UI
src/audio/           engine, sound effects, radio, theme song, voices and calls, crowd
src/ui/              HUD and minimap, start screen, menu, voice card, portraits, confetti
src/*.js             player, NPCs and townsfolk, vehicles, train, gators, ninjas,
                     Dr. Pebber cans, fishing, camera, controls, textures, signage
src/gary.js          Gary Jones's model, outfits and chainsaw
src/arborist.js      the Treehouse poplar, the big oak and ladder, sawing / climbing jobs
src/shop.js          the western wear store's shopping list
public/              static files: index.html, style.css, audio/
build.mjs            esbuild build and dev server; stamps cache-busting hashes
eslint.config.js     lint rules
.github/workflows/pages.yml   lint, build and deploy to GitHub Pages
```
