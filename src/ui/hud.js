import { locate } from "../map/layout.js";

const EXT = 830;
const PX = 0.5; // minimap pixels per world unit

const toMap = (x, z) => [(x + EXT) * PX, (z + EXT) * PX];

function drawBase(data) {
  const size = EXT * 2 * PX;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#86c262";
  ctx.fillRect(0, 0, size, size);
  // Field patchwork hint
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = 0; i < size; i += 32) {
    for (let j = (i / 32) % 2 === 0 ? 0 : 32; j < size; j += 64) ctx.fillRect(i, j, 32, 32);
  }
  const rect = (r, col) => {
    const [x0, z0] = toMap(r.x0, r.z0);
    const [x1, z1] = toMap(r.x1, r.z1);
    ctx.fillStyle = col;
    ctx.fillRect(x0, z0, x1 - x0, z1 - z0);
  };
  rect({ x0: -268, z0: -268, x1: 268, z1: 196 }, "#a0d97f");
  rect(data.areas.golf, "#b5ea95");
  rect(data.areas.vetPark, "#b5ea95");
  rect(data.areas.muniPark, "#b5ea95");
  rect(data.areas.airport, "#b9e39c");
  rect(data.areas.gravel, "#d8cba4");
  const poly = (pts, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    pts.forEach(([x, z], i) => {
      const [mx, mz] = toMap(x, z);
      if (i === 0) ctx.moveTo(mx, mz);
      else ctx.lineTo(mx, mz);
    });
    ctx.closePath();
    ctx.fill();
  };
  poly(data.lake, "#3a96ea");
  poly(data.pond, "#3a96ea");
  for (const p of data.pits) poly(p, "#3cc9c4");
  for (const b of data.buildings) {
    const [mx, mz] = toMap(b.x, b.z);
    ctx.save();
    ctx.translate(mx, mz);
    ctx.rotate(-b.rot);
    ctx.fillStyle = "#c98e6a";
    ctx.fillRect(-b.hw * PX, -b.hd * PX, b.hw * 2 * PX, b.hd * 2 * PX);
    ctx.restore();
  }
  const line = (pts, width, col, dash = null) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    pts.forEach(([x, z], i) => {
      const [mx, mz] = toMap(x, z);
      if (i === 0) ctx.moveTo(mx, mz);
      else ctx.lineTo(mx, mz);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };
  for (const r of data.roads) line(r.pts, Math.max(2, r.w * PX), r.kind === "highway" || r.kind === "main" ? "#ffe08a" : "#f4f1e8");
  for (const rail of Object.values(data.rails)) {
    line(rail.pts, 2.4, rail.active ? "#5a3b25" : "#a08f78");
    if (rail.active) line(rail.pts, 5, "#5a3b25", [1, 4]);
  }
  return c;
}

export function createHud(minimapData) {
  const $ = (id) => document.getElementById(id);
  const el = {
    loc: $("locPlate"),
    rose: $("compassRose"),
    meter: $("meterFill"),
    mode: $("hudMode"),
    prompt: $("prompt"),
    toast: $("toast"),
    now: $("nowPlaying"),
    banner: $("trainBanner"),
    ride: $("btnRide"),
    map: $("minimap"),
  };
  const base = drawBase(minimapData);
  const mctx = el.map.getContext("2d");
  let mapMode = 1; // 0 off, 1 mini, 2 full town
  let lastLoc = 0, lastMap = 0, toastTimer = null, lastPrompt = "", lastMode = "", lastNow = "";

  function applyMapMode() {
    el.map.className = mapMode === 2 ? "full" : mapMode === 1 ? "mini" : "off";
    const r = el.map.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.map.width = Math.max(1, Math.round(r.width * dpr));
    el.map.height = Math.max(1, Math.round(r.height * dpr));
  }
  applyMapMode();
  window.addEventListener("resize", applyMapMode);

  function arrow(ctx, x, y, bearing, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bearing);
    ctx.fillStyle = color;
    ctx.strokeStyle = "#1b0f2e";
    ctx.lineWidth = Math.max(1.5, size * 0.18);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, size * 0.75);
    ctx.lineTo(0, size * 0.35);
    ctx.lineTo(-size * 0.7, size * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawMap(px, pz, bearing, extras) {
    const W = el.map.width, H = el.map.height;
    if (mapMode === 0 || W < 2) return;
    mctx.clearRect(0, 0, W, H);
    if (mapMode === 1) {
      const span = 360 * PX; // world units visible across
      const [mx, mz] = toMap(px, pz);
      mctx.drawImage(base, mx - span / 2, mz - span / 2, span, span, 0, 0, W, H);
      const s = W / span;
      for (const e of extras) {
        const [ex, ez] = toMap(e.x, e.z);
        const sx = W / 2 + (ex - mx) * s, sz = H / 2 + (ez - mz) * s;
        if (sx < 0 || sz < 0 || sx > W || sz > H) continue;
        mctx.fillStyle = e.color;
        mctx.beginPath();
        mctx.arc(sx, sz, e.r * (W / 160), 0, Math.PI * 2);
        mctx.fill();
      }
      arrow(mctx, W / 2, H / 2, bearing, W * 0.05, "#ffd34d");
    } else {
      // Whole-town view: the town core, stretched to fill the panel's shape.
      const scale = Math.min(W, H) / (840 * PX);
      const spanX = W / scale / PX, spanZ = H / scale / PX;
      const x0 = -spanX / 2, z0 = -60 - spanZ / 2;
      const [bx, bz] = toMap(x0, z0);
      mctx.fillStyle = "#86c262";
      mctx.fillRect(0, 0, W, H);
      mctx.drawImage(base, bx, bz, spanX * PX, spanZ * PX, 0, 0, W, H);
      const proj = (x, z) => [(x - x0) * PX * scale, (z - z0) * PX * scale];
      const fs = Math.round(Math.max(10, Math.min(W, H) / 42));
      mctx.font = `bold ${fs}px "Trebuchet MS", sans-serif`;
      mctx.textAlign = "center";
      // Greedy label placement: skip any label that would overlap one already drawn.
      const placed = [];
      for (const l of [...minimapData.landmarks].reverse()) {
        const [lx, lz] = proj(l.x, l.z);
        if (lx < 0 || lz < 0 || lx > W || lz > H) continue;
        mctx.fillStyle = "#5a2a9a";
        mctx.beginPath();
        mctx.arc(lx, lz, 4, 0, Math.PI * 2);
        mctx.fill();
        const tw = mctx.measureText(l.label).width;
        const box = [lx - tw / 2 - 3, lz - 8 - fs, lx + tw / 2 + 3, lz - 6];
        if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
        placed.push(box);
        mctx.lineWidth = 3;
        mctx.strokeStyle = "rgba(255,255,255,0.85)";
        mctx.strokeText(l.label, lx, lz - 8);
        mctx.fillStyle = "#2b1450";
        mctx.fillText(l.label, lx, lz - 8);
      }
      for (const e of extras) {
        const [ex, ez] = proj(e.x, e.z);
        mctx.fillStyle = e.color;
        mctx.beginPath();
        mctx.arc(ex, ez, e.r * 1.4, 0, Math.PI * 2);
        mctx.fill();
      }
      const [ax, az] = proj(px, pz);
      arrow(mctx, ax, az, bearing, Math.max(9, W / 55), "#ffd34d");
    }
  }

  return {
    update({ x, z, heading, speedFrac, now, time, extras }) {
      // Bearing measured clockwise from north (north is -z).
      const bearing = Math.atan2(Math.sin(heading), -Math.cos(heading));
      el.rose.style.transform = `rotate(${(-bearing * 180) / Math.PI}deg)`;
      el.meter.style.width = `${Math.round(Math.min(1, speedFrac) * 100)}%`;
      if (time - lastLoc > 0.25) {
        lastLoc = time;
        el.loc.textContent = locate(x, z);
      }
      if (now !== lastNow) {
        lastNow = now;
        el.now.textContent = now;
      }
      if (time - lastMap > 0.08) {
        lastMap = time;
        drawMap(x, z, bearing, extras);
      }
    },
    setPrompt(text) {
      if (text === lastPrompt) return;
      lastPrompt = text;
      el.prompt.textContent = text;
      el.prompt.style.opacity = text ? "1" : "0";
    },
    setMode(text, riding) {
      if (text === lastMode) return;
      lastMode = text;
      el.mode.textContent = text;
      el.ride.textContent = riding ? "PARK" : "RIDE";
    },
    toast(text, ms = 2200) {
      el.toast.textContent = text;
      el.toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.toast.classList.remove("show"), ms);
    },
    setTrainWarning(on) {
      el.banner.classList.toggle("show", on);
    },
    cycleMap() {
      mapMode = (mapMode + 1) % 3;
      applyMapMode();
      return ["MAP OFF", "MINI MAP", "TOWN MAP"][mapMode];
    },
  };
}
