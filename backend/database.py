"""
database.py — Raati v2 Slice 6
SQLite database setup with aiosqlite.

Tables correspond to the logical records in spec §11.5.
All tables use UUIDs as primary keys for portability.
"""
import aiosqlite
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "raati_v2.db"

CREATE_TABLES_SQL = """
-- Assignment version: exact brief, resolved fields, rubric+panel reference
CREATE TABLE IF NOT EXISTS assignment_versions (
    assignment_id      TEXT NOT NULL,
    version            TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'draft',
    assessment_target  TEXT,
    design_discipline  TEXT,
    artifact_domain    TEXT,
    development_stage  TEXT,
    brief_text         TEXT NOT NULL,
    brief_hash         TEXT,
    learning_objectives TEXT,   -- JSON array
    required_deliverables TEXT, -- JSON array
    requirements       TEXT,    -- JSON array of {id, text, source}
    user_context       TEXT,    -- JSON object
    rubric_version     TEXT,
    panel_version      TEXT,
    created_at         TEXT NOT NULL,
    PRIMARY KEY (assignment_id, version)
);

-- Professional profile version: source asset, expertise, adaptations
CREATE TABLE IF NOT EXISTS professional_profile_versions (
    profile_id         TEXT NOT NULL,
    version            INTEGER NOT NULL DEFAULT 1,
    status             TEXT NOT NULL DEFAULT 'draft',
    display_name       TEXT NOT NULL,
    professional_title TEXT NOT NULL,
    identity_kind      TEXT,
    display_disclosure TEXT,
    expertise_json     TEXT,   -- JSON list of ExpertiseClaim
    excluded_claims    TEXT,   -- JSON array
    assessment_limits  TEXT,   -- JSON array
    source_hash        TEXT,
    created_at         TEXT NOT NULL,
    PRIMARY KEY (profile_id, version)
);

-- Panel version: 3 slot definitions, compiled briefs, rationale
CREATE TABLE IF NOT EXISTS panel_versions (
    panel_id           TEXT PRIMARY KEY,
    panel_version      TEXT NOT NULL,
    assignment_id      TEXT,
    assignment_version TEXT,
    rubric_version     TEXT,
    slots_json         TEXT NOT NULL,  -- JSON list of PanelSlot
    rationale          TEXT,
    status             TEXT NOT NULL DEFAULT 'draft',
    created_at         TEXT NOT NULL
);

-- Submission version: assets, description, status
CREATE TABLE IF NOT EXISTS submission_versions (
    submission_id      TEXT NOT NULL,
    version            INTEGER NOT NULL DEFAULT 1,
    assignment_id      TEXT NOT NULL,
    assignment_version TEXT NOT NULL,
    designer_description TEXT,
    description_status TEXT NOT NULL DEFAULT 'not_supplied',
    assets_json        TEXT,   -- JSON list of AssetRecord
    submitter_name     TEXT,
    created_at         TEXT NOT NULL,
    PRIMARY KEY (submission_id, version)
);

-- Evaluation run: 9 expected slots, deadline, idempotency key, statuses
CREATE TABLE IF NOT EXISTS evaluation_runs (
    run_id              TEXT PRIMARY KEY,
    submission_id       TEXT NOT NULL,
    submission_version  INTEGER NOT NULL DEFAULT 1,
    assignment_id       TEXT NOT NULL,
    assignment_version  TEXT NOT NULL,
    panel_id            TEXT,
    idempotency_key     TEXT UNIQUE,
    execution_status    TEXT NOT NULL DEFAULT 'queued',
    completeness        TEXT NOT NULL DEFAULT 'none',
    disposition         TEXT NOT NULL DEFAULT 'blocked',
    n_expected_slots    INTEGER NOT NULL DEFAULT 9,
    n_valid_judgments   INTEGER NOT NULL DEFAULT 0,
    deadline_at         TEXT,
    created_at          TEXT NOT NULL,
    started_at          TEXT,
    completed_at        TEXT,
    -- Snapshot of config used
    rubric_version      TEXT,
    pipeline_version    TEXT DEFAULT 'design-assessment-v2'
);

-- Evaluation attempt: one call to one provider for one slot
CREATE TABLE IF NOT EXISTS evaluation_attempts (
    attempt_id         TEXT PRIMARY KEY,
    run_id             TEXT NOT NULL,
    slot_id            TEXT NOT NULL,        -- e.g. 'openai_design_creativity'
    attempt_number     INTEGER NOT NULL,
    provider           TEXT NOT NULL,
    model_id           TEXT,
    persona_id         TEXT,
    status             TEXT NOT NULL DEFAULT 'pending',
    raw_response_path  TEXT,                 -- path to stored raw response file
    validation_outcome TEXT,                 -- 'accepted', 'rejected', 'error'
    validation_errors  TEXT,                 -- JSON array of error strings
    usage_json         TEXT,                 -- provider usage metadata
    elapsed_ms         INTEGER,
    created_at         TEXT NOT NULL,
    completed_at       TEXT,
    UNIQUE (run_id, slot_id, attempt_number)
);

-- Accepted judgment: one per slot per run
CREATE TABLE IF NOT EXISTS accepted_judgments (
    judgment_id        TEXT PRIMARY KEY,
    run_id             TEXT NOT NULL,
    slot_id            TEXT NOT NULL,
    attempt_id         TEXT NOT NULL,
    provider           TEXT NOT NULL,
    persona_id         TEXT,
    -- Parsed scores per dimension (denormalized for query speed)
    creativity_score   INTEGER,
    originality_score  INTEGER,
    usefulness_relevance_score INTEGER,
    clarity_score      INTEGER,
    level_of_detail_elaboration_score INTEGER,
    feasibility_score  INTEGER,
    -- Full judgment JSON
    judgment_json      TEXT NOT NULL,
    accepted_at        TEXT NOT NULL,
    UNIQUE (run_id, slot_id)
);

-- Aggregate version: computed scorecard, source judgment IDs
CREATE TABLE IF NOT EXISTS aggregate_versions (
    aggregate_id       TEXT PRIMARY KEY,
    run_id             TEXT NOT NULL UNIQUE,
    aggregation_version TEXT NOT NULL DEFAULT 'equal-mean-v2',
    scorecard_json     TEXT NOT NULL,
    source_judgment_ids TEXT NOT NULL,  -- JSON array
    created_at         TEXT NOT NULL
);

-- Evidence reviews: issue definitions and verdicts
CREATE TABLE IF NOT EXISTS evidence_reviews (
    review_id          TEXT PRIMARY KEY,
    run_id             TEXT NOT NULL,
    issues_json        TEXT NOT NULL,
    needs_targeted_review INTEGER NOT NULL DEFAULT 0,
    targeted_review_done INTEGER NOT NULL DEFAULT 0,
    review_result_json TEXT,
    created_at         TEXT NOT NULL
);

-- Report version: narrative, aggregate reference, status
CREATE TABLE IF NOT EXISTS report_versions (
    report_id          TEXT PRIMARY KEY,
    run_id             TEXT NOT NULL UNIQUE,
    aggregate_id       TEXT NOT NULL,
    narrative_json     TEXT NOT NULL,
    narrative_status   TEXT NOT NULL DEFAULT 'generated',
    evidence_review_id TEXT,
    disposition        TEXT NOT NULL DEFAULT 'ready',
    export_version     INTEGER NOT NULL DEFAULT 1,
    created_at         TEXT NOT NULL,
    -- v1 compatibility flat fields
    overall_score      REAL,
    v1_compat_json     TEXT  -- JSON with flat score/reasoning fields
);
"""


from contextlib import asynccontextmanager

@asynccontextmanager
async def get_db():
    """Open and yield an aiosqlite connection with WAL mode for concurrency."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(str(DB_PATH)) as conn:
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA journal_mode=WAL")
        await conn.execute("PRAGMA foreign_keys=ON")
        yield conn


async def init_db() -> None:
    """Create all tables if they don't exist. Safe to call on every startup."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(str(DB_PATH)) as conn:
        await conn.executescript(CREATE_TABLES_SQL)
        await conn.commit()
    logger.info(f"Database initialized at {DB_PATH}")
