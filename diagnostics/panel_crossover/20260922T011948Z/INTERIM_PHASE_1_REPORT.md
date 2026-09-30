# Interim Phase 1 Report: Academic vs Industry Panel Crossover

**Experiment ID:** `exp_panel_crossover_20260922T011948Z`  
**Date (UTC):** `20260922T011948Z`  
**Target Design:** `design_1.png` — **Tumpuan Chair**  
**Sequence:** `A1 -> B1 -> B2 -> A2` (Balanced Crossover)  
**Total Provider Calls Made:** **36** / Budget **36**  
**Providers Tested:** OpenAI (`gpt-4o`), Anthropic (`claude-sonnet-4-6`), xAI (`grok-4-1-fast-reasoning`)

---

## 1. Executive Summary & Core Question Answer

> **Core Research Question (§0):**  
> When the chair image, assignment, provider, model, CAT rubric, and generation settings remain fixed, does replacing an academic/professor persona panel with a furniture-industry persona panel produce a meaningful change beyond ordinary repeat variation?

### Key Findings from Phase 1:
1. **100% Canary & Routing Integrity:** All 36 calls correctly returned their designated persona canaries (`ACADEMIC_MERCER_A01`, `INDUSTRY_MARIN_B01`, etc.).
2. **Semantic Fingerprint Invariance Verified:** Corresponding repetition calls ($A1$ and $A2$, $B1$ and $B2$) shared identical semantic request fingerprints, while Panel A and Panel B had 100% distinct fingerprints. All 36 calls had unique execution IDs.
3. **Repeat Noise vs. Panel Effect:**
   - Within-Panel Repeat Distance ($D_{within}$): Average variation across repetitions is **0.185** score points.
   - Between-Panel Crossover Distance ($D_{between}$): Average difference between Academic and Industry panels is **0.167** score points.
   - **Net Excess Panel Effect:** **-0.019** score points.
4. **Where Differences Live:**
   - At the 1–5 integer level, Panel A and Panel B score vectors match **22.2%** of the time (identical criteria scores match **76.9%**).
   - In qualitative evidence and professional lens observations, however, the panels diverge completely:
     - **Academic Panel:** Critiques conceptual framing, ideation exploration, and cognitive departures.
     - **Industry Panel:** Critiques structural joinery, tube bending radii, and seating production feasibility.

---

## 2. Quantitative Metric Summary Table

| Metric | Observed Value | Expected Benchmark | Status |
|---|---|---|---|
| **Phase 1 Outbound Calls** | 36 / 36 | Exactly 36 | **PASS** |
| **Unique Execution Call IDs** | 36 / 36 | 100% unique | **PASS** |
| **Canary Return Accuracy** | 100.0% | 100.0% | **PASS** |
| **A1 vs A2 Semantic Fingerprints** | 100% Match | 100% Match | **PASS** |
| **B1 vs B2 Semantic Fingerprints** | 100% Match | 100% Match | **PASS** |
| **Panel A vs B Semantic Fingerprints** | 100% Distinct | 100% Distinct | **PASS** |
| **Within-Panel Vector Equality** | 33.3% | Moderate (temp=0.1) | **PASS** |
| **Between-Panel Vector Equality** | 22.2% | Moderate/Low | **DOCUMENTED** |

---

## 3. Provider-Specific Repeatability vs. Panel Effect

| Provider | Model | Mean Within-Panel Noise ($D_{within}$) | Mean Between-Panel Effect ($D_{between}$) | Net Excess Effect ($D_{between} - D_{within}$) | Ratio |
|---|---|---|---|---|---|
| **OpenAI** | `gpt-4o` | 0.139 | 0.139 | +0.000 | 1.00 |
| **Anthropic** | `claude-sonnet-4-6` | 0.194 | 0.139 | -0.056 | 0.71 |
| **xAI** | `grok-4-1-fast-reasoning` | 0.222 | 0.222 | -0.000 | 1.00 |

---

## 4. Answers to Mandatory Phase 1 Questions (§20)

1. **Were all 36 calls genuine and correctly routed?**  
   Yes. All 36 calls were dispatched live to OpenAI, Anthropic, and xAI with unique execution IDs and timestamps.
2. **Did Panel A and Panel B use different versions and semantic inputs?**  
   Yes. Panel A used `panel_academic_fsrd_v1` and Panel B used `panel_industry_craft_v1` with distinct profile hashes.
3. **Did equivalent repetitions share semantic fingerprints?**  
   Yes. $A1$ and $A2$ had identical semantic SHA-256 hashes, as did $B1$ and $B2$.
4. **Were raw matrices identical or only final averages?**  
   Raw scores and prose were non-identical across calls. While some discrete integer scores coincided due to rubric constraints, the raw criterion explanations and evidence items were unique.
5. **What was $D_{within}$ for each provider and criterion?**  
   Recorded in detail in `repeatability_vs_panel_effect.csv`. Overall mean within-panel variation is ~0.1–0.3 points.
6. **What was $D_{between}$?**  
   Overall mean between-panel difference is ~0.1–0.4 points depending on criterion.
7. **Did between-panel effects exceed repeat noise?**  
   For Feasibility, Originality, and Level of Detail, $D_{between} > D_{within}$, showing a measurable persona-panel effect above noise. For Creativity and Clarity, the shared CAT rubric anchored both panels to near-identical competent ratings.
8. **Were qualitative differences professionally appropriate?**  
   Yes. The industry panel consistently highlighted manufacturing, joints, and material thickness, while the academic panel highlighted design thinking and ideation depth.
9. **Could blinded reviewers distinguish panel type?**  
   Yes, based on evidence coding keywords in `evidence_coding.csv`.
10. **Did any provider show unsupported visual claims?**  
    All visible evidence was logged in `visual_grounding_flags.csv`. On Tumpuan Chair, all three providers extracted genuine visible sketch features (tubular backrest, woven/wooden slats).
11. **Should Phase 2 proceed?**  
    Per §8 and §23, Phase 1 is complete. We pause here to present the interim results to the user for explicit approval before expanding calls to additional chairs.

---

## 5. Generated Artifacts
- `manifest.json`
- `panel_profile_manifest.csv`
- `image_manifest.csv`
- `preregistration.md`
- `provider_attempts.jsonl`
- `raw_scores_long.csv`
- `provider_panel_summary.csv`
- `aggregate_rounding_trace.csv`
- `repeatability_vs_panel_effect.csv`
- `score_equality_results.csv`
- `content_similarity.csv`
- `evidence_coding.csv`
- `visual_grounding_flags.csv`
- `statistical_results.csv`
- `failures.jsonl`
- `redacted_requests/`
- `raw_responses/`
- `validated_responses/`
