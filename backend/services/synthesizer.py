import os
import json
import logging
import pandas as pd
import pingouin as pg
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)
api_key = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=api_key if api_key else "placeholder")

DIMENSION_KEYS = [
    "creativity_score",
    "originality_score",
    "usefulness_relevance_score",
    "clarity_score",
    "level_of_detail_elaboration_score",
    "feasibility_score",
]

DIMENSION_LABELS = [
    "creativity",
    "originality",
    "usefulness_relevance",
    "clarity",
    "level_of_detail_elaboration",
    "feasibility",
]

SYNTHESIS_SYSTEM_PROMPT = """
You are a Chief Assessment Officer synthesizing two expert evaluations of a design concept into a single authoritative report.

You will receive two expert evaluations in JSON format. Your task is:

1. For each of the 6 dimensions, compute the MEAN score across both experts (round to 1 decimal place) and write a single synthesized reasoning paragraph (2-3 sentences max) that captures the key insights from both evaluators.

2. Write 3-part instructor feedback:
   - intro: A single paragraph starting with a catchy memorable phrase that summarizes the overall performance.
   - pivot: Specific, actionable advice on what area needs the most attention.
   - next_step: A single concrete, immediate action the student can take.

3. The overall_score must be the mathematical mean of both experts' overall_score values (round to 2 decimal places).

Return ONLY valid JSON in this exact schema:
{
  "creativity_score": 0.0,
  "creativity_reasoning": "string",
  "originality_score": 0.0,
  "originality_reasoning": "string",
  "usefulness_relevance_score": 0.0,
  "usefulness_relevance_reasoning": "string",
  "clarity_score": 0.0,
  "clarity_reasoning": "string",
  "level_of_detail_elaboration_score": 0.0,
  "level_of_detail_elaboration_reasoning": "string",
  "feasibility_score": 0.0,
  "feasibility_reasoning": "string",
  "overall_score": 0.0,
  "instructor_feedback_intro": "string",
  "instructor_feedback_pivot": "string",
  "instructor_feedback_next_step": "string"
}
"""

ICC_INTERPRETATION_PROMPT = """
You are a statistics communicator for a student-facing design evaluation report.
Given the following mathematically-computed statistics, write brief, plain-English interpretations.

ICC value: {icc}
ICC interpretation: {icc_interp}
ANOVA p-value: {p_value}
ANOVA significant: {anova_sig}
Highest-variance dimension: {outlier_dim}

Write a JSON response with:
- "icc_label": A 1-2 word badge label (e.g. "Excellent", "Good", "Moderate", "Poor")
- "icc_message": One plain-English sentence explaining what this ICC score means for the student.
- "anova_message": One plain-English sentence explaining what the ANOVA result means — be specific about the dimension.

Return ONLY the JSON object, no other text.
"""

def _compute_statistics(expert_results: list) -> dict:
    """
    Computes ICC and Repeated Measures ANOVA from the expert panel scores.
    Uses pingouin for academically rigorous calculations.
    """
    # Build a long-format DataFrame: one row per (dimension, judge, score)
    rows = []
    for expert in expert_results:
        result = expert.get("result", {})
        judge = expert.get("assigned_model", "Unknown")
        if not result:
            continue
        for dim_key, dim_label in zip(DIMENSION_KEYS, DIMENSION_LABELS):
            score = result.get(dim_key)
            if score is not None:
                try:
                    rows.append({
                        "dimension": dim_label,
                        "judge": judge,
                        "score": float(score)
                    })
                except (TypeError, ValueError):
                    pass

    if len(rows) < 2:
        return {
            "icc": None,
            "icc_label": "N/A",
            "icc_message": "Not enough data to compute ICC.",
            "p_value": None,
            "anova_message": "Not enough data to compute ANOVA.",
        }

    df = pd.DataFrame(rows)

    # ---- ICC Calculation ----
    try:
        icc_results = pg.intraclass_corr(
            data=df,
            targets="dimension",  # Items being graded (6 dimensions)
            raters="judge",        # AI models
            ratings="score"        # The 0-5 scores
        )
        # Use ICC2 or ICC3 (Two-way mixed, absolute agreement)
        icc_row = icc_results[icc_results["Type"].isin(["ICC2", "ICC3"])].iloc[0]
        icc_val = round(float(icc_row["ICC"]), 3)

        if icc_val >= 0.75:
            icc_interp = "excellent"
        elif icc_val >= 0.6:
            icc_interp = "good"
        elif icc_val >= 0.4:
            icc_interp = "moderate"
        else:
            icc_interp = "poor"
    except Exception as e:
        logger.warning(f"ICC calculation failed: {e}")
        icc_val = None
        icc_interp = "unavailable"

    # ---- Repeated Measures ANOVA ----
    try:
        anova_results = pg.rm_anova(
            data=df,
            dv="score",
            within="judge",
            subject="dimension",
            detailed=True
        )
        p_value = round(float(anova_results["p_unc"].iloc[0]), 4)
        anova_sig = p_value < 0.05

        # Find dimension with highest variance between raters
        pivot = df.groupby("dimension")["score"].std().idxmax()
    except Exception as e:
        logger.warning(f"ANOVA calculation failed: {e}")
        p_value = None
        anova_sig = False
        pivot = "unknown"

    return {
        "icc": icc_val,
        "icc_interp": icc_interp,
        "p_value": p_value,
        "anova_sig": anova_sig,
        "outlier_dim": pivot,
    }


async def _get_stat_interpretation(stats: dict) -> dict:
    """Ask gpt-4o to translate the computed stats numbers into plain English."""
    prompt = ICC_INTERPRETATION_PROMPT.format(
        icc=stats.get("icc", "N/A"),
        icc_interp=stats.get("icc_interp", "unavailable"),
        p_value=stats.get("p_value", "N/A"),
        anova_sig=stats.get("anova_sig", False),
        outlier_dim=stats.get("outlier_dim", "unknown")
    )
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"ICC interpretation LLM call failed: {e}")
        return {
            "icc_label": "N/A",
            "icc_message": "Unable to compute reliability interpretation.",
            "anova_message": "Unable to compute variance interpretation.",
        }


async def synthesize(expert_results: list) -> dict:
    """
    Main entry point: runs math then LLM synthesis.
    Returns a dict with merged scores, feedback, and stats.
    """
    # Step 1: Filter to only successful results
    valid_results = [r for r in expert_results if "result" in r]

    if not valid_results:
        raise ValueError("No valid expert results to synthesize.")

    # Step 2: Run Python math for ICC and ANOVA
    print("\nRunning statistical calculations (ICC + ANOVA)...")
    raw_stats = _compute_statistics(expert_results)
    print(f"  ICC: {raw_stats.get('icc')} ({raw_stats.get('icc_interp')})")
    print(f"  ANOVA p-value: {raw_stats.get('p_value')}, Significant: {raw_stats.get('anova_sig')}")

    # Step 3: LLM synthesis of scores and feedback
    experts_text = "\n\n".join([
        f"Expert {i+1} ({r['assigned_model']}):\n{json.dumps(r.get('result', {}), indent=2)}"
        for i, r in enumerate(valid_results)
    ])

    print("Starting LLM Synthesis (gpt-4o)...")
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1200,
            messages=[
                {"role": "system", "content": SYNTHESIS_SYSTEM_PROMPT},
                {"role": "user", "content": f"Expert Evaluations:\n\n{experts_text}"}
            ]
        )
        synthesis = json.loads(response.choices[0].message.content)
        print("\n--- RESPONSE FROM SYNTHESIS AGENT ---")
        print(json.dumps(synthesis, indent=2))
    except Exception as e:
        logger.error(f"Synthesis LLM call failed: {e}")
        raise

    # Step 4: LLM translates ICC + ANOVA numbers into readable text
    stat_text = await _get_stat_interpretation(raw_stats)
    print(f"\n--- STAT INTERPRETATION ---")
    print(json.dumps(stat_text, indent=2))

    # Step 5: Assemble final stats object for the frontend
    synthesis["stats"] = {
        "icc": {
            "score": raw_stats.get("icc"),
            "label": stat_text.get("icc_label", "N/A"),
            "message": stat_text.get("icc_message", ""),
            "bg": "bg-green-50" if raw_stats.get("icc_interp") in ["excellent", "good"] else "bg-yellow-50",
            "color": "text-green-700" if raw_stats.get("icc_interp") in ["excellent", "good"] else "text-yellow-700",
            "border": "border-green-200" if raw_stats.get("icc_interp") in ["excellent", "good"] else "border-yellow-200",
        },
        "anova": {
            "p_value": raw_stats.get("p_value"),
            "significant": raw_stats.get("anova_sig"),
            "message": stat_text.get("anova_message", ""),
        }
    }

    return synthesis
