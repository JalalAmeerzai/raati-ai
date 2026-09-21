from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
import logging
from pathlib import Path

# Stream all logs to stdout so Render's log viewer captures them
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)

# Load environment variables
load_dotenv()

from services.storage import save_submission, get_history, get_result_by_id
from services.creativity_judge import evaluate_design
from services.persona_storage import save_personas, get_all_personas, get_personas_by_ids, delete_persona
from services.agents import generate_personas

app = FastAPI(title="raati.ai — Creativity Assessment Tool")

# Setup CORS — restrict to the deployed frontend in production
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
allowed_origins = [FRONTEND_URL] if FRONTEND_URL != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for images
BASE_DIR = Path(__file__).resolve().parent
IMAGES_DIR = BASE_DIR / "data" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")

@app.get("/")
def read_root():
    return {"message": "raati.ai API is running"}

from fastapi.concurrency import run_in_threadpool

@app.post("/evaluate")
async def evaluate_submission(
    image: UploadFile = File(...),
    description: str = Form(...),
    submitter_name: str = Form(""),
    recruiter_mode: str = Form("dynamic"),
    persona_file: UploadFile = File(None),
    persona_text: str = Form(None),
    selected_persona_ids: str = Form(None),
):
    """
    Receives an image and description, runs 3×3 AI evaluation, and saves the full result.
    When recruiter_mode='saved' and selected_persona_ids is provided, skips the recruiter agent.
    """
    # Resolve saved personas if IDs were provided
    selected_personas = None
    if recruiter_mode == "saved" and selected_persona_ids:
        ids = [pid.strip() for pid in selected_persona_ids.split(",") if pid.strip()]
        selected_personas = get_personas_by_ids(ids)
        if len(selected_personas) < 3:
            raise HTTPException(
                status_code=400,
                detail=f"At least 3 saved personas must be selected. Found {len(selected_personas)} matching IDs."
            )

    # 1. Evaluate with LLM pipeline
    ai_result = await evaluate_design(
        image_file=image, 
        description=description,
        recruiter_mode=recruiter_mode,
        persona_file=persona_file,
        persona_text=persona_text,
        selected_personas=selected_personas,
    )

    # 2. Save full result (image + JSON + CSV index)
    await image.seek(0)
    saved_record = await run_in_threadpool(save_submission, image, description, ai_result, submitter_name)

    return saved_record


@app.post("/personas/generate")
async def generate_and_save_personas(
    persona_file: UploadFile = File(None),
    persona_text: str = Form(""),
    num_personas: int = Form(3),
    assignment_context: str = Form("General design creativity and visualization"),
):
    """
    Runs the recruiter agent to generate personas from an uploaded profile or pasted text,
    then persists them to the persona library. Returns the newly saved persona records.
    """
    import io
    # Build custom context
    custom_context = persona_text or ""
    source_ref = "Pasted text"
    if persona_file and persona_file.filename:
        file_bytes = await persona_file.read()
        filename = persona_file.filename.lower()
        source_ref = f"Uploaded: {persona_file.filename}"
        if filename.endswith(".pdf"):
            from pypdf import PdfReader
            try:
                pdf_reader = PdfReader(io.BytesIO(file_bytes))
                text_pages = [page.extract_text() for page in pdf_reader.pages if page.extract_text()]
                custom_context += "\n\n" + "\n".join(text_pages)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {e}")
        else:
            custom_context += "\n\n" + file_bytes.decode('utf-8', errors='replace')

    if not custom_context.strip():
        raise HTTPException(status_code=400, detail="Please provide a persona file or paste persona details.")

    num_personas = max(3, min(5, num_personas))
    recruiter_result = await generate_personas(
        assignment_text=assignment_context,
        recruiter_mode="saved",
        custom_persona_context=custom_context.strip(),
        num_personas=num_personas,
    )
    raw_personas = recruiter_result.get("personas", [])
    saved = save_personas(raw_personas, source_reference=source_ref)
    return {"saved": saved, "count": len(saved)}


@app.get("/personas")
def list_personas():
    """Returns all saved personas in the library (newest first)."""
    return {"personas": get_all_personas()}


@app.delete("/personas/{persona_id}")
def remove_persona(persona_id: str):
    """Deletes a persona from the library by ID."""
    removed = delete_persona(persona_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Persona not found")
    return {"success": True, "persona_id": persona_id}

@app.get("/results/{result_id}")
def get_result(result_id: str):
    """
    Returns a single full evaluation result by ID (including expert_panel + stats).
    """
    result = get_result_by_id(result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result

@app.get("/history")
def get_submission_history():
    """
    Returns the list of past evaluations (lightweight for listing).
    """
    return get_history()

@app.get("/analytics")
def get_analytics():
    """
    Returns platform-wide analytics data (open/public metrics).
    """
    from datetime import datetime

    history = get_history()
    valid_scores = []

    for item in history:
        score_val = item.get("overall_score")
        if score_val:
            try:
                valid_scores.append(float(score_val))
            except ValueError:
                pass

    total_submissions = len(valid_scores)

    if total_submissions == 0:
        return {
            "total_submissions": 0,
            "submissions_this_month": 0,
            "average_score": 0,
            "highest_score": 0,
            "distribution": []
        }

    total_score = sum(valid_scores)
    average_score = round(total_score / total_submissions, 1)
    highest_score = round(max(valid_scores), 1)

    # Count submissions from the current calendar month
    now = datetime.now()
    submissions_this_month = 0
    for item in history:
        ts = item.get("timestamp")
        if ts:
            try:
                dt = datetime.fromisoformat(ts)
                if dt.month == now.month and dt.year == now.year:
                    submissions_this_month += 1
            except (ValueError, TypeError):
                pass

    distribution = [
        {"range": "Needs Work (0-2)", "count": 0},
        {"range": "Fair (2-3)", "count": 0},
        {"range": "Good (3-4)", "count": 0},
        {"range": "Excellent (4-5)", "count": 0},
    ]

    for score_num in valid_scores:
        if score_num < 2:
            distribution[0]["count"] += 1
        elif score_num < 3:
            distribution[1]["count"] += 1
        elif score_num < 4:
            distribution[2]["count"] += 1
        else:
            distribution[3]["count"] += 1

    for bucket in distribution:
        bucket["percentage"] = round((bucket["count"] / total_submissions * 100)) if total_submissions > 0 else 0

    return {
        "total_submissions": total_submissions,
        "submissions_this_month": submissions_this_month,
        "average_score": average_score,
        "highest_score": highest_score,
        "distribution": distribution,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_excludes=["data/*"])
