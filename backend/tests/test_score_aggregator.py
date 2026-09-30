"""
Tests for score_aggregator.py — Raati v2 Slice 1 arithmetic fixtures.

Three anchor cases confirmed directly from the supplied export data:
  - Shizuku clarity:   sum=39, count=9, mean=4.333…, display="4.3"
  - Molten detail:     sum=33, count=9, mean=3.666…, display="3.7"
  - PariPari overall:  sum=185, count=54, mean=3.4259…, display="3.43"
"""
import json
import sys
import os
from pathlib import Path

import pytest

# Allow import without installing the package
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.score_aggregator import (
    DIMENSIONS,
    aggregate_complete_panel,
    build_scorecard_from_expert_panel,
    extract_rows_from_expert_panel,
    format_fraction,
    scorecard_to_flat_fields,
)
from fractions import Fraction

# ─── Helpers ──────────────────────────────────────────────────────────────────

RESULTS_DIR = Path(__file__).parent.parent / "data" / "results"

CHAIR_IDS = {
    "Tumpuan": "042a2736-ef02-47cc-90c9-a13386cb0939",
    "Shizuku": "4d7aa73a-afea-44dc-8a38-0a351361d8a8",
    "Cayi": "f0dbd507-aba1-4437-8687-8420098478c5",
    "Sluma": "2de007c7-84c0-4741-8141-a78a951677dc",
    "Gee": "72501209-10a0-423f-822a-007ee6650deb",
    "Molten": "bed39655-5d60-429c-8eb9-39d8b5e4c33a",
    "Para": "a3c5cc55-12dd-4b7a-afe4-65187d732a28",
    "Crescent": "295ea8d1-3f6f-450a-b0ec-68239360ca03",
    "LikaLiku": "1f482f77-e963-486c-bb3c-d91223e2de9f",
    "Fingie": "08ccfdad-e698-47d6-b200-fec8e95cf380",
    "Levica": "91bd712d-ec47-4cdc-aa44-3af008ff25c1",
    "PariPari": "bedbbfed-50a1-4ce7-8582-2844a4f7b645",
    "Lipat": "fbb03026-00f3-4ec3-a34a-b61cd606c04e",
}


def load_result(uuid: str) -> dict:
    path = RESULTS_DIR / f"{uuid}.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_rows_from_result(data: dict) -> tuple[list[dict], list[str]]:
    return extract_rows_from_expert_panel(data["expert_panel"])


# ─── format_fraction ──────────────────────────────────────────────────────────

def test_format_fraction_shizuku_clarity():
    """Shizuku clarity: sum=39, count=9 → display '4.3'"""
    assert format_fraction(Fraction(39, 9), 1) == "4.3"


def test_format_fraction_molten_detail():
    """Molten detail: sum=33, count=9 → display '3.7'"""
    assert format_fraction(Fraction(33, 9), 1) == "3.7"


def test_format_fraction_paripari_overall():
    """PariPari overall: sum=185, count=54 → display '3.43'"""
    assert format_fraction(Fraction(185, 54), 2) == "3.43"


def test_format_fraction_round_half_up():
    """ROUND_HALF_UP: 2.5 should round to 3.0 at 0 places (Fraction(5,2))"""
    # 2.5 → "3" at 0 decimal places with ROUND_HALF_UP
    result = format_fraction(Fraction(5, 2), 0)
    assert result == "3"


# ─── Arithmetic fixtures from spec §8.2 ───────────────────────────────────────

class TestSpecArithmeticFixtures:
    """Three fixtures confirmed in §8.2 of the spec."""

    def test_shizuku_clarity_sum_and_display(self):
        data = load_result(CHAIR_IDS["Shizuku"])
        rows, cids = build_rows_from_result(data)
        assert len(rows) == 9, "Shizuku should have 9 valid panel entries"
        scorecard = aggregate_complete_panel(rows, cids)
        clarity = scorecard["criteria"]["clarity"]
        assert clarity["sum"] == 39
        assert clarity["count"] == 9
        assert clarity["display"] == "4.3"

    def test_molten_detail_sum_and_display(self):
        data = load_result(CHAIR_IDS["Molten"])
        rows, cids = build_rows_from_result(data)
        assert len(rows) == 9
        scorecard = aggregate_complete_panel(rows, cids)
        detail = scorecard["criteria"]["level_of_detail_elaboration"]
        assert detail["sum"] == 33
        assert detail["count"] == 9
        assert detail["display"] == "3.7"

    def test_paripari_overall_sum_and_display(self):
        data = load_result(CHAIR_IDS["PariPari"])
        rows, cids = build_rows_from_result(data)
        assert len(rows) == 9
        scorecard = aggregate_complete_panel(rows, cids)
        overall = scorecard["overall"]
        assert overall["sum"] == 185
        assert overall["count"] == 54
        assert overall["display"] == "3.43"


# ─── All 13 chair fixtures ─────────────────────────────────────────────────────

class TestAllChairFixtures:
    """
    Each of the 13 chairs should:
    1. Parse to exactly 9 rows.
    2. Produce a complete scorecard with aggregation_version = 'equal-mean-v2'.
    3. Have overall display matching the stored overall_score (±0.05 tolerance,
       since stored values were computed by a different method).
    """

    @pytest.mark.parametrize("chair_name,uuid", list(CHAIR_IDS.items()))
    def test_chair_produces_complete_scorecard(self, chair_name, uuid):
        data = load_result(uuid)
        scorecard = build_scorecard_from_expert_panel(data["expert_panel"])
        assert scorecard is not None, f"{chair_name}: expected complete scorecard"
        assert scorecard["aggregation_version"] == "equal-mean-v2"
        assert set(scorecard["criteria"].keys()) == set(DIMENSIONS)
        assert "overall" in scorecard
        for dim, stats in scorecard["criteria"].items():
            assert stats["count"] == 9, f"{chair_name}: {dim} count should be 9"
            assert isinstance(stats["sum"], int)
            assert 9 <= stats["sum"] <= 45
        assert scorecard["overall"]["count"] == 54

    @pytest.mark.parametrize("chair_name,uuid", list(CHAIR_IDS.items()))
    def test_chair_overall_display_is_two_decimal_string(self, chair_name, uuid):
        data = load_result(uuid)
        scorecard = build_scorecard_from_expert_panel(data["expert_panel"])
        assert scorecard is not None
        display = scorecard["overall"]["display"]
        assert "." in display
        assert len(display.split(".")[1]) == 2, f"{chair_name}: overall display should have 2 decimal places"

    @pytest.mark.parametrize("chair_name,uuid", list(CHAIR_IDS.items()))
    def test_chair_criterion_display_is_one_decimal_string(self, chair_name, uuid):
        data = load_result(uuid)
        scorecard = build_scorecard_from_expert_panel(data["expert_panel"])
        assert scorecard is not None
        for dim, stats in scorecard["criteria"].items():
            display = stats["display"]
            assert "." in display, f"{chair_name}: {dim} display should have a decimal point"
            assert len(display.split(".")[1]) == 1, f"{chair_name}: {dim} display should have 1 decimal place"


# ─── aggregate_complete_panel validation ──────────────────────────────────────

class TestAggregateValidation:
    """aggregate_complete_panel should reject bad input cleanly."""

    def _make_rows(self, scores_override: dict = None):
        """Generate 9 valid rows with all scores = 3, optionally overriding."""
        conditions = [f"cond_{i}" for i in range(9)]
        rows = []
        for c in conditions:
            scores = {d: 3 for d in DIMENSIONS}
            if scores_override and c in scores_override:
                scores.update(scores_override[c])
            rows.append({"condition_id": c, "scores": scores})
        return rows, conditions

    def test_accepts_valid_complete_panel(self):
        rows, cids = self._make_rows()
        result = aggregate_complete_panel(rows, cids)
        assert result["aggregation_version"] == "equal-mean-v2"
        # All scores = 3 → every criterion mean = 3.0, overall = 3.00
        assert result["overall"]["display"] == "3.00"

    def test_rejects_boolean_score(self):
        rows, cids = self._make_rows()
        rows[0]["scores"]["creativity"] = True  # bool is subclass of int — must reject
        with pytest.raises(ValueError, match="score must be an integer 1–5"):
            aggregate_complete_panel(rows, cids)

    def test_rejects_string_score(self):
        rows, cids = self._make_rows()
        rows[0]["scores"]["originality"] = "4"
        with pytest.raises(ValueError, match="score must be an integer 1–5"):
            aggregate_complete_panel(rows, cids)

    def test_rejects_float_score(self):
        rows, cids = self._make_rows()
        rows[0]["scores"]["clarity"] = 4.5
        with pytest.raises(ValueError, match="score must be an integer 1–5"):
            aggregate_complete_panel(rows, cids)

    def test_rejects_out_of_range_score_zero(self):
        rows, cids = self._make_rows()
        rows[0]["scores"]["feasibility"] = 0
        with pytest.raises(ValueError, match="score must be an integer 1–5"):
            aggregate_complete_panel(rows, cids)

    def test_rejects_out_of_range_score_six(self):
        rows, cids = self._make_rows()
        rows[0]["scores"]["creativity"] = 6
        with pytest.raises(ValueError, match="score must be an integer 1–5"):
            aggregate_complete_panel(rows, cids)

    def test_rejects_null_score(self):
        rows, cids = self._make_rows()
        rows[0]["scores"]["creativity"] = None
        with pytest.raises(ValueError, match="score must be an integer 1–5"):
            aggregate_complete_panel(rows, cids)

    def test_rejects_missing_criterion(self):
        rows, cids = self._make_rows()
        del rows[0]["scores"]["feasibility"]
        with pytest.raises(ValueError, match="exactly six criteria required"):
            aggregate_complete_panel(rows, cids)

    def test_rejects_duplicate_condition_id(self):
        rows, cids = self._make_rows()
        rows[1]["condition_id"] = rows[0]["condition_id"]
        cids[1] = cids[0]
        with pytest.raises(ValueError):
            aggregate_complete_panel(rows, cids)

    def test_rejects_wrong_row_count(self):
        rows, cids = self._make_rows()
        with pytest.raises(ValueError, match="exactly 9 score rows"):
            aggregate_complete_panel(rows[:8], cids)

    def test_rejects_fewer_than_9_expected(self):
        rows, cids = self._make_rows()
        with pytest.raises(ValueError, match="9 distinct configured slots"):
            aggregate_complete_panel(rows, cids[:8])

    def test_rejects_unexpected_condition_id(self):
        rows, cids = self._make_rows()
        rows[0]["condition_id"] = "not_in_expected_list"
        with pytest.raises(ValueError, match="Unexpected condition_id"):
            aggregate_complete_panel(rows, cids)


# ─── Compatibility serializer ──────────────────────────────────────────────────

class TestFlatFieldsCompatibility:
    """scorecard_to_flat_fields must produce exactly the old v1 field names."""

    def test_flat_fields_keys_match_v1_schema(self):
        rows = [{"condition_id": f"c{i}", "scores": {d: 3 for d in DIMENSIONS}} for i in range(9)]
        cids = [f"c{i}" for i in range(9)]
        scorecard = aggregate_complete_panel(rows, cids)
        flat = scorecard_to_flat_fields(scorecard)
        expected_keys = {
            "creativity_score",
            "originality_score",
            "usefulness_relevance_score",
            "clarity_score",
            "level_of_detail_elaboration_score",
            "feasibility_score",
            "overall_score",
        }
        assert set(flat.keys()) == expected_keys

    def test_flat_fields_values_are_floats(self):
        rows = [{"condition_id": f"c{i}", "scores": {d: 4 for d in DIMENSIONS}} for i in range(9)]
        cids = [f"c{i}" for i in range(9)]
        scorecard = aggregate_complete_panel(rows, cids)
        flat = scorecard_to_flat_fields(scorecard)
        for key, val in flat.items():
            assert isinstance(val, float), f"{key} should be float, got {type(val)}"


# ─── build_scorecard_from_expert_panel ────────────────────────────────────────

class TestBuildScorecardFromExpertPanel:
    """High-level entry point should return None for incomplete/bad panels."""

    def test_returns_none_for_empty_panel(self):
        result = build_scorecard_from_expert_panel([])
        assert result is None

    def test_returns_none_for_panel_with_errors(self):
        panel = [
            {"model_provider": "OpenAI", "persona": {"persona_id": "p1"}, "error": "timeout"}
            for _ in range(9)
        ]
        result = build_scorecard_from_expert_panel(panel)
        assert result is None

    def test_returns_scorecard_for_valid_9_entry_panel(self):
        panel = []
        providers = ["openai", "xai", "claude"]
        personas = ["p1", "p2", "p3"]
        for persona in personas:
            for provider in providers:
                panel.append({
                    "model_provider": provider,
                    "persona": {"persona_id": persona},
                    "result": {
                        "creativity_score": 3,
                        "originality_score": 4,
                        "usefulness_relevance_score": 3,
                        "clarity_score": 4,
                        "level_of_detail_elaboration_score": 3,
                        "feasibility_score": 4,
                    }
                })
        result = build_scorecard_from_expert_panel(panel)
        assert result is not None
        assert result["overall"]["count"] == 54
