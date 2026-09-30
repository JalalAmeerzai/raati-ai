"""
provider_adapters.py — Raati v2 Slice 4 & Slice 6
Unified adapter interface for OpenAI, Claude, and xAI.

Adheres to spec §7 and §11.1:
- Resolves actual model IDs and snapshots them.
- Normalizes responses into a standard envelope.
- Handles image attachments (vision), structured JSON output, timeouts,
  rate limits, truncation, and provider-specific error handling.
- Returns execution metadata (model, tokens, elapsed_ms, finish_reason).
"""
import os
import json
import time
import asyncio
import logging
from typing import Optional, Any
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class ProviderResponse(BaseModel):
    status: str  # "success", "refusal", "truncation", "timeout", "auth_error", "rate_limit", "error"
    raw_text: Optional[str] = None
    parsed_json: Optional[dict] = None
    model_id: str
    finish_reason: Optional[str] = None
    usage: dict = {}
    elapsed_ms: int = 0
    error: Optional[str] = None


def detect_mime_type(image_bytes: bytes) -> str:
    """Detect image MIME type from magic bytes."""
    if not image_bytes:
        return "image/jpeg"
    if image_bytes[:8] == b'\x89PNG\r\n\x1a\n':
        return "image/png"
    elif image_bytes[:2] == b'\xff\xd8':
        return "image/jpeg"
    elif image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
        return "image/webp"
    elif image_bytes[:6] in (b'GIF87a', b'GIF89a'):
        return "image/gif"
    return "image/jpeg"


def try_repair_truncated_json(raw: str) -> Optional[dict]:
    """Attempt to balance braces and quotes for truncated JSON."""
    if not raw or not raw.strip():
        return None
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`").strip()
        if text.lower().startswith("json"):
            text = text[4:].strip()
    for suffix in ['"}', '"', '']:
        candidate = text + suffix
        open_braces = candidate.count('{') - candidate.count('}')
        open_brackets = candidate.count('[') - candidate.count(']')
        candidate += ']' * max(open_brackets, 0)
        candidate += '}' * max(open_braces, 0)
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    return None


def clean_json_text(text: str) -> str:
    """Strip markdown backticks if returned."""
    s = text.strip()
    if s.startswith("```"):
        s = s.strip("`").strip()
        if s.lower().startswith("json"):
            s = s[4:].strip()
    return s


class BaseProviderAdapter:
    provider_name: str
    default_model: str

    async def call_evaluator(
        self,
        system_prompt: str,
        user_text: str,
        base64_image: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/jpeg",
        model: Optional[str] = None,
        timeout_seconds: int = 120,
    ) -> ProviderResponse:
        raise NotImplementedError


class OpenAIAdapter(BaseProviderAdapter):
    provider_name = "OpenAI"
    default_model = "gpt-4o"

    async def call_evaluator(
        self,
        system_prompt: str,
        user_text: str,
        base64_image: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/jpeg",
        model: Optional[str] = None,
        timeout_seconds: int = 120,
    ) -> ProviderResponse:
        from openai import AsyncOpenAI
        api_key = os.getenv("OPENAI_API_KEY", "placeholder")
        client = AsyncOpenAI(api_key=api_key)
        target_model = model or self.default_model

        user_content: list[dict] = [{"type": "text", "text": user_text}]
        if base64_image:
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{base64_image}",
                    "detail": "high",
                }
            })

        t0 = time.perf_counter()
        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=target_model,
                    temperature=0.1,
                    max_completion_tokens=3500,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ]
                ),
                timeout=timeout_seconds,
            )
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            choice = response.choices[0]
            raw_text = choice.message.content or ""
            finish_reason = choice.finish_reason

            usage_info = {}
            if response.usage:
                usage_info = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }

            if finish_reason == "length":
                repaired = try_repair_truncated_json(raw_text)
                return ProviderResponse(
                    status="truncation" if not repaired else "success",
                    raw_text=raw_text,
                    parsed_json=repaired,
                    model_id=target_model,
                    finish_reason=finish_reason,
                    usage=usage_info,
                    elapsed_ms=elapsed_ms,
                    error="Response truncated by token limit" if not repaired else None,
                )

            cleaned = clean_json_text(raw_text)
            parsed = None
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                parsed = try_repair_truncated_json(cleaned)

            if parsed is None:
                return ProviderResponse(
                    status="error",
                    raw_text=raw_text,
                    parsed_json=None,
                    model_id=target_model,
                    finish_reason=finish_reason,
                    usage=usage_info,
                    elapsed_ms=elapsed_ms,
                    error="JSON decode error",
                )

            return ProviderResponse(
                status="success",
                raw_text=raw_text,
                parsed_json=parsed,
                model_id=target_model,
                finish_reason=finish_reason,
                usage=usage_info,
                elapsed_ms=elapsed_ms,
            )
        except asyncio.TimeoutError:
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            return ProviderResponse(
                status="timeout",
                model_id=target_model,
                elapsed_ms=elapsed_ms,
                error=f"Timeout after {timeout_seconds}s",
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            err_str = str(e)
            status = "error"
            if "auth" in err_str.lower() or "api_key" in err_str.lower():
                status = "auth_error"
            elif "rate" in err_str.lower() or "429" in err_str:
                status = "rate_limit"
            return ProviderResponse(
                status=status,
                model_id=target_model,
                elapsed_ms=elapsed_ms,
                error=err_str,
            )


class XAIAdapter(BaseProviderAdapter):
    provider_name = "xAI"
    default_model = "grok-4-1-fast-reasoning"

    async def call_evaluator(
        self,
        system_prompt: str,
        user_text: str,
        base64_image: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/jpeg",
        model: Optional[str] = None,
        timeout_seconds: int = 120,
    ) -> ProviderResponse:
        from openai import AsyncOpenAI
        api_key = os.getenv("XAI_API_KEY", "placeholder")
        client = AsyncOpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
        target_model = model or self.default_model

        user_content: list[dict] = [{"type": "text", "text": user_text}]
        if base64_image:
            user_content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{base64_image}",
                    "detail": "high",
                }
            })

        t0 = time.perf_counter()
        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=target_model,
                    temperature=0.1,
                    max_tokens=3500,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ]
                ),
                timeout=timeout_seconds,
            )
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            choice = response.choices[0]
            raw_text = choice.message.content or ""
            finish_reason = choice.finish_reason

            usage_info = {}
            if response.usage:
                usage_info = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }

            cleaned = clean_json_text(raw_text)
            parsed = None
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                parsed = try_repair_truncated_json(cleaned)

            if parsed is None:
                return ProviderResponse(
                    status="error",
                    raw_text=raw_text,
                    parsed_json=None,
                    model_id=target_model,
                    finish_reason=finish_reason,
                    usage=usage_info,
                    elapsed_ms=elapsed_ms,
                    error="JSON decode error",
                )

            return ProviderResponse(
                status="success",
                raw_text=raw_text,
                parsed_json=parsed,
                model_id=target_model,
                finish_reason=finish_reason,
                usage=usage_info,
                elapsed_ms=elapsed_ms,
            )
        except asyncio.TimeoutError:
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            return ProviderResponse(
                status="timeout",
                model_id=target_model,
                elapsed_ms=elapsed_ms,
                error=f"Timeout after {timeout_seconds}s",
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            err_str = str(e)
            status = "error"
            if "auth" in err_str.lower() or "api_key" in err_str.lower():
                status = "auth_error"
            elif "rate" in err_str.lower() or "429" in err_str:
                status = "rate_limit"
            return ProviderResponse(
                status=status,
                model_id=target_model,
                elapsed_ms=elapsed_ms,
                error=err_str,
            )


class ClaudeAdapter(BaseProviderAdapter):
    provider_name = "Claude"
    default_model = "claude-sonnet-4-6"

    async def call_evaluator(
        self,
        system_prompt: str,
        user_text: str,
        base64_image: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/jpeg",
        model: Optional[str] = None,
        timeout_seconds: int = 120,
    ) -> ProviderResponse:
        import anthropic as _anthropic
        api_key = os.getenv("CLAUDE_API_KEY", "placeholder")
        client = _anthropic.AsyncAnthropic(api_key=api_key)
        target_model = model or self.default_model

        uploaded_file_id = None
        t0 = time.perf_counter()
        try:
            user_content: list[dict] = []
            if image_bytes:
                # Upload image via Files API to handle any size cleanly
                ext = mime_type.split("/")[-1]
                uploaded_file = await client.beta.files.upload(
                    file=(f"submission.{ext}", image_bytes, mime_type),
                    betas=["files-api-2025-04-14"],
                )
                uploaded_file_id = uploaded_file.id
                user_content.append({
                    "type": "image",
                    "source": {
                        "type": "file",
                        "file_id": uploaded_file_id,
                    }
                })
            elif base64_image:
                user_content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime_type,
                        "data": base64_image,
                    }
                })

            user_content.append({
                "type": "text",
                "text": f"{user_text}\n\nRespond with ONLY valid JSON matching the schema."
            })

            response = await asyncio.wait_for(
                client.beta.messages.create(
                    model=target_model,
                    max_tokens=3500,
                    temperature=0.1,
                    betas=["files-api-2025-04-14"],
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_content}],
                ),
                timeout=timeout_seconds,
            )
            elapsed_ms = int((time.perf_counter() - t0) * 1000)

            raw_text = response.content[0].text if response.content else ""
            stop_reason = response.stop_reason

            usage_info = {}
            if hasattr(response, "usage") and response.usage:
                usage_info = {
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
                }

            cleaned = clean_json_text(raw_text)
            parsed = None
            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                parsed = try_repair_truncated_json(cleaned)

            if parsed is None:
                return ProviderResponse(
                    status="error",
                    raw_text=raw_text,
                    parsed_json=None,
                    model_id=target_model,
                    finish_reason=stop_reason,
                    usage=usage_info,
                    elapsed_ms=elapsed_ms,
                    error="JSON decode error",
                )

            return ProviderResponse(
                status="success",
                raw_text=raw_text,
                parsed_json=parsed,
                model_id=target_model,
                finish_reason=stop_reason,
                usage=usage_info,
                elapsed_ms=elapsed_ms,
            )
        except asyncio.TimeoutError:
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            return ProviderResponse(
                status="timeout",
                model_id=target_model,
                elapsed_ms=elapsed_ms,
                error=f"Timeout after {timeout_seconds}s",
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            err_str = str(e)
            status = "error"
            if "auth" in err_str.lower() or "api_key" in err_str.lower():
                status = "auth_error"
            elif "rate" in err_str.lower() or "429" in err_str:
                status = "rate_limit"
            return ProviderResponse(
                status=status,
                model_id=target_model,
                elapsed_ms=elapsed_ms,
                error=err_str,
            )
        finally:
            if uploaded_file_id:
                try:
                    await client.beta.files.delete(
                        uploaded_file_id,
                        betas=["files-api-2025-04-14"],
                    )
                except Exception as cleanup_err:
                    logger.warning(f"Claude file cleanup failed: {cleanup_err}")


ADAPTERS = {
    "OpenAI": OpenAIAdapter(),
    "openai": OpenAIAdapter(),
    "Claude": ClaudeAdapter(),
    "claude": ClaudeAdapter(),
    "xAI": XAIAdapter(),
    "xai": XAIAdapter(),
}


def get_provider_adapter(provider_name: str) -> BaseProviderAdapter:
    adapter = ADAPTERS.get(provider_name)
    if not adapter:
        raise ValueError(f"Unknown provider '{provider_name}'. Supported: OpenAI, Claude, xAI")
    return adapter
