import csv
import os
import uuid
import json
import shutil
from datetime import datetime
from pathlib import Path

# Define paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
IMAGES_DIR = DATA_DIR / "images"
RESULTS_DIR = DATA_DIR / "results"       # Full JSON results (expert_panel + stats)
RESULTS_FILE = DATA_DIR / "results.csv"  # Lightweight index for history listing

# Ensure directories exist
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


class _SafeEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        return super().default(obj)


def save_submission(image_file, description, evaluation_result, submitter_name: str = ""):
    """
    Saves the uploaded image, the full evaluation result (JSON), and a CSV index row.
    """
    # 1. Generate unique ID
    unique_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()

    # 2. Save Image
    filename = image_file.filename
    ext = os.path.splitext(filename)[1] if filename else ".png"
    if not ext:
        ext = ".png"
    saved_filename = f"{unique_id}{ext}"
    image_path = IMAGES_DIR / saved_filename

    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image_file.file, buffer)

    # 3. Build the full record (including expert_panel + stats)
    full_record = {
        "id": unique_id,
        "timestamp": timestamp,
        "image_filename": saved_filename,
        "image_url": f"/images/{saved_filename}",
        "description": description,
        "submitter_name": submitter_name,
        # Synthesised consensus scores
        "creativity_score": evaluation_result.get("creativity_score"),
        "originality_score": evaluation_result.get("originality_score"),
        "usefulness_relevance_score": evaluation_result.get("usefulness_relevance_score"),
        "clarity_score": evaluation_result.get("clarity_score"),
        "level_of_detail_elaboration_score": evaluation_result.get("level_of_detail_elaboration_score"),
        "feasibility_score": evaluation_result.get("feasibility_score"),
        "overall_score": evaluation_result.get("overall_score"),
        # Synthesised consensus reasoning
        "creativity_reasoning": evaluation_result.get("creativity_reasoning"),
        "originality_reasoning": evaluation_result.get("originality_reasoning"),
        "usefulness_relevance_reasoning": evaluation_result.get("usefulness_relevance_reasoning"),
        "clarity_reasoning": evaluation_result.get("clarity_reasoning"),
        "level_of_detail_elaboration_reasoning": evaluation_result.get("level_of_detail_elaboration_reasoning"),
        "feasibility_reasoning": evaluation_result.get("feasibility_reasoning"),
        # Instructor feedback
        "instructor_feedback_intro": evaluation_result.get("instructor_feedback_intro"),
        "instructor_feedback_pivot": evaluation_result.get("instructor_feedback_pivot"),
        "instructor_feedback_next_step": evaluation_result.get("instructor_feedback_next_step"),
        # Full LLM data (expert_panel + stats)
        "expert_panel": evaluation_result.get("expert_panel", []),
        "stats": evaluation_result.get("stats", {}),
    }

    # 4. Save full record as JSON
    json_path = RESULTS_DIR / f"{unique_id}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(full_record, f, cls=_SafeEncoder, default=str, ensure_ascii=False, indent=2)

    # 5. Also append lightweight row to CSV (for quick listing)
    csv_row = {
        "id": unique_id,
        "timestamp": timestamp,
        "image_filename": saved_filename,
        "description": description,
        "overall_score": evaluation_result.get("overall_score"),
        "submitter_name": submitter_name,
    }

    file_exists = RESULTS_FILE.exists()
    with open(RESULTS_FILE, mode="a", newline="", encoding="utf-8") as f:
        fieldnames = ["id", "timestamp", "image_filename", "description", "overall_score", "submitter_name"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerow(csv_row)

    return full_record


def get_result_by_id(result_id: str) -> dict | None:
    """Load a full result from JSON. Falls back to CSV row if JSON doesn't exist."""
    json_path = RESULTS_DIR / f"{result_id}.json"
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # Fallback: read from CSV (legacy records without JSON)
    if RESULTS_FILE.exists():
        with open(RESULTS_FILE, mode="r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row["id"] == result_id:
                    row["image_url"] = f"/images/{row['image_filename']}"
                    return row
    return None


def get_history():
    """
    Returns all past submissions for the listing page.
    Uses CSV for fast listing; enriches with JSON data when available.
    """
    if not RESULTS_FILE.exists():
        return []

    results = []
    with open(RESULTS_FILE, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["image_url"] = f"/images/{row['image_filename']}"
            # Enrich from JSON when CSV fields are missing
            needs_score = not row.get("overall_score")
            needs_name = not row.get("submitter_name")
            if needs_score or needs_name:
                json_path = RESULTS_DIR / f"{row['id']}.json"
                if json_path.exists():
                    try:
                        with open(json_path, "r", encoding="utf-8") as jf:
                            full = json.load(jf)
                            if needs_score:
                                row["overall_score"] = full.get("overall_score")
                            if needs_name:
                                row["submitter_name"] = full.get("submitter_name", "")
                    except Exception:
                        pass
            results.append(row)

    return list(reversed(results))
