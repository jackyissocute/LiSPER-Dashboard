/**
 * Vector LiSPER bead — SVG model, hover explode, no side cards
 */

const BEAD_LAYERS = ["peptide", "capture", "exclude", "shell", "core"];

const BEAD_CENTER = 200;
const SVG_CENTER = `${BEAD_CENTER} ${BEAD_CENTER}`;

/** Exploded layout follows the story order used by the scrolling panels. */
const PART_EXPLODE = {
  desktop: {
    peptide: { x: 38, y: -126, scale: 0.82 },
    capture: { x: -22, y: -28, scale: 0.58 },
    exclude: { x: -19, y: 34, scale: 0.58 },
    shell: { x: -6, y: 92, scale: 0.66 },
    core: { x: 7, y: 168, scale: 0.72 },
  },
  mobile: {
    peptide: { x: -112, y: 0, scale: 0.56 },
    capture: { x: -42, y: 0, scale: 0.76 },
    exclude: { x: 10, y: 0, scale: 0.76 },
    shell: { x: 72, y: 0, scale: 0.5 },
    core: { x: 128, y: 0, scale: 0.68 },
  },
};

const EXPLODE_ORDER = ["peptide", "capture", "exclude", "shell", "core"];

function porousShellPattern() {
  const cx = BEAD_CENTER;
  const cy = BEAD_CENTER;
  const holes = [];
  for (let ring = 0; ring < 3; ring++) {
    const r = 64 + ring * 13;
    const count = 10 + ring * 4;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.4;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > 56 && dist < 96) {
        holes.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${2.4 + ring * 0.3}" class="shell-pore"/>`);
      }
    }
  }
  return holes.join("\n");
}

function peptideBranches() {
  const branches = [];
  const cx = BEAD_CENTER;
  const cy = BEAD_CENTER;
  const angles = [
    -0.48, -0.18, 0.1, 0.38, 0.66, 0.94, 1.22, 1.5,
    1.78, 2.06, 2.34, 2.62, 2.9, 3.18, 3.46, 3.74,
    4.02, 4.3, 4.58, 4.86,
  ];

  angles.forEach((a, i) => {
    const r0 = 96 + (i % 2) * 3;
    const r1 = 136 + (i % 4) * 8;
    const x0 = cx + Math.cos(a) * r0;
    const y0 = cy + Math.sin(a) * r0;
    const x1 = cx + Math.cos(a) * r1;
    const y1 = cy + Math.sin(a) * r1;
    const mx = cx + Math.cos(a + 0.15) * (r0 + r1) / 2;
    const my = cy + Math.sin(a + 0.15) * (r0 + r1) / 2;
    branches.push(
      `<path class="peptide-branch" d="M${x0.toFixed(1)},${y0.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}" />`
    );
    branches.push(`<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="3.4" class="peptide-node"/>`);
    if (i % 2 === 0) {
      const a2 = a + 0.35;
      const x2 = x1 + Math.cos(a2) * 12;
      const y2 = y1 + Math.sin(a2) * 12;
      branches.push(`<path class="peptide-branch peptide-branch--sub" d="M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}" />`);
      branches.push(`<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="2.2" class="peptide-node peptide-node--sub"/>`);
    }
  });
  return branches.join("\n");
}

function beadHitArea(layerId, cx, cy, r) {
  return `<circle class="bead-hit" data-layer="${layerId}" cx="${cx}" cy="${cy}" r="${r}" aria-label="${layerId} layer"/>`;
}

function beadSvgMarkup() {
  return `
<svg class="bead-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="LiSPER bead cross-section">
  <defs>
    <radialGradient id="coreBlack" cx="32%" cy="28%" r="68%">
      <stop offset="0%" stop-color="#3d3d3d"/>
      <stop offset="45%" stop-color="#141414"/>
      <stop offset="100%" stop-color="#050505"/>
    </radialGradient>
    <radialGradient id="shellWhite" cx="38%" cy="32%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </radialGradient>
    <radialGradient id="beadOuter" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="62%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#64748b"/>
    </radialGradient>
    <radialGradient id="liGlow" cx="35%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#0891b2"/>
    </radialGradient>
    <radialGradient id="naGrad" cx="35%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </radialGradient>
    <linearGradient id="peptideGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="48%" stop-color="#2dd4bf"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
    <filter id="peptideGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="2.4" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="partGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <ellipse class="bead-shadow" cx="200" cy="328" rx="88" ry="12" fill="rgba(0,0,0,0.35)"/>

  <g class="bead-explode-root">
    <g class="bead-part bead-part--shell" data-layer="shell">
      <circle cx="200" cy="200" r="118" fill="url(#beadOuter)" opacity="0.42" class="bead-outer-ring"/>
      <path
        class="shell-body"
        fill="url(#shellWhite)"
        fill-rule="evenodd"
        opacity="0.96"
        d="M 200 104
           A 96 96 0 1 1 199.9 104
           M 200 153
           A 47 47 0 1 0 200.1 153"
      />
      <g class="shell-pores">${porousShellPattern()}</g>
      <circle cx="200" cy="200" r="96" fill="none" stroke="rgba(255,255,255,0.72)" stroke-width="1.8"/>
      <circle cx="200" cy="200" r="48" fill="rgba(15,23,42,0.18)" stroke="rgba(255,255,255,0.35)" stroke-width="1.3"/>
      ${beadHitArea("shell", 200, 200, 95)}
    </g>

    <g class="bead-part bead-part--core" data-layer="core">
      <circle cx="200" cy="200" r="50" fill="rgba(0,0,0,0.32)" filter="url(#partGlow)"/>
      <circle cx="200" cy="200" r="42" fill="url(#coreBlack)" class="magnetic-core"/>
      <circle cx="200" cy="200" r="42" fill="none" stroke="rgba(255,255,255,0.34)" stroke-width="1.6"/>
      <ellipse cx="188" cy="188" rx="8" ry="5" fill="rgba(255,255,255,0.16)"/>
      ${beadHitArea("core", 200, 200, 50)}
    </g>

    <g class="bead-part bead-part--peptide" data-layer="peptide">
      ${peptideBranches()}
      ${beadHitArea("peptide", 200, 200, 128)}
    </g>

    <g class="bead-part bead-part--capture" data-layer="capture">
      <circle class="ion ion--li" cx="176" cy="184" r="6" fill="url(#liGlow)"/>
      <circle class="ion ion--li" cx="220" cy="184" r="5.5" fill="url(#liGlow)"/>
      <circle class="ion ion--li" cx="183" cy="222" r="5.5" fill="url(#liGlow)"/>
      <circle class="ion ion--li" cx="226" cy="216" r="6" fill="url(#liGlow)"/>
      ${beadHitArea("capture", 200, 200, 54)}
    </g>

    <g class="bead-part bead-part--exclude" data-layer="exclude">
      <circle class="ion ion--na" cx="176" cy="176" r="7.2" fill="url(#naGrad)"/>
      <circle class="ion ion--na" cx="226" cy="200" r="7.6" fill="url(#naGrad)"/>
      <circle class="ion ion--na" cx="182" cy="226" r="7.2" fill="url(#naGrad)"/>
      ${beadHitArea("exclude", 200, 200, 50)}
    </g>
  </g>

  <circle cx="200" cy="200" r="118" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" class="bead-rim"/>
</svg>`;
}

function initBeadModel() {
  const modelEl = document.getElementById("bead-model-main");
  const wrap = document.getElementById("bead-vector-wrap");
  if (!modelEl || !wrap) return null;

  modelEl.innerHTML = beadSvgMarkup();

  wrap.querySelectorAll(".bead-part").forEach((part) => {
    part.style.transformBox = "view-box";
    part.style.transformOrigin = "200px 200px";
  });

  return { model: modelEl, container: wrap };
}

function currentExplodeLayout() {
  return window.matchMedia("(max-width: 900px)").matches ? PART_EXPLODE.mobile : PART_EXPLODE.desktop;
}

function currentBeadScale() {
  return window.matchMedia("(max-width: 900px)").matches ? 1.04 : 1;
}

function svgLayerTransform(x, y, scale) {
  if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001 && Math.abs(scale - 1) < 0.001) return "";
  return `translate(${x} ${y}) translate(${BEAD_CENTER} ${BEAD_CENTER}) scale(${scale}) translate(${-BEAD_CENTER} ${-BEAD_CENTER})`;
}

function applyLayerTransform(part, x, y, scale) {
  gsap.killTweensOf(part);
  part.removeAttribute("transform");
  part.style.translate = "";
  part.style.rotate = "";
  part.style.scale = "";
  if (!x && !y && scale === 1) {
    part.style.transform = "";
    return;
  }
  part.style.transform = `translate(${x}px, ${y}px) translate(${BEAD_CENTER}px, ${BEAD_CENTER}px) scale(${scale}) translate(${-BEAD_CENTER}px, ${-BEAD_CENTER}px)`;
}

function setBeadExploded(wrap, exploded, focusLayerId = null, instant = false) {
  if (!wrap || typeof gsap === "undefined") return;

  wrap.classList.toggle("is-exploded", exploded);
  const layout = currentExplodeLayout();
  const parts = EXPLODE_ORDER
    .map((layerId) => wrap.querySelector(`.bead-part[data-layer="${layerId}"]`))
    .filter(Boolean);
  const model = wrap.querySelector(".bead-vector-model");

  gsap.killTweensOf(parts);
  if (model) gsap.killTweensOf(model);

  EXPLODE_ORDER.forEach((layerId) => {
    const part = wrap.querySelector(`.bead-part[data-layer="${layerId}"]`);
    const off = layout[layerId] || { x: 0, y: 0, scale: 1 };

    if (part) {
      const isFocused = focusLayerId && layerId === focusLayerId;
      applyLayerTransform(
        part,
        exploded ? off.x : 0,
        exploded ? off.y : 0,
        exploded ? off.scale * (isFocused ? 1.08 : 1) : 1
      );
    }
  });

  if (model) {
    model.style.transform = `scale(${currentBeadScale()})`;
  }
}

window.BEAD_LAYERS = BEAD_LAYERS;
window.PART_EXPLODE = PART_EXPLODE;
window.initBeadModel = initBeadModel;
window.setBeadExploded = setBeadExploded;
