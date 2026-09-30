"""
assignment_contracts.py — Raati v2 Slice 2
Separate the published assignment brief from the student's design explanation.

The core problem this solves: all 13 chair submissions had identical `description`
fields containing the full ITB brief. Evaluators were treating the shared brief as
evidence of the student's reasoning. This module separates the two and detects
the legacy `brief_duplicate` case.
"""
import hashlib
import re
import uuid
from datetime import datetime
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ─── Provenance values (from spec §3.1) ───────────────────────────────────────

ProvenanceValue = Literal["explicit_in_brief", "configured_by_instructor", "unresolved"]
AssessmentTarget = Literal["product_concept", "design_representation", "interaction_concept", "other"]
DevelopmentStage = Literal["concept", "developed_concept", "prototype", "production_proposal"]
DescriptionStatus = Literal["supplied", "not_supplied", "brief_duplicate", "placeholder"]


# ─── Pydantic models ──────────────────────────────────────────────────────────

class Requirement(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    text: str
    source: ProvenanceValue


class UserContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    age_range_years: Optional[list[int]] = None
    intended_sitting_duration_hours: Optional[list[float]] = None
    activities: Optional[list[str]] = None
    notes: Optional[str] = None


class AssignmentContract(BaseModel):
    """
    Structured assignment configuration — published once per assignment version.
    Created from instructor brief; `required_deliverables` default empty (not invented).
    """
    model_config = ConfigDict(extra="forbid")

    assignment_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assignment_version: str = "1"
    status: Literal["draft", "published"] = "draft"

    # Assessment configuration
    assessment_target: AssessmentTarget = "product_concept"
    design_discipline: str = "industrial_product_design"
    artifact_domain: str = ""
    development_stage: DevelopmentStage = "concept"
    stage_source: ProvenanceValue = "unresolved"

    # Brief content
    brief_text: str
    brief_hash: Optional[str] = None  # SHA-256 of normalized brief

    # Extracted fields
    learning_objectives: list[str] = Field(default_factory=list)
    required_deliverables: list[str] = Field(default_factory=list)  # empty = nothing required
    requirements: list[Requirement] = Field(default_factory=list)
    user_context: Optional[UserContext] = None

    # Versioning
    rubric_version: str = "design-six-criteria-v2"
    panel_version: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class AssetRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")
    asset_id: str
    view_label: str = "perspective"
    sha256: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    filename: Optional[str] = None


class SubmissionData(BaseModel):
    """
    A single student submission — versioned, with explicit description status.
    Separates the student's own explanation from the shared assignment brief.
    """
    model_config = ConfigDict(extra="forbid")

    submission_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    submission_version: int = 1
    assignment_id: str
    assignment_version: str = "1"

    # Student-authored text only — null if not supplied or if brief_duplicate
    designer_description: Optional[str] = None
    description_status: DescriptionStatus = "not_supplied"

    # Preserve original submitted field for audit (may be the duplicate brief)
    _original_description: Optional[str] = None

    # Image assets
    assets: list[AssetRecord] = Field(default_factory=list)

    # Admin fields — kept here but excluded from evaluator inputs
    submitter_name: Optional[str] = None

    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


# ─── Brief-duplicate detection (spec §3.2) ────────────────────────────────────

def _normalize_text(text: str) -> str:
    """
    Normalize whitespace for comparison:
    collapse all whitespace runs to single space, strip leading/trailing.
    """
    return re.sub(r"\s+", " ", text).strip().lower()


def detect_brief_duplicate(
    description: str,
    brief_text: str,
    threshold: float = 0.97,
) -> bool:
    """
    Returns True if the submitted description is essentially the same as
    the assignment brief (brief_duplicate case).

    Uses both exact-match (after normalization) and a length-based heuristic
    to catch cases where the description is a substring/superset of the brief.

    Args:
        description: The raw description submitted by the student.
        brief_text: The canonical assignment brief.
        threshold: Fraction of brief words that must appear in description
                   for a near-duplicate judgment.
    """
    if not description or not brief_text:
        return False

    norm_desc = _normalize_text(description)
    norm_brief = _normalize_text(brief_text)

    # Exact match after normalization
    if norm_desc == norm_brief:
        return True

    # Near-duplicate: if the description contains >= threshold of the brief content
    # (handles cases where description = brief + minor additions)
    brief_words = set(norm_brief.split())
    desc_words = set(norm_desc.split())
    if not brief_words:
        return False

    overlap = len(brief_words & desc_words) / len(brief_words)
    if overlap >= threshold:
        return True

    # Also check the reverse: if brief is almost entirely contained in description
    desc_word_list = norm_desc.split()
    brief_word_list = norm_brief.split()
    if len(brief_word_list) > 20 and len(desc_word_list) > 0:
        # Simple containment check using sliding window would be too slow;
        # use character-level overlap as a proxy
        if len(norm_brief) > 0:
            # If description starts with brief text (common paste-in case)
            if norm_desc.startswith(norm_brief[:min(200, len(norm_brief))]):
                return True

    return False


def compute_brief_hash(brief_text: str) -> str:
    """SHA-256 hex digest of the normalized brief text."""
    normalized = _normalize_text(brief_text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def create_submission_from_legacy(
    description: str,
    assignment_id: str,
    assignment_version: str,
    brief_text: str,
    submitter_name: str = "",
    image_filename: str = "",
) -> SubmissionData:
    """
    Create a SubmissionData from the legacy v1 single-description format.

    Detects the brief_duplicate case (all 13 chairs share identical descriptions).
    Marks designer_description as null when it's just the brief repeated.
    """
    is_duplicate = detect_brief_duplicate(description, brief_text) if brief_text else False

    if is_duplicate:
        designer_description = None
        description_status: DescriptionStatus = "brief_duplicate"
    elif not description or not description.strip():
        designer_description = None
        description_status = "not_supplied"
    else:
        designer_description = description.strip()
        description_status = "supplied"

    asset_id = image_filename.split(".")[0] if image_filename else "view-01"
    assets = [AssetRecord(asset_id=asset_id, view_label="perspective", filename=image_filename)]

    return SubmissionData(
        assignment_id=assignment_id,
        assignment_version=assignment_version,
        designer_description=designer_description,
        description_status=description_status,
        assets=assets,
        submitter_name=submitter_name or None,
    )


# ─── Default assignment contract for the ITB Easy Chair brief ─────────────────

# The canonical ITB brief (normalized for comparison)
ITB_EASY_CHAIR_BRIEF_PREFIX = (
    "Design an Easy Chair for the Design Center FSRD ITB"
)

DEFAULT_ASSIGNMENT = AssignmentContract(
    assignment_id="itb-easy-chair",
    assignment_version="2",
    status="published",
    assessment_target="product_concept",
    design_discipline="industrial_product_design",
    artifact_domain="furniture_easy_chair",
    development_stage="concept",
    stage_source="configured_by_instructor",
    brief_text=(
        "Design an Easy Chair for the Design Center FSRD ITB, a space used for academic "
        "and non-academic activities such as guest lectures, seminars, workshops, sharing "
        "sessions, and meetings. The chair will primarily be used by speakers, guest "
        "speakers, and moderators, although it may also be used by students, lecturers, "
        "guests, and other visitors when no event is taking place. The intended users range "
        "approximately from 18 to 65 years old, and the chair should be suitable for sitting "
        "periods of around 1–3 hours."
    ),
    learning_objectives=[
        "Develop a coherent easy-chair concept for the stated activities and users.",
        "Communicate the concept and its user-facing design decisions.",
    ],
    required_deliverables=[],  # brief does not list exact required views
    requirements=[
        Requirement(id="R1", text="Support the intended sitting and leaning activities.", source="explicit_in_brief"),
        Requirement(id="R2", text="Provide supportive armrests.", source="explicit_in_brief"),
        Requirement(id="R3", text="Provide sufficient seat width for the described postures.", source="explicit_in_brief"),
    ],
    user_context=UserContext(
        age_range_years=[18, 65],
        intended_sitting_duration_hours=[1, 3],
        activities=["speaking", "moderating", "listening", "taking notes"],
    ),
    rubric_version="design-six-criteria-v2",
    panel_version="furniture-design-panel-v2",
)

# Pre-compute the brief hash
DEFAULT_ASSIGNMENT.brief_hash = compute_brief_hash(DEFAULT_ASSIGNMENT.brief_text)


def get_default_itb_assignment() -> AssignmentContract:
    """Return the default published ITB Easy Chair assignment contract."""
    return DEFAULT_ASSIGNMENT


def get_or_create_assignment_for_description(description: str) -> tuple[AssignmentContract, bool]:
    """
    Detect if the description matches the ITB brief and return the default
    assignment contract. Returns (contract, is_legacy_duplicate).

    Used by the v1 compatibility adapter to auto-create an assignment context
    from a bare description.
    """
    is_duplicate = detect_brief_duplicate(description, DEFAULT_ASSIGNMENT.brief_text)
    return DEFAULT_ASSIGNMENT, is_duplicate
