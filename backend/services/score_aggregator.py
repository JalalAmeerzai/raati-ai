"""
score_aggregator.py — Raati v2 Slice 1
Server-side deterministic score aggregation.

All arithmetic is a backend responsibility.
The LLM synthesis layer must never compute or return score fields.
This module is the single source of truth for all numeric values
shown in the API, radar charts, and exports.
"""
from decimal import Decimal, ROUND_HALF_UP
from fractions import Fraction
from statistics import median
from typing import Any

DIMENSIONS = (
    "creativity",
    "originality",
    "usefulness_relevance",
    "clarity",
    "level_of_detail_elaboration",
    "feasibility",
)

# Mapping from the old flat JSON keys in expert_panel results
# to the canonical dimension names used by the aggregator.
SCORE_KEY_TO_DIMENSION = {
    "creativity_score": "creativity",
    "originality_score": "originality",
    "usefulness_relevance_score": "usefulness_relevance",
    "clarity_score": "clarity",
    "level_of_detail_elaboration_score": "level_of_detail_elaboration",
    "feasibility_score": "feasibility",
}

AGGREGATION_VERSION = "equal-mean-v2"


def format_fraction(value: Fraction, places: int) -> str:
    """
    Convert a Fraction to a display string with ROUND_HALF_UP rounding.
    e.g. format_fraction(Fraction(39, 9), 1) == "4.3"
         format_fraction(Fraction(185, 54), 2) == "3.43"
    """
    quantum = Decimal(1).scaleb(-places)
    number = Decimal(value.numerator) / Decimal(value.denominator)
    return str(number.quantize(quantum, rounding=ROUND_HALF_UP))


def aggregate_complete_panel(rows: list[dict[str, Any]], expected_conditions: list[str]) -> dict:
    """
    Aggregate a complete 9-slot panel into a deterministic scorecard.

    Each row must be:
      {
        "condition_id": "<slot identifier, e.g. 'openai_design_creativity'>",
        "scores": {
          "creativity": <int 1-5>,
          "originality": <int 1-5>,
          ...   (all 6 dimensions required)
        }
      }

    Args:
        rows: List of 9 accepted judgment score rows.
        expected_conditions: The 9 slot IDs that constitute a complete panel.

    Returns:
        A scorecard dict with per-criterion statistics and an overall aggregate.

    Raises:
        ValueError: On any structural or data integrity problem — caller handles
                    partial/incomplete panels separately.
    """
    expected = set(expected_conditions)
    if len(expected) != 9:
        raise ValueError(
            f"A complete panel requires exactly 9 distinct configured slots; "
            f"got {len(expected)} unique expected conditions"
        )
    if len(rows) != 9:
        raise ValueError(
            f"A complete panel requires exactly 9 score rows; got {len(rows)}"
        )

    by_condition: dict[str, dict[str, int]] = {}
    for row in rows:
        condition = row["condition_id"]
        scores = row["scores"]

        if condition in by_condition:
            raise ValueError(f"Duplicate condition_id: {condition!r}")
        if condition not in expected:
            raise ValueError(f"Unexpected condition_id: {condition!r}")

        if set(scores.keys()) != set(DIMENSIONS):
            missing = set(DIMENSIONS) - set(scores.keys())
            extra = set(scores.keys()) - set(DIMENSIONS)
            raise ValueError(
                f"Slot {condition!r}: exactly six criteria required. "
                f"Missing: {missing}, Extra: {extra}"
            )

        for dim, val in scores.items():
            # Strict integer check — no coercion of booleans, strings or floats.
            if type(val) is not int or not (1 <= val <= 5):
                raise ValueError(
                    f"Slot {condition!r}, dimension {dim!r}: "
                    f"score must be an integer 1–5; got {val!r} (type={type(val).__name__})"
                )

        by_condition[condition] = scores

    if set(by_condition.keys()) != expected:
        missing_slots = expected - set(by_condition.keys())
        raise ValueError(f"Missing configured condition(s): {missing_slots}")

    # Per-dimension aggregation
    criteria: dict[str, dict] = {}
    for dimension in DIMENSIONS:
        values = [by_condition[slot][dimension] for slot in sorted(expected)]
        total = sum(values)
        count = len(values)  # always 9 for a complete panel
        mean = Fraction(total, count)
        sample_var = (
            sum((Fraction(v) - mean) ** 2 for v in values) / (count - 1)
        )
        criteria[dimension] = {
            "sum": total,
            "count": count,
            "mean": float(mean),
            "display": format_fraction(mean, 1),
            "median": float(median(values)),
            "min": min(values),
            "max": max(values),
            "sample_variance": float(sample_var),
        }

    # Overall composite = mean of all 54 raw scores (not mean-of-means)
    total_all = sum(d["sum"] for d in criteria.values())
    count_all = sum(d["count"] for d in criteria.values())  # 54 for a complete panel
    overall = Fraction(total_all, count_all)

    return {
        "aggregation_version": AGGREGATION_VERSION,
        "criteria": criteria,
        "overall": {
            "sum": total_all,
            "count": count_all,
            "mean": float(overall),
            "display": format_fraction(overall, 2),
        },
    }


def extract_rows_from_expert_panel(expert_panel: list[dict]) -> tuple[list[dict], list[str]]:
    """
    Convert the existing expert_panel format (list of 9 provider+persona+result dicts)
    into the normalized (rows, expected_conditions) format accepted by aggregate_complete_panel.

    Condition IDs are formed as "<provider>_<persona_id>" for deterministic ordering.

    Returns:
        (rows, condition_ids) — both lists have the same length (up to 9).
        Invalid/failed entries are excluded; the caller decides if the panel is complete.
    """
    rows = []
    condition_ids = []

    for entry in expert_panel:
        provider = entry.get("model_provider", "unknown").lower().replace(" ", "_")
        persona = entry.get("persona") or {}
        persona_id = persona.get("persona_id", "unknown")
        condition_id = f"{provider}_{persona_id}"

        result = entry.get("result")
        if not result:
            continue  # skip failed/error entries

        scores: dict[str, int] = {}
        valid = True
        for old_key, dim in SCORE_KEY_TO_DIMENSION.items():
            raw = result.get(old_key)
            if raw is None:
                valid = False
                break
            # Strict integer check — reject booleans, floats, strings
            if type(raw) is not int or not (1 <= raw <= 5):
                valid = False
                break
            scores[dim] = raw

        if valid and len(scores) == 6:
            rows.append({"condition_id": condition_id, "scores": scores})
            condition_ids.append(condition_id)

    return rows, condition_ids


def build_scorecard_from_expert_panel(expert_panel: list[dict]) -> dict | None:
    """
    High-level convenience: extract rows from expert_panel and aggregate if complete.
    Returns the scorecard dict on success, or None for incomplete/invalid panels.

    This is the primary entry point called by storage.py and report_service.py.
    """
    rows, condition_ids = extract_rows_from_expert_panel(expert_panel)

    if len(rows) != 9:
        return None  # partial panel — caller handles separately

    try:
        return aggregate_complete_panel(rows, condition_ids)
    except ValueError:
        return None


def scorecard_to_flat_fields(scorecard: dict) -> dict:
    """
    Compatibility serializer: maps the v2 scorecard back to the v1 flat field names
    so existing frontend components keep working without modification.

    Returns a dict with keys like `creativity_score`, `overall_score`, etc.
    Only scores (display values as floats) are emitted here; reasoning fields
    remain in the narrative layer.
    """
    flat: dict[str, Any] = {}
    for dimension, stats in scorecard.get("criteria", {}).items():
        # Old key format: "creativity_score", "originality_score", etc.
        old_key = f"{dimension}_score"
        flat[old_key] = float(stats["display"])  # already ROUND_HALF_UP string → float

    overall = scorecard.get("overall", {})
    if overall:
        flat["overall_score"] = float(overall["display"])

    return flat
