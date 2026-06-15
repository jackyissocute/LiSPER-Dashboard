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
  preparing: "Preparing",
  concept: "Concept",
};

let dashboardData = null;
let charts = [];

function statusColor(status) {
  return dashboardData?.status_colors?.[status] || "#94a3b8";
}

async function loadDashboardData() {
  const response = await fetch("data/dashboard.json");
  if (!response.ok) throw new Error(`Failed to load dashboard data (${response.status})`);
  dashboardData = await response.json();
  return dashboardData;
}

function destroyCharts() {
  charts.forEach((chart) => chart.destroy());
  charts = [];
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
  document.getElementById("remote-checked").textContent = remote.last_checked || "—";

  const stats = [
    { label: "Candidates", value: summary.total_candidates, accent: "#22d3ee" },
    { label: "Production done", value: summary.production_complete, accent: "#16a34a" },
    { label: "Clustered", value: summary.clustering_complete, accent: "#38bdf8" },
    { label: "Blocked", value: summary.blocked, accent: "#ef4444" },
  ];

  const statsEl = document.getElementById("overview-stats");
  statsEl.innerHTML = stats
    .map(
      (s) => `
      <div class="stat-card">
        <span class="stat-value" style="color:${s.accent}">${s.value}</span>
        <span class="stat-label">${s.label}</span>
      </div>`
    )
    .join("");

  const phasesEl = document.getElementById("phase-progress-list");
  phasesEl.innerHTML = dashboardData.phases
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
  const list = document.getElementById("workstream-list");
  list.innerHTML = dashboardData.workstreams
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

  const ctx = document.getElementById("workstream-chart");
  charts.push(
    new Chart(ctx, {
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

function renderProduction() {
  const { candidates, equilibration, summary } = dashboardData;

  document.getElementById("equil-li").textContent = `${equilibration.li_cl}/10`;
  document.getElementById("equil-na").textContent = `${equilibration.na_cl}/10`;

  const active = summary.active_run;
  const activeEl = document.getElementById("active-run-card");
  if (active) {
    activeEl.hidden = false;
    activeEl.innerHTML = `
      <div class="active-run-label">Active LiCl production</div>
      <div class="active-run-name">${active.candidate_id}</div>
      <div class="progress-track progress-track--lg">
        <div class="progress-fill" style="width:${active.production_progress}%; background:#22d3ee"></div>
      </div>
      <div class="active-run-detail">${active.production_progress.toFixed(1)}% · ${active.production_status}</div>`;
  } else {
    activeEl.hidden = true;
  }

  const grid = document.getElementById("candidate-grid");
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

  const ctx = document.getElementById("production-chart");
  charts.push(
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: candidates.map((c) => c.candidate_id),
        datasets: [
          {
            label: "Production %",
            data: candidates.map((c) => c.production_progress),
            backgroundColor: "rgba(34,211,238,0.65)",
            borderColor: "#22d3ee",
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
          x: { ticks: { color: "#cbd5e1", maxRotation: 45 }, grid: { display: false } },
          y: { max: 100, ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.12)" } },
        },
      }),
    })
  );
}

function renderRemote() {
  const { remote } = dashboardData;

  const runningEl = document.getElementById("remote-running");
  runningEl.innerHTML =
    remote.running?.length > 0
      ? remote.running.map((item) => `<li>${item}</li>`).join("")
      : "<li>No active jobs reported</li>";

  const blockersEl = document.getElementById("remote-blockers");
  blockersEl.innerHTML =
    remote.blockers?.length > 0
      ? remote.blockers.map((item) => `<li>${item}</li>`).join("")
      : "<li>No blockers reported</li>";

  const ctx = document.getElementById("pipeline-chart");
  const states = ["complete", "running", "blocked", "queued"];
  const counts = states.map((state) => dashboardData.candidates.filter((c) => c.state === state).length);

  charts.push(
    new Chart(ctx, {
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
  const tbody = document.getElementById("library-body");
  tbody.innerHTML = dashboardData.candidates
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

function renderDashboard() {
  destroyCharts();
  renderOverview();
  renderWorkstreams();
  renderProduction();
  renderRemote();
  renderLibrary();
}

window.loadAndRenderDashboard = async function loadAndRenderDashboard() {
  await loadDashboardData();
  renderDashboard();
  return dashboardData;
};
