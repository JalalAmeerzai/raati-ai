import os
import json
import logging
import uuid
from pydantic import BaseModel, Field
from openai import AsyncOpenAI
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=api_key if api_key else "placeholder")

class Persona(BaseModel):
    persona_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8], description="Auto-generated short ID for stable grouping")
    name: str = Field(description="A realistic professional name")
    title: str = Field(description="A real-world, industry-standard job title")
    sub_text: str = Field(description="A short, punchy UI subtitle summarizing their focus (max 8 words)")
    prompt: str = Field(description="Exactly three sentences following the strict template for the evaluation prompt.")

class RecruiterResponse(BaseModel):
    personas: list[Persona]

RECRUITER_SYSTEM_PROMPT = """
You are the "Dean of Faculty" at an elite design and engineering university. Your task is to assemble a panel of 3 highly specialized expert judges to evaluate a student's design concept (which will consist of a sketch and a text description). 

Analyze the following "Assignment Instructions" provided to the student. Based entirely on the specific problem, domain, product type, and requirements of the assignment, dynamically determine the THREE most critical areas of expertise needed to evaluate the submission.

The 3 personas must evaluate the design from distinct, complementary angles tailored exactly to the assignment's core challenges. (For example: A medical device might require a "Biomedical Engineer", a "Human Factors Specialist", and a "Regulatory Affairs Specialist". A sustainable furniture piece might require a "Materials Scientist", an "Industrial Designer", and a "Supply Chain Sustainability Expert").

CRITICAL CONSTRAINTS:
- The "title" must be a dynamically generated, real-world, industry-standard job title perfectly suited to the assignment's specific domain.
- The "sub_text" must be a concise, UI-friendly summary (max 8 words) describing what specific problem they are evaluating.
- The "prompt" MUST be exactly three sentences following the strict template provided in the JSON schema below. Do not add any extra rules, conversational text, or formatting.

You MUST output your response in valid JSON format matching this exact schema:
{
  "personas": [
    {
      "name": "A realistic professional name",
      "title": "A dynamically generated, real-world job title",
      "sub_text": "A short, punchy UI subtitle summarizing their focus.",
      "prompt": "You are an expert design critic and creativity researcher. Your task is to evaluate a design concept consisting of a sketch and a text description. As a [Insert Title Here], you will focus specifically on [Insert 1-2 specific technical details related to the assignment and their expertise]."
    },
    {
      "name": "A realistic professional name",
      "title": "A dynamically generated, real-world job title",
      "sub_text": "A short, punchy UI subtitle summarizing their focus.",
      "prompt": "You are an expert design critic and creativity researcher. Your task is to evaluate a design concept consisting of a sketch and a text description. As a [Insert Title Here], you will focus specifically on [Insert 1-2 specific technical details related to the assignment and their expertise]."
    },
    {
      "name": "A realistic professional name",
      "title": "A dynamically generated, real-world job title",
      "sub_text": "A short, punchy UI subtitle summarizing their focus.",
      "prompt": "You are an expert design critic and creativity researcher. Your task is to evaluate a design concept consisting of a sketch and a text description. As a [Insert Title Here], you will focus specifically on [Insert 1-2 specific technical details related to the assignment and their expertise]."
    }
  ]
}
"""

async def generate_personas(assignment_text: str) -> dict:
    """
    Calls OpenAI gpt-4o-mini to act as the Recruiter Agent and generate 3 expert personas.
    Personas are model-agnostic — each will be evaluated by ALL 3 LLMs.
    """
    try:
        response = await client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": RECRUITER_SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": f'Assignment Instructions: "{assignment_text}"'
                }
            ],
            response_format=RecruiterResponse,
        )
        
        # Extract the structured response
        recruiter_data = response.choices[0].message.parsed
        
        # Convert to dictionary
        result_dict = recruiter_data.model_dump()
        
        print("\n--- RESPONSE FROM RECRUITER AGENT ---")
        print(json.dumps(result_dict, indent=2))
        print("---------------------------------------\n")
        
        return result_dict
        
    except Exception as e:
        logger.error(f"Recruiter Agent failed. Details: {str(e)}", exc_info=True)
        print(f"Error in Recruiter Agent: {e}")
        raise
