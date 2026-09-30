"""
test_api_v2.py — Test Raati v2 API routes and contracts
"""
import sys
from pathlib import Path

# Allow import without installing package
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_root(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "running" in res.json()["message"]


def test_get_assignment(client):
    res = client.get("/api/v2/assignments/itb-easy-chair")
    assert res.status_code == 200
    data = res.json()
    assert data["assignment_id"] == "itb-easy-chair"
    assert data["artifact_domain"] == "furniture_easy_chair"
    assert len(data["requirements"]) >= 3


def test_list_professional_profiles(client):
    res = client.get("/api/v2/professional-profiles")
    assert res.status_code == 200
    profiles = res.json()["profiles"]
    assert len(profiles) == 3
    # Profile 1: John Doe
    # Profile 2: Deny Willy Junaidy
    # Profile 3: HCD
    titles = [p["professional_title"] for p in profiles]
    assert any("Creativity" in t for t in titles)
    assert any("Craft" in t or "Furniture" in t for t in titles)
    assert any("Human-Centered" in t for t in titles)


def test_recruit_panel(client):
    res = client.post("/api/v2/assignments/itb-easy-chair/panel")
    assert res.status_code == 200
    panel = res.json()["panel"]
    assert len(panel["slots"]) == 3
    slot_ids = [s["slot_id"] for s in panel["slots"]]
    assert "design_creativity" in slot_ids
    assert "furniture_craft" in slot_ids
    assert "human_centered_design" in slot_ids


def test_nonexistent_evaluation_404(client):
    res = client.get("/api/v2/evaluations/nonexistent-run-id")
    assert res.status_code == 404
