"""
test_judgment_validator.py — Raati v2 Slice 4 tests

Tests for EvaluatorJudgment Pydantic v2 strict contract (§7.1 and §13):
- Rejects boolean, string, float, and out-of-range scores (no coercion).
- Requires all six criteria.
- Validates evidence references (no unknown IDs, no duplicate evidence IDs).
- Validates unassessable vs scored rules.
- Rejects extra fields (extra="forbid").
- Verifies validate_judgment helper.
- Verifies extract_flat_scores_from_legacy_result helper.
"""
import sys
from pathlib import Path

# Allow import without installing package
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from pydantic import ValidationError
from services.judgment_validator import (
    EvaluatorJudgment,
    Criteria,
    CriterionDecision,
    Evidence,
    Suggestion,
    validate_judgment,
    extract_flat_scores_from_legacy_result,
    DIMENSIONS,
)


def make_valid_decision(score=4, ev_id="E1"):
    return {
        "status": "scored",
        "score": score,
        "evidence_ids": [ev_id],
        "evidence_strength": "adequate",
        "rationale": "Clear support for the intended posture.",
        "limitation": None,
    }


def make_unassessable_decision(limitation="Image resolution does not reveal joint construction."):
    return {
        "status": "unassessable",
        "score": None,
        "evidence_ids": [],
        "evidence_strength": "unavailable",
        "rationale": "Cannot be assessed from available view.",
        "limitation": limitation,
    }


def make_valid_judgment_dict():
    return {
        "evidence": [
            {
                "evidence_id": "E1",
                "source_type": "image",
                "source_id": "img-0",
                "feature_or_requirement": "cantilever backrest",
                "statement": "The curved tubular backrest connects directly to the rear base.",
                "observation_type": "visible",
            },
            {
                "evidence_id": "E2",
                "source_type": "designer_text",
                "source_id": "desc",
                "feature_or_requirement": "ergonomic lumbar support",
                "statement": "Designer claims lumbar support matches natural curvature.",
                "observation_type": "author_claim",
            },
        ],
        "criteria": {
            dim: make_valid_decision(3, "E1") for dim in DIMENSIONS
        },
        "suggestions": [
            {
                "dimension": "feasibility",
                "evidence_ids": ["E1"],
                "action": "Add gusset reinforcement at the lower frame bend.",
                "intended_benefit": "Prevent torsional flex during sitting transition.",
            }
        ],
    }


def test_valid_judgment_passes():
    data = make_valid_judgment_dict()
    judgment = EvaluatorJudgment.model_validate(data)
    assert judgment is not None
    assert judgment.criteria.creativity.score == 3
    assert len(judgment.evidence) == 2


def test_unassessable_decision_passes():
    data = make_valid_judgment_dict()
    data["criteria"]["feasibility"] = make_unassessable_decision()
    judgment = EvaluatorJudgment.model_validate(data)
    assert judgment.criteria.feasibility.status == "unassessable"
    assert judgment.criteria.feasibility.score is None
    assert judgment.criteria.feasibility.limitation is not None


@pytest.mark.parametrize("bad_score", ["4", "3", True, False, 4.5, 3.0, 0, 6, -1, 10])
def test_rejects_non_integer_or_out_of_range_score(bad_score):
    data = make_valid_judgment_dict()
    data["criteria"]["creativity"]["score"] = bad_score
    with pytest.raises(ValidationError):
        EvaluatorJudgment.model_validate(data)


def test_rejects_scored_decision_with_null_score():
    data = make_valid_judgment_dict()
    data["criteria"]["creativity"]["score"] = None
    with pytest.raises(ValidationError):
        EvaluatorJudgment.model_validate(data)


def test_rejects_scored_decision_with_empty_evidence():
    data = make_valid_judgment_dict()
    data["criteria"]["creativity"]["evidence_ids"] = []
    with pytest.raises(ValidationError):
        EvaluatorJudgment.model_validate(data)


def test_rejects_scored_decision_with_unavailable_evidence_strength():
    data = make_valid_judgment_dict()
    data["criteria"]["creativity"]["evidence_strength"] = "unavailable"
    with pytest.raises(ValidationError):
        EvaluatorJudgment.model_validate(data)


def test_rejects_unassessable_with_score():
    data = make_valid_judgment_dict()
    dec = make_unassessable_decision()
    dec["score"] = 3  # Conflict: unassessable cannot have score
    data["criteria"]["clarity"] = dec
    with pytest.raises(ValidationError):
        EvaluatorJudgment.model_validate(data)


def test_rejects_unassessable_without_limitation():
    data = make_valid_judgment_dict()
    dec = make_unassessable_decision()
    dec["limitation"] = ""  # Empty limitation
    data["criteria"]["clarity"] = dec
    with pytest.raises(ValidationError):
        EvaluatorJudgment.model_validate(data)


def test_rejects_duplicate_evidence_ids():
    data = make_valid_judgment_dict()
    # Duplicate E1
    data["evidence"].append({
        "evidence_id": "E1",
        "source_type": "image",
        "source_id": "img-0",
        "feature_or_requirement": "duplicate",
        "statement": "Another statement with duplicate ID.",
        "observation_type": "visible",
    })
    with pytest.raises(ValidationError):
        EvaluatorJudgment.model_validate(data)


def test_rejects_unknown_evidence_id_in_criteria():
    data = make_valid_judgment_dict()
    data["criteria"]["originality"]["evidence_ids"] = ["E999"]
    with pytest.raises(ValidationError):
        EvaluatorJudgment.model_validate(data)


def test_rejects_unknown_evidence_id_in_suggestion():
    data = make_valid_judgment_dict()
    data["suggestions"][0]["evidence_ids"] = ["E999"]
    with pytest.raises(ValidationError):
        EvaluatorJudgment.model_validate(data)


def test_rejects_extra_fields():
    data = make_valid_judgment_dict()
    data["overall_score"] = 4.2  # LLM must not return overall score
    with pytest.raises(ValidationError):
        EvaluatorJudgment.model_validate(data)


def test_validate_judgment_wrapper():
    data = make_valid_judgment_dict()
    res = validate_judgment(data, slot_id="slot-1")
    assert res.valid is True
    assert len(res.errors) == 0
    assert len(res.scored_dimensions) == 6
    assert res.flat_scores["creativity"] == 3

    bad_data = make_valid_judgment_dict()
    bad_data["criteria"]["creativity"]["score"] = 99
    res_bad = validate_judgment(bad_data, slot_id="slot-1")
    assert res_bad.valid is False
    assert len(res_bad.errors) > 0


def test_extract_flat_scores_from_legacy_result():
    legacy_good = {
        "creativity_score": 4,
        "originality_score": 3,
        "usefulness_relevance_score": 5,
        "clarity_score": 4,
        "level_of_detail_elaboration_score": 3,
        "feasibility_score": 4,
        "instructor_feedback": "Great job",
    }
    extracted = extract_flat_scores_from_legacy_result(legacy_good)
    assert extracted is not None
    assert extracted["creativity"] == 4
    assert extracted["usefulness_relevance"] == 5

    # Bad type: string score
    legacy_bad = dict(legacy_good, creativity_score="4")
    assert extract_flat_scores_from_legacy_result(legacy_bad) is None

    # Missing dimension
    legacy_missing = dict(legacy_good)
    del legacy_missing["feasibility_score"]
    assert extract_flat_scores_from_legacy_result(legacy_missing) is None
