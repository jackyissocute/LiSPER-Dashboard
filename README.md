# LiSPER Progress Dashboard

Investor-facing static progress monitor for the [LiSPER](../LiSPER) project.

This rebuild keeps the original animated chemical-solution background and replaces the failed automatic dashboard pipeline with a clean three-page reporting site:

| Page | Purpose |
|---|---|
| Process metrics | Task-focused view of computational discovery, validation, and Bio-DLE translation milestones. |
| Protein metrics | Candidate-by-candidate status for the 10-peptide first-round library. |
| Time horizon | Planning estimate for LiCl, NaCl, PMF, ΔG, and first ΔΔG selectivity output. |

## Quick Start

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Current Design Choice

The dashboard is intentionally static for now. Status values should be updated from the main LiSPER README/status logs after each meaningful remote-computing transition. This keeps the public-facing site stable while the research workflow is still changing.

## Structure

```text
LiSPER-Dashboard/
├── index.html
├── css/styles.css
├── js/
│   ├── main.js              # Three-page navigation
│   └── solution-field.js    # Preserved animated background
└── assets/                  # LiSPER visual identity assets
```
