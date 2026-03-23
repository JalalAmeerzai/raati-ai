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
You are a Chief Assessment Officer synthesizing multiple expert evaluations of a design concept into a single authoritative report.

You will receive 9 expert evaluations in JSON format (3 expert personas × 3 AI models each). Your task is:

1. For each of the 6 dimensions, compute the MEAN score across ALL evaluations (round to 1 decimal place) and write a single synthesized reasoning paragraph (2-3 sentences max) that captures the key insights from across all evaluators.

2. Write 3-part instructor feedback:
   - intro: A single paragraph starting with a catchy memorable phrase that summarizes the overall performance.
   - pivot: Specific, actionable advice on what area needs the most attention.
   - next_step: A single concrete, immediate action the student can take.

3. The overall_score must be the mathematical mean of ALL experts' dimension scores (round to 2 decimal places).

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

Overall ICC value: {overall_icc}
Overall ICC interpretation: {overall_icc_interp}
Per-persona ICC values: {per_persona_icc}
Two-Way ANOVA model effect p-value: {model_p}
Two-Way ANOVA persona effect p-value: {persona_p}
Highest-variance dimension: {outlier_dim}

Write a JSON response with:
- "icc_label": A 1-2 word badge label (e.g. "Excellent", "Good", "Moderate", "Poor")
- "icc_message": One plain-English sentence explaining what the overall ICC score means for the student.
- "anova_message": One plain-English sentence summarizing the ANOVA results — whether different AI models or different expert lenses produced significantly different scores.

Return ONLY the JSON object, no other text.
"""


def _build_long_df(expert_results: list) -> pd.DataFrame:
    """Build a long-format DataFrame from the 9 expert results."""
    rows = []
    for expert in expert_results:
        result = expert.get("result", {})
        model = expert.get("model_provider", "Unknown")
        persona = expert.get("persona", {})
        persona_id = persona.get("persona_id", "unknown")
        persona_name = persona.get("name", "Unknown")
        if not result:
            continue
        for dim_key, dim_label in zip(DIMENSION_KEYS, DIMENSION_LABELS):
            score = result.get(dim_key)
            if score is not None:
                try:
                    rows.append({
                        "dimension": dim_label,
                        "model_provider": model,
                        "persona_id": persona_id,
                        "persona_name": persona_name,
                        "score": float(score)
                    })
                except (TypeError, ValueError):
                    pass
    return pd.DataFrame(rows)


def _compute_per_persona_icc(df: pd.DataFrame) -> list:
    """Compute ICC3 for each persona — measures LLM agreement within each expert lens."""
    results = []
    for pid in df["persona_id"].unique():
        persona_df = df[df["persona_id"] == pid].copy()
        persona_name = persona_df["persona_name"].iloc[0] if len(persona_df) > 0 else "Unknown"

        try:
            icc_results = pg.intraclass_corr(
                data=persona_df,
                targets="dimension",
                raters="model_provider",
                ratings="score"
            )
            icc_row = icc_results[icc_results["Type"].isin(["ICC3", "ICC2"])].iloc[0]
            icc_val = round(float(icc_row["ICC"]), 3)

            if icc_val >= 0.75:
                label = "Excellent"
            elif icc_val >= 0.6:
                label = "Good"
            elif icc_val >= 0.4:
                label = "Moderate"
            else:
                label = "Poor"

            results.append({
                "persona_id": pid,
                "persona_name": persona_name,
                "icc": icc_val,
                "label": label
            })
        except Exception as e:
            logger.warning(f"ICC calculation failed for persona {pid}: {e}")
            results.append({
                "persona_id": pid,
                "persona_name": persona_name,
                "icc": None,
                "label": "N/A"
            })

    return results


def _compute_overall_icc(df: pd.DataFrame) -> dict:
    """Compute overall ICC across all 9 evaluations."""
    try:
        # Create a unique rater ID for each (model_provider, persona_id) combo
        df_copy = df.copy()
        df_copy["rater"] = df_copy["model_provider"] + "_" + df_copy["persona_id"]

        icc_results = pg.intraclass_corr(
            data=df_copy,
            targets="dimension",
            raters="rater",
            ratings="score"
        )
        icc_row = icc_results[icc_results["Type"].isin(["ICC2", "ICC3"])].iloc[0]
        icc_val = round(float(icc_row["ICC"]), 3)

        if icc_val >= 0.75:
            interp = "excellent"
        elif icc_val >= 0.6:
            interp = "good"
        elif icc_val >= 0.4:
            interp = "moderate"
        else:
            interp = "poor"

        return {"score": icc_val, "interp": interp}
    except Exception as e:
        logger.warning(f"Overall ICC calculation failed: {e}")
        return {"score": None, "interp": "unavailable"}


def _compute_two_way_anova(df: pd.DataFrame) -> dict:
    """
    Two-Way Repeated Measures ANOVA.
    Factors: model_provider × persona_name on CAT scores.
    """
    try:
        # For RM-ANOVA we need 'subject' as the within-subject grouping.
        # Here, 'dimension' serves as the subject (the items being rated).
        anova_results = pg.rm_anova(
            data=df,
            dv="score",
            within="model_provider",
            subject="dimension",
            detailed=True
        )
        model_p = round(float(anova_results["p_unc"].iloc[0]), 4)

        # separate ANOVA for persona effect
        anova_persona = pg.rm_anova(
            data=df,
            dv="score",
            within="persona_name",
            subject="dimension",
            detailed=True
        )
        persona_p = round(float(anova_persona["p_unc"].iloc[0]), 4)

        return {
            "model_effect": {
                "F": round(float(anova_results["F"].iloc[0]), 3),
                "p": model_p,
                "significant": model_p < 0.05
            },
            "persona_effect": {
                "F": round(float(anova_persona["F"].iloc[0]), 3),
                "p": persona_p,
                "significant": persona_p < 0.05
            }
        }
    except Exception as e:
        logger.warning(f"Two-Way ANOVA failed: {e}")
        return {
            "model_effect": {"F": None, "p": None, "significant": False},
            "persona_effect": {"F": None, "p": None, "significant": False}
        }


def _compute_statistics(expert_results: list) -> dict:
    """
    Full statistical analysis for the 3×3 matrix:
    - Per-persona ICC3
    - Overall ICC
    - Two-Way RM-ANOVA (model_provider × persona_name)
    """
    df = _build_long_df(expert_results)

    if len(df) < 6:
        return {
            "per_persona_icc": [],
            "overall_icc": {"score": None, "interp": "unavailable"},
            "two_way_anova": {
                "model_effect": {"F": None, "p": None, "significant": False},
                "persona_effect": {"F": None, "p": None, "significant": False}
            },
            "outlier_dim": "unknown"
        }

    per_persona = _compute_per_persona_icc(df)
    overall = _compute_overall_icc(df)
    anova = _compute_two_way_anova(df)

    # Find dimension with highest variance between raters
    try:
        outlier_dim = df.groupby("dimension")["score"].std().idxmax()
    except Exception:
        outlier_dim = "unknown"

    return {
        "per_persona_icc": per_persona,
        "overall_icc": overall,
        "two_way_anova": anova,
        "outlier_dim": outlier_dim
    }


async def _get_stat_interpretation(stats: dict) -> dict:
    """Ask gpt-4o to translate the computed stats numbers into plain English."""
    prompt = ICC_INTERPRETATION_PROMPT.format(
        overall_icc=stats.get("overall_icc", {}).get("score", "N/A"),
        overall_icc_interp=stats.get("overall_icc", {}).get("interp", "unavailable"),
        per_persona_icc=json.dumps(stats.get("per_persona_icc", []), default=str),
        model_p=stats.get("two_way_anova", {}).get("model_effect", {}).get("p", "N/A"),
        persona_p=stats.get("two_way_anova", {}).get("persona_effect", {}).get("p", "N/A"),
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
    Main entry point: runs math then LLM synthesis for the 3×3 matrix.
    Returns a dict with merged scores, feedback, and stats.
    """
    # Step 1: Filter to only successful results
    valid_results = [r for r in expert_results if "result" in r]

    if not valid_results:
        raise ValueError("No valid expert results to synthesize.")

    # Step 2: Run Python math for ICC and ANOVA
    print("\nRunning statistical calculations (per-persona ICC + Two-Way ANOVA)...")
    raw_stats = _compute_statistics(expert_results)
    print(f"  Overall ICC: {raw_stats.get('overall_icc', {}).get('score')} ({raw_stats.get('overall_icc', {}).get('interp')})")
    print(f"  Per-persona ICCs: {json.dumps(raw_stats.get('per_persona_icc', []), default=str)}")
    anova = raw_stats.get("two_way_anova", {})
    print(f"  ANOVA model p={anova.get('model_effect', {}).get('p')}, persona p={anova.get('persona_effect', {}).get('p')}")

    # Step 3: LLM synthesis of scores and feedback
    experts_text = "\n\n".join([
        f"Expert {i+1} ({r.get('model_provider', '?')}, Persona: {r.get('persona', {}).get('name', '?')}):\n{json.dumps(r.get('result', {}), indent=2)}"
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

    # Step 4: LLM translates stats into readable text
    stat_text = await _get_stat_interpretation(raw_stats)
    print(f"\n--- STAT INTERPRETATION ---")
    print(json.dumps(stat_text, indent=2))

    # Step 5: Assemble final stats object for the frontend
    overall_icc = raw_stats.get("overall_icc", {})
    interp = overall_icc.get("interp", "unavailable")

    synthesis["stats"] = {
        "overall_icc": {
            "score": overall_icc.get("score"),
            "label": stat_text.get("icc_label", "N/A"),
            "message": stat_text.get("icc_message", ""),
            "bg": "bg-green-50" if interp in ["excellent", "good"] else "bg-yellow-50",
            "color": "text-green-700" if interp in ["excellent", "good"] else "text-yellow-700",
            "border": "border-green-200" if interp in ["excellent", "good"] else "border-yellow-200",
        },
        "per_persona_icc": raw_stats.get("per_persona_icc", []),
        "two_way_anova": raw_stats.get("two_way_anova", {}),
        "anova_message": stat_text.get("anova_message", ""),
    }

    return synthesis
