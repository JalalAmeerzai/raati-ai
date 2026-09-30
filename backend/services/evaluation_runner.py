"""
evaluation_runner.py — Raati v2 Slice 6
Orchestrates the 9-slot evaluation panel with bounded retries, per-attempt
tracking, database persistence, evidence review, and report composition.

Adheres to spec §11.2, §11.4, and §11.5:
- 9 slots = 3 persona roles × 3 providers (OpenAI, Claude, xAI).
- Max 2 attempts per slot.
- Concurrency limit across provider calls (asyncio.Semaphore).
- Idempotent acceptance: exactly one accepted judgment per slot.
- Computes server-owned scorecard via score_aggregator.
- Performs factual issue review via evidence_review.
- Composes student narrative via report_composer.
- Persists all states to SQLite via database.py.
"""
import os
import json
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Any

try:
    from database import get_db
except ImportError:
    from ..database import get_db
from .provider_adapters import get_provider_adapter, detect_mime_type
from .judgment_validator import validate_judgment, EvaluatorJudgment, DIMENSIONS
from .design_recruiter import PanelSpec, PanelSlot, DEFAULT_FURNITURE_PANEL
from .assignment_contracts import AssignmentContract, SubmissionData, get_default_itb_assignment
from .score_aggregator import aggregate_complete_panel, scorecard_to_flat_fields
from .evidence_review import run_evidence_review
from .report_composer import compose_narrative

logger = logging.getLogger(__name__)

PROVIDERS = ["OpenAI", "Claude", "xAI"]

EVALUATOR_RUBRIC_V2 = """\
SHARED DESIGN-STAGE RUBRIC (Concept Stage)
Scale: 1 (Low) to 5 (High). Integers only.
Judge the submitted design outcome at concept stage.
Do NOT penalize missing production specs, dimensions or unrequested drawings.
A conventional design is not useless; visible support for user activity is useful.
Unassessable: use ONLY if evidence is genuinely absent or unreadable.

CRITERIA:
1. creativity: Inventiveness and coherence of the design concept.
2. originality: Distinction from standard solutions in the stated domain.
3. usefulness_relevance: Visible support for the intended sitting postures and user activities.
4. clarity: Legibility of forms, parts, and intended interaction.
5. level_of_detail_elaboration: Resolution and completeness appropriate to concept stage.
6. feasibility: Plausibility of structural support, materials, and making logic.
"""


def _build_evaluator_prompt(panel_slot: PanelSlot, contract: AssignmentContract) -> str:
    """Build the system prompt for an evaluator slot."""
    return f"""\
{panel_slot.evaluator_brief}

{EVALUATOR_RUBRIC_V2}

ASSIGNMENT CONTEXT:
- Assignment ID: {contract.assignment_id} (v{contract.assignment_version})
- Target: {contract.assessment_target} | Stage: {contract.development_stage}
- Domain: {contract.artifact_domain}
- Intended Activities: {', '.join(contract.user_context.activities)}
- User Age: {contract.user_context.age_range_years[0]}-{contract.user_context.age_range_years[1]} years
- Sitting Duration: {contract.user_context.intended_sitting_duration_hours[0]}-{contract.user_context.intended_sitting_duration_hours[1]} hours

EVALUATOR RULES:
1. Ground every criterion score in explicit evidence references (E1, E2, ...).
2. Distinguish visible features from author claims or unverified performance.
3. Return at most 2 concrete actionable suggestions.
4. Do NOT calculate or return overall scores or mean scores.
5. Strict output format: Return ONLY valid JSON conforming to the EvaluatorJudgment schema.
"""


def _build_user_text(submission: SubmissionData, contract: AssignmentContract) -> str:
    """Build user message cleanly separating brief from designer description."""
    parts = [f"Assignment Brief:\n{contract.brief_text}"]
    if submission.designer_description and submission.description_status != "brief_duplicate":
        parts.append(f"\nDesigner's Explanation:\n{submission.designer_description}")
    else:
        parts.append("\nDesigner's Explanation: [No separate designer explanation supplied]")
    parts.append("\nEvaluate the attached design image based on the assignment brief and rubric.")
    return "\n\n".join(parts)


async def execute_slot_attempt(
    run_id: str,
    slot_id: str,
    provider: str,
    panel_slot: PanelSlot,
    contract: AssignmentContract,
    submission: SubmissionData,
    base64_image: Optional[str],
    image_bytes: Optional[bytes],
    mime_type: str,
    attempt_number: int,
) -> tuple[bool, Optional[dict], Optional[EvaluatorJudgment]]:
    """
    Executes a single provider attempt for a given slot.
    Records the attempt in evaluation_attempts table.
    Returns (success, raw_parsed_dict, validated_judgment).
    """
    attempt_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    adapter = get_provider_adapter(provider)
    system_prompt = _build_evaluator_prompt(panel_slot, contract)
    user_text = _build_user_text(submission, contract)

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO evaluation_attempts (
                attempt_id, run_id, slot_id, attempt_number, provider, model_id,
                persona_id, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?)
            """,
            (attempt_id, run_id, slot_id, attempt_number, provider, adapter.default_model, panel_slot.persona_id, now_iso),
        )
        await db.commit()

    resp = await adapter.call_evaluator(
        system_prompt=system_prompt,
        user_text=user_text,
        base64_image=base64_image,
        image_bytes=image_bytes,
        mime_type=mime_type,
        timeout_seconds=120,
    )

    completed_iso = datetime.now(timezone.utc).isoformat()
    val_result = None
    judgment = None
    validation_outcome = "error"
    validation_errors = []

    if resp.status == "success" and resp.parsed_json:
        val_result = validate_judgment(resp.parsed_json, slot_id=slot_id)
        if val_result.valid and val_result.judgment:
            judgment = val_result.judgment
            validation_outcome = "accepted"
        else:
            validation_outcome = "rejected"
            validation_errors = val_result.errors
    else:
        validation_errors = [resp.error or f"Provider returned status: {resp.status}"]

    async with get_db() as db:
        await db.execute(
            """
            UPDATE evaluation_attempts SET
                status = ?,
                validation_outcome = ?,
                validation_errors = ?,
                usage_json = ?,
                elapsed_ms = ?,
                completed_at = ?
            WHERE attempt_id = ?
            """,
            (
                resp.status,
                validation_outcome,
                json.dumps(validation_errors),
                json.dumps(resp.usage),
                resp.elapsed_ms,
                completed_iso,
                attempt_id,
            ),
        )
        await db.commit()

    if validation_outcome == "accepted" and judgment:
        return True, resp.parsed_json, judgment
    return False, resp.parsed_json, None


async def run_evaluation_pipeline(
    run_id: str,
    submission: SubmissionData,
    contract: Optional[AssignmentContract] = None,
    panel: Optional[PanelSpec] = None,
    base64_image: Optional[str] = None,
    image_bytes: Optional[bytes] = None,
) -> dict:
    """
    Main evaluation pipeline orchestrating all 9 slots, bounded retries (max 2),
    score aggregation, evidence review, and narrative composition.
    """
    contract = contract or get_default_itb_assignment()
    panel = panel or DEFAULT_FURNITURE_PANEL
    mime_type = detect_mime_type(image_bytes) if image_bytes else "image/jpeg"

    start_iso = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            "UPDATE evaluation_runs SET execution_status='running', started_at=? WHERE run_id=?",
            (start_iso, run_id),
        )
        await db.commit()

    # Semaphore for concurrency limit across providers
    sem = asyncio.Semaphore(3)

    async def _handle_slot(panel_slot: PanelSlot, provider: str):
        slot_id = f"{provider.lower()}_{panel_slot.slot_id}"
        async with sem:
            # Attempt 1
            success, raw_dict, judgment = await execute_slot_attempt(
                run_id=run_id,
                slot_id=slot_id,
                provider=provider,
                panel_slot=panel_slot,
                contract=contract,
                submission=submission,
                base64_image=base64_image,
                image_bytes=image_bytes,
                mime_type=mime_type,
                attempt_number=1,
            )
            # Bounded retry: Attempt 2 if attempt 1 failed
            if not success:
                logger.warning(f"Slot {slot_id} attempt 1 failed. Retrying (attempt 2)...")
                await asyncio.sleep(1.0)
                success, raw_dict, judgment = await execute_slot_attempt(
                    run_id=run_id,
                    slot_id=slot_id,
                    provider=provider,
                    panel_slot=panel_slot,
                    contract=contract,
                    submission=submission,
                    base64_image=base64_image,
                    image_bytes=image_bytes,
                    mime_type=mime_type,
                    attempt_number=2,
                )

            if success and judgment:
                # Save accepted judgment
                judgment_id = str(uuid.uuid4())
                accepted_at = datetime.now(timezone.utc).isoformat()
                c = judgment.criteria
                async with get_db() as db:
                    await db.execute(
                        """
                        INSERT OR IGNORE INTO accepted_judgments (
                            judgment_id, run_id, slot_id, attempt_id, provider, persona_id,
                            creativity_score, originality_score, usefulness_relevance_score,
                            clarity_score, level_of_detail_elaboration_score, feasibility_score,
                            judgment_json, accepted_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            judgment_id, run_id, slot_id, f"{run_id}_{slot_id}_accepted", provider, panel_slot.persona_id,
                            c.creativity.score, c.originality.score, c.usefulness_relevance.score,
                            c.clarity.score, c.level_of_detail_elaboration.score, c.feasibility.score,
                            judgment.model_dump_json(), accepted_at
                        ),
                    )
                    await db.commit()
                return {
                    "slot_id": slot_id,
                    "provider": provider,
                    "persona": {
                        "persona_id": panel_slot.persona_id,
                        "name": panel_slot.display_name,
                        "title": panel_slot.professional_title,
                        "sub_text": panel_slot.task_adaptation[:60],
                    },
                    "model_provider": provider,
                    "result": raw_dict,
                    "judgment": judgment,
                }
            else:
                return {
                    "slot_id": slot_id,
                    "provider": provider,
                    "persona": {
                        "persona_id": panel_slot.persona_id,
                        "name": panel_slot.display_name,
                        "title": panel_slot.professional_title,
                    },
                    "model_provider": provider,
                    "error": f"Failed after 2 attempts",
                }

    # Dispatch 9 slots
    tasks = []
    for slot in panel.slots:
        for prov in PROVIDERS:
            tasks.append(_handle_slot(slot, prov))

    slot_results = await asyncio.gather(*tasks, return_exceptions=True)

    # Filter successful judgments
    valid_judgments_map: dict[str, dict[str, int]] = {}
    accepted_records: list[dict] = []
    expert_panel_v1: list[dict] = []

    for r in slot_results:
        if isinstance(r, dict) and "judgment" in r and r["judgment"]:
            accepted_records.append(r)
            j: EvaluatorJudgment = r["judgment"]
            scores = {}
            for dim in DIMENSIONS:
                dec = getattr(j.criteria, dim)
                if dec.status == "scored" and dec.score is not None:
                    scores[dim] = dec.score
            valid_judgments_map[r["slot_id"]] = scores

            # Build v1 compatible entry
            expert_entry = {
                "model_provider": r["provider"],
                "persona": r["persona"],
                "result": {
                    "creativity_score": j.criteria.creativity.score,
                    "creativity_reasoning": j.criteria.creativity.rationale,
                    "originality_score": j.criteria.originality.score,
                    "originality_reasoning": j.criteria.originality.rationale,
                    "usefulness_relevance_score": j.criteria.usefulness_relevance.score,
                    "usefulness_relevance_reasoning": j.criteria.usefulness_relevance.rationale,
                    "clarity_score": j.criteria.clarity.score,
                    "clarity_reasoning": j.criteria.clarity.rationale,
                    "level_of_detail_elaboration_score": j.criteria.level_of_detail_elaboration.score,
                    "level_of_detail_elaboration_reasoning": j.criteria.level_of_detail_elaboration.rationale,
                    "feasibility_score": j.criteria.feasibility.score,
                    "feasibility_reasoning": j.criteria.feasibility.rationale,
                    "instructor_feedback": j.criteria.creativity.rationale,
                }
            }
            expert_panel_v1.append(expert_entry)
        elif isinstance(r, dict):
            expert_panel_v1.append(r)

    n_valid = len(valid_judgments_map)
    completeness = "complete" if n_valid == 9 else "partial" if n_valid > 0 else "none"

    # Step 2: Deterministic score aggregation (Slice 1)
    scorecard = None
    flat_scores = {}
    aggregate_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    if completeness == "complete":
        scorecard = aggregate_complete_panel(valid_judgments_map)
        flat_scores = scorecard_to_flat_fields(scorecard)
        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO aggregate_versions (
                    aggregate_id, run_id, aggregation_version, scorecard_json, source_judgment_ids, created_at
                ) VALUES (?, ?, 'equal-mean-v2', ?, ?, ?)
                """,
                (aggregate_id, run_id, json.dumps(scorecard), json.dumps(list(valid_judgments_map.keys())), now_iso),
            )
            await db.commit()

    # Step 3: Evidence review (Slice 5)
    review_res = run_evidence_review(expert_panel_v1, contract.brief_text)
    review_id = str(uuid.uuid4())
    disposition = "ready"
    if review_res.get("needs_targeted_review"):
        disposition = "needs_review"

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO evidence_reviews (
                review_id, run_id, issues_json, needs_targeted_review, review_result_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                review_id,
                run_id,
                json.dumps(review_res.get("issues", [])),
                1 if review_res.get("needs_targeted_review") else 0,
                json.dumps(review_res),
                now_iso,
            ),
        )
        await db.commit()

    # Step 4: Narrative composition (Slice 5)
    synthesis_text = {}
    for r in accepted_records:
        j = r["judgment"]
        for dim in DIMENSIONS:
            key = f"{dim}_reasoning"
            if key not in synthesis_text:
                synthesis_text[key] = getattr(j.criteria, dim).rationale

    narrative = await compose_narrative(
        scorecard=scorecard or {},
        synthesis_text=synthesis_text,
        evidence_review=review_res,
    )
    narrative_status = "generated" if narrative.get("limitations") is None else "limited_fallback"

    report_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO report_versions (
                report_id, run_id, aggregate_id, narrative_json, narrative_status,
                evidence_review_id, disposition, created_at, overall_score, v1_compat_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                run_id,
                aggregate_id,
                json.dumps(narrative),
                narrative_status,
                review_id,
                disposition,
                now_iso,
                flat_scores.get("overall_score"),
                json.dumps(flat_scores),
            ),
        )
        await db.execute(
            """
            UPDATE evaluation_runs SET
                execution_status = 'completed',
                completeness = ?,
                disposition = ?,
                n_valid_judgments = ?,
                completed_at = ?
            WHERE run_id = ?
            """,
            (completeness, disposition, n_valid, now_iso, run_id),
        )
        await db.commit()

    return {
        "run_id": run_id,
        "execution_status": "completed",
        "completeness": completeness,
        "disposition": disposition,
        "n_valid_judgments": n_valid,
        "scorecard": scorecard,
        "narrative": narrative,
        "narrative_status": narrative_status,
        "expert_panel": expert_panel_v1,
        "flat_scores": flat_scores,
        "factual_review": review_res,
    }
