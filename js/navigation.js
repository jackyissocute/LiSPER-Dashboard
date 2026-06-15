/**
 * LiSPER Dashboard — horizontal full-viewport panel navigation (GSAP)
 */

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "workstreams", label: "Workstreams" },
  { id: "production", label: "LiCl MD" },
  { id: "remote", label: "Remote ops" },
  { id: "library", label: "Library" },
];

let currentIndex = 0;
let isAnimating = false;

function getPanelWidth() {
  return document.querySelector(".dashboard-panels")?.offsetWidth || window.innerWidth;
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

function goToPanel(index, direction = index > currentIndex ? 1 : -1) {
  if (isAnimating || index === currentIndex || index < 0 || index >= SECTIONS.length) return;

  isAnimating = true;
  const panels = document.getElementById("dashboard-panels");
  const outgoing = panels.children[currentIndex];
  const incoming = panels.children[index];
  const width = getPanelWidth();

  gsap.set(incoming, { x: direction * width, opacity: 0.4 });
  incoming.classList.add("is-active");
  outgoing.classList.remove("is-active");

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(outgoing, { clearProps: "all" });
      currentIndex = index;
      updateNav(index);
      isAnimating = false;
    },
  });

  tl.to(outgoing, { x: -direction * width * 0.35, opacity: 0, duration: 0.45, ease: "power2.in" }, 0)
    .to(incoming, { x: 0, opacity: 1, duration: 0.55, ease: "power2.out" }, 0)
    .fromTo(
      incoming.querySelectorAll(".panel-animate"),
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out" },
      0.12
    );
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
  updateNav(0);
  bindKeys();
  bindArrows();
  bindSwipe();

  gsap.from(".dashboard-header", { y: -20, opacity: 0, duration: 0.6, ease: "power2.out" });
  gsap.from(".dashboard-footer", { y: 20, opacity: 0, duration: 0.6, delay: 0.1, ease: "power2.out" });
  gsap.from(".panel.is-active .panel-animate", {
    y: 24,
    opacity: 0,
    duration: 0.55,
    stagger: 0.06,
    ease: "power2.out",
    delay: 0.15,
  });
}

window.initNavigation = initNavigation;
