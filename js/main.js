(function () {
  const pages = Array.from(document.querySelectorAll(".dashboard-page"));
  const tabs = Array.from(document.querySelectorAll(".tab-button"));
  const pageCount = document.getElementById("page-count");

  function pageIndex(id) {
    const index = pages.findIndex((page) => page.id === id);
    return index >= 0 ? index : 0;
  }

  function activate(id, updateHash = true) {
    const index = pageIndex(id);
    const activePage = pages[index];

    pages.forEach((page) => {
      page.classList.toggle("is-active", page === activePage);
    });

    tabs.forEach((tab) => {
      const selected = tab.dataset.target === activePage.id;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", selected ? "true" : "false");
    });

    pageCount.textContent = `${index + 1} / ${pages.length}`;

    if (updateHash && window.location.hash.slice(1) !== activePage.id) {
      history.replaceState(null, "", `#${activePage.id}`);
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab.dataset.target));
  });

  window.addEventListener("hashchange", () => {
    activate(window.location.hash.slice(1) || "process", false);
  });

  window.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const current = pageIndex(document.querySelector(".dashboard-page.is-active")?.id);
    if (event.key === "ArrowRight") {
      activate(pages[(current + 1) % pages.length].id);
    }
    if (event.key === "ArrowLeft") {
      activate(pages[(current - 1 + pages.length) % pages.length].id);
    }
  });

  if (window.initSolutionField) {
    window.initSolutionField();
  }

  activate(window.location.hash.slice(1) || "process", false);
})();
