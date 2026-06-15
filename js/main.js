/**
 * LiSPER Dashboard — entry point
 */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

initSolutionField();

if (!prefersReducedMotion && finePointer) {
  document.body.classList.add("has-pointer");

  const glow = document.querySelector(".cursor-glow");
  const light = document.querySelector(".cursor-light");

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let glowX = targetX;
  let glowY = targetY;

  window.addEventListener("mousemove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    light.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
  });

  function renderCursorGlow() {
    glowX += (targetX - glowX) * 0.16;
    glowY += (targetY - glowY) * 0.16;
    glow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`;
    requestAnimationFrame(renderCursorGlow);
  }

  renderCursorGlow();
}

async function boot() {
  try {
    await loadAndRenderDashboard();
    initNavigation();
  } catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="boot-error">Could not load dashboard data. Run <code>python3 scripts/extract_dashboard_data.py</code> first.</div>`
    );
  }
}

boot();
