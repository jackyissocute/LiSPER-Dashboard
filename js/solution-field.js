/**
 * LiSPER BEADS — full-page chemical solution background
 * Rising bubbles, floating ions & molecules, mouse-reactive blue light
 */

function initSolutionField() {
  const canvas = document.getElementById("solution-canvas");
  if (!canvas) return null;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const ctx = canvas.getContext("2d");

  let w = 0;
  let h = 0;
  let dpr = 1;
  let frameId = 0;
  let time = 0;

  const mouse = { x: -9999, y: -9999, active: false };
  const LIGHT_RADIUS = 140;

  const bubbles = [];
  const ions = [];
  const molecules = [];
  const ripples = [];

  const LI_TYPES = [
    { label: "Li⁺", color: "#22d3ee", glow: "rgba(34,211,238,0.45)", r: 5, pull: 0.018 },
    { label: "Li⁺", color: "#38bdf8", glow: "rgba(56,189,248,0.4)", r: 4.5, pull: 0.015 },
  ];
  const NA_TYPES = [
    { label: "Na⁺", color: "#94a3b8", glow: "rgba(148,163,184,0.25)", r: 6, pull: -0.012 },
    { label: "Na⁺", color: "#64748b", glow: "rgba(100,116,139,0.2)", r: 4, pull: -0.008 },
  ];
  const CL_TYPES = [
    { label: "Cl⁻", color: "#64748b", glow: "rgba(100,116,139,0.16)", r: 4, pull: 0 },
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnBubble() {
    return {
      x: Math.random() * w,
      y: h + Math.random() * 40,
      r: Math.random() * 5 + 2,
      vy: -(Math.random() * 0.45 + 0.25),
      vx: (Math.random() - 0.5) * 0.15,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.02 + 0.008,
      alpha: Math.random() * 0.25 + 0.12,
    };
  }

  function spawnIon(types) {
    const t = types[Math.floor(Math.random() * types.length)];
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      wobble: Math.random() * Math.PI * 2,
      ...t,
    };
  }

  function spawnMolecule() {
    const types = ["h2o", "peptide"];
    const type = types[Math.floor(Math.random() * types.length)];
    const parts =
      type === "h2o"
        ? [
            { dx: -6, dy: 0, r: 2.5, color: "#e2e8f0" },
            { dx: 6, dy: 0, r: 2.5, color: "#e2e8f0" },
            { dx: 0, dy: -5, r: 4, color: "#ef4444" },
          ]
        : [
            { dx: -10, dy: 2, r: 2.2, color: "#38bdf8" },
            { dx: -3, dy: -2, r: 2.5, color: "#2563eb" },
            { dx: 4, dy: 1, r: 2.2, color: "#06b6d4" },
            { dx: 11, dy: -1, r: 2, color: "#38bdf8" },
          ];
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.004,
      parts,
      alpha: Math.random() * 0.35 + 0.25,
    };
  }

  function populate() {
    bubbles.length = 0;
    ions.length = 0;
    molecules.length = 0;

    const bubbleCount = Math.min(55, Math.floor(w / 22));
    const ionPairCount = Math.min(28, Math.max(12, Math.floor(w / 34)));
    const chlorideCount = Math.min(14, Math.max(6, Math.floor(w / 90)));
    const molCount = Math.min(14, Math.floor(w / 90));

    for (let i = 0; i < bubbleCount; i++) {
      const b = spawnBubble();
      b.y = Math.random() * h;
      bubbles.push(b);
    }
    for (let i = 0; i < ionPairCount; i++) {
      ions.push(spawnIon(LI_TYPES));
      ions.push(spawnIon(NA_TYPES));
    }
    for (let i = 0; i < chlorideCount; i++) ions.push(spawnIon(CL_TYPES));
    for (let i = 0; i < molCount; i++) molecules.push(spawnMolecule());
  }

  function applyLightForce(x, y, pull) {
    if (!mouse.active) return { fx: 0, fy: 0 };
    const dx = mouse.x - x;
    const dy = mouse.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist > LIGHT_RADIUS || dist < 1) return { fx: 0, fy: 0 };
    const strength = (1 - dist / LIGHT_RADIUS) * pull;
    return { fx: (dx / dist) * strength, fy: (dy / dist) * strength };
  }

  function wrapEntity(entity) {
    if (entity.x < -30) entity.x = w + 30;
    if (entity.x > w + 30) entity.x = -30;
    if (entity.y < -30) entity.y = h + 30;
    if (entity.y > h + 30) entity.y = -30;
  }

  function update() {
    time += 1;

    bubbles.forEach((b) => {
      b.wobble += b.wobbleSpeed;
      b.x += b.vx + Math.sin(b.wobble) * 0.12;

      if (mouse.active) {
        const dx = b.x - mouse.x;
        const dy = b.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < LIGHT_RADIUS && dist > 1) {
          const push = (1 - dist / LIGHT_RADIUS) * 0.35;
          b.x += (dx / dist) * push;
          b.y += (dy / dist) * push;
        }
      }

      b.y += b.vy;
      if (b.y < -20) {
        Object.assign(b, spawnBubble());
      }
    });

    ions.forEach((ion) => {
      ion.wobble += 0.015;
      const force = applyLightForce(ion.x, ion.y, ion.pull * 60);
      ion.vx += force.fx;
      ion.vy += force.fy;
      ion.vx *= 0.985;
      ion.vy *= 0.985;
      ion.x += ion.vx + Math.sin(ion.wobble) * 0.08;
      ion.y += ion.vy + Math.cos(ion.wobble * 0.7) * 0.06;
      wrapEntity(ion);
    });

    molecules.forEach((mol) => {
      mol.angle += mol.spin;
      const force = applyLightForce(mol.x, mol.y, -0.004 * 60);
      mol.vx += force.fx;
      mol.vy += force.fy;
      mol.vx *= 0.99;
      mol.vy *= 0.99;
      mol.x += mol.vx;
      mol.y += mol.vy;
      wrapEntity(mol);
    });

    if (mouse.active && finePointer && time % 18 === 0 && ripples.length < 6) {
      ripples.push({ x: mouse.x, y: mouse.y, r: 8, alpha: 0.35 });
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].r += 1.2;
      ripples[i].alpha *= 0.94;
      if (ripples[i].alpha < 0.02) ripples.splice(i, 1);
    }
  }

  function drawSolutionBase() {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(6, 28, 48, 0.55)");
    grad.addColorStop(0.45, "rgba(4, 18, 36, 0.35)");
    grad.addColorStop(1, "rgba(2, 12, 28, 0.5)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (mouse.active && finePointer) {
      const light = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, LIGHT_RADIUS * 1.6);
      light.addColorStop(0, "rgba(56, 189, 248, 0.14)");
      light.addColorStop(0.35, "rgba(37, 99, 235, 0.07)");
      light.addColorStop(1, "rgba(37, 99, 235, 0)");
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawRipples() {
    ripples.forEach((rip) => {
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(34, 211, 238, ${rip.alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  function drawBubble(b) {
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(186, 230, 253, 0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(186, 230, 253, 0.35)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.28, b.y - b.r * 0.28, b.r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.fill();
    ctx.restore();
  }

  function drawIon(ion) {
    ctx.save();
    ctx.shadowColor = ion.glow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ion.x, ion.y, ion.r, 0, Math.PI * 2);
    ctx.fillStyle = ion.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = "600 9px DM Sans, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ion.label, ion.x, ion.y + ion.r + 8);
    ctx.restore();
  }

  function drawMolecule(mol) {
    ctx.save();
    ctx.globalAlpha = mol.alpha;
    ctx.translate(mol.x, mol.y);
    ctx.rotate(mol.angle);
    mol.parts.forEach((p, i) => {
      if (i > 0) {
        const prev = mol.parts[i - 1];
        ctx.beginPath();
        ctx.moveTo(prev.dx, prev.dy);
        ctx.lineTo(p.dx, p.dy);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    mol.parts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.dx, p.dy, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    drawSolutionBase();
    drawRipples();
    molecules.forEach(drawMolecule);
    bubbles.forEach(drawBubble);
    ions.forEach(drawIon);

    if (mouse.active && finePointer) {
      const core = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 28);
      core.addColorStop(0, "rgba(186, 230, 253, 0.9)");
      core.addColorStop(0.4, "rgba(56, 189, 248, 0.35)");
      core.addColorStop(1, "rgba(37, 99, 235, 0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 28, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduced) update();
  }

  function loop() {
    draw();
    frameId = requestAnimationFrame(loop);
  }

  function onMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  }

  function onLeave() {
    mouse.active = false;
  }

  resize();
  populate();

  if (reduced) {
    draw();
  } else {
    loop();
  }

  window.addEventListener("resize", () => {
    resize();
    populate();
  });

  if (finePointer) {
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
  }

  return { mouse, destroy: () => cancelAnimationFrame(frameId) };
}

window.initSolutionField = initSolutionField;
