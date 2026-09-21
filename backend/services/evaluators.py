import os
import io
import json
import logging
import asyncio
import base64
import httpx
from pydantic import BaseModel
from openai import AsyncOpenAI
import anthropic as _anthropic
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

# ── Retry configuration for API calls ──
MAX_RETRIES = 3
RETRY_BACKOFF = [1.0, 2.0, 4.0]  # seconds between retries


async def _with_retry(coro_fn, *args, retries=MAX_RETRIES, backoff=RETRY_BACKOFF, label="API", **kwargs):
    """
    Exponential-backoff retry wrapper for async API calls.
    Retries on any exception up to `retries` times with configurable delays.
    """
    last_error = None
    for attempt in range(retries):
        try:
            return await coro_fn(*args, **kwargs)
        except Exception as e:
            last_error = e
            wait = backoff[attempt] if attempt < len(backoff) else backoff[-1]
            if attempt < retries - 1:
                logger.warning(f"{label} call failed (attempt {attempt + 1}/{retries}): {e}. Retrying in {wait}s...")
                await asyncio.sleep(wait)
            else:
                logger.error(f"{label} call failed after {retries} attempts: {e}")
    raise last_error

# Keys used to compute overall_score deterministically
SCORE_KEYS = [
    "creativity_score",
    "originality_score",
    "usefulness_relevance_score",
    "clarity_score",
    "level_of_detail_elaboration_score",
    "feasibility_score",
]

def _compute_overall_score(result_json: dict) -> float:
    """Compute overall_score as the mean of the 6 dimension scores."""
    scores = [float(result_json[k]) for k in SCORE_KEYS if k in result_json]
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 2)

def _try_repair_truncated_json(raw: str) -> dict | None:
    """
    Attempt to repair JSON that was truncated mid-string by the LLM hitting
    its max_tokens limit. The most common symptom is an unterminated string
    inside the last field (usually instructor_feedback).
    Returns the parsed dict on success, or None if repair fails.
    """
    if not raw or not raw.strip():
        return None
    text = raw.strip()
    # Try progressively more aggressive repairs
    for suffix in ['"}', '"', '']:
        candidate = text + suffix
        # Balance braces / brackets
        open_braces = candidate.count('{') - candidate.count('}')
        open_brackets = candidate.count('[') - candidate.count(']')
        candidate += ']' * max(open_brackets, 0)
        candidate += '}' * max(open_braces, 0)
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    return None

def _detect_mime_type(image_bytes: bytes) -> str:
    """Detect image MIME type from magic bytes."""
    if image_bytes[:8] == b'\x89PNG\r\n\x1a\n':
        return "image/png"
    elif image_bytes[:2] == b'\xff\xd8':
        return "image/jpeg"
    elif image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
        return "image/webp"
    elif image_bytes[:6] in (b'GIF87a', b'GIF89a'):
        return "image/gif"
    return "image/jpeg"

# Shared Output Schema for all evaluators
class EvaluationResult(BaseModel):
    creativity_score: int
    creativity_reasoning: str
    originality_score: int
    originality_reasoning: str
    usefulness_relevance_score: int
    usefulness_relevance_reasoning: str
    clarity_score: int
    clarity_reasoning: str
    level_of_detail_elaboration_score: int
    level_of_detail_elaboration_reasoning: str
    feasibility_score: int
    feasibility_reasoning: str
    instructor_feedback: str

FIXED_RUBRIC = """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 0 — ASSIGNMENT-SCOPE CALIBRATION (Do this BEFORE scoring)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before assigning any score, read the assignment description carefully and determine:
  (a) What is the student ACTUALLY asked to produce? (e.g., a construction sketch, a presentation view, a form study, a two-viewpoint drawing)
  (b) What level of resolution is reasonable for this task? (e.g., quick ideation sketch vs. polished portfolio piece)
  (c) Which elements does the assignment EXPLICITLY request?

CALIBRATION RULE — MANDATORY:
You must evaluate ONLY against the scope established by the assignment. Do NOT reduce any score because the submission is missing information that the assignment never requested. The following elements must NOT be treated as deficiencies unless the assignment explicitly asks for them:
  ✗ Material specifications or manufacturing details
  ✗ Engineering dimensions, tolerances, or annotations
  ✗ Component callouts, section drawings, or exploded views
  ✗ Shading, textures, or line-weight hierarchies
  ✗ Internal mechanisms, production tolerances, or assembly sequences
  ✗ Branding, labeling, or presentation enhancements
  ✗ Cap mechanics, dispensing details, or product-development documentation

If the assignment asks for a construction sketch + presentation view of an object, that is the entire scope. Score against that scope — not against a professional portfolio or engineering drawing standard.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — TASK COMPLIANCE vs. CAT CONSTRUCT QUALITY (Critical Separation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The assignment description serves ONE purpose in your evaluation: it establishes the context and scope so you know what evidence can reasonably be expected. It does NOT establish the quality of the submission.

ANTI-CONFLATION RULE — MANDATORY:
Task compliance must never be treated as evidence of CAT construct quality. A submission may fully satisfy the stated task requirements while still receiving low scores on individual dimensions if the underlying qualities are weak. Conversely, a submission that attempts the task correctly but produces a generic, uninventive, or poorly reasoned result must receive scores reflecting those weaknesses — not inflated scores because it followed the instructions.

These substitutions are FORBIDDEN:
  ✗ "The student followed the task" → this is NOT evidence of Creativity
  ✗ "The student produced the requested object type" → this is NOT evidence of Originality
  ✗ "The student addressed the brief" → this is NOT evidence of Usefulness/Relevance
  ✗ "This type of solution is generally feasible" → this is NOT evidence of Feasibility for this specific concept
  ✗ Procedural correctness, task adherence, or brief compliance in any form → these are NOT CAT constructs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CALIBRATED SCORING SCALE & ANCHORS (1 to 5):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These anchors describe the QUALITY of the CAT construct being measured — not the degree of task compliance:

- 1 (Emerging): The quality represented by this dimension is almost entirely absent. The submission shows negligible inventiveness, distinctiveness, relevance, clarity, elaboration, or plausibility — whichever applies.
- 2 (Developing): Weak but detectable quality. The construct is present in a rudimentary or underdeveloped form; execution is generic, predictable, or unclear.
- 3 (Competent): Adequate quality. The construct is present and sufficiently demonstrated — not exceptional, but honest and coherent. This is the expected baseline for a sincere attempt.
- 4 (Proficient): Strong quality. The construct is clearly and confidently demonstrated with noticeable craft, depth, or distinction above the expected baseline.
- 5 (Exemplary): Outstanding quality. The construct is demonstrated at a level significantly above expectations — inventive, precise, distinctive, or rigorous in ways that are genuinely impressive within the task's scope.

A score of 3 is NOT a penalty — it means the dimension is competently present. Scores of 1 or 2 require specific observable evidence of weakness in that construct, not merely absence of elements beyond the brief.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVALUATION DIMENSIONS (apply AFTER Steps 0 and 1):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CREATIVITY — Inventiveness of the concept or execution.
   Measure: How inventive, ingenious, or conceptually surprising is the submitted work within the task's scope? Does the student make unexpected or imaginative choices in form, structure, approach, or representation?
   Anti-conflation: Do NOT raise this score because the student correctly completed the task. Do NOT lower this score because the submission lacks elements outside the brief. A correct but entirely predictable response scores low on Creativity regardless of task compliance.

2. ORIGINALITY — Distinctiveness relative to familiar or expected solutions.
   Measure: How uncommon or distinctive is this concept compared to the most obvious or generic response to this type of task? Does the submission avoid clichéd, templated, or formulaic solutions?
   Anti-conflation: Do NOT reward procedural correctness, task adherence, or selecting the standard solution type. A submission that produces the conventional expected object in a conventional way scores low on Originality even if it satisfies the brief perfectly.

3. USEFULNESS_RELEVANCE — Practical value and functional appropriateness of the represented concept.
   Measure: How well does the design concept — not the task response, but the actual thing being depicted — serve a genuine functional purpose or user need within its intended context? Is the concept's design logic meaningful and applicable?
   Anti-conflation: Do NOT equate "addresses the brief" with high Usefulness/Relevance. The question is whether the concept itself has genuine practical value or functional intelligence — not whether the student responded to the prompt correctly. A well-drawn but functionally unintelligent design scores low.

4. CLARITY — Communicative quality of the visual output.
   Measure: How clearly and legibly does the sketch communicate the required visual information? Judge readability of form, line intent, spatial logic, perspective coherence, and overall communicative precision for what the assignment asks to be shown.
   Scope rule (retained): Do NOT penalize for absence of labels, annotations, or presentation enhancements that were not part of the brief.

5. LEVEL_OF_DETAIL_ELABORATION — Depth and completeness relative to task expectations.
   Measure: How completely and confidently has the student developed and communicated the elements required by the assignment? Assess whether required viewpoints, forms, construction geometry, and design intent are sufficiently elaborated — not whether additional professional documentation was provided.
   Scope rule (retained): Do NOT penalize for absence of elements beyond the requested scope. Elaboration is judged relative to what the task reasonably requires.

6. FEASIBILITY — Physical and functional plausibility of the specific submitted concept.
   Measure: Is THIS specific concept, as depicted and described, geometrically coherent, physically plausible, and buildable in principle at the resolution level appropriate for the task? Assess the specific design choices visible in the sketch — proportions, form relationships, structural logic.
   Anti-conflation: Do NOT assign a high score simply because the general category of solution (e.g., "bottles are feasible", "flanges can be made") is known to work. Assess whether the specific proportions, geometry, and design decisions depicted are coherent. A generic plausible type with incoherent or unresolved specific execution scores lower than a well-reasoned specific design.
   Scope rule (retained): Do NOT require material specs, manufacturing tolerances, or production-ready engineering detail unless explicitly requested.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY CRITIQUE REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. STRICT PERSONA LENS: Evaluate exclusively through your designated professional persona. Persona diversity influences which evidence you notice and how you professionally interpret it — it does not change what each CAT dimension measures, nor how the scope calibration or anti-conflation rules apply. All personas share the same construct definitions and scoring standards.
2. CONCRETE VISUAL EVIDENCE: In each dimension's reasoning (2-3 sentences), cite at least 1-2 specific visual features observable in the sketch. Ground your reasoning in what is actually visible and what it reveals about the CAT construct — not in task compliance or elements absent beyond the brief.
3. PEDAGOGICAL INSTRUCTOR FEEDBACK: A structured string with 3 clearly formatted sections:
   - "🎯 Diagnosis:": Catchy summary phrase followed by precise analysis of current strengths and trajectory.
   - "⚠️ Where to Pivot:": Specific blind spots or weaknesses within the requested scope to address in the next iteration.
   - "🛠️ Next Step:": Exactly one concrete, actionable sketching or design exercise the student should do immediately.

Combine all instructor feedback into a single coherent string.
Do NOT include an "overall_score" field (it is calculated deterministically).

OUTPUT FORMAT (JSON ONLY):
{
  "creativity_score": 1,
  "creativity_reasoning": "string",
  "originality_score": 1,
  "originality_reasoning": "string",
  "usefulness_relevance_score": 1,
  "usefulness_relevance_reasoning": "string",
  "clarity_score": 1,
  "clarity_reasoning": "string",
  "level_of_detail_elaboration_score": 1,
  "level_of_detail_elaboration_reasoning": "string",
  "feasibility_score": 1,
  "feasibility_reasoning": "string",
  "instructor_feedback": "string"
}
"""


async def _openai_api_call(client, model, system_prompt, description, mime_type, base64_image):
    """Inner API call for OpenAI — separated for retry wrapping."""
    return await client.chat.completions.create(
        model=model,
        response_format={ "type": "json_object" },
        temperature=0.1,
        max_completion_tokens=3000,
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Design Description: {description}"},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{base64_image}"}}
                ]
            }
        ]
    )


async def evaluate_with_openai(persona: dict, description: str, base64_image: str, mime_type: str = "image/jpeg") -> dict:
    """Evaluates the design using OpenAI with retry logic."""
    try:
        api_key = os.getenv("OPENAI_API_KEY", "placeholder")
        client = AsyncOpenAI(api_key=api_key)
        
        system_prompt = f"{persona['prompt']}\n\n{FIXED_RUBRIC}"
        
        response = await _with_retry(
            _openai_api_call, client, "gpt-4o", system_prompt, description, mime_type, base64_image,
            label="OpenAI/gpt-4o"
        )
        result_text = response.choices[0].message.content

        try:
            result_json = json.loads(result_text)
        except Exception as parse_error:
            print(f"\n--- ERROR PARSING OPENAI RESPONSE (attempting repair) ---")
            print(f"Parse Error: {parse_error}")
            repaired = _try_repair_truncated_json(result_text)
            if repaired:
                print("--- REPAIR SUCCESSFUL ---")
                result_json = repaired
            else:
                print(f"Raw Output: {result_text}")
                return {"model_provider": "OpenAI", "persona": persona, "error": f"Parse error: {parse_error}, Raw text: {result_text}"}
        
        # Compute overall_score deterministically
        result_json["overall_score"] = _compute_overall_score(result_json)
            
        print(f"\n--- RESPONSE FROM OPENAI [{persona.get('name', '?')}] ---")
        print(json.dumps(result_json, indent=2))
        return {"model_provider": "OpenAI", "persona": persona, "result": result_json}
    except Exception as e:
        logger.error(f"OpenAI Evaluator failed: {e}")
        return {"model_provider": "OpenAI", "persona": persona, "error": str(e)}

async def _xai_api_call(client, model, system_prompt, description, mime_type, base64_image):
    """Inner API call for xAI — separated for retry wrapping."""
    return await client.chat.completions.create(
        model=model,
        temperature=0.1,
        max_tokens=3000,
        response_format={ "type": "json_object" },
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Design Description: {description}"},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{base64_image}"}}
                ]
            }
        ]
    )


async def evaluate_with_xai(persona: dict, description: str, base64_image: str, mime_type: str = "image/jpeg") -> dict:
    """Evaluates the design using xAI's multimodal model with retry logic."""
    try:
        api_key = os.getenv("XAI_API_KEY", "placeholder")
        client = AsyncOpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
        
        system_prompt = f"{persona['prompt']}\n\n{FIXED_RUBRIC}"
        
        response = await _with_retry(
            _xai_api_call, client, "grok-4-1-fast-reasoning", system_prompt, description, mime_type, base64_image,
            label="xAI/grok-4-1"
        )
            
        result_text = response.choices[0].message.content
        try:
            result_json = json.loads(result_text)
        except Exception as parse_error:
            print(f"\n--- ERROR PARSING XAI RESPONSE (attempting repair) ---")
            print(f"Parse Error: {parse_error}")
            repaired = _try_repair_truncated_json(result_text)
            if repaired:
                print("--- REPAIR SUCCESSFUL ---")
                result_json = repaired
            else:
                print(f"Raw Output: {result_text}")
                return {"model_provider": "xAI", "persona": persona, "error": f"Parse error: {parse_error}"}
        
        # Compute overall_score deterministically
        result_json["overall_score"] = _compute_overall_score(result_json)
        
        print(f"\n--- RESPONSE FROM XAI [{persona.get('name', '?')}] ---")
        print(json.dumps(result_json, indent=2))
        return {"model_provider": "xAI", "persona": persona, "result": result_json}
    except Exception as e:
        logger.error(f"xAI Evaluator failed: {e}")
        print(f"Error calling xAI API: {e}")
        return {"model_provider": "xAI", "persona": persona, "error": str(e)}

async def _claude_api_call(client, system_prompt, description, uploaded_file_id):
    """Inner API call for Claude — separated for retry wrapping."""
    return await client.beta.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        temperature=0.1,
        betas=["files-api-2025-04-14"],
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "file",
                            "file_id": uploaded_file_id,
                        },
                    },
                    {"type": "text", "text": f"Design Description: {description}\n\nRespond with ONLY valid JSON matching the schema in your system prompt."}
                ],
            }
        ],
    )


async def evaluate_with_claude(persona: dict, description: str, image_bytes: bytes) -> dict:
    """Evaluates the design using Claude with Files API for large images, with retry logic."""
    api_key = os.getenv("CLAUDE_API_KEY", "placeholder")
    client = _anthropic.AsyncAnthropic(api_key=api_key)
    uploaded_file_id = None

    try:
        # Upload image via Files API to bypass 5MB base64 limit
        mime_type = _detect_mime_type(image_bytes)
        ext = mime_type.split("/")[-1]
        uploaded_file = await client.beta.files.upload(
            file=(f"design.{ext}", image_bytes, mime_type),
            betas=["files-api-2025-04-14"],
        )
        uploaded_file_id = uploaded_file.id
        print(f"Uploaded image to Claude Files API: {uploaded_file_id}")

        system_prompt = f"{persona['prompt']}\n\n{FIXED_RUBRIC}"

        response = await _with_retry(
            _claude_api_call, client, system_prompt, description, uploaded_file_id,
            label="Claude/sonnet-3.7"
        )
        result_text = response.content[0].text
        # Strip markdown code fences if Claude wraps output
        if result_text.strip().startswith("```"):
            result_text = result_text.strip().strip("`").strip()
            if result_text.lower().startswith("json"):
                result_text = result_text[4:].strip()

        try:
            result_json = json.loads(result_text)
        except Exception as parse_error:
            print(f"\n--- ERROR PARSING CLAUDE RESPONSE (attempting repair) ---")
            print(f"Parse Error: {parse_error}")
            repaired = _try_repair_truncated_json(result_text)
            if repaired:
                print("--- REPAIR SUCCESSFUL ---")
                result_json = repaired
            else:
                print(f"Raw Output: {result_text}")
                return {"model_provider": "Claude", "persona": persona, "error": f"Parse error: {parse_error}"}

        # Compute overall_score deterministically
        result_json["overall_score"] = _compute_overall_score(result_json)

        print(f"\n--- RESPONSE FROM CLAUDE [{persona.get('name', '?')}] ---")
        print(json.dumps(result_json, indent=2))
        return {"model_provider": "Claude", "persona": persona, "result": result_json}
    except Exception as e:
        logger.error(f"Claude Evaluator failed: {e}")
        print(f"\n--- ERROR FROM CLAUDE EVALUATOR ---")
        print(str(e))
        return {"model_provider": "Claude", "persona": persona, "error": str(e)}
    finally:
        # Clean up uploaded file to avoid storage buildup
        if uploaded_file_id:
            try:
                await client.beta.files.delete(
                    uploaded_file_id,
                    betas=["files-api-2025-04-14"],
                )
                print(f"Cleaned up Claude file: {uploaded_file_id}")
            except Exception as cleanup_err:
                logger.warning(f"Failed to clean up Claude file {uploaded_file_id}: {cleanup_err}")

async def run_expert_panel(personas_list: list, description: str, base64_image: str, image_bytes: bytes) -> list:
    """
    3×3 Fan-Out: Each persona is evaluated by ALL 3 LLMs (OpenAI, xAI, Claude).
    Fires 9 async tasks, limited to 3 concurrent tasks to avoid OOM limits on memory-constrained servers.
    Returns a list of 9 results, each tagged with model_provider and persona info.
    """
    mime_type = _detect_mime_type(image_bytes)
    
    # Semaphore to limit concurrent network requests and memory usage
    sem = asyncio.Semaphore(3)

    async def _bound_evaluate(coro):
        async with sem:
            return await coro

    tasks = []
    
    for persona in personas_list:
        # Each persona gets evaluated by all 3 LLMs
        tasks.append(_bound_evaluate(evaluate_with_openai(persona, description, base64_image, mime_type)))
        tasks.append(_bound_evaluate(evaluate_with_xai(persona, description, base64_image, mime_type)))
        tasks.append(_bound_evaluate(evaluate_with_claude(persona, description, image_bytes)))
    
    print(f"\n--- FIRING {len(tasks)} EVALUATIONS (Max 3 Concurrent) ---")
    
    # Run evaluations with concurrency limit
    results = await asyncio.gather(*tasks)
    return list(results)
