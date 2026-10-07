// Voices: Sidney's lines and phone calls (Sid calling Bradshall, Brian
// Weed calling anybody). One queue so nobody talks over anybody, with the
// radio dipping under every line.
import { getCtx, noise } from "./engine.js";
import { setTalkWindow, setVoiceDuck } from "./radio.js";

// Short lines cut from Sid's voicemails (captions transcribed from the
// recordings). Playing Sidney, one plays at random every 8-13 seconds;
// playing Bradshall, Sid calls him on the phone with them. The music ducks
// down under every line so you can hear it.
export const SID_LINES = [
  { src: "sid01", text: "Hey, Blakey Boy! Have a Thanksgiving." },
  { src: "sid02", text: "Give me a call back later. Bye." },
  { src: "sid03", text: "Hey, Blakey Boy, happy New Year, brother!" },
  { src: "sid04", text: "Bye!" },
  { src: "sid05", text: "Hey Blake, give me a call back." },
  { src: "sid08", text: "Give me a call back. Bye." },
  { src: "sid09", text: "Hey Blake, give me a call back." },
  { src: "sid10", text: "Bye." },
  { src: "sid11", text: "Hey, Blakey Boy, give me a call back." },
  { src: "sid15", text: "Go home. Give me a call back." },
  { src: "sid16", text: "Bye." },
];

// Brian Weed's phone calls. No recordings of the real guy, so these are
// synthesized (Piper TTS, "ryan" voice, pitched down and slowed a touch for
// a big lazy drawl). Generated offline into audio/brian/.
export const BRIAN_LINES = [
  { src: "brian01", text: "Hey, it's Brian. You got any Dr. Pebber? I'm all out." },
  { src: "brian02", text: "I just ate four hamburgers. I'm thinking about a fifth." },
  { src: "brian03", text: "If I see Billy Powell, I'm putting him in a headlock." },
  { src: "brian04", text: "Me and Billy Powell. One on one. Steel cage. He's done." },
  { src: "brian05", text: "Billy Powell couldn't pin a piece of paper to a wall." },
  { src: "brian06", text: "Nothing beats a cold Dr. Pebber and a double cheeseburger." },
  { src: "brian07", text: "Bring me a burger. Extra cheese. No. Extra, extra cheese." },
  { src: "brian08", text: "Tell Billy Powell he wrestles like a wet noodle." },
  { src: "brian09", text: "Body slam. Leg drop. Billy Powell is going down." },
  { src: "brian10", text: "Twenty-four flavors, baby! Dr. Pebber is the best." },
  { src: "brian11", text: "Pick me up some burgers on your way. Like, six." },
  { src: "brian12", text: "I'd beat Billy Powell with one arm, and a burger in the other hand." },
];
// Sid's clips sorted for phone calls: a hello, then a sign-off.
const SID_HELLO = ["sid01", "sid03", "sid05", "sid09", "sid11"];
const SID_BYE = ["sid02", "sid04", "sid08", "sid10", "sid15", "sid16"];

const VOICES = {
  sid: { dir: "audio/sid", lines: SID_LINES, bufs: null, bag: [], last: -1 },
  brian: { dir: "audio/brian", lines: BRIAN_LINES, bufs: null, bag: [], last: -1 },
};
function loadVoice(v) {
  const c = getCtx();
  if (!c || v.bufs) return;
  v.bufs = [];
  v.lines.forEach((line, i) => {
    fetch(`${v.dir}/${line.src}.mp3`)
      .then((r) => r.arrayBuffer())
      .then((b) => c.decodeAudioData(b))
      .then((buf) => { v.bufs[i] = buf; })
      .catch(() => {});
  });
}
// Shuffled bag per voice, so nothing repeats until the rest have played.
// `only` limits it to some clip names (Sid's hellos / goodbyes).
function nextClip(v, only) {
  const ok = (i) => v.bufs && v.bufs[i] && (!only || only.includes(v.lines[i].src));
  const ready = v.lines.map((_, i) => i).filter(ok);
  if (!ready.length) return -1;
  v.bag = v.bag.filter(ok);
  if (!v.bag.length) {
    v.bag = ready.slice();
    for (let i = v.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [v.bag[i], v.bag[j]] = [v.bag[j], v.bag[i]];
    }
    if (v.bag.length > 1 && v.bag[v.bag.length - 1] === v.last) v.bag.unshift(v.bag.pop());
  }
  return v.bag.pop();
}

let onVoiceCb = null;
// cb({ who: "sid" | "brian", text, call: null | "ringing" | "talking" }) or cb(null)
export const onVoice = (cb) => (onVoiceCb = cb);

// Phone ring: two "brrring"s (US ring tones, 440 + 480 Hz, warbled).
function ring(c, t0) {
  for (let k = 0; k < 2; k++) {
    const t = t0 + k * 1.15;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.03);
    g.gain.setValueAtTime(0.06, t + 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    const trem = c.createGain();
    trem.gain.value = 0.5;
    const lfo = c.createOscillator();
    lfo.frequency.value = 20;
    const depth = c.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(trem.gain);
    for (const f of [440, 480]) {
      const o = c.createOscillator();
      o.frequency.value = f;
      o.connect(trem);
      o.start(t);
      o.stop(t + 0.82);
    }
    trem.connect(g).connect(c.destination);
    lfo.start(t);
    lfo.stop(t + 0.82);
  }
}
function hangUp(c, t) {
  noise(Math.max(0, t - c.currentTime), 0.04, { vol: 0.12, freq: 1500, q: 1 });
}

// Voice queue: everything (Sid's lines, rings, calls) goes through one
// line so nothing talks over anything else.
let voiceBusy = 0;
let duck = 1; // smoothed music level under the voices (fallback path)
let queue = [];
let lineNext = 5; // Sidney's own lines (when you play Sidney)
let callNext = 26; // first phone call
let lastCaller = null;

function playLine(c, who, i, phone) {
  const v = VOICES[who];
  const src = c.createBufferSource();
  src.buffer = v.bufs[i];
  src.playbackRate.value = phone ? 1 : 0.97 + Math.random() * 0.06;
  const g = c.createGain();
  g.gain.value = phone ? 1.25 : 1.0;
  if (phone) {
    // Phone line: no lows, no highs, a little honk in the mids.
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 320;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3300;
    const pk = c.createBiquadFilter();
    pk.type = "peaking";
    pk.frequency.value = 1700;
    pk.gain.value = 5;
    src.connect(hp).connect(pk).connect(lp).connect(g);
  } else src.connect(g);
  g.connect(c.destination);
  const t0 = c.currentTime + 0.15; // let the duck land first
  src.start(t0);
  v.last = i;
  return 0.15 + src.buffer.duration / src.playbackRate.value;
}

function startItem(c, item) {
  let dur = 0.3;
  if (item.kind === "ring") {
    ring(c, c.currentTime + 0.05);
    dur = 2.3;
    if (onVoiceCb) onVoiceCb({ who: item.who, text: "Ring... ring...", call: "ringing" });
  } else if (item.kind === "line") {
    dur = playLine(c, item.who, item.i, item.phone) + (item.phone ? 0.25 : 0);
    if (onVoiceCb) onVoiceCb({ who: item.who, text: VOICES[item.who].lines[item.i].text, call: item.phone ? "talking" : null });
  } else if (item.kind === "hangup") {
    hangUp(c, c.currentTime + 0.05);
    dur = 0.35;
  }
  voiceBusy = dur;
  setTalkWindow(c.currentTime, c.currentTime + dur + 0.1);
}

// Build a phone call: ring, a line or two, click.
function makeCall(who) {
  const v = VOICES[who];
  const items = [{ kind: "ring", who }];
  if (who === "sid") {
    const hello = nextClip(v, SID_HELLO);
    if (hello >= 0) items.push({ kind: "line", who, i: hello, phone: true });
    const bye = nextClip(v, SID_BYE);
    if (bye >= 0) items.push({ kind: "line", who, i: bye, phone: true });
  } else {
    const n = Math.random() < 0.55 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const i = nextClip(v);
      if (i >= 0) items.push({ kind: "line", who, i, phone: true });
    }
  }
  if (items.length < 2) return null; // clips not loaded yet
  items.push({ kind: "hangup", who });
  return items;
}

// Call every frame. character: "sidney" | "bradshall". `active` is false
// during story cards, menus and the theme song.
//   Playing Sidney: his own short lines every 8-13 s, and Brian calls
//   about once a minute.
//   Playing Bradshall: phone calls every 22-36 s, from Sid ("Hey, Blakey
//   Boy...") and from Brian, mixed up.
//   Anyone else (Gary): Brian calls every 35-55 s.
let voiceClock = 0;
export function updateVoices(frameDt, active, character = "sidney") {
  // Wall-clock time, not game time: on a slow phone the game's capped frame
  // step would stretch the calls out. (Not the audio clock either, so a
  // suspended audio context can't leave a line stuck "busy".)
  const now = performance.now();
  const dt = voiceClock ? Math.min(0.5, (now - voiceClock) / 1000) : frameDt;
  voiceClock = now;
  loadVoice(VOICES.sid);
  loadVoice(VOICES.brian);
  const duckTarget = voiceBusy > 0 ? 0.18 : 1;
  duck += (duckTarget - duck) * Math.min(1, dt * (duckTarget < duck ? 9 : 2.5));
  setVoiceDuck(duck);
  const c = getCtx();
  if (voiceBusy > 0) {
    voiceBusy -= dt;
    if (voiceBusy > 0) return;
    if (!queue.length) {
      if (onVoiceCb) onVoiceCb(null);
    }
  }
  // A call in progress carries on even if a story card pops up.
  if (queue.length) {
    if (c && c.state === "running") startItem(c, queue.shift());
    return;
  }
  if (!active || !c || c.state !== "running") return;
  callNext -= dt;
  if (callNext <= 0) {
    let who = "brian";
    if (character === "bradshall") who = lastCaller === "sid" ? (Math.random() < 0.7 ? "brian" : "sid") : lastCaller === "brian" ? (Math.random() < 0.7 ? "sid" : "brian") : "sid";
    const call = makeCall(who);
    if (call) {
      lastCaller = who;
      queue = call;
      callNext = character === "bradshall" ? 22 + Math.random() * 14 : character === "sidney" ? 55 + Math.random() * 30 : 35 + Math.random() * 20;
      lineNext = Math.max(lineNext, 6);
      startItem(c, queue.shift());
      return;
    }
    callNext = 3;
  }
  if (character !== "sidney") return;
  lineNext -= dt;
  if (lineNext > 0) return;
  const i = nextClip(VOICES.sid);
  if (i < 0) return;
  startItem(c, { kind: "line", who: "sid", i, phone: false });
  // Next line 8-13 s after this one starts.
  lineNext = Math.max(2, 8 + Math.random() * 5 - voiceBusy);
}

// Testing: make the next phone call come from `who` right away.
export function debugCall(who) {
  const call = makeCall(who);
  if (call) { lastCaller = who; queue = call; voiceBusy = 0; }
  return !!call;
}
