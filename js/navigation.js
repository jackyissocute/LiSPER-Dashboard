/**
 * LiSPER Dashboard — horizontal full-viewport panel navigation
 */

const SECTIONS = [
  { id: "overview", label: "Overview", panelId: "overview" },
  { id: "workstreams", label: "Workstreams", panelId: "workstreams" },
  { id: "production", label: "MD pipeline", panelId: "production" },
  { id: "remote", label: "Remote ops", panelId: "remote" },
  { id: "library", label: "Library", panelId: "library" },
];

let currentIndex = 0;

function hasGsap() {
  return typeof gsap !== "undefined";
}

function buildNav() {
  const nav = document.getElementById("section-nav");
  nav.innerHTML = SECTIONS.map(
    (section, index) =>
      `<button type="button" class="nav-dot${index === 0 ? " is-active" : ""}" data-index="${index}" aria-label="${section.label}"><span>${section.label}</span></button>`
  ).join("");

  nav.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-dot");
    if (!button) return;
    goToPanel(Number(button.dataset.index));
  });
}

function updateNav(index) {
  document.querySelectorAll(".nav-dot").forEach((dot, i) => {
    dot.classList.toggle("is-active", i === index);
  });
  document.getElementById("section-label").textContent = SECTIONS[index].label;
  document.getElementById("section-counter").textContent = `${index + 1} / ${SECTIONS.length}`;
}

function setActivePanel(index) {
  const panels = document.getElementById("dashboard-panels");
  Array.from(panels.children).forEach((panel, i) => {
    panel.classList.toggle("is-active", i === index);
    if (hasGsap()) {
      gsap.set(panel, { clearProps: "transform,opacity" });
    } else {
      panel.style.transform = "";
      panel.style.opacity = "";
    }
  });
}

function goToPanel(index) {
  if (index === currentIndex || index < 0 || index >= SECTIONS.length) return;

  const panels = document.getElementById("dashboard-panels");
  const outgoing = panels.children[currentIndex];
  const incoming = panels.children[index];
  const section = SECTIONS[index];

  currentIndex = index;
  updateNav(index);
  incoming.classList.add("is-active");
  outgoing.classList.remove("is-active");

  if (typeof window.renderPanelCharts === "function" && section.panelId !== "overview") {
    window.renderPanelCharts(section.panelId);
  }

  if (typeof window.resizeAllCharts === "function") {
    setTimeout(window.resizeAllCharts, 100);
  }

  document.querySelector(".dashboard-main")?.scrollTo({ top: 0, behavior: "smooth" });
}

function bindKeys() {
  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      goToPanel(currentIndex + 1, 1);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      goToPanel(currentIndex - 1, -1);
    }
  });
}

function bindArrows() {
  document.getElementById("nav-prev").addEventListener("click", () => goToPanel(currentIndex - 1, -1));
  document.getElementById("nav-next").addEventListener("click", () => goToPanel(currentIndex + 1, 1));
}

function bindSwipe() {
  let startX = 0;
  const threshold = 60;

  window.addEventListener(
    "touchstart",
    (event) => {
      startX = event.changedTouches[0].clientX;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    (event) => {
      const delta = event.changedTouches[0].clientX - startX;
      if (Math.abs(delta) < threshold) return;
      if (delta < 0) goToPanel(currentIndex + 1, 1);
      else goToPanel(currentIndex - 1, -1);
    },
    { passive: true }
  );
}

function initNavigation() {
  buildNav();
  setActivePanel(0);
  updateNav(0);
  bindKeys();
  bindArrows();
  bindSwipe();
  document.body.classList.add("dashboard-ready");

  if (!hasGsap()) {
    return;
  }

  gsap.fromTo(
    ".dashboard-header",
    { y: -12, opacity: 0.6 },
    { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" }
  );
  gsap.fromTo(
    ".dashboard-footer",
    { y: 12, opacity: 0.6 },
    { y: 0, opacity: 1, duration: 0.45, delay: 0.05, ease: "power2.out" }
  );
}

window.initNavigation = initNavigation;
