from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables
load_dotenv()

from services.storage import save_submission, get_history
from services.creativity_judge import evaluate_design

app = FastAPI(title="Creativity Assessment Tool")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for images
# Go up one level from 'backend' to root, then 'backend/data/images'?
# No, we are in backend/main.py. storage.py defines DATA_DIR relative to itself.
# Let's ensure we point to the same directory.
BASE_DIR = Path(__file__).resolve().parent
IMAGES_DIR = BASE_DIR / "data" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")

@app.get("/")
def read_root():
    return {"message": "Creativity Assessment Tool API is running"}

from fastapi.concurrency import run_in_threadpool

@app.post("/evaluate")
async def evaluate_submission(
    image: UploadFile = File(...),
    description: str = Form(...)
):
    """
    Receives an image and description, runs AI evaluation, and saves the result.
    """
    # 1. Evaluate with LLM
    ai_result = await evaluate_design(image, description)
    
    # 2. Save result and image
    await image.seek(0)
    saved_record = await run_in_threadpool(save_submission, image, description, ai_result)
    
    # Inject expert_panel + stats back into the response — not persisted to CSV.
    import json as _json
    
    class _SafeEncoder(_json.JSONEncoder):
        def default(self, obj):
            if hasattr(obj, "model_dump"):
                return obj.model_dump()
            return super().default(obj)
    
    def _safe(val):
        return _json.loads(_json.dumps(val, cls=_SafeEncoder, default=str))
    
    saved_record["expert_panel"] = _safe(ai_result.get("expert_panel", []))
    saved_record["stats"] = _safe(ai_result.get("stats", {}))
    
    return saved_record

@app.get("/results/{result_id}")
def get_result(result_id: str):
    """
    Returns a single evaluation result by ID.
    """
    history = get_history()
    for item in history:
        if item["id"] == result_id:
            return item
    raise HTTPException(status_code=404, detail="Result not found")

@app.get("/history")
def get_submission_history():
    """
    Returns the list of past evaluations.
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
                pass # Skip rows where 'overall_score' is a string or corrupted
                
    total_submissions = len(valid_scores)
    
    if total_submissions == 0:
        return {
            "total_submissions": 0,
            "average_score": 0,
            "trend": []
        }
        
    total_score = sum(valid_scores)
    average_score = round(total_score / total_submissions, 1)
    
    # Calculate trend (last 6 valid submissions)
    # We want chronological order for the chart
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
                
    # keep only the last 6
    trend = trend[-6:]
    
    return {
        "total_submissions": total_submissions,
        "average_score": average_score,
        "trend": trend,
        "creative_standing": "Top 10%" # Mocked for now as we don't have other users
    }

if __name__ == "__main__":
    import uvicorn
    # Do not watch 'data' dir to prevent restarts when saving submissions
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_excludes=["data/*"])
