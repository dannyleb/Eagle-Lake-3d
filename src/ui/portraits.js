import { makeFaceTexture } from "../textures.js";
import { FACES } from "../faces.js";

// Little square portraits (character select, caller card), drawn from the
// same face art as the 3D models plus a hair / hat line on top.
const LOOKS = {
  sidney: {
    bg: "#21c4b5",
    face: [6, 16, 100, 100],
    top(c) {
      c.fillStyle = "#1b1611"; // close-cropped hair
      c.beginPath();
      c.ellipse(56, 18, 52, 20, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#4d4741"; // shirt collar
      c.fillRect(0, 106, 112, 6);
    },
  },
  bradshall: {
    bg: "#21c4b5",
    face: [6, 18, 100, 100],
    top(c) {
      c.fillStyle = "#caa46a"; // cowboy hat
      c.beginPath();
      c.ellipse(56, 26, 58, 11, 0, 0, Math.PI * 2);
      c.fill();
      c.fillRect(28, 0, 56, 26);
      c.fillStyle = "#3b2614"; // hat band
      c.fillRect(28, 18, 56, 6);
    },
  },
  gary: {
    bg: "#21c4b5",
    face: [6, 18, 100, 100],
    top(c) {
      c.fillStyle = "#6f8fb3"; // his old denim cowboy hat
      c.beginPath();
      c.ellipse(56, 27, 58, 10, 0, 0, Math.PI * 2);
      c.fill();
      c.fillRect(30, 2, 52, 25);
      c.fillStyle = "#4f6f96";
      c.fillRect(30, 19, 52, 5);
      c.fillStyle = "#7d9cc4"; // denim collar
      c.fillRect(0, 104, 112, 8);
    },
  },
  brian: {
    bg: "#e8742a",
    face: [2, 16, 108, 100],
    top(c) {
      c.fillStyle = "#16181c"; // black ball cap and brim
      c.beginPath();
      c.ellipse(56, 18, 56, 22, 0, Math.PI, 0);
      c.fill();
      c.fillRect(0, 16, 112, 8);
      c.fillRect(20, 22, 80, 6);
      c.fillStyle = "#6b6f75"; // gray tee
      c.fillRect(0, 104, 112, 8);
    },
  },
};

// Draw `who` onto a 112 x 112 canvas.
export function drawPortrait(canvas, who) {
  const look = LOOKS[who];
  const c = canvas.getContext("2d");
  c.fillStyle = look.bg;
  c.fillRect(0, 0, 112, 112);
  c.drawImage(makeFaceTexture(FACES[who]).image, ...look.face);
  look.top(c);
}
