# LiSPER Progress Dashboard

Single-page progress reporting dashboard for the [LiSPER](../LiSPER) project. Uses the interactive solution-field background from the original prototype, GSAP horizontal panel transitions, and Chart.js charts fed from repository TSV/MD files.

## Quick start

```bash
# 1. Extract latest metrics from the LiSPER repo
python3 scripts/extract_dashboard_data.py

# 2. Serve locally (any static server)
python3 -m http.server 8080
# Open http://localhost:8080
```

## Refresh data

Re-run the extractor whenever LiSPER remote runs or summaries change:

```bash
python3 scripts/extract_dashboard_data.py
# Optional custom paths:
python3 scripts/extract_dashboard_data.py --lisper-root /path/to/LiSPER --out data/dashboard.json
```

## Navigation

The dashboard is a **single page** with five full-viewport sections (no page reloads):

| Section | Content |
|---|---|
| Overview | Program snapshot, phase progress bars |
| Workstreams | Eight repository workstreams + bar chart |
| LiCl MD | Per-candidate production/clustering cards and chart |
| Remote ops | AutoDL monitor status, blockers, queue donut |
| Library | Full candidate sequence table |

Navigate with **arrow keys**, **footer dots**, **←/→ buttons**, or **horizontal swipe** on touch devices.

## Data sources

The extractor reads from `../LiSPER` by default:

- `01_computational_discovery/sequences/candidates.tsv`
- `01_computational_discovery/md/li_cl/remote_runs/*.tsv`
- `01_computational_discovery/md/li_cl/remote_runs/current_production_snapshot.md`
- `01_computational_discovery/md/li_cl/remote_runs/remote_status.md`
- `01_computational_discovery/md/na_cl/remote_runs/equilibration_summary.tsv`

Output: `data/dashboard.json`

## Structure

```text
LiSPER-Dashboard/
├── index.html
├── css/styles.css
├── js/
│   ├── main.js              # Boot + cursor glow
│   ├── solution-field.js    # Interactive background canvas
│   ├── dashboard.js         # Charts and panel rendering
│   └── navigation.js        # GSAP horizontal panels
├── data/dashboard.json      # Generated metrics
└── scripts/
    └── extract_dashboard_data.py
```
