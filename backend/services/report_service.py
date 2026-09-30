"""
report_service.py — Raati v2 Slice 6
Provides immutable report retrieval, v1 backward-compatibility serialization,
and CSV/JSON exports.

Adheres to spec §11.3, §11.4, and §11.5.
"""
import io
import csv
import json
import logging
from typing import Optional

try:
    from database import get_db
except ImportError:
    from ..database import get_db

logger = logging.getLogger(__name__)


async def get_evaluation_report(run_id: str) -> Optional[dict]:
    """
    Fetches the persisted run, scorecard, narrative, review, and accepted judgments.
    Returns a unified dict with both v2 structured fields and v1 flat fields.
    """
    async with get_db() as db:
        # 1. Fetch Run Record
        async with db.execute("SELECT * FROM evaluation_runs WHERE run_id = ?", (run_id,)) as cur:
            run_row = await cur.fetchone()
            if not run_row:
                return None
            run = dict(run_row)

        # 2. Fetch Scorecard Aggregate
        scorecard = None
        async with db.execute("SELECT * FROM aggregate_versions WHERE run_id = ?", (run_id,)) as cur:
            agg_row = await cur.fetchone()
            if agg_row and agg_row["scorecard_json"]:
                try:
                    scorecard = json.loads(agg_row["scorecard_json"])
                except Exception:
                    pass

        # 3. Fetch Narrative Report
        narrative = None
        report_row = None
        async with db.execute("SELECT * FROM report_versions WHERE run_id = ?", (run_id,)) as cur:
            report_row = await cur.fetchone()
            if report_row and report_row["narrative_json"]:
                try:
                    narrative = json.loads(report_row["narrative_json"])
                except Exception:
                    pass

        # 4. Fetch Evidence Review
        review = None
        async with db.execute("SELECT * FROM evidence_reviews WHERE run_id = ?", (run_id,)) as cur:
            rev_row = await cur.fetchone()
            if rev_row and rev_row["review_result_json"]:
                try:
                    review = json.loads(rev_row["review_result_json"])
                except Exception:
                    pass

        # 5. Fetch Accepted Judgments (expert_panel)
        expert_panel = []
        async with db.execute(
            "SELECT * FROM accepted_judgments WHERE run_id = ? ORDER BY slot_id", (run_id,)
        ) as cur:
            async for j_row in cur:
                try:
                    j_dict = json.loads(j_row["judgment_json"])
                    expert_panel.append({
                        "slot_id": j_row["slot_id"],
                        "model_provider": j_row["provider"],
                        "persona": {"persona_id": j_row["persona_id"], "name": j_row["persona_id"]},
                        "judgment": j_dict,
                        "result": {
                            "creativity_score": j_row["creativity_score"],
                            "originality_score": j_row["originality_score"],
                            "usefulness_relevance_score": j_row["usefulness_relevance_score"],
                            "clarity_score": j_row["clarity_score"],
                            "level_of_detail_elaboration_score": j_row["level_of_detail_elaboration_score"],
                            "feasibility_score": j_row["feasibility_score"],
                            "instructor_feedback": j_dict.get("criteria", {}).get("creativity", {}).get("rationale", ""),
                        }
                    })
                except Exception:
                    pass

    # Extract flat scores from scorecard for v1 compatibility
    from .score_aggregator import scorecard_to_flat_fields
    flat_scores = scorecard_to_flat_fields(scorecard) if scorecard else {}

    # Map narrative to v1 feedback fields
    intro = ""
    pivot = ""
    next_step = ""
    if narrative:
        intro = narrative.get("summary", "")
        priorities = narrative.get("priorities", [])
        if priorities:
            p = priorities[0]
            pivot = f"Focus on {p.get('feature')}: {p.get('action')} to achieve {p.get('intended_benefit')}."
        next_step = narrative.get("next_step") or ""

    return {
        "run_id": run["run_id"],
        "assignment_id": run.get("assignment_id"),
        "submission_id": run.get("submission_id"),
        "pipeline_version": run.get("pipeline_version", "design-assessment-v2"),
        "execution_status": run.get("execution_status"),
        "completeness": run.get("completeness"),
        "disposition": run.get("disposition"),
        "n_valid_judgments": run.get("n_valid_judgments", 0),
        "created_at": run.get("created_at"),
        "completed_at": run.get("completed_at"),
        # v2 models
        "scorecard": scorecard,
        "narrative": narrative,
        "narrative_status": report_row["narrative_status"] if report_row else "none",
        "evidence_review": review,
        "expert_panel": expert_panel,
        # v1 compatibility fields
        **flat_scores,
        "instructor_feedback_intro": intro,
        "instructor_feedback_pivot": pivot,
        "instructor_feedback_next_step": next_step,
    }


def export_report_to_csv(report: dict) -> str:
    """Export the report scores and metadata as a CSV string."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Field", "Value"])
    writer.writerow(["Run ID", report.get("run_id", "")])
    writer.writerow(["Assignment ID", report.get("assignment_id", "")])
    writer.writerow(["Pipeline Version", report.get("pipeline_version", "")])
    writer.writerow(["Completeness", report.get("completeness", "")])
    writer.writerow(["Disposition", report.get("disposition", "")])
    writer.writerow(["Overall Score", report.get("overall_score", "")])

    scorecard = report.get("scorecard") or {}
    criteria = scorecard.get("criteria") or {}
    for dim, data in criteria.items():
        writer.writerow([f"Score: {dim}", data.get("display_value", "")])
        writer.writerow([f"Mean: {dim}", data.get("mean", "")])
        writer.writerow([f"Median: {dim}", data.get("median", "")])
        writer.writerow([f"Count: {dim}", data.get("count", "")])

    narrative = report.get("narrative") or {}
    writer.writerow(["Narrative Summary", narrative.get("summary", "")])
    writer.writerow(["Narrative Next Step", narrative.get("next_step", "")])

    return output.getvalue()
