import os
import json
import base64
import logging
from openai import AsyncOpenAI
from dotenv import load_dotenv

from .agents import generate_personas
from .evaluators import run_expert_panel
from .synthesizer import synthesize

logger = logging.getLogger(__name__)

load_dotenv()

# Initialize client (will use OPENAI_API_KEY from environment)
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    # Use placeholder to allow app startup without key
    client = AsyncOpenAI(api_key="placeholder")
else:
    client = AsyncOpenAI()

SYSTEM_PROMPT = """
You are an expert design critic and creativity researcher. Your task is to evaluate a design concept consisting of a sketch and a text description.

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

async def evaluate_design(image_file, description: str):
    """
    Calls Recruiter Agent -> 3×3 Expert Panel (3 personas × 3 LLMs = 9 evaluations).
    """
    # 1. Read Image
    await image_file.seek(0)
    image_bytes = await image_file.read()
    base64_image = base64.b64encode(image_bytes).decode('utf-8')

    try:
        # 2. Recruiter Agent
        print("Starting Recruiter Agent...")
        recruiter_response = await generate_personas(description)
        personas = recruiter_response.get("personas", [])
        print("Recruiter Agent finished successfully.")

        # 3. Fan-Out Expert Panel Evaluation
        print("Starting Fan-Out Expert Evaluation...")
        expert_results = await run_expert_panel(personas, description, base64_image, image_bytes)
        print("Fan-Out Evaluation finished successfully.")

        # 4. Part 3: Synthesis + Statistical Analysis
        print("Starting Synthesis & Statistical Analysis...")
        synthesis = await synthesize(expert_results)
        print("Synthesis finished successfully.")

        # Shallow copy to avoid circular reference, then attach panel + stats
        return_result = dict(synthesis)
        return_result["expert_panel"] = expert_results

        return return_result
        
    except Exception as e:
        logger.error(f"Multi-Agent Evaluation failed. Details: {str(e)}", exc_info=True)
        print(f"Error calling multi-agent pipeline: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"AI Evaluation Failed: {str(e)}")
