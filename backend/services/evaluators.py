import os
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
    overall_score: int
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
  "overall_score": 0,
  "instructor_feedback": "string"
}
"""

async def evaluate_with_openai(persona: dict, description: str, base64_image: str) -> dict:
    """Evaluates the design using OpenAI's gpt-5.4."""
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
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ]
        )
        result_text = response.choices[0].message.content
        
        # Fallback for gpt-5.4 empty string bug
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
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
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
            return {"assigned_model": "OpenAI", "persona": persona, "error": f"Parse error: {parse_error}, Raw text: {result_text}"}
            
        print("\n--- RESPONSE FROM OPENAI EVALUATOR ---")
        print(json.dumps(result_json, indent=2))
        return {"assigned_model": "OpenAI", "persona": persona, "result": result_json}
    except Exception as e:
        logger.error(f"OpenAI Fast Evaluator failed: {e}")
        return {"assigned_model": "OpenAI", "persona": persona, "error": str(e)}

async def evaluate_with_xai(persona: dict, description: str, base64_image: str) -> dict:
    """Evaluates the design using xAI's grok-2-vision."""
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
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                    ]
                }
            ]
        )
        result_text = response.choices[0].message.content
        result_json = json.loads(result_text)
        
        print("\n--- RESPONSE FROM XAI EVALUATOR ---")
        print(json.dumps(result_json, indent=2))
        return {"assigned_model": "xAI", "persona": persona, "result": result_json}
    except Exception as e:
        logger.error(f"xAI Fast Evaluator failed: {e}")
        print(f"Error calling xAI API: {e}")
        return {"assigned_model": "xAI", "persona": persona, "error": str(e)}

async def evaluate_with_gemini(persona: dict, description: str, base64_image: str) -> dict:
    """Evaluates the design using Gemini gemini-2.5-pro over HTTP API."""
    try:
        api_key = os.getenv("GEMINI_API_KEY", "placeholder")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={api_key}"
        
        system_prompt = f"{persona['prompt']}\n\n{FIXED_RUBRIC}"
        
        payload = {
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [{
                "parts": [
                    {"text": f"Design Description: {description}"},
                    {"inlineData": {"mimeType": "image/jpeg", "data": base64_image}}
                ]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
                "maxOutputTokens": 800
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=60.0)
            
        if response.status_code == 200:
            data = response.json()
            try:
                # Extract text
                result_text = data['candidates'][0]['content']['parts'][0]['text']
                result_json = json.loads(result_text)
                
                print("\n--- RESPONSE FROM GEMINI EVALUATOR ---")
                print(json.dumps(result_json, indent=2))
                return {"assigned_model": "Gemini", "persona": persona, "result": result_json}
            except Exception as parse_e:
                print(f"\n--- ERROR FROM GEMINI EVALUATOR ---")
                print(f"Parse error: {parse_e}\nFull body: {data}")
                return {"assigned_model": "Gemini", "persona": persona, "error": f"Parse error: {parse_e}, Full response: {data}"}
        else:
            print(f"\n--- ERROR FROM GEMINI EVALUATOR ---")
            print(f"HTTP {response.status_code}: {response.text}")
            return {"assigned_model": "Gemini", "persona": persona, "error": f"HTTP {response.status_code}: {response.text}"}
    except Exception as e:
        logger.error(f"Gemini Fast Evaluator failed: {e}")
        print(f"\n--- ERROR FROM GEMINI EVALUATOR ---")
        print(str(e))
        return {"assigned_model": "Gemini", "persona": persona, "error": str(e)}

async def evaluate_with_claude(persona: dict, description: str, base64_image: str) -> dict:
    """Evaluates the design using Anthropic's claude-3-5-sonnet with vision."""
    try:
        api_key = os.getenv("CLAUDE_API_KEY", "placeholder")
        client = _anthropic.AsyncAnthropic(api_key=api_key)

        system_prompt = f"{persona['prompt']}\n\n{FIXED_RUBRIC}"

        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=800,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": base64_image,
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

        print("\n--- RESPONSE FROM CLAUDE EVALUATOR ---")
        print(json.dumps(result_json, indent=2))
        return {"assigned_model": "Claude", "persona": persona, "result": result_json}
    except Exception as e:
        logger.error(f"Claude Fast Evaluator failed: {e}")
        print(f"\n--- ERROR FROM CLAUDE EVALUATOR ---")
        print(str(e))
        return {"assigned_model": "Claude", "persona": persona, "error": str(e)}

async def run_expert_panel(personas_list: list, description: str, base64_image: str) -> list:
    """
    Takes the personas generated by the Recruiter and runs them concurrently against the assigned APIs.
    """
    tasks = []
    
    for persona in personas_list:
        model = persona.get("assigned_model")
        if model == "OpenAI":
            tasks.append(evaluate_with_openai(persona, description, base64_image))
        elif model == "xAI":
            tasks.append(evaluate_with_xai(persona, description, base64_image))
        elif model == "Claude":
            tasks.append(evaluate_with_claude(persona, description, base64_image))
        elif model == "Gemini":
            print("Skipping Gemini as requested by user.")
            # tasks.append(evaluate_with_gemini(persona, description, base64_image))
    
    # Run all evaluations simultaneously
    results = await asyncio.gather(*tasks)
    return results
