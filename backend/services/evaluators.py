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
You must evaluate the design on 6 dimensions using a 0-5 scale (0=Low, 5=High):

1. CREATIVITY: The general inventiveness and ingenuity of the concept.
2. ORIGINALITY: The extent to which the idea is unique and distinct from existing solutions.
3. USEFULNESS_RELEVANCE: The practical value and applicability of the design to the problem.
4. CLARITY: How well the idea is communicated and understood.
5. LEVEL_OF_DETAIL_ELABORATION: The depth and completeness of the concept's description and visualization.
6. FEASIBILITY: The technical and economic viability of implementing the design.

Start your evaluation with a structured "Instructor Feedback" section containing 3 specific components:
1. A detailed paragraph starting with a catchy summary (e.g., "You are finding the 'Goldilocks zone'!") followed by specific analysis of the student's progress and context.
2. specific advice on where to shift focus or what to avoid (e.g., "Where we need to pivot: ...").
3. A concrete, actionable next step (e.g., "Your Next Step: ...").

Combine all the feedback into a single string.

Do NOT include an "overall_score" field. It will be computed automatically.

OUTPUT FORMAT (JSON ONLY):
{
  "creativity_score": 0,
  "creativity_reasoning": "string",
  "originality_score": 0,
  "originality_reasoning": "string",
  "usefulness_relevance_score": 0,
  "usefulness_relevance_reasoning": "string",
  "clarity_score": 0,
  "clarity_reasoning": "string",
  "level_of_detail_elaboration_score": 0,
  "level_of_detail_elaboration_reasoning": "string",
  "feasibility_score": 0,
  "feasibility_reasoning": "string",
  "instructor_feedback": "string"
}
"""

async def evaluate_with_openai(persona: dict, description: str, base64_image: str, mime_type: str = "image/jpeg") -> dict:
    """Evaluates the design using OpenAI."""
    try:
        api_key = os.getenv("OPENAI_API_KEY", "placeholder")
        client = AsyncOpenAI(api_key=api_key)
        
        system_prompt = f"{persona['prompt']}\n\n{FIXED_RUBRIC}"
        
        response = await client.chat.completions.create(
            model="gpt-5.2",
            response_format={ "type": "json_object" },
            temperature=0.1,
            max_completion_tokens=800,
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
        result_text = response.choices[0].message.content
        
        # Fallback for empty response bug
        if not result_text or not result_text.strip():
            print("\n--- GPT-5.2 RETURNED EMPTY. FALLING BACK TO GPT-4o ---")
            response = await client.chat.completions.create(
                model="gpt-4o",
                response_format={ "type": "json_object" },
                temperature=0.1,
                max_tokens=800,
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
            result_text = response.choices[0].message.content

        try:
            result_json = json.loads(result_text)
        except Exception as parse_error:
            print("\n--- ERROR PARSING OPENAI RESPONSE ---")
            print(f"Raw Output: {result_text}")
            print(f"Parse Error: {parse_error}")
            return {"model_provider": "OpenAI", "persona": persona, "error": f"Parse error: {parse_error}, Raw text: {result_text}"}
        
        # Compute overall_score deterministically
        result_json["overall_score"] = _compute_overall_score(result_json)
            
        print(f"\n--- RESPONSE FROM OPENAI [{persona.get('name', '?')}] ---")
        print(json.dumps(result_json, indent=2))
        return {"model_provider": "OpenAI", "persona": persona, "result": result_json}
    except Exception as e:
        logger.error(f"OpenAI Evaluator failed: {e}")
        return {"model_provider": "OpenAI", "persona": persona, "error": str(e)}

async def evaluate_with_xai(persona: dict, description: str, base64_image: str, mime_type: str = "image/jpeg") -> dict:
    """Evaluates the design using xAI's Grok."""
    try:
        api_key = os.getenv("XAI_API_KEY", "placeholder")
        client = AsyncOpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
        
        system_prompt = f"{persona['prompt']}\n\n{FIXED_RUBRIC}"
        
        response = await client.chat.completions.create(
            model="grok-4-1-fast-reasoning",
            temperature=0.1,
            max_tokens=800,
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
        result_text = response.choices[0].message.content
        result_json = json.loads(result_text)
        
        # Compute overall_score deterministically
        result_json["overall_score"] = _compute_overall_score(result_json)
        
        print(f"\n--- RESPONSE FROM XAI [{persona.get('name', '?')}] ---")
        print(json.dumps(result_json, indent=2))
        return {"model_provider": "xAI", "persona": persona, "result": result_json}
    except Exception as e:
        logger.error(f"xAI Evaluator failed: {e}")
        print(f"Error calling xAI API: {e}")
        return {"model_provider": "xAI", "persona": persona, "error": str(e)}

async def evaluate_with_claude(persona: dict, description: str, image_bytes: bytes) -> dict:
    """Evaluates the design using Claude with Files API for large images."""
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

        response = await client.beta.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
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
        result_text = response.content[0].text
        # Strip markdown code fences if Claude wraps output
        if result_text.strip().startswith("```"):
            result_text = result_text.strip().strip("`").strip()
            if result_text.lower().startswith("json"):
                result_text = result_text[4:].strip()

        result_json = json.loads(result_text)

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
    Fires 9 async tasks in parallel.
    Returns a list of 9 results, each tagged with model_provider and persona info.
    """
    mime_type = _detect_mime_type(image_bytes)
    tasks = []
    
    for persona in personas_list:
        # Each persona gets evaluated by all 3 LLMs
        tasks.append(evaluate_with_openai(persona, description, base64_image, mime_type))
        tasks.append(evaluate_with_xai(persona, description, base64_image, mime_type))
        tasks.append(evaluate_with_claude(persona, description, image_bytes))
    
    print(f"\n--- FIRING {len(tasks)} PARALLEL EVALUATIONS (3 personas × 3 LLMs) ---")
    
    # Run all 9 evaluations simultaneously
    results = await asyncio.gather(*tasks)
    return list(results)
