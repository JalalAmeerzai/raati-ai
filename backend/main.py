from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables
load_dotenv()

from services.storage import save_submission, get_history, get_result_by_id
from services.creativity_judge import evaluate_design

app = FastAPI(title="raati.ai — Creativity Assessment Tool")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
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
    submitter_name: str = Form("")
):
    """
    Receives an image and description, runs 3×3 AI evaluation, and saves the full result.
    """
    # 1. Evaluate with LLM pipeline
    ai_result = await evaluate_design(image, description)

    # 2. Save full result (image + JSON + CSV index)
    await image.seek(0)
    saved_record = await run_in_threadpool(save_submission, image, description, ai_result, submitter_name)

    return saved_record

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
