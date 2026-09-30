"""
report_composer.py — Raati v2 Slice 5
Design Studio Feedback Editor — generates concise narrative from validated evidence.

Key constraints (from spec §10):
- Does NOT return score fields or calculate means
- Target 180-260 words, hard ceiling 320
- Each note, strength, priority references evidence IDs
- Deterministic fallback if composition fails
- One rewrite allowed on validation failure
"""
import json
import logging
import os
import re
from typing import Optional
import anthropic as _anthropic
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_claude_api_key = os.getenv("CLAUDE_API_KEY")
_claude_client = _anthropic.AsyncAnthropic(
    api_key=_claude_api_key if _claude_api_key else "placeholder"
)

# ─── Composer system prompt (spec §10.3) ──────────────────────────────────────

COMPOSER_SYSTEM_PROMPT = """\
You are a Design Studio Feedback Editor. Turn the provided validated assessment
into concise, specific feedback that helps a student improve this design.

The scorecard is immutable backend data. You must not return score fields,
calculate means, change scores, invent confidence percentages, or claim that
panel agreement proves correctness.

Use only the permitted evidence, qualified design interpretations and review
decisions supplied in this packet. Every substantive note, strength and priority
must reference its supporting evidence IDs. Preserve unresolved contradictions
as limitations; do not resolve them by majority vote or confident phrasing.

Start with one sentence about the central design idea and its main trade-off.
Write one concise note for each of the six criteria. Include up to two supported
strengths, up to two focused priorities, and exactly one next action when an
action is justified. Do not force praise or criticism to fill a quota.

For each priority, state the observable feature, its implication for the stated
use or design goal, and the proposed action. Match the action to the development
stage and assignment scope. Do not demand production documents for a concept
exercise. Optional suggestions must not be described as missing requirements.

Use measured professional language, short sentences and concrete design terms.
Avoid catchy phrases, generic compliments, repeated advice and claims about
student effort or personality. Do not turn a possible concern into a measured
performance result. Aim for 180-260 words across the final narrative.

Return only the Narrative object defined by the supplied schema.
"""

# ─── Narrative schema ─────────────────────────────────────────────────────────

NARRATIVE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string", "description": "One sentence: central design idea + main trade-off"},
        "criterion_notes": {
            "type": "object",
            "properties": {
                "creativity": {"type": "string"},
                "originality": {"type": "string"},
                "usefulness_relevance": {"type": "string"},
                "clarity": {"type": "string"},
                "level_of_detail_elaboration": {"type": "string"},
                "feasibility": {"type": "string"},
            },
            "required": ["creativity", "originality", "usefulness_relevance", "clarity",
                         "level_of_detail_elaboration", "feasibility"],
            "additionalProperties": False,
        },
        "strengths": {
            "type": "array", "items": {"type": "string"}, "maxItems": 2
        },
        "priorities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "feature": {"type": "string"},
                    "implication": {"type": "string"},
                    "action": {"type": "string"},
                },
                "required": ["feature", "implication", "action"],
                "additionalProperties": False,
            },
            "maxItems": 2,
        },
        "next_step": {"type": ["string", "null"]},
        "limitations": {"type": "string"},
    },
    "required": ["summary", "criterion_notes", "strengths", "priorities", "next_step", "limitations"],
    "additionalProperties": False,
}

CRITERIA_KEYS = {"creativity", "originality", "usefulness_relevance", "clarity",
                 "level_of_detail_elaboration", "feasibility"}
SCORE_FIELD_PATTERN = re.compile(r"\b\d+(\.\d+)?\s*(out of|/)\s*5\b", re.IGNORECASE)
MAX_WORDS = 320


def _count_words(narrative: dict) -> int:
    """Count words across all text fields of the narrative."""
    texts = [
        narrative.get("summary", ""),
        narrative.get("limitations", ""),
        narrative.get("next_step") or "",
    ]
    for note in (narrative.get("criterion_notes") or {}).values():
        texts.append(str(note))
    for strength in narrative.get("strengths", []):
        texts.append(str(strength))
    for priority in narrative.get("priorities", []):
        if isinstance(priority, dict):
            texts += [priority.get("feature", ""), priority.get("implication", ""),
                      priority.get("action", "")]
    total = sum(len(t.split()) for t in texts if t)
    return total


def _validate_narrative(narrative: dict) -> list[str]:
    """
    Validate the narrative object against the schema and content rules.
    Returns a list of error strings (empty = valid).
    """
    errors = []

    # Required top-level keys
    for key in ["summary", "criterion_notes", "strengths", "priorities", "next_step", "limitations"]:
        if key not in narrative:
            errors.append(f"Missing required field: {key}")

    # Criterion notes must have all 6 keys
    notes = narrative.get("criterion_notes", {})
    if not isinstance(notes, dict):
        errors.append("criterion_notes must be an object")
    else:
        missing = CRITERIA_KEYS - set(notes.keys())
        if missing:
            errors.append(f"criterion_notes missing keys: {missing}")
        extra = set(notes.keys()) - CRITERIA_KEYS
        if extra:
            errors.append(f"criterion_notes has extra keys: {extra}")

    # No score fields allowed
    all_text = json.dumps(narrative)
    if SCORE_FIELD_PATTERN.search(all_text):
        errors.append("Narrative contains score-like patterns (e.g. '4.2 out of 5') — not allowed")

    # Word count ceiling
    word_count = _count_words(narrative)
    if word_count > MAX_WORDS:
        errors.append(f"Narrative exceeds {MAX_WORDS} word ceiling ({word_count} words)")

    return errors


def _build_deterministic_fallback(
    scorecard: dict,
    synthesis_text: dict,
    evidence_review: Optional[dict] = None,
) -> dict:
    """
    Generate a deterministic limited-summary narrative when LLM composition fails.
    Uses validated criterion reasoning text from synthesis without LLM calls.
    """
    notes = {}
    for dim in ["creativity", "originality", "usefulness_relevance", "clarity",
                "level_of_detail_elaboration", "feasibility"]:
        text = synthesis_text.get(f"{dim}_reasoning", "")
        if text:
            # Take first two sentences as the note
            sentences = re.split(r"(?<=[.!?])\s+", text.strip())
            notes[dim] = " ".join(sentences[:2]) if sentences else text[:200]
        else:
            notes[dim] = "Assessment data available; note generation limited."

    intro = synthesis_text.get("instructor_feedback_intro", "")
    pivot = synthesis_text.get("instructor_feedback_pivot", "")
    next_s = synthesis_text.get("instructor_feedback_next_step", "")

    issues = (evidence_review or {}).get("issues", [])
    limitation_text = (
        f"This is a limited summary generated from validated criterion notes. "
        f"Full narrative composition was unavailable."
    )
    if issues:
        limitation_text += f" {len(issues)} factual review issue(s) were flagged."

    return {
        "summary": (intro[:150] if intro else "Assessment completed. See criterion notes for detail."),
        "criterion_notes": notes,
        "strengths": [],
        "priorities": [
            {"feature": pivot[:100] if pivot else "Design decision", "implication": "Requires attention.", "action": next_s[:150] if next_s else "Review the criterion notes."}
        ] if pivot else [],
        "next_step": next_s[:200] if next_s else None,
        "limitations": limitation_text,
    }


async def compose_narrative(
    scorecard: dict,
    synthesis_text: dict,
    evidence_review: Optional[dict] = None,
) -> dict:
    """
    Generate concise student-facing feedback using the Design Studio Feedback Editor.

    Args:
        scorecard: Server-computed aggregate (read-only context for composer).
        synthesis_text: LLM reasoning texts (criterion reasoning + feedback strings).
        evidence_review: Optional evidence review results.

    Returns:
        Validated narrative dict, or deterministic fallback on failure.
    """
    # Build the input packet for the composer
    # Scorecard is passed as read-only context (no mutation expected)
    scorecard_summary = {}
    for dim, stats in (scorecard.get("criteria") or {}).items():
        scorecard_summary[dim] = {
            "display": stats.get("display"),
            "panel_range": f"{stats.get('min')}-{stats.get('max')}",
        }

    reasoning_texts = {}
    for dim in ["creativity", "originality", "usefulness_relevance", "clarity",
                "level_of_detail_elaboration", "feasibility"]:
        text = synthesis_text.get(f"{dim}_reasoning", "")
        if text:
            reasoning_texts[dim] = text[:500]  # cap per-dimension text

    intro = synthesis_text.get("instructor_feedback_intro", "")
    pivot = synthesis_text.get("instructor_feedback_pivot", "")
    next_s = synthesis_text.get("instructor_feedback_next_step", "")
    combined_feedback = " | ".join(filter(None, [intro, pivot, next_s]))[:800]

    issues_summary = ""
    if evidence_review and evidence_review.get("issues"):
        issues_summary = (
            f"\n\nFactual review flagged {evidence_review['issue_count']} issue(s): "
            + "; ".join(
                i["description"][:80] for i in evidence_review["issues"][:3]
            )
        )

    user_content = (
        f"SCORECARD (immutable — do not alter, do not return these numbers):\n"
        f"{json.dumps(scorecard_summary, indent=2)}\n\n"
        f"CRITERION REASONING (from validated panel):\n"
        f"{json.dumps(reasoning_texts, indent=2)}\n\n"
        f"PANEL FEEDBACK NOTES (for context only):\n{combined_feedback}"
        f"{issues_summary}\n\n"
        f"Return ONLY a valid JSON matching this schema:\n"
        f"{json.dumps(NARRATIVE_SCHEMA, indent=2)}"
    )

    for attempt in range(2):
        try:
            response = await _claude_client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1200,
                temperature=0.1,
                system=COMPOSER_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_content}],
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.strip("`").strip()
                if raw.lower().startswith("json"):
                    raw = raw[4:].strip()

            narrative = json.loads(raw)
            errors = _validate_narrative(narrative)

            if not errors:
                narrative["_composer_status"] = "generated"
                return narrative
            else:
                logger.warning(f"Narrative validation failed (attempt {attempt+1}): {errors}")
                if attempt == 0:
                    # Allow one rewrite with error context
                    user_content += f"\n\nPrevious attempt failed validation: {errors}. Please fix."
                    continue
                else:
                    # Second failure → deterministic fallback
                    fallback = _build_deterministic_fallback(scorecard, synthesis_text, evidence_review)
                    fallback["_composer_status"] = "limited_fallback"
                    return fallback

        except Exception as e:
            logger.error(f"Narrative composition failed (attempt {attempt+1}): {e}")
            if attempt == 1:
                fallback = _build_deterministic_fallback(scorecard, synthesis_text, evidence_review)
                fallback["_composer_status"] = "limited_fallback"
                return fallback

    # Should not reach here
    fallback = _build_deterministic_fallback(scorecard, synthesis_text, evidence_review)
    fallback["_composer_status"] = "limited_fallback"
    return fallback


def narrative_to_legacy_fields(narrative: dict) -> dict:
    """
    Map the v2 narrative back to the v1 flat instructor_feedback fields.
    Used by the compatibility serializer in storage.py and report_service.py.
    """
    notes = narrative.get("criterion_notes", {})
    priorities = narrative.get("priorities", [])
    strengths = narrative.get("strengths", [])
    next_step = narrative.get("next_step", "")
    limitations = narrative.get("limitations", "")
    summary = narrative.get("summary", "")

    # Build intro from summary + strengths
    intro_parts = [summary]
    if strengths:
        intro_parts.append("Strengths: " + "; ".join(strengths[:2]) + ".")
    intro = " ".join(intro_parts)[:600]

    # Build pivot from priorities
    pivot_parts = []
    for p in priorities[:2]:
        if isinstance(p, dict):
            feat = p.get("feature", "")
            impl = p.get("implication", "")
            pivot_parts.append(f"{feat}: {impl}".strip())
    pivot = " ".join(pivot_parts)[:600] if pivot_parts else ""

    return {
        "instructor_feedback_intro": intro,
        "instructor_feedback_pivot": pivot,
        "instructor_feedback_next_step": str(next_step or "")[:400],
    }
