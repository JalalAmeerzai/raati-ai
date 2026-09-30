# Raati 46-Chair Academic Panel Raw CAT Evaluation Dataset

- **Experiment ID:** `exp_46_chair_academic_raw_cat_20260922`
- **Pipeline Version:** `design-assessment-v3-evidence-gated`
- **Target Dataset:** All 46 Easy Chair concept designs (`design_1` through `design_46`).
- **Providers:** OpenAI (`gpt-4o`), Anthropic (`claude-sonnet-4-6`), xAI (`grok-4-1-fast-reasoning`).
- **Panel:** 3 Frozen Academic Personas (`panel_academic_fsrd_v1`):
  1. `ACADEMIC_1`: Dr. Jonathan Mercer (Creativity & Cognitive Innovation)
  2. `ACADEMIC_2`: Dr. Serena Voss (Visual Communication & Representation)
  3. `ACADEMIC_3`: Dr. Haruto Nakamura (Human-Centred Design & User Experience)
- **Architecture:** Two-Stage Evidence-Gated Execution:
  * Stage 1: Neutral Image-Only Evidence Extraction (138 records in `visual_evidence.jsonl`)
  * Stage 2: Evidence-Gated Academic CAT Scoring (414 judgments in `raw_cat_scores_wide.csv`, 2,484 rows in `raw_cat_scores_long.csv`)
- **Strict Blind Evaluation:** No exposure to human Excel ratings, no synthesizer consensus narrative, no artificial overall score.

## File Manifest:
- `raw_cat_scores_long.csv`: 2,484 rows (exact criterion-level raw scores 1–5).
- `raw_cat_scores_wide.csv`: 414 rows (9 judgments per chair).
- `visual_evidence.jsonl`: 138 image-only evidence extraction records.
- `validated_numeric_responses.jsonl`: 414 validated structured evaluation records.
- `run_status.csv`: Slot-by-slot tracking of all 414 planned evaluations.
- `image_manifest.csv`: Verified metadata and SHA-256 for all 46 chairs.
- `persona_manifest.csv`: Profile hashes and canaries for the 3 academic personas.
- `provider_manifest.csv`: Model parameters and adapter versions.
- `failures.csv`: Log of any failed attempts (0 failures observed).
- `validation_summary.json`: §18 mandatory completeness validation assertion results.
