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

  if (glow && light) {
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
}

function showBootError(message) {
  document.body.classList.add("dashboard-ready");
  const existing = document.querySelector(".boot-error");
  if (existing) {
    existing.textContent = message;
    return;
  }
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="boot-error" role="alert">${message}</div>`
  );
}

async function boot() {
  // Always show the dashboard chrome, even if data or charts fail.
  try {
    initNavigation();
  } catch (error) {
    console.error("Navigation init failed:", error);
    document.body.classList.add("dashboard-ready");
  }

  try {
    await loadAndRenderDashboard();
  } catch (error) {
    console.error(error);
    showBootError(
      "Could not load dashboard data. Ensure data/dashboard.json is deployed, then refresh."
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
