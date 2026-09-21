import json
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
PERSONAS_FILE = DATA_DIR / "personas.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load() -> dict:
    """Load the personas JSON file, initializing if missing."""
    if not PERSONAS_FILE.exists():
        return {"personas": []}
    try:
        with open(PERSONAS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load personas.json: {e}")
        return {"personas": []}


def _save(data: dict) -> None:
    """Persist the personas dict to disk."""
    with open(PERSONAS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def save_personas(personas: list[dict], source_reference: str = "") -> list[dict]:
    """
    Persist a list of generated persona objects into the library.
    Enriches each with source_reference and created_at, then saves.
    Returns the list of saved records (with all fields).
    """
    data = _load()
    saved = []
    now = datetime.now().isoformat()
    for p in personas:
        record = {
            "persona_id": p.get("persona_id") or str(uuid.uuid4())[:8],
            "name": p.get("name", ""),
            "title": p.get("title", ""),
            "sub_text": p.get("sub_text", ""),
            "prompt": p.get("prompt", ""),
            "source_reference": source_reference,
            "created_at": now,
        }
        data["personas"].append(record)
        saved.append(record)
    _save(data)
    logger.info(f"Saved {len(saved)} personas to library.")
    return saved


def get_all_personas() -> list[dict]:
    """Return all saved personas, newest first."""
    data = _load()
    personas = data.get("personas", [])
    return list(reversed(personas))


def get_personas_by_ids(persona_ids: list[str]) -> list[dict]:
    """Return specific personas by their IDs."""
    data = _load()
    id_set = set(persona_ids)
    return [p for p in data.get("personas", []) if p.get("persona_id") in id_set]


def delete_persona(persona_id: str) -> bool:
    """Remove a persona by ID. Returns True if found and removed."""
    data = _load()
    original = len(data["personas"])
    data["personas"] = [p for p in data["personas"] if p.get("persona_id") != persona_id]
    if len(data["personas"]) < original:
        _save(data)
        return True
    return False
