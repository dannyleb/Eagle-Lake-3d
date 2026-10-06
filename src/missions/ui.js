import * as THREE from "three";
import { createConfetti } from "../ui/confetti.js";

// DOM side of missions: the flashing alarm banner, the objective tracker,
// story cards between missions, achievement popups, and the on-screen
// waypoint marker that tracks the destination (pinned to the screen edge,
// pointing the way, when it's out of view).

export function createMissionUI(viewport) {
  const $ = (id) => document.getElementById(id);
  const el = {
    alarm: $("alarmBanner"),
    alarmText: $("alarmText"),
    obj: $("objective"),
    objText: $("objText"),
    objSub: $("objSub"),
    story: $("storyCard"),
    storyKicker: $("storyKicker"),
    storyTitle: $("storyTitle"),
    storyBody: $("storyBody"),
    storyGo: $("storyGo"),
    ach: $("achievement"),
    achTitle: $("achTitle"),
    achText: $("achText"),
    way: $("waypoint"),
    timer: $("timer"),
    wayDist: $("wayDist"),
    reel: $("reelMeter"),
    reelLabel: $("reelLabel"),
    reelBar: $("reelBar"),
  };
  const confetti = createConfetti(document.getElementById("confetti"));
  let storyResolve = null;
  el.storyGo.addEventListener("click", (e) => {
    e.stopPropagation();
    closeStory();
  });

  function closeStory() {
    if (!storyResolve) return;
    el.story.classList.remove("show");
    const r = storyResolve;
    storyResolve = null;
    r();
  }

  const v = new THREE.Vector3();

  return {
    setAlarm(text) {
      if (text) el.alarmText.textContent = text;
      el.alarm.classList.toggle("show", !!text);
      viewport.classList.toggle("alarm", !!text); // pushes toasts below the banner
    },
    // Countdown clock (seconds), or null to hide it.
    setTimer(sec) {
      if (sec == null) {
        el.timer.classList.remove("show", "low");
        return;
      }
      const t = Math.max(0, Math.ceil(sec));
      el.timer.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
      el.timer.classList.add("show");
      el.timer.classList.toggle("low", t <= 15);
    },
    setObjective(text, sub = "", urgent = false) {
      el.obj.classList.toggle("show", !!text);
      el.obj.classList.toggle("urgent", urgent);
      if (text) {
        if (el.objText.textContent !== text) {
          el.objText.textContent = text;
          // Restart the "new objective" flash.
          el.obj.classList.remove("fresh");
          void el.obj.offsetWidth;
          el.obj.classList.add("fresh");
        }
        el.objSub.textContent = sub;
      }
    },
    // Fishing: the reel-in meter (0..1), or null to hide it. `hot` flashes
    // it (a bite to hook, or the gator pulling hard).
    setReel(frac, label = "", hot = false) {
      el.reel.classList.toggle("show", frac != null);
      if (frac == null) return;
      el.reelLabel.textContent = label;
      el.reelBar.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
      el.reel.classList.toggle("hot", hot);
    },
    // Resolves when the player dismisses the card (button, E, Enter, Space).
    story({ kicker, title, body, go = "LET'S GO" }) {
      el.storyKicker.textContent = kicker;
      el.storyTitle.textContent = title;
      el.storyBody.textContent = body;
      el.storyGo.innerHTML = `<span class="keycap">E</span> ${go}`;
      el.story.classList.add("show");
      return new Promise((res) => (storyResolve = res));
    },
    get storyOpen() {
      return !!storyResolve;
    },
    dismissStory: closeStory,
    achievement(title, text, ms = 6500) {
      confetti.burst();
      el.achTitle.textContent = title;
      el.achText.textContent = text;
      el.ach.classList.remove("show");
      void el.ach.offsetWidth;
      el.ach.classList.add("show");
      return new Promise((res) => setTimeout(() => {
        el.ach.classList.remove("show");
        res();
      }, ms));
    },
    // Place the waypoint marker over a world point (or clamp to the edge).
    waypoint(target, camera, distance) {
      if (!target) {
        el.way.classList.remove("show");
        return;
      }
      el.way.classList.add("show");
      const w = viewport.clientWidth, h = viewport.clientHeight;
      v.set(target.x, target.y ?? 12, target.z).project(camera);
      const behind = v.z > 1;
      let x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      if (behind) {
        x = w - x;
        y = h - 30;
      }
      const onScreen = !behind && x > 30 && x < w - 30 && y > 30 && y < h - 30;
      let cx = x, cy = y;
      if (!onScreen) {
        // Ride an inset ellipse toward the target, clear of the HUD corners.
        const ang = Math.atan2(y - h / 2, x - w / 2);
        cx = w / 2 + Math.cos(ang) * (w / 2 - 44);
        cy = h / 2 + Math.sin(ang) * (h / 2 - 78);
        el.way.style.setProperty("--arrow", `${(ang * 180) / Math.PI + 90}deg`);
      }
      el.way.style.transform = `translate(${cx}px, ${cy}px)`;
      el.way.classList.toggle("edge", !onScreen);
      el.wayDist.textContent = `${Math.round(distance)} m`;
    },
  };
}
