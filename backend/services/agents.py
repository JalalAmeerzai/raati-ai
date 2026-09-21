import os
import json
import logging
import uuid
from pydantic import BaseModel, Field
import anthropic
from dotenv import load_dotenv
from typing import Optional

logger = logging.getLogger(__name__)
load_dotenv()

api_key = os.getenv("CLAUDE_API_KEY")
client = anthropic.AsyncAnthropic(api_key=api_key if api_key else "placeholder")

class DomainAnalysis(BaseModel):
    identified_task: str = Field(description="Brief description of what the student is asked TO DO (the activity/skill being tested)")
    key_instruction_words: list[str] = Field(description="List of task verbs/phrases extracted from the assignment instructions that justify the domain classification")
    domain: str = Field(description="One of: VISUAL_ARTISTIC, ENGINEERING_TECHNICAL, or MIXED")
    rationale: str = Field(description="One sentence justifying the domain classification based on the actual instruction words")

class Persona(BaseModel):
    persona_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8], description="Auto-generated short ID for stable grouping")
    name: str = Field(description="A realistic professional name")
    title: str = Field(description="A real-world, industry-standard job title")
    sub_text: str = Field(description="A short, punchy UI subtitle summarizing their focus (max 8 words)")
    prompt: str = Field(description="Exactly three sentences following the strict template for the evaluation prompt.")

class RecruiterResponse(BaseModel):
    domain_analysis: DomainAnalysis
    personas: list[Persona]

RECRUITER_SYSTEM_PROMPT = """
You are the "Dean of Faculty" at an elite design university. Your task is to assemble a panel of 3 expert judges to evaluate a student's design submission (sketch + text description).

━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — INSTRUCTION PARSING (Mandatory)
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Read the Assignment Instructions EXTREMELY carefully.

Extract ONLY what the instructions are asking the student TO DO (the task/activity/skill being tested), NOT what the subject matter or object is.

Ask yourself: "What skill or activity is the instructor testing?"

CRITICAL EXAMPLES:
✓ "Sketch a juicer mixer using 3-point perspective" → Task = SKETCHING SKILL in perspective drawing.
  Domain = VISUAL_ARTISTIC. The juicer is merely the subject, not the domain.

✓ "Design a child-proof juicer that meets EU safety regulations" → Task = SAFETY ENGINEERING DESIGN.
  Domain = ENGINEERING_TECHNICAL.

✓ "Create an ideation sketch with construction lines and multiple viewpoints" → Task = IDEATION SKETCHING.
  Domain = VISUAL_ARTISTIC regardless of the object depicted.

✓ "Propose a novel blending mechanism with material specifications" → Task = MECHANICAL DESIGN.
  Domain = ENGINEERING_TECHNICAL.

✓ "Draw a mechanical flange from three orthographic views with proper line weights" → Task = TECHNICAL DRAWING SKILL.
  Domain = VISUAL_ARTISTIC. The flange is the subject; the skill being tested is drawing.

DOMAIN CLASSIFICATION RULES:
- If the instructions use task verbs like "sketch", "draw", "render", "illustrate", "depict", "visualize", "show", "present", "ideate", "concept sketch" → Domain = VISUAL_ARTISTIC
- If the instructions use task verbs like "engineer", "design for manufacturing", "specify materials", "calculate", "meet regulations", "manufacture", "optimize", "prototype" → Domain = ENGINEERING_TECHNICAL
- If the instructions combine both types of verbs → Domain = MIXED (weight toward the dominant verb type)

THE SUBJECT MATTER (what is being drawn/designed) IS IRRELEVANT to domain classification. Only the TASK VERBS matter.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — PERSONA GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate THREE expert personas whose expertise DIRECTLY matches the task identified in STEP 1, not the subject matter.

For VISUAL_ARTISTIC tasks, ONLY select from experts like:
- Technical Illustration Instructors
- Industrial Design Sketching Professors
- Visual Communication Specialists
- Perspective Drawing Experts
- Design Presentation Coaches
- Concept Ideation Facilitators
- Drawing & Rendering Specialists
- Architectural Rendering Specialists
- Design Studio Critics

For ENGINEERING_TECHNICAL tasks, ONLY select from experts like:
- Materials Scientists / Engineers
- Manufacturing / Production Engineers
- Human Factors / Ergonomics Specialists
- Structural / Mechanical Engineers
- Regulatory Affairs Specialists
- Systems Design Engineers

For MIXED tasks: Weight heavily toward the dominant task type identified in Step 1.

FORBIDDEN: Do NOT select engineering personas (Materials Engineer, Mechanical Engineer, Product Engineer, etc.) for assignments whose primary instruction verbs are about sketching, drawing, or visually presenting a concept — even if the concept happens to depict an engineered object like a motor, flange, juicer, or bridge.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━

The personas must evaluate the submission from distinct, complementary angles tailored exactly to the assignment's core challenges.

CRITICAL CONSTRAINTS:
- The "name" must be a real, believable full human name (e.g., "Sofia Hernandez", "Marcus Delacroix", "Yuki Tanaka"). Do NOT use placeholder names like "Professional Name", "Expert A", or generic titles.
- The "title" must be a dynamically generated, real-world, industry-standard job title perfectly suited to the assignment's ACTUAL evaluation domain (not just its subject matter).
- The "sub_text" must be a concise, UI-friendly summary (max 8 words) describing what specific aspect they are evaluating.
- The "prompt" MUST be exactly three sentences following the strict template provided in the JSON schema below. Do not add any extra rules, conversational text, or formatting.
- You MUST generate EXACTLY {num_personas} persona objects in the "personas" array — no more, no fewer.

You MUST output your response in valid JSON format matching this exact schema:
{{
  "domain_analysis": {{
    "identified_task": "Brief description of what the student is asked TO DO",
    "key_instruction_words": ["list", "of", "task", "verbs", "from", "the", "instructions"],
    "domain": "VISUAL_ARTISTIC | ENGINEERING_TECHNICAL | MIXED",
    "rationale": "One sentence justifying the domain based on the actual instruction words"
  }},
  "personas": [
    // Repeat this object EXACTLY {num_personas} times — one per persona
    {{
      "name": "Real full human name (e.g. Sofia Hernandez)",
      "title": "A dynamically generated, real-world job title",
      "sub_text": "A short, punchy UI subtitle summarizing their focus.",
      "prompt": "You are an expert design critic and creativity researcher. Your task is to evaluate a design concept consisting of a sketch and a text description. As a [Insert Title Here], you will focus specifically on [Insert 1-2 specific technical details related to the assignment and their expertise]."
    }}
  ]
}}
"""

async def generate_personas(
    assignment_text: str,
    recruiter_mode: str = "dynamic",
    custom_persona_context: str = "",
    num_personas: int = 3
) -> dict:
    """
    Calls Anthropic claude-sonnet-4-6 to act as the Recruiter Agent and generate expert personas.
    num_personas controls how many personas are created (3-5).
    Personas are model-agnostic — each will be evaluated by ALL configured LLMs.
    Returns a dict with domain_analysis and personas list.
    """
    num_personas = max(3, min(5, num_personas))  # clamp to 3-5
    try:
        user_content = f'Assignment Instructions: "{assignment_text}"'
        # Resolve the {num_personas} placeholders in the prompt template
        system_content = RECRUITER_SYSTEM_PROMPT.replace("{num_personas}", str(num_personas))
        # Also replace the old "Generate THREE" wording from Step 2
        system_content = system_content.replace(
            "Generate THREE expert personas",
            f"Generate exactly {num_personas} expert personas"
        )
        system_content += "\n\nRespond with ONLY a valid JSON object matching the schema above. Do not include any markdown formatting, code fences, or explanatory text outside the JSON."
        
        if recruiter_mode in ("custom", "saved") and custom_persona_context:
            system_content += f"\n\nCRITICAL OVERRIDE: The user has provided a CUSTOM PERSONA PROFILE. Instead of purely inferring personas from the assignment, generate {num_personas} distinct but highly related personas (e.g. variations in seniority, specialization, or related roles) based directly on this provided profile:\n"
            system_content += f"<CUSTOM_PERSONA_PROFILE>\n{custom_persona_context}\n</CUSTOM_PERSONA_PROFILE>"
            
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=max(2500, num_personas * 700),  # Scale tokens with persona count
            temperature=0.2,
            system=system_content,
            messages=[
                {
                    "role": "user",
                    "content": user_content
                }
            ],
        )
        
        raw_text = response.content[0].text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`").strip()
            if raw_text.lower().startswith("json"):
                raw_text = raw_text[4:].strip()
                
        parsed_json = json.loads(raw_text)
        
        # Ensure persona_id is assigned if not present
        for p in parsed_json.get("personas", []):
            if "persona_id" not in p or not p["persona_id"]:
                p["persona_id"] = str(uuid.uuid4())[:8]
                
        # Validate schema via Pydantic model
        validated = RecruiterResponse.model_validate(parsed_json)
        result_dict = validated.model_dump()
        
        # Log domain analysis for debugging and auditing
        domain = result_dict.get("domain_analysis", {})
        print("\n--- RESPONSE FROM RECRUITER AGENT (Claude Sonnet) ---")
        print(f"  Domain Analysis:")
        print(f"    Task: {domain.get('identified_task', 'N/A')}")
        print(f"    Key Words: {domain.get('key_instruction_words', [])}")
        print(f"    Domain: {domain.get('domain', 'N/A')}")
        print(f"    Rationale: {domain.get('rationale', 'N/A')}")
        print(f"  Personas:")
        for p in result_dict.get("personas", []):
            print(f"    - {p['name']} ({p['title']}) — {p['sub_text']}")
        print("---------------------------------------\n")
        
        return result_dict
        
    except Exception as e:
        logger.error(f"Recruiter Agent failed. Details: {str(e)}", exc_info=True)
        print(f"Error in Recruiter Agent: {e}")
        raise
