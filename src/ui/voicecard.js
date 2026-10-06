import { drawPortrait } from "./portraits.js";

// Caption card, lower right, with the speaker's face: Sid's own lines when
// you play Sidney, and phone calls (Sid calling Bradshall, Brian calling
// anybody) with an INCOMING CALL / ON THE PHONE tag. Returns the handler
// for onVoice(): show(v) with { who, text, call } or show(null).
const CALLERS = {
  sid: { name: "SIDNEY", portrait: "sidney" },
  brian: { name: "BRIAN WEED", portrait: "brian" },
};

export function createVoiceCard(viewport) {
  const card = document.getElementById("voiceCard");
  const text = document.getElementById("voiceText");
  const who = document.getElementById("vWho");
  const tag = document.getElementById("vTag");
  const face = document.getElementById("voiceFace");
  let shown = null;

  return function show(v) {
    if (v) {
      if (shown !== v.who) {
        shown = v.who;
        drawPortrait(face, CALLERS[v.who].portrait);
        who.textContent = CALLERS[v.who].name;
      }
      text.textContent = v.text;
      tag.textContent = v.call === "ringing" ? "INCOMING CALL" : v.call ? "ON THE PHONE" : "";
    }
    card.classList.toggle("show", !!v);
    card.classList.toggle("ringing", !!v && v.call === "ringing");
    card.classList.toggle("phone", !!v && !!v.call);
    viewport.classList.toggle("talking", !!v);
  };
}
