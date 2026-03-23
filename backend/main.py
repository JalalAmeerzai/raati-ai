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
    description: str = Form(...)
):
    """
    Receives an image and description, runs 3×3 AI evaluation, and saves the full result.
    """
    # 1. Evaluate with LLM pipeline
    ai_result = await evaluate_design(image, description)

    # 2. Save full result (image + JSON + CSV index)
    await image.seek(0)
    saved_record = await run_in_threadpool(save_submission, image, description, ai_result)

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
    Returns analytics data for the user.
    """
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
            "average_score": 0,
            "trend": []
        }

    total_score = sum(valid_scores)
    average_score = round(total_score / total_submissions, 1)

    chronological = list(reversed(history))

    trend = []
    valid_count = 0
    for item in chronological:
        score_val = item.get("overall_score")
        if score_val:
            try:
                score_num = float(score_val)
                trend.append({"week": f"Upload {valid_count+1}", "score": score_num})
                valid_count += 1
            except ValueError:
                pass

    trend = trend[-6:]

    return {
        "total_submissions": total_submissions,
        "average_score": average_score,
        "trend": trend,
        "creative_standing": "Top 10%"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_excludes=["data/*"])
