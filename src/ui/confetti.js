// Confetti burst for achievements: two cannons fire from the bottom corners
// and a shower falls from the top, with paper strips, squares and stars
// that flutter as they fall. Runs its own animation loop only while pieces
// are alive, so it costs nothing the rest of the time.

const COLORS = ["#ffd43b", "#ff5d8f", "#21c4b5", "#7a3fc0", "#ff922b", "#4dabf7", "#ffffff", "#e03131", "#51cf66"];

export function createConfetti(canvas) {
  const ctx = canvas.getContext("2d");
  let pieces = [];
  let running = false;
  let last = 0;
  let w = 0, h = 0, dpr = 1;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width;
    h = r.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
  }

  function spawn(x, y, vx, vy) {
    const shape = Math.random();
    pieces.push({
      x, y, vx, vy,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 14,
      flip: Math.random() * Math.PI * 2,
      vflip: 6 + Math.random() * 10,
      size: 6 + Math.random() * 7,
      kind: shape < 0.55 ? "strip" : shape < 0.88 ? "square" : "star",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 3.2 + Math.random() * 1.6,
    });
  }

  function star(size) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? size * 0.45 : size;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const p of pieces) {
      p.vy += 520 * dt; // gravity
      p.vx *= Math.pow(0.35, dt); // air drag
      p.vy *= Math.pow(0.55, dt);
      p.x += (p.vx + Math.sin(p.flip) * 30) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.flip += p.vflip * dt;
      p.life -= dt;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.abs(Math.cos(p.flip)) * 0.85 + 0.15); // tumbling paper
      ctx.globalAlpha = Math.min(1, p.life * 1.5);
      ctx.fillStyle = p.color;
      if (p.kind === "strip") ctx.fillRect(-p.size * 0.25, -p.size, p.size * 0.5, p.size * 2);
      else if (p.kind === "square") ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      else star(p.size * 0.8);
      ctx.restore();
    }
    pieces = pieces.filter((p) => p.life > 0 && p.y < h + 40);
    if (pieces.length) requestAnimationFrame(frame);
    else {
      running = false;
      ctx.clearRect(0, 0, w, h);
    }
  }

  return {
    burst() {
      resize();
      const n = Math.round(Math.min(220, 110 + w * 0.12));
      for (let i = 0; i < n; i++) {
        const side = i % 3;
        if (side === 0) spawn(0, h * 0.95, 380 + Math.random() * 520, -(620 + Math.random() * 520));
        else if (side === 1) spawn(w, h * 0.95, -(380 + Math.random() * 520), -(620 + Math.random() * 520));
        else spawn(Math.random() * w, -20 - Math.random() * h * 0.4, (Math.random() - 0.5) * 120, Math.random() * 120);
      }
      // A second, smaller pop a moment later.
      setTimeout(() => {
        for (let i = 0; i < n / 3; i++) spawn(w / 2 + (Math.random() - 0.5) * 60, h * 0.42, (Math.random() - 0.5) * 900, -(200 + Math.random() * 600));
        if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      }, 450);
      if (!running) {
        running = true;
        last = performance.now();
        requestAnimationFrame(frame);
      }
    },
  };
}
