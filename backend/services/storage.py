import csv
import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path

# Define paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
IMAGES_DIR = DATA_DIR / "images"
RESULTS_FILE = DATA_DIR / "results.csv"

# Ensure directories exist
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

def save_submission(image_file, description, evaluation_result):
    """
    Saves the uploaded image and the evaluation results to storage.
    """
    # 1. Generate unique ID
    unique_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    # 2. Save Image
    # Get file extension from filename or default to .png
    filename = image_file.filename
    ext = os.path.splitext(filename)[1] if filename else ".png"
    if not ext:
        ext = ".png"
        
    saved_filename = f"{unique_id}{ext}"
    image_path = IMAGES_DIR / saved_filename
    
    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(image_file.file, buffer)
        
    # 3. Prepare Data Row
    # 3. Prepare Data Row
    row = {
        "id": unique_id,
        "timestamp": timestamp,
        "image_filename": saved_filename,
        "description": description,
        "creativity_score": evaluation_result.get("creativity_score"),
        "originality_score": evaluation_result.get("originality_score"),
        "usefulness_relevance_score": evaluation_result.get("usefulness_relevance_score"),
        "clarity_score": evaluation_result.get("clarity_score"),
        "level_of_detail_elaboration_score": evaluation_result.get("level_of_detail_elaboration_score"),
        "feasibility_score": evaluation_result.get("feasibility_score"),
        "overall_score": evaluation_result.get("overall_score"),
        "creativity_reasoning": evaluation_result.get("creativity_reasoning"),
        "originality_reasoning": evaluation_result.get("originality_reasoning"),
        "usefulness_relevance_reasoning": evaluation_result.get("usefulness_relevance_reasoning"),
        "clarity_reasoning": evaluation_result.get("clarity_reasoning"),
        "level_of_detail_elaboration_reasoning": evaluation_result.get("level_of_detail_elaboration_reasoning"),
        "feasibility_reasoning": evaluation_result.get("feasibility_reasoning"),
        "instructor_feedback_intro": evaluation_result.get("instructor_feedback_intro"),
        "instructor_feedback_pivot": evaluation_result.get("instructor_feedback_pivot"),
        "instructor_feedback_next_step": evaluation_result.get("instructor_feedback_next_step"),
    }
    
    # 4. Append to CSV
    file_exists = RESULTS_FILE.exists()
    
    with open(RESULTS_FILE, mode="a", newline="", encoding="utf-8") as f:
        fieldnames = [
            "id", "timestamp", "image_filename", "description", 
            "creativity_score", "originality_score", "usefulness_relevance_score", 
            "clarity_score", "level_of_detail_elaboration_score", "feasibility_score", "overall_score", 
            "creativity_reasoning", "originality_reasoning", "usefulness_relevance_reasoning", 
            "clarity_reasoning", "level_of_detail_elaboration_reasoning", "feasibility_reasoning",
            "instructor_feedback_intro", "instructor_feedback_pivot", "instructor_feedback_next_step"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        
        if not file_exists:
            writer.writeheader()
        
        writer.writerow(row)
        
    return {
        **row,
        "image_url": f"/images/{saved_filename}"
    }

def get_history():
    """
    Reads the CSV file and returns all past submissions.
    """
    if not RESULTS_FILE.exists():
        return []
        
    results = []
    with open(RESULTS_FILE, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Add full image URL for frontend
            row["image_url"] = f"/images/{row['image_filename']}"
            results.append(row)
            
    # Return reversed (newest first)
    return list(reversed(results))
