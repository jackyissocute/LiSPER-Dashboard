/**
 * Toggle desktop (fixed viewport) vs compact (page scroll) layout modes.
 * Priority: never overlap sections when the window is resized.
 */

const COMPACT_QUERY = window.matchMedia("(max-width: 900px), (max-height: 580px)");

function applyLayoutMode() {
  const compact = COMPACT_QUERY.matches;
  document.body.classList.toggle("layout-compact", compact);
  document.body.classList.toggle("layout-desktop", !compact);

  if (typeof window.resizeAllCharts === "function") {
    requestAnimationFrame(() => window.resizeAllCharts());
  }
}

COMPACT_QUERY.addEventListener("change", applyLayoutMode);
applyLayoutMode();

window.applyLayoutMode = applyLayoutMode;
