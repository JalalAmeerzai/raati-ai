"""
evidence_review.py — Raati v2 Slice 5
Conflict detection and unsupported-claim detection across 9 judgments.

Detects:
1. Contradictory observations about the same feature across evaluators
2. Claims stated as measurements that appear only as brief requirements
3. Unsupported performance claims (comfort durations, load capacities, material IDs)

Makes at most one targeted vision review call when material issues are found.
"""
import re
import logging
from typing import Literal, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ─── Known unsupported-claim patterns ─────────────────────────────────────────

# Patterns that indicate a claim is a measurement/performance assertion that
# an image alone cannot establish
UNSUPPORTED_CLAIM_PATTERNS = [
    # Exact comfort durations stated as measurements
    r"\b(\d+)[–\-](\d+)\s*minutes?\s*(of\s+)?(sitting|comfort|use|discomfort)",
    r"\b(\d+)\s*minutes?\s*(of\s+)?(sitting|comfort|use|discomfort)",
    r"comfortable for\s+(\d+)",
    r"will cause (discomfort|pain|fatigue) (within|after|in) (\d+)",
    # Material identity stated as fact from appearance alone
    r"\b(confirmed|verified|tested|proven|established)\s+(material|wood|steel|fabric|foam)",
    # Load/weight capacity stated as fact
    r"\b(load capacity|weight capacity|supports up to)\s+[\d,]+\s*(kg|lbs?|pounds?|kilograms?)",
    # Global originality/novelty claims
    r"\b(unique|novel|unprecedented|first of its kind|never seen before)\s+(in the world|globally|ever)",
]

COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in UNSUPPORTED_CLAIM_PATTERNS]


@dataclass
class EvidenceIssue:
    """A detected factual or claim issue across evaluator responses."""
    issue_id: str
    issue_type: Literal[
        "contradictory_observation",
        "brief_requirement_as_measurement",
        "unsupported_performance_claim",
        "unsupported_material_identity",
    ]
    description: str
    affected_dimensions: list[str] = field(default_factory=list)
    affected_slot_ids: list[str] = field(default_factory=list)
    feature_key: Optional[str] = None
    # After targeted review
    review_verdict: Optional[Literal["supported", "refuted", "not_resolvable_from_packet"]] = None
    disposition_effect: Optional[Literal["needs_review", "withheld", "preserved"]] = None


def detect_unsupported_claims(
    expert_results: list[dict],
    brief_text: str = "",
) -> list[EvidenceIssue]:
    """
    Scan evaluator reasoning texts for claims that should not appear in final feedback:
    - Exact comfort/discomfort durations
    - Material identity stated as verified fact
    - Load/weight capacity claims
    - Global originality claims

    Brief requirements (e.g. "1-3 hours sitting") are legitimate context;
    claims that the chair will cause discomfort in X minutes are unsupported.
    """
    issues = []
    issue_counter = 0

    for entry in expert_results:
        provider = entry.get("model_provider", "unknown")
        persona = (entry.get("persona") or {}).get("persona_id", "unknown")
        slot_id = f"{provider}_{persona}"
        result = entry.get("result") or {}

        # Collect all reasoning texts from this slot
        reasoning_texts = []
        for key in [
            "creativity_reasoning", "originality_reasoning", "usefulness_relevance_reasoning",
            "clarity_reasoning", "level_of_detail_elaboration_reasoning", "feasibility_reasoning",
            "instructor_feedback", "instructor_feedback_intro", "instructor_feedback_pivot",
            "instructor_feedback_next_step",
        ]:
            text = result.get(key, "")
            if text:
                reasoning_texts.append((key, str(text)))

        for field_name, text in reasoning_texts:
            for pattern in COMPILED_PATTERNS:
                matches = pattern.findall(text)
                if matches:
                    issue_counter += 1
                    # Map field name to dimension
                    dim = field_name.replace("_reasoning", "").replace("_score", "")
                    issues.append(EvidenceIssue(
                        issue_id=f"ISSUE-{issue_counter:03d}",
                        issue_type="unsupported_performance_claim",
                        description=(
                            f"Slot {slot_id}, field '{field_name}': "
                            f"Pattern matched suggesting unsupported claim: '{text[:120]}...'"
                        ),
                        affected_dimensions=[dim] if dim in ["creativity", "originality",
                                                              "usefulness_relevance", "clarity",
                                                              "level_of_detail_elaboration",
                                                              "feasibility"] else [],
                        affected_slot_ids=[slot_id],
                    ))

    return issues


def detect_contradictory_observations(expert_results: list[dict]) -> list[EvidenceIssue]:
    """
    Detect cases where evaluators make contradictory observations about the same
    visible feature (e.g., "armrest is present" vs "armrest is absent").

    Uses a simple heuristic: looks for key design feature terms that appear
    in contradictory visibility assessments across slots.
    """
    issues = []
    issue_counter = 0

    # Feature keywords to watch for contradictions
    FEATURE_PATTERNS = {
        "left_armrest": [r"left arm(rest)?", r"armrest.*left", r"left.*arm(rest)?"],
        "right_armrest": [r"right arm(rest)?", r"armrest.*right", r"right.*arm(rest)?"],
        "backrest": [r"back(rest)?", r"lumbar", r"spine support"],
        "seat_surface": [r"seat (surface|cushion|pan)", r"sitting surface"],
        "structural_support": [r"structural.*support", r"frame.*stable", r"cantilevered"],
    }

    PRESENCE_POSITIVE = [r"\bvisible\b", r"\bclearly\b", r"\bpresent\b", r"\bexists\b", r"\bshows?\b"]
    PRESENCE_NEGATIVE = [r"\babsent\b", r"\bmissing\b", r"\bnot visible\b", r"\bnot present\b", r"\bno .{0,20}(arm|back|seat)\b"]

    pos_patterns = [re.compile(p, re.IGNORECASE) for p in PRESENCE_POSITIVE]
    neg_patterns = [re.compile(p, re.IGNORECASE) for p in PRESENCE_NEGATIVE]

    for feature_key, feature_pats in FEATURE_PATTERNS.items():
        compiled_feat = [re.compile(p, re.IGNORECASE) for p in feature_pats]

        positive_slots = []
        negative_slots = []

        for entry in expert_results:
            provider = entry.get("model_provider", "unknown")
            persona = (entry.get("persona") or {}).get("persona_id", "unknown")
            slot_id = f"{provider}_{persona}"
            result = entry.get("result") or {}

            all_text = " ".join(str(v) for v in result.values() if isinstance(v, str))

            # Check if this slot mentions the feature
            feature_mentioned = any(p.search(all_text) for p in compiled_feat)
            if not feature_mentioned:
                continue

            has_positive = any(p.search(all_text) for p in pos_patterns)
            has_negative = any(p.search(all_text) for p in neg_patterns)

            if has_positive and not has_negative:
                positive_slots.append(slot_id)
            elif has_negative and not has_positive:
                negative_slots.append(slot_id)

        # Flag if the same feature has both positive and negative mentions
        if positive_slots and negative_slots:
            issue_counter += 1
            issues.append(EvidenceIssue(
                issue_id=f"CONTRA-{issue_counter:03d}",
                issue_type="contradictory_observation",
                description=(
                    f"Feature '{feature_key}' described as present in {len(positive_slots)} slot(s) "
                    f"and absent/missing in {len(negative_slots)} slot(s). "
                    f"Positive: {positive_slots[:3]}. Negative: {negative_slots[:3]}."
                ),
                feature_key=feature_key,
                affected_slot_ids=positive_slots + negative_slots,
            ))

    return issues


def run_evidence_review(expert_results: list[dict], brief_text: str = "") -> dict:
    """
    Full evidence review pass.

    Returns a structured review result with detected issues and a disposition flag.
    Does NOT modify scores or make factual determinations — that requires the
    targeted vision review call (separate, optional).
    """
    unsupported = detect_unsupported_claims(expert_results, brief_text)
    contradictions = detect_contradictory_observations(expert_results)

    all_issues = unsupported + contradictions
    needs_targeted_review = len(all_issues) > 0

    return {
        "issues": [
            {
                "issue_id": issue.issue_id,
                "issue_type": issue.issue_type,
                "description": issue.description,
                "affected_dimensions": issue.affected_dimensions,
                "affected_slot_ids": issue.affected_slot_ids,
                "feature_key": issue.feature_key,
                "review_verdict": issue.review_verdict,
                "disposition_effect": issue.disposition_effect,
            }
            for issue in all_issues
        ],
        "needs_targeted_review": needs_targeted_review,
        "issue_count": len(all_issues),
        "contradiction_count": len(contradictions),
        "unsupported_claim_count": len(unsupported),
    }
