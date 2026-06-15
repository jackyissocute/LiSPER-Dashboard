/**
 * LiSPER Progress Dashboard — data loading, charts, and panel content
 */

const STATUS_LABELS = {
  complete: "Complete",
  clustered: "Clustered",
  running: "Running",
  produced: "Produced",
  blocked: "Blocked",
  repair_needed: "Repair needed",
  pending: "Pending",
  queued: "Queued",
  planned: "Planned",
  waiting: "Waiting",
  preparing: "Preparing",
  concept: "Concept",
};

const QUEUE_LABELS = {
  active: "Active",
  waiting_for_licl: "Waiting for LiCl",
  preparing: "Preparing",
};

let dashboardData = null;
const charts = new Map();

function dashboardBaseUrl() {
  const base = document.querySelector("base[href]");
  if (base) {
    return document.baseURI;
  }

  const { origin, pathname } = window.location;
  let basePath = pathname;
  if (!basePath.endsWith("/")) {
    const last = basePath.split("/").pop() || "";
    basePath = last.includes(".") ? basePath.slice(0, basePath.lastIndexOf("/") + 1) : `${basePath}/`;
  }
  return `${origin}${basePath}`;
}

function assetUrl(relativePath) {
  return new URL(relativePath, dashboardBaseUrl()).href;
}

function statusColor(status) {
  return dashboardData?.status_colors?.[status] || "#94a3b8";
}

async function loadDashboardData() {
  if (window.__DASHBOARD_DATA__) {
    dashboardData = window.__DASHBOARD_DATA__;
    return dashboardData;
  }

  const urls = [
    assetUrl("data/dashboard.json"),
    new URL("data/dashboard.json", document.baseURI).href,
  ];

  let lastError = null;
  for (const url of [...new Set(urls)]) {
    try {
      const response = await fetch(url, { cache: "no-cache" });
      if (!response.ok) {
        lastError = new Error(`Failed to load dashboard data (${response.status}) from ${url}`);
        continue;
      }
      dashboardData = await response.json();
      return dashboardData;
    } catch (error) {
      lastError = error;
    }
  }

  if (window.location.protocol === "file:") {
    throw new Error(
      "Cannot fetch JSON from a local file URL. Open via a local server (python3 -m http.server) or use the deployed GitHub Pages site."
    );
  }

  throw lastError || new Error("Failed to load dashboard data");
}

function destroyChart(id) {
  const chart = charts.get(id);
  if (chart) {
    chart.destroy();
    charts.delete(id);
  }
}

function destroyCharts() {
  charts.forEach((chart) => chart.destroy());
  charts.clear();
}

function formatTimestamp(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function renderOverview() {
  const { project, summary, remote, generated_at } = dashboardData;

  document.getElementById("overview-title").textContent = project.name;
  document.getElementById("overview-tagline").textContent = project.tagline;
  document.getElementById("overview-focus").textContent = project.phase_focus;
  document.getElementById("overview-updated").textContent = formatTimestamp(generated_at);
  const remoteLi = remote?.li_cl || remote || {};
  document.getElementById("remote-checked").textContent = remoteLi.last_checked || "—";

  const stats = [
    { label: "Candidates", value: summary.total_candidates, accent: "#22d3ee" },
    { label: "Production done", value: summary.production_complete, accent: "#16a34a" },
    { label: "Clustered", value: summary.clustering_complete, accent: "#38bdf8" },
    { label: "Blocked", value: summary.blocked, accent: "#ef4444" },
  ];

  document.getElementById("overview-stats").innerHTML = stats
    .map(
      (s) => `
      <div class="stat-card">
        <span class="stat-value" style="color:${s.accent}">${s.value}</span>
        <span class="stat-label">${s.label}</span>
      </div>`
    )
    .join("");

  document.getElementById("phase-progress-list").innerHTML = dashboardData.phases
    .map((phase) => {
      const color = statusColor(phase.status);
      return `
        <div class="progress-row">
          <div class="progress-meta">
            <span>${phase.label}</span>
            <span class="progress-pct">${phase.progress}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${phase.progress}%; background:${color}"></div>
          </div>
        </div>`;
    })
    .join("");
}

function renderWorkstreams() {
  document.getElementById("workstream-list").innerHTML = dashboardData.workstreams
    .map((ws) => {
      const color = statusColor(ws.status);
      return `
        <div class="workstream-card">
          <div class="workstream-head">
            <span>${ws.label}</span>
            <span class="badge" style="--badge-color:${color}">${ws.status}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${ws.progress}%; background:${color}"></div>
          </div>
          <span class="workstream-pct">${ws.progress}%</span>
        </div>`;
    })
    .join("");
}

function renderWorkstreamChart() {
  if (typeof Chart === "undefined") return;

  const canvas = document.getElementById("workstream-chart");
  if (!canvas) return;

  destroyChart("workstream");

  charts.set(
    "workstream",
    new Chart(canvas, {
      type: "bar",
      data: {
        labels: dashboardData.workstreams.map((w) => w.label.replace(/ /g, "\n")),
        datasets: [
          {
            label: "Progress %",
            data: dashboardData.workstreams.map((w) => w.progress),
            backgroundColor: dashboardData.workstreams.map((w) => statusColor(w.status) + "cc"),
            borderColor: dashboardData.workstreams.map((w) => statusColor(w.status)),
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: chartDefaults({
        indexAxis: "y",
        scales: {
          x: { max: 100, ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.12)" } },
          y: { ticks: { color: "#cbd5e1", font: { size: 11 } }, grid: { display: false } },
        },
      }),
    })
  );
}

function renderCandidateGrid(containerId, candidates) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = candidates
    .map((c) => {
      const color = statusColor(c.state);
      const clusterNote =
        c.top_cluster_population_percent != null
          ? `Top cluster ${c.top_cluster_population_percent}%`
          : c.repaired
            ? "Repaired clustering"
            : c.cluster_status;
      return `
        <article class="candidate-card" data-state="${c.state}">
          <header>
            <h3>${c.candidate_id}</h3>
            <span class="badge" style="--badge-color:${color}">${STATUS_LABELS[c.state] || c.state}</span>
          </header>
          <div class="candidate-bars">
            <div class="mini-bar">
              <span>Production</span>
              <div class="progress-track"><div class="progress-fill" style="width:${c.production_progress}%;background:#22d3ee"></div></div>
            </div>
            <div class="mini-bar">
              <span>Clustering</span>
              <div class="progress-track"><div class="progress-fill" style="width:${c.cluster_progress}%;background:#16a34a"></div></div>
            </div>
          </div>
          <p class="candidate-note">${clusterNote}</p>
        </article>`;
    })
    .join("");
}

function renderBranchChart(canvasId, chartKey, candidates, prodColor) {
  if (typeof Chart === "undefined") return;

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  destroyChart(chartKey);

  charts.set(
    chartKey,
    new Chart(canvas, {
      type: "bar",
      data: {
        labels: candidates.map((c) => c.candidate_id),
        datasets: [
          {
            label: "Production %",
            data: candidates.map((c) => c.production_progress),
            backgroundColor: prodColor + "a6",
            borderColor: prodColor,
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: "Clustering %",
            data: candidates.map((c) => c.cluster_progress),
            backgroundColor: "rgba(22,163,74,0.55)",
            borderColor: "#16a34a",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: chartDefaults({
        scales: {
          x: { ticks: { color: "#cbd5e1", maxRotation: 45, autoSkip: true, maxTicksLimit: 10 }, grid: { display: false } },
          y: { max: 100, ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.12)" } },
        },
      }),
    })
  );
}

function renderBranchPanel(branch, prefix, prodColor, queueBadgeId, statsId, activeId, gridId, chartId, chartKey) {
  const queueStatus = branch.queue_status || "preparing";
  const badgeEl = document.getElementById(queueBadgeId);
  if (badgeEl) {
    badgeEl.textContent = QUEUE_LABELS[queueStatus] || queueStatus.replace(/_/g, " ");
    badgeEl.style.setProperty("--badge-color", statusColor(queueStatus === "active" ? "running" : "waiting"));
  }

  const statsEl = document.getElementById(statsId);
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-grid stat-grid--branch">
        <div class="stat-card"><span class="stat-value" style="color:${prodColor}">${branch.equilibrated ?? "—"}/10</span><span class="stat-label">Equilibrated</span></div>
        <div class="stat-card"><span class="stat-value" style="color:#16a34a">${branch.production_complete}</span><span class="stat-label">Production done</span></div>
        <div class="stat-card"><span class="stat-value" style="color:#38bdf8">${branch.clustering_complete}</span><span class="stat-label">Clustered</span></div>
        <div class="stat-card"><span class="stat-value" style="color:#ef4444">${branch.blocked}</span><span class="stat-label">Blocked</span></div>
      </div>`;
  }

  const activeEl = document.getElementById(activeId);
  if (activeEl) {
    const active = branch.active_run;
    if (active) {
      activeEl.hidden = false;
      activeEl.innerHTML = `
        <div class="active-run-label">Active production</div>
        <div class="active-run-name">${active.candidate_id}</div>
        <div class="progress-track progress-track--lg">
          <div class="progress-fill" style="width:${active.production_progress}%; background:${prodColor}"></div>
        </div>
        <div class="active-run-detail">${active.production_progress.toFixed(1)}% · ${active.production_status}</div>`;
    } else {
      activeEl.hidden = true;
      activeEl.innerHTML = "";
    }
  }

  renderCandidateGrid(gridId, branch.candidates || []);
  renderBranchChart(chartId, chartKey, branch.candidates || [], prodColor);
}

function renderProduction() {
  const { md_branches, md_pipeline } = dashboardData;
  const licl = md_branches?.li_cl;
  const nacl = md_branches?.na_cl;

  if (md_pipeline) {
    document.getElementById("md-pipeline-summary").textContent = md_pipeline.summary;
    document.getElementById("licl-branch-pct").textContent = `${md_pipeline.licl_progress}%`;
    document.getElementById("nacl-branch-pct").textContent = `${md_pipeline.nacl_progress}%`;
    document.getElementById("licl-branch-bar").style.width = `${md_pipeline.licl_progress}%`;
    document.getElementById("nacl-branch-bar").style.width = `${md_pipeline.nacl_progress}%`;
  }

  if (licl) {
    renderBranchPanel(
      licl,
      "licl",
      "#22d3ee",
      "licl-queue-badge",
      "licl-branch-stats",
      "licl-active-run",
      "licl-candidate-grid",
      "licl-production-chart",
      "licl-production"
    );
  }

  if (nacl) {
    renderBranchPanel(
      nacl,
      "nacl",
      "#94a3b8",
      "nacl-queue-badge",
      "nacl-branch-stats",
      "nacl-active-run",
      "nacl-candidate-grid",
      "nacl-production-chart",
      "nacl-production"
    );
    const noteEl = document.getElementById("nacl-branch-note");
    if (noteEl) noteEl.textContent = nacl.note || "";
  }
}

function renderRemote() {
  const remoteLi = dashboardData.remote?.li_cl || dashboardData.remote || {};
  const remoteNa = dashboardData.remote?.na_cl || {};

  const runningItems = [
    ...(remoteLi.running || []).map((item) => `[LiCl] ${item}`),
    ...(remoteNa.running || []).map((item) => `[NaCl] ${item}`),
  ];
  const blockerItems = [
    ...(remoteLi.blockers || []).map((item) => `[LiCl] ${item}`),
    ...(remoteNa.blockers || []).map((item) => `[NaCl] ${item}`),
  ];

  document.getElementById("remote-running").innerHTML =
    runningItems.length > 0
      ? runningItems.map((item) => `<li>${item}</li>`).join("")
      : "<li>No active jobs reported</li>";

  document.getElementById("remote-blockers").innerHTML =
    blockerItems.length > 0
      ? blockerItems.map((item) => `<li>${item}</li>`).join("")
      : "<li>No blockers reported</li>";
}

function renderPipelineChart() {
  if (typeof Chart === "undefined") return;

  const canvas = document.getElementById("pipeline-chart");
  if (!canvas) return;

  destroyChart("pipeline");

  const liclCandidates = dashboardData.md_branches?.li_cl?.candidates || dashboardData.candidates || [];
  const states = ["complete", "running", "blocked", "queued"];
  const counts = states.map((state) => liclCandidates.filter((c) => c.state === state).length);

  charts.set(
    "pipeline",
    new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: states.map((s) => STATUS_LABELS[s] || s),
        datasets: [
          {
            data: counts,
            backgroundColor: states.map((s) => statusColor(s) + "cc"),
            borderColor: states.map((s) => statusColor(s)),
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: "#cbd5e1", boxWidth: 12 } },
        },
      },
    })
  );
}

function renderLibrary() {
  document.getElementById("library-body").innerHTML = dashboardData.candidates
    .map(
      (c) => `
      <tr>
        <td>${c.rank}</td>
        <td><strong>${c.candidate_id}</strong></td>
        <td><code>${c.sequence}</code></td>
        <td>${c.role.replace(/_/g, " ")}</td>
        <td><span class="badge badge--sm" style="--badge-color:${statusColor(c.state)}">${STATUS_LABELS[c.state] || c.state}</span></td>
        <td>${c.overall_progress}%</td>
      </tr>`
    )
    .join("");
}

function chartDefaults(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#cbd5e1" } },
    },
    ...extra,
  };
}

const PANEL_CHART_RENDERERS = {
  workstreams: () => {
    renderWorkstreamChart();
  },
  production: () => {
    renderBranchChart(
      "licl-production-chart",
      "licl-production",
      dashboardData.md_branches?.li_cl?.candidates || [],
      "#22d3ee"
    );
    renderBranchChart(
      "nacl-production-chart",
      "nacl-production",
      dashboardData.md_branches?.na_cl?.candidates || [],
      "#94a3b8"
    );
  },
  remote: () => {
    renderPipelineChart();
  },
};

function renderDashboardText() {
  renderOverview();
  renderWorkstreams();
  renderProduction();
  renderRemote();
  renderLibrary();
}

function renderPanelCharts(panelId) {
  const renderer = PANEL_CHART_RENDERERS[panelId];
  if (renderer) {
    requestAnimationFrame(() => {
      renderer();
      charts.forEach((chart) => chart.resize());
    });
  }
}

function renderDashboard() {
  destroyCharts();
  renderDashboardText();
}

window.loadAndRenderDashboard = async function loadAndRenderDashboard() {
  await loadDashboardData();
  renderDashboard();
  return dashboardData;
};

window.renderPanelCharts = renderPanelCharts;
window.assetUrl = assetUrl;

function resizeAllCharts() {
  charts.forEach((chart) => chart.resize());
}

window.resizeAllCharts = resizeAllCharts;

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resizeAllCharts, 120);
});
