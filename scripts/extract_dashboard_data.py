#!/usr/bin/env python3
"""Extract LiSPER project metrics into dashboard.json for the progress dashboard."""

from __future__ import annotations

import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DASHBOARD_ROOT = SCRIPT_DIR.parent
DEFAULT_LISPER_ROOT = DASHBOARD_ROOT.parent / "LiSPER"

WORKSTREAMS = [
    {"id": "design", "label": "Candidate design", "status": "complete", "progress": 100},
    {"id": "esmfold", "label": "ESMFold structures", "status": "complete", "progress": 100},
    {"id": "charmm", "label": "CHARMM-GUI systems", "status": "complete", "progress": 100},
    {"id": "equil", "label": "GROMACS equilibration", "status": "complete", "progress": 100},
    {"id": "prod", "label": "Production MD + clustering", "status": "active", "progress": None},
    {"id": "pmf", "label": "Umbrella sampling + PMF", "status": "planned", "progress": 0},
    {"id": "wetlab", "label": "Wet-lab validation", "status": "preparing", "progress": 20},
    {"id": "biodle", "label": "Bio-DLE translation", "status": "concept", "progress": 10},
]

PHASES = [
    {"id": "discovery", "label": "Computational discovery", "progress": 80, "status": "active"},
    {"id": "validation", "label": "Experimental validation", "progress": 20, "status": "preparing"},
    {"id": "translation", "label": "Industrial translation", "progress": 10, "status": "concept"},
]

STATUS_COLORS = {
    "complete": "#16a34a",
    "clustered": "#16a34a",
    "running": "#22d3ee",
    "produced": "#f59e0b",
    "blocked": "#ef4444",
    "failed": "#ef4444",
    "waiting": "#94a3b8",
    "planned": "#64748b",
    "preparing": "#a855f7",
    "concept": "#64748b",
    "equilibrated": "#38bdf8",
}


def read_tsv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def parse_remote_status(path: Path) -> dict:
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    last_checked = ""
    match = re.search(r"Last checked:\s*(.+)", text)
    if match:
        last_checked = match.group(1).strip()

    running: list[str] = []
    blockers: list[str] = []
    section = None
    for line in text.splitlines():
        stripped = line.strip()
        if stripped == "Running:":
            section = "running"
            continue
        if stripped == "Current blockers:":
            section = "blockers"
            continue
        if stripped.startswith("Latest synced"):
            section = None
            continue
        if section == "running" and stripped.startswith("- "):
            running.append(stripped[2:])
        if section == "blockers" and stripped.startswith("- "):
            blockers.append(stripped[2:])

    return {"last_checked": last_checked, "running": running, "blockers": blockers}


def parse_production_snapshot_md(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    rows: dict[str, dict] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|") or "---" in line or "Candidate" in line:
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 6:
            continue
        candidate, stage, status = cells[0], cells[1], cells[2]
        if candidate in {"NaCl queue", "---"}:
            continue
        progress_raw = cells[5] if len(cells) > 5 else ""
        progress = None
        if progress_raw.endswith("%"):
            try:
                progress = float(progress_raw.replace("%", ""))
            except ValueError:
                progress = None
        key = f"{candidate}:{stage}"
        rows[key] = {
            "candidate_id": candidate,
            "stage": stage,
            "status": status,
            "progress_percent": progress,
            "last_step": cells[3] if len(cells) > 3 else "",
            "time_ps": cells[4] if len(cells) > 4 else "",
        }
    return rows


def classify_candidate(
    candidate_id: str,
    prod_rows: dict[str, str],
    repair_rows: dict[str, str],
    snapshot_rows: dict[str, dict],
) -> dict:
    prod = prod_rows.get(candidate_id, {})
    repair = repair_rows.get(candidate_id)
    snap_prod = snapshot_rows.get(f"{candidate_id}:production_20ns", {})
    snap_cluster = snapshot_rows.get(f"{candidate_id}:clustering_20ns_repair", {})

    production_status = prod.get("production_status", "")
    cluster_status = prod.get("cluster_status", "")

    if snap_prod.get("status") == "complete":
        prod_progress = 100.0
        state = "complete"
    elif snap_prod.get("status", "").startswith("running"):
        prod_progress = snap_prod.get("progress_percent") or 0.0
        state = "running"
    elif snap_prod.get("status", "").startswith("blocked"):
        prod_progress = 0.0
        state = "blocked"
    elif production_status == "produced":
        prod_progress = 100.0
        state = "produced"
    elif production_status == "grompp_failed":
        prod_progress = 0.0
        state = "blocked"
    else:
        prod_progress = 0.0
        state = "queued"

    if repair or snap_cluster.get("status") == "complete" or cluster_status == "clustered":
        cluster_state = "clustered"
        cluster_progress = 100.0
    elif cluster_status == "trjconv_failed":
        cluster_state = "repair_needed"
        cluster_progress = 50.0
    elif production_status == "grompp_failed":
        cluster_state = "blocked"
        cluster_progress = 0.0
    else:
        cluster_state = "pending"
        cluster_progress = 0.0

    overall = round((prod_progress * 0.7 + cluster_progress * 0.3), 1)

    top_cluster = prod.get("top_cluster_population_percent", "")
    try:
        top_cluster_pct = float(top_cluster) if top_cluster else None
    except ValueError:
        top_cluster_pct = None

    return {
        "candidate_id": candidate_id,
        "production_status": production_status or snap_prod.get("status", "not_started"),
        "cluster_status": cluster_status or cluster_state,
        "state": state,
        "production_progress": prod_progress,
        "cluster_progress": cluster_progress,
        "overall_progress": overall,
        "top_cluster_population_percent": top_cluster_pct,
        "ns_per_day": _float_or_none(prod.get("production_ns_per_day")),
        "finished_at": prod.get("production_finished_at", ""),
        "repaired": repair is not None,
    }


def _float_or_none(value: str) -> float | None:
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def compute_production_workstream(candidates: list[dict]) -> int:
    if not candidates:
        return 0
    return round(sum(c["overall_progress"] for c in candidates) / len(candidates))


def parse_nacl_queue_summary(remote_text: str) -> str:
    if "waiting for LiCl" in remote_text or "has not started production" in remote_text:
        return "waiting_for_licl"
    if "production/clustering queue is active" in remote_text.lower():
        return "active"
    return "preparing"


def build_branch_candidates(
    candidate_rows: list[dict[str, str]],
    prod_by_id: dict[str, str],
    repair_by_id: dict[str, str],
    snapshot_rows: dict[str, dict],
    *,
    default_state: str = "queued",
) -> list[dict]:
    metrics = [
        classify_candidate(row["candidate_id"], prod_by_id, repair_by_id, snapshot_rows)
        for row in candidate_rows
        if row.get("candidate_id")
    ]
    if not prod_by_id and default_state == "waiting":
        metrics = []
        for row in candidate_rows:
            if not row.get("candidate_id"):
                continue
            metrics.append(
                {
                    "candidate_id": row["candidate_id"],
                    "production_status": "not_started",
                    "cluster_status": "pending",
                    "state": "waiting",
                    "production_progress": 0.0,
                    "cluster_progress": 0.0,
                    "overall_progress": 0.0,
                    "top_cluster_population_percent": None,
                    "ns_per_day": None,
                    "finished_at": "",
                    "repaired": False,
                }
            )
    return metrics


def build_branch_summary(branch_id: str, label: str, ion: str, candidates: list[dict], **extra) -> dict:
    running = [c for c in candidates if c["state"] == "running"]
    return {
        "id": branch_id,
        "label": label,
        "ion": ion,
        "total_candidates": len(candidates),
        "production_complete": sum(1 for c in candidates if c["production_progress"] >= 100),
        "clustering_complete": sum(1 for c in candidates if c["cluster_progress"] >= 100),
        "blocked": sum(1 for c in candidates if c["state"] == "blocked"),
        "running_count": len(running),
        "active_run": running[0] if running else None,
        "branch_progress": round(
            sum(c["overall_progress"] for c in candidates) / len(candidates), 1
        )
        if candidates
        else 0,
        "candidates": candidates,
        **extra,
    }


def build_payload(lisper_root: Path) -> dict:
    md_root = lisper_root / "01_computational_discovery" / "md"
    li_runs = md_root / "li_cl" / "remote_runs"
    na_runs = md_root / "na_cl" / "remote_runs"

    candidates = read_tsv(lisper_root / "01_computational_discovery" / "sequences" / "candidates.tsv")
    prod_tsv = read_tsv(li_runs / "production_clustering_summary.tsv")
    repair_tsv = read_tsv(li_runs / "clustering_repair_summary.tsv")
    eq_li = read_tsv(li_runs / "equilibration_summary.tsv")
    eq_na = read_tsv(na_runs / "equilibration_summary.tsv")

    prod_by_id = {row["candidate_id"]: row for row in prod_tsv if row.get("candidate_id")}
    repair_by_id = {row["candidate_id"]: row for row in repair_tsv if row.get("candidate_id")}
    snapshot_rows = parse_production_snapshot_md(li_runs / "current_production_snapshot.md")
    remote_li = parse_remote_status(li_runs / "remote_status.md")

    na_remote_path = na_runs / "remote_status.md"
    na_remote_text = na_remote_path.read_text(encoding="utf-8") if na_remote_path.exists() else ""
    remote_na = parse_remote_status(na_remote_path)

    licl_candidates = build_branch_candidates(candidates, prod_by_id, repair_by_id, snapshot_rows)
    nacl_candidates = build_branch_candidates(
        candidates, {}, {}, {}, default_state="waiting"
    )

    licl_branch = build_branch_summary(
        "li_cl",
        "LiCl branch (Li⁺)",
        "Li⁺",
        licl_candidates,
        equilibrated=sum(1 for r in eq_li if r.get("status") == "equilibrated"),
        queue_status="active",
        last_checked=remote_li.get("last_checked", ""),
        note="20 ns production MD + GROMOS clustering per candidate.",
    )
    nacl_branch = build_branch_summary(
        "na_cl",
        "NaCl branch (Na⁺)",
        "Na⁺",
        nacl_candidates,
        equilibrated=sum(1 for r in eq_na if r.get("status") == "equilibrated"),
        queue_status=parse_nacl_queue_summary(na_remote_text),
        last_checked=remote_na.get("last_checked", ""),
        note="Queued after LiCl; shared production/clustering script with NaCl workdir.",
    )

    candidate_metrics = licl_candidates
    prod_ws_progress = round(
        (licl_branch["branch_progress"] + nacl_branch["branch_progress"]) / 2
    )
    workstreams = []
    for ws in WORKSTREAMS:
        item = dict(ws)
        if item["id"] == "prod":
            item["progress"] = prod_ws_progress
        workstreams.append(item)

    equil_counts = {
        "li_cl": sum(1 for r in eq_li if r.get("status") == "equilibrated"),
        "na_cl": sum(1 for r in eq_na if r.get("status") == "equilibrated"),
    }

    completed_prod = sum(1 for c in candidate_metrics if c["production_progress"] >= 100)
    clustered = sum(1 for c in candidate_metrics if c["cluster_progress"] >= 100)
    blocked = sum(1 for c in candidate_metrics if c["state"] == "blocked")
    running = [c for c in candidate_metrics if c["state"] == "running"]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "lisper_root": str(lisper_root),
        "project": {
            "name": "LiSPER",
            "tagline": "Lithium-Selective Peptide Engineering and Recovery",
            "phase_focus": "Active computational discovery — parallel LiCl and NaCl production MD, then PMF",
        },
        "phases": PHASES,
        "workstreams": workstreams,
        "equilibration": equil_counts,
        "md_branches": {
            "li_cl": licl_branch,
            "na_cl": nacl_branch,
        },
        "md_pipeline": {
            "summary": (
                f"LiCl {licl_branch['production_complete']}/{licl_branch['total_candidates']} production complete · "
                f"NaCl {nacl_branch['equilibrated']}/{nacl_branch['total_candidates']} equilibrated, "
                f"production {nacl_branch['queue_status'].replace('_', ' ')}"
            ),
            "licl_progress": licl_branch["branch_progress"],
            "nacl_progress": nacl_branch["branch_progress"],
        },
        "candidates": [
            {
                **metric,
                **{
                    k: row.get(k, "")
                    for k in ("rank", "sequence", "role", "main_design_logic", "recommended_start")
                },
            }
            for metric, row in zip(candidate_metrics, candidates, strict=False)
        ],
        "summary": {
            "total_candidates": len(candidate_metrics),
            "production_complete": completed_prod,
            "clustering_complete": clustered,
            "blocked": blocked,
            "running_count": len(running),
            "active_run": running[0] if running else None,
        },
        "remote": {
            "li_cl": remote_li,
            "na_cl": remote_na,
        },
        "status_colors": STATUS_COLORS,
    }


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Extract LiSPER metrics for the progress dashboard.")
    parser.add_argument(
        "--lisper-root",
        type=Path,
        default=DEFAULT_LISPER_ROOT,
        help="Path to the LiSPER repository",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DASHBOARD_ROOT / "data" / "dashboard.json",
        help="Output JSON path",
    )
    args = parser.parse_args()

    payload = build_payload(args.lisper_root.resolve())
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    bundle_path = args.out.with_name("dashboard.bundle.js")
    bundle_path.write_text(
        "window.__DASHBOARD_DATA__ = " + json.dumps(payload, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {args.out} ({payload['summary']['total_candidates']} candidates)")
    print(f"Wrote {bundle_path}")


if __name__ == "__main__":
    main()
