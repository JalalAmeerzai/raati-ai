"""
test_evaluators_mocked.py — Mocked tests for LLM evaluator code paths.
Tests JSON repair, deterministic overall_score computation, and error handling.
"""
import sys
import json
from pathlib import Path
from unittest.mock import patch, AsyncMock

import pytest

# Allow import without installing package
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.evaluators import (
    evaluate_with_openai,
    evaluate_with_xai,
    evaluate_with_claude,
    _compute_overall_score,
    _try_repair_truncated_json,
)

# Mock response objects
class MockMessage:
    def __init__(self, content):
        self.content = content

class MockChoice:
    def __init__(self, content):
        self.message = MockMessage(content)

class MockOpenAIResponse:
    def __init__(self, content):
        self.choices = [MockChoice(content)]

class MockClaudeContent:
    def __init__(self, text):
        self.text = text

class MockClaudeResponse:
    def __init__(self, text):
        self.content = [MockClaudeContent(text)]

# Sample valid result JSON string
VALID_JSON_DICT = {
    "creativity_score": 4,
    "creativity_reasoning": "Good",
    "originality_score": 3,
    "originality_reasoning": "Okay",
    "usefulness_relevance_score": 5,
    "usefulness_relevance_reasoning": "Great",
    "clarity_score": 4,
    "clarity_reasoning": "Clear",
    "level_of_detail_elaboration_score": 2,
    "level_of_detail_elaboration_reasoning": "Lacking",
    "feasibility_score": 4,
    "feasibility_reasoning": "Doable",
    "instructor_feedback": "Keep it up"
}
VALID_JSON_STR = json.dumps(VALID_JSON_DICT)


def test_compute_overall_score():
    score = _compute_overall_score(VALID_JSON_DICT)
    assert score == 3.67

    empty_score = _compute_overall_score({})
    assert empty_score == 0.0


def test_try_repair_truncated_json():
    # Truncated string in the last field
    truncated_str = '{"creativity_score": 4, "instructor_feedback": "Keep it'
    repaired = _try_repair_truncated_json(truncated_str)
    assert repaired is not None
    assert repaired["creativity_score"] == 4
    assert repaired["instructor_feedback"] == "Keep it"
    
    # Very broken string
    broken_str = '{"creativity_score": '
    repaired2 = _try_repair_truncated_json(broken_str)
    assert repaired2 is None


@pytest.mark.asyncio
@patch("services.evaluators._openai_api_call", new_callable=AsyncMock)
async def test_evaluate_with_openai_success(mock_api_call):
    mock_api_call.return_value = MockOpenAIResponse(VALID_JSON_STR)
    
    persona = {"name": "Test Persona", "prompt": "You are a judge."}
    result = await evaluate_with_openai(persona, "Description", "base64data", "image/jpeg")
    
    assert "error" not in result
    assert result["model_provider"] == "OpenAI"
    assert result["result"]["overall_score"] == 3.67


@pytest.mark.asyncio
@patch("services.evaluators._openai_api_call", new_callable=AsyncMock)
@patch("services.evaluators.RETRY_BACKOFF", [0.01]) # Speed up test
async def test_evaluate_with_openai_repair(mock_api_call):
    # Missing closing brace and quote
    truncated_json = '{"creativity_score": 4, "instructor_feedback": "Good'
    mock_api_call.return_value = MockOpenAIResponse(truncated_json)
    
    persona = {"name": "Test Persona", "prompt": "You are a judge."}
    result = await evaluate_with_openai(persona, "Description", "base64data", "image/jpeg")
    
    assert "error" not in result
    assert result["result"]["creativity_score"] == 4
    # With only one dimension, the average is 4.0
    assert result["result"]["overall_score"] == 4.0


@pytest.mark.asyncio
@patch("services.evaluators._xai_api_call", new_callable=AsyncMock)
@patch("services.evaluators.RETRY_BACKOFF", [0.01, 0.01, 0.01]) # Speed up test
async def test_evaluate_with_xai_api_error(mock_api_call):
    mock_api_call.side_effect = Exception("API Timeout")
    
    persona = {"name": "Test Persona", "prompt": "You are a judge."}
    # Since we use retry, it will try multiple times and raise Exception
    # _with_retry captures it. evaluate_with_xai handles it and returns "error"
    result = await evaluate_with_xai(persona, "Description", "base64data", "image/jpeg")
    
    assert "error" in result
    assert "API Timeout" in result["error"]
    assert "result" not in result


@pytest.mark.asyncio
@patch("services.evaluators._anthropic.AsyncAnthropic")
@patch("services.evaluators._claude_api_call", new_callable=AsyncMock)
async def test_evaluate_with_claude_markdown_stripping(mock_api_call, mock_anthropic):
    # Claude often returns JSON wrapped in markdown
    markdown_json = "```json\n" + VALID_JSON_STR + "\n```"
    mock_api_call.return_value = MockClaudeResponse(markdown_json)
    
    # Mock file upload
    mock_client = mock_anthropic.return_value
    mock_client.beta.files.upload = AsyncMock(return_value=type("Obj", (object,), {"id": "file_123"})())
    mock_client.beta.files.delete = AsyncMock()
    
    persona = {"name": "Test Persona", "prompt": "You are a judge."}
    # Dummy bytes for image
    result = await evaluate_with_claude(persona, "Description", b"fake_image_bytes")
    
    assert "error" not in result
    assert result["result"]["creativity_score"] == 4
    assert result["result"]["overall_score"] == 3.67
    
    # Ensure file was deleted
    mock_client.beta.files.delete.assert_called_once()
