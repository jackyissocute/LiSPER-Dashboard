# AGENTS.md

## Cursor Cloud specific instructions

LiSPER-Dashboard is a zero-dependency static site (HTML/CSS/vanilla JS). There is nothing to install, build, lint, or test.

- Run locally with the command in `README.md` ("Local Preview"): `python3 -m http.server 8080`, then open `http://localhost:8080`.
- All dashboard data is hardcoded in `index.html`; there is no backend, API, or runtime data loader. Edit the markup directly to change displayed values.
- Tab navigation (`Process metrics` / `Protein metrics` / `Time horizon`) is handled client-side in `js/main.js` via hash routing.
- Deploys to GitHub Pages from `main`; no build/CI step converts sources.
