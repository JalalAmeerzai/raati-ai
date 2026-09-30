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

from contextlib import asynccontextmanager
from database import init_db
from services.storage import save_submission, get_history, get_result_by_id
from services.creativity_judge import evaluate_design
from services.persona_storage import save_personas, get_all_personas, get_personas_by_ids, delete_persona
from services.agents import generate_personas
from services.assignment_contracts import AssignmentContract, SubmissionData, get_default_itb_assignment
from services.professional_profiles import (
    ProfessionalProfile,
    JOHN_DOE_PROFILE,
    JUNAIDY_PROFILE,
    HCD_PROFILE,
)
from services.design_recruiter import PanelSpec, DEFAULT_FURNITURE_PANEL
from services.evaluation_runner import run_evaluation_pipeline
from services.report_service import get_evaluation_report, export_report_to_csv


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="raati.ai — Creativity Assessment Tool", lifespan=lifespan)

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


# ─── Raati v2 Endpoints (Spec §11.3) ──────────────────────────────────────────

from fastapi import BackgroundTasks, Response
import base64
import uuid
from datetime import datetime, timezone
from database import get_db


@app.post("/api/v2/assignments")
async def create_assignment(contract: AssignmentContract):
    """Create or publish a new assignment contract version."""
    async with get_db() as db:
        await db.execute(
            """
            INSERT OR REPLACE INTO assignment_versions (
                assignment_id, version, status, assessment_target, design_discipline,
                artifact_domain, development_stage, brief_text, learning_objectives,
                required_deliverables, requirements, user_context, rubric_version,
                panel_version, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                contract.assignment_id,
                contract.assignment_version,
                contract.status,
                contract.assessment_target,
                contract.design_discipline,
                contract.artifact_domain,
                contract.development_stage,
                contract.brief_text,
                json.dumps(contract.learning_objectives),
                json.dumps(contract.required_deliverables),
                json.dumps([r.model_dump() for r in contract.requirements]),
                contract.user_context.model_dump_json(),
                contract.rubric_version,
                contract.panel_version,
                contract.created_at,
            ),
        )
        await db.commit()
    return {"status": "success", "assignment": contract}


@app.get("/api/v2/assignments/{assignment_id}")
async def get_assignment(assignment_id: str):
    """Fetch the published or default assignment contract."""
    if assignment_id in ("itb-easy-chair", "default"):
        return get_default_itb_assignment()

    async with get_db() as db:
        async with db.execute(
            "SELECT * FROM assignment_versions WHERE assignment_id = ? ORDER BY version DESC LIMIT 1",
            (assignment_id,),
        ) as cur:
            row = await cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Assignment not found")
            return dict(row)


@app.get("/api/v2/professional-profiles")
async def list_professional_profiles():
    """Returns the source-grounded design-professional profile registry (Spec §3.3)."""
    return {
        "profiles": [
            JOHN_DOE_PROFILE.model_dump(),
            JUNAIDY_PROFILE.model_dump(),
            HCD_PROFILE.model_dump(),
        ]
    }


@app.post("/api/v2/assignments/{assignment_id}/panel")
async def recruit_panel(assignment_id: str):
    """Recruits and freezes a 3-slot design-professional panel for the assignment."""
    panel = DEFAULT_FURNITURE_PANEL
    return {"status": "success", "panel": panel.model_dump()}


@app.post("/api/v2/evaluate")
async def evaluate_submission_v2(
    response: Response,
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    designer_description: str = Form(None),
    assignment_id: str = Form("itb-easy-chair"),
    submitter_name: str = Form(""),
    sync: bool = Form(False),
):
    """
    Submits a design concept for evaluation under the v2 pipeline.
    Returns 202 Accepted with run_id (async) or full report if sync=true.
    """
    # 1. Read and optimize image
    await image.seek(0)
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file.")

    from PIL import Image
    import io
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            bg = Image.new('RGB', img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
            img = bg
        img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=85)
        image_bytes = buf.getvalue()
    except Exception as e:
        logger.warning(f"Image resize failed: {e}")

    base64_image = base64.b64encode(image_bytes).decode('utf-8')

    # 2. Resolve contract & submission
    contract = get_default_itb_assignment()
    run_id = str(uuid.uuid4())
    sub_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    desc_status = "not_supplied" if not designer_description else "supplied"
    from services.assignment_contracts import detect_brief_duplicate
    if designer_description and detect_brief_duplicate(designer_description, contract.brief_text):
        desc_status = "brief_duplicate"

    submission = SubmissionData(
        submission_id=sub_id,
        assignment_id=assignment_id,
        designer_description=designer_description,
        description_status=desc_status,
        submitter_name=submitter_name,
    )

    # 3. Create run record in database
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO evaluation_runs (
                run_id, submission_id, assignment_id, assignment_version,
                execution_status, completeness, disposition, n_expected_slots,
                n_valid_judgments, created_at, rubric_version
            ) VALUES (?, ?, ?, ?, 'queued', 'none', 'blocked', 9, 0, ?, ?)
            """,
            (run_id, sub_id, assignment_id, contract.assignment_version, now_iso, contract.rubric_version),
        )
        await db.commit()

    # 4. Run asynchronously or synchronously
    if sync:
        result = await run_evaluation_pipeline(
            run_id=run_id,
            submission=submission,
            contract=contract,
            panel=DEFAULT_FURNITURE_PANEL,
            base64_image=base64_image,
            image_bytes=image_bytes,
        )
        report = await get_evaluation_report(run_id)
        return {"status": "completed", "report": report or result}

    # Asynchronous dispatch
    background_tasks.add_task(
        run_evaluation_pipeline,
        run_id=run_id,
        submission=submission,
        contract=contract,
        panel=DEFAULT_FURNITURE_PANEL,
        base64_image=base64_image,
        image_bytes=image_bytes,
    )
    response.status_code = 202
    return {
        "status": "queued",
        "run_id": run_id,
        "submission_id": sub_id,
        "status_url": f"/api/v2/evaluations/{run_id}",
    }


@app.get("/api/v2/evaluations/{run_id}")
async def get_evaluation_status(run_id: str):
    """Poll run status and retrieve completed immutable report."""
    report = await get_evaluation_report(run_id)
    if not report:
        raise HTTPException(status_code=404, detail="Evaluation run not found")
    return report


@app.get("/api/v2/evaluations/{run_id}/export")
async def export_evaluation(run_id: str, format: str = "json"):
    """Export evaluation report as JSON or CSV."""
    report = await get_evaluation_report(run_id)
    if not report:
        raise HTTPException(status_code=404, detail="Evaluation run not found")

    if format.lower() == "csv":
        csv_data = export_report_to_csv(report)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=evaluation_{run_id}.csv"}
        )
    return report


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_excludes=["data/*"])
