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

### Automatic (recommended — no local server)

The dashboard is static files on GitHub Pages. Data refresh runs **in the cloud** via GitHub Actions:

1. Check out this repo and your **LiSPER** repo
2. Run `scripts/extract_dashboard_data.py`
3. Commit `data/dashboard.json` if it changed
4. GitHub Pages serves the updated site automatically

**One-time setup** (LiSPER-Dashboard repo → Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `LISPER_ACCESS_TOKEN` | Fine-grained PAT with **read** access to `jackyissocute/LiSPER` |

Create a token at GitHub → Settings → Developer settings → Fine-grained tokens. Scope it to the LiSPER repo, contents: read-only.

The workflow runs **every hour** (`cron: 0 * * * *` UTC) and can also be triggered manually from the Actions tab.

If you make LiSPER **public**, you can remove the `token:` line from the checkout step in `refresh-dashboard-data.yml` — no secret needed for read access.

### Manual (local)

```bash
python3 scripts/extract_dashboard_data.py
git add data/dashboard.json && git commit -m "chore: refresh dashboard data" && git push
```

You do **not** need a local web server to inspect changes — push and check https://jackyissocute.github.io/LiSPER-Dashboard/

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
