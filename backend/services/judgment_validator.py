"""
judgment_validator.py — Raati v2 Slice 4
Strict Pydantic v2 contract for evaluator judgments (from spec §7.1).

No coercion: rejects "4", True, 4.5, 6, null-with-status-scored, duplicate JSON keys.
Each criterion must have evidence references that exist in the evidence list.
"""
from typing import Annotated, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, StrictInt, model_validator

DIMENSIONS = (
    "creativity",
    "originality",
    "usefulness_relevance",
    "clarity",
    "level_of_detail_elaboration",
    "feasibility",
)

DimensionName = Literal[
    "creativity", "originality", "usefulness_relevance", "clarity",
    "level_of_detail_elaboration", "feasibility",
]

# StrictInt + range: no coercion from bool, string, or float
Score = Annotated[StrictInt, Field(ge=1, le=5)]


class StrictObject(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Evidence(StrictObject):
    """A single piece of evidence referenced in this evaluation."""
    evidence_id: str
    source_type: Literal["image", "designer_text", "assignment"]
    source_id: str
    feature_or_requirement: str
    statement: Annotated[str, Field(min_length=1, max_length=400)]
    observation_type: Literal[
        "visible", "not_visible_in_view", "ambiguous", "author_claim", "requirement"
    ]


class CriterionDecision(StrictObject):
    """One criterion's judgment within an EvaluatorJudgment."""
    status: Literal["scored", "unassessable"]
    score: Score | None
    evidence_ids: Annotated[list[str], Field(max_length=4)]
    evidence_strength: Literal["limited", "adequate", "strong", "unavailable"]
    rationale: Annotated[str, Field(min_length=1, max_length=650)]
    limitation: str | None

    @model_validator(mode="after")
    def validate_decision(self) -> "CriterionDecision":
        if self.status == "scored":
            if self.score is None or not self.evidence_ids:
                raise ValueError("A scored decision requires a score and at least one evidence_id")
            if self.evidence_strength == "unavailable":
                raise ValueError("Unavailable evidence cannot support a scored decision")
        else:  # unassessable
            if self.score is not None:
                raise ValueError("Unassessable decision must have score=null")
            if not self.limitation or not self.limitation.strip():
                raise ValueError("Unassessable decision requires a specific limitation string")
        return self


class Criteria(StrictObject):
    """All six criteria for one judgment."""
    creativity: CriterionDecision
    originality: CriterionDecision
    usefulness_relevance: CriterionDecision
    clarity: CriterionDecision
    level_of_detail_elaboration: CriterionDecision
    feasibility: CriterionDecision


class Suggestion(StrictObject):
    """A concrete improvement suggestion referenced to evidence."""
    dimension: DimensionName
    evidence_ids: Annotated[list[str], Field(min_length=1, max_length=4)]
    action: Annotated[str, Field(min_length=1, max_length=300)]
    intended_benefit: Annotated[str, Field(min_length=1, max_length=300)]


class EvaluatorJudgment(StrictObject):
    """
    The complete structured output from one evaluator slot.
    Evidence IDs must be unique; criterion and suggestion references must point
    to known evidence IDs.
    """
    evidence: Annotated[list[Evidence], Field(max_length=16)]
    criteria: Criteria
    suggestions: Annotated[list[Suggestion], Field(max_length=2)]

    @model_validator(mode="after")
    def validate_references(self) -> "EvaluatorJudgment":
        ids = [e.evidence_id for e in self.evidence]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate evidence IDs in judgment")
        known = set(ids)
        for dim in DIMENSIONS:
            decision = getattr(self.criteria, dim)
            bad = set(decision.evidence_ids) - known
            if bad:
                raise ValueError(f"Criterion '{dim}' references unknown evidence ID(s): {bad}")
        for suggestion in self.suggestions:
            bad = set(suggestion.evidence_ids) - known
            if bad:
                raise ValueError(f"Suggestion references unknown evidence ID(s): {bad}")
        return self


# ─── Legacy → EvaluatorJudgment extraction ────────────────────────────────────

class ValidationResult:
    """Container for validation outcome."""
    def __init__(self, judgment: Optional[EvaluatorJudgment], errors: list[str], raw: dict):
        self.judgment = judgment
        self.errors = errors
        self.raw = raw
        self.valid = judgment is not None and not errors

    @property
    def scored_dimensions(self) -> list[str]:
        if not self.judgment:
            return []
        return [
            dim for dim in DIMENSIONS
            if getattr(self.judgment.criteria, dim).status == "scored"
        ]

    @property
    def flat_scores(self) -> dict[str, int]:
        """Extract dimension→score mapping for the score aggregator."""
        if not self.judgment:
            return {}
        result = {}
        for dim in DIMENSIONS:
            decision = getattr(self.judgment.criteria, dim)
            if decision.status == "scored" and decision.score is not None:
                result[dim] = decision.score
        return result


def validate_judgment(raw: dict, slot_id: str) -> ValidationResult:
    """
    Validate a raw parsed LLM response against the EvaluatorJudgment schema.

    Args:
        raw: The parsed JSON dict from the LLM response.
        slot_id: Identifies this slot for namespacing (not used in validation itself).

    Returns:
        ValidationResult with judgment on success, or errors on failure.
    """
    errors = []
    try:
        judgment = EvaluatorJudgment.model_validate(raw)
        return ValidationResult(judgment=judgment, errors=[], raw=raw)
    except Exception as e:
        errors.append(str(e))
        return ValidationResult(judgment=None, errors=errors, raw=raw)


def extract_flat_scores_from_legacy_result(result: dict) -> dict[str, int] | None:
    """
    Extract dimension scores from the legacy evaluator output format.
    Returns None if any score is invalid (wrong type, out of range).

    This is used by the score_aggregator when working with pre-v2 data.
    """
    from .score_aggregator import SCORE_KEY_TO_DIMENSION

    scores = {}
    for old_key, dim in SCORE_KEY_TO_DIMENSION.items():
        raw_val = result.get(old_key)
        if raw_val is None:
            return None
        # Strict type check
        if type(raw_val) is not int or not (1 <= raw_val <= 5):
            return None
        scores[dim] = raw_val

    if len(scores) != 6:
        return None
    return scores


# ─── JSON schema for structured outputs ────────────────────────────────────────

def get_judgment_json_schema() -> dict:
    """
    Return the JSON Schema for EvaluatorJudgment, suitable for use with
    provider structured-output APIs.
    """
    return EvaluatorJudgment.model_json_schema()
