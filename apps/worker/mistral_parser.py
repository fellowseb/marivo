import json
import logging
import os
import re
import time
import uuid

import httpx
from dotenv import load_dotenv
from mistralai.client import Mistral, errors

load_dotenv()

DEFAULT_MODEL = "mistral-large-latest"
# Resolved next to this module so it does not depend on the process cwd;
# overridable via IMPORT_SCRIPT_PROMPT_PATH
DEFAULT_PROMPT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "IMPORT-SCRIPT-PROMPT.md"
)

# HTTP statuses (and transport errors) worth retrying
TRANSIENT_STATUS_CODES = {429, 500, 502, 503, 504}
MAX_COMPLETION_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 1.0

VALID_LINE_TYPES = {"heading", "chartext", "freetext"}

logger = logging.getLogger("worker.parser")


class ParseError(ValueError):
    """The LLM response could not be extracted, parsed or validated."""


class CircuitOpenError(RuntimeError):
    """Fail-fast error raised when the API circuit breaker is open."""


def is_transient_error(exc: BaseException) -> bool:
    if isinstance(exc, httpx.TransportError):
        return True
    if isinstance(exc, errors.MistralError):
        return getattr(exc, "status_code", None) in TRANSIENT_STATUS_CODES
    return False


class CircuitBreaker:
    """Simple circuit breaker around fallible API calls.

    After `failure_threshold` consecutive failures the circuit opens and
    calls fail fast with CircuitOpenError; after `cooldown_seconds` one
    trial call is allowed (half-open), which either closes the circuit
    (success) or re-opens it (failure).
    """

    def __init__(self, failure_threshold: int = 5, cooldown_seconds: float = 60.0):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.consecutive_failures = 0
        self.opened_at: float | None = None

    def before_call(self) -> None:
        if self.opened_at is None:
            return
        if time.monotonic() - self.opened_at >= self.cooldown_seconds:
            logger.info("circuit breaker half-open: allowing one trial call")
            return
        raise CircuitOpenError(
            f"Mistral API circuit is open after {self.consecutive_failures} "
            f"consecutive failures (retry in {self.cooldown_seconds}s)"
        )

    def on_success(self) -> None:
        self.consecutive_failures = 0
        self.opened_at = None

    def on_failure(self) -> None:
        self.consecutive_failures += 1
        if self.consecutive_failures >= self.failure_threshold and self.opened_at is None:
            self.opened_at = time.monotonic()
            logger.error(
                "circuit breaker opened",
                extra={
                    "consecutive_failures": self.consecutive_failures,
                    "cooldown_s": self.cooldown_seconds,
                },
            )


class MistralParser:
    def __init__(self, prompt_path: str | None = None, breaker: CircuitBreaker | None = None):
        self.model = os.getenv("MISTRAL_MODEL", DEFAULT_MODEL)
        self.prompt_path = prompt_path or os.getenv("IMPORT_SCRIPT_PROMPT_PATH") or DEFAULT_PROMPT_PATH
        self.breaker = breaker or CircuitBreaker()
        self.http_client = httpx.Client(timeout=None)
        self.client = Mistral(
            # `or None`: an empty key would produce an illegal "Bearer " header
            # (httpx LocalProtocolError); None lets the SDK skip the header,
            # which is what mock/custom endpoints (MISTRAL_API_BASE) expect
            api_key=os.getenv("MISTRAL_API_KEY") or None,
            # Optional override, e.g. a mock LLM endpoint in E2E tests
            server_url=os.getenv("MISTRAL_API_BASE") or None,
            debug_logger=logging.getLogger("mistralai.client"),
            client=self.http_client,
        )
        model_info = self.client.models.retrieve(model_id=self.model)
        logger.debug(
            "model max context length",
            extra={"model": self.model, "max_context_length": model_info.max_context_length},
        )

    def _load_prompt(self) -> str:
        try:
            with open(self.prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        except OSError as e:
            raise ParseError(f"cannot read prompt file {self.prompt_path}: {e}") from e

    def _complete_chunk(self, content: str, chunk_num: int, chunk_total: int):
        """One chat completion with retry on transient errors + circuit breaker."""
        last_exc: BaseException | None = None
        for attempt in range(1, MAX_COMPLETION_ATTEMPTS + 1):
            self.breaker.before_call()
            try:
                response = self.client.chat.complete(
                    model=self.model,
                    messages=[{"role": "user", "content": content}],
                    stream=False,
                    response_format={"type": "text"},
                    temperature=0.1,
                )
            except Exception as e:
                self.breaker.on_failure()
                last_exc = e
                transient = is_transient_error(e)
                logger.warning(
                    "chat completion attempt failed",
                    extra={
                        "chunk_num": chunk_num,
                        "chunk_total": chunk_total,
                        "attempt": attempt,
                        "transient": transient,
                        "error": str(e)[:200],
                    },
                    exc_info=not transient,
                )
                if not transient or attempt == MAX_COMPLETION_ATTEMPTS:
                    raise
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
            else:
                self.breaker.on_success()
                return response
        raise last_exc  # unreachable, but keeps type-checkers happy

    @staticmethod
    def _extract_fenced(text: str, lang: str) -> str | None:
        # tolerate case/whitespace variations of the fence language tag
        match = re.search(r"```" + lang + r"\s*\n(.*?)```", text, re.DOTALL | re.IGNORECASE)
        return match.group(1) if match else None

    @classmethod
    def _extract_blocks(cls, response_text: str) -> tuple[dict, str]:
        """Extract (metadata, csv) from an LLM response.

        Strategy: fenced ```json / ```csv blocks first; fall back to a bare
        JSON object for metadata and to raw `type|...` lines for the CSV.
        Raises ParseError with a clear message when extraction or JSON
        parsing fails.
        """
        json_block = cls._extract_fenced(response_text, "json")
        if json_block is None:
            bare = re.search(r"\{.*\}", response_text, re.DOTALL)
            json_block = bare.group(0) if bare else None
        if json_block is None:
            raise ParseError("no json block found in Mistral response")
        try:
            metadata = json.loads(json_block)
        except json.JSONDecodeError as e:
            raise ParseError(f"invalid json block in Mistral response: {e}") from e

        csv_block = cls._extract_fenced(response_text, "csv")
        if csv_block is None:
            # fallback: raw lines that look like CSV rows
            lines = [
                line
                for line in response_text.splitlines()
                if re.match(r"^(heading|chartext|freetext)\|", line)
            ]
            csv_block = "\n".join(lines) if lines else None
        if not csv_block or not csv_block.strip():
            raise ParseError("no csv block found in Mistral response")
        return metadata, csv_block

    @staticmethod
    def _validate_metadata(metadata) -> None:
        if not isinstance(metadata, dict):
            raise ParseError(f"metadata must be a JSON object, got {type(metadata).__name__}")
        for field in ("title", "author", "genre", "period", "language"):
            if field in metadata and not isinstance(metadata[field], str):
                raise ParseError(f"metadata.{field} must be a string")
        characters = metadata.get("characters")
        if characters is not None:
            if not isinstance(characters, list):
                raise ParseError("metadata.characters must be a list")
            for i, character in enumerate(characters):
                if not isinstance(character, dict) or "id" not in character or "name" not in character:
                    raise ParseError(
                        f"metadata.characters[{i}] must be an object with 'id' and 'name'"
                    )

    @staticmethod
    def _validate_csv(csv_data: str) -> None:
        problems = []
        for lineno, line in enumerate(csv_data.splitlines(), start=1):
            if not line.strip():
                continue
            fields = line.split("|")
            if len(fields) != 4:
                problems.append(f"line {lineno}: expected 4 pipe-separated fields, got {len(fields)}")
                continue
            line_type = fields[0]
            if line_type not in VALID_LINE_TYPES:
                problems.append(f"line {lineno}: invalid line_type {line_type!r}")
            if line_type == "heading":
                try:
                    int(fields[2])
                except ValueError:
                    problems.append(f"line {lineno}: heading_level {fields[2]!r} is not an integer")
            if line_type == "chartext" and not fields[1].strip():
                problems.append(f"line {lineno}: chartext line has no characters")
        if problems:
            raise ParseError("invalid csv data: " + "; ".join(problems[:5]))

    def parse_script(self, script_text, theatrical_genres, theatrical_periods):
        if not script_text or not script_text.strip():
            raise ParseError("script text is empty")
        try:
            prompt = self._load_prompt()
            chunks = list(split_script_strategically(script_text))
            all_csv_data = ""
            all_metadata: dict = {}
            for chunk_count, chunk in enumerate(chunks, start=1):
                response = self._complete_chunk(
                    prompt.format(
                        script_text=chunk,
                        chunk_num=chunk_count,
                        chunk_num_total=len(chunks),
                        metadata=all_metadata,
                        theatrical_genres=theatrical_genres,
                        theatrical_periods=theatrical_periods,
                    ),
                    chunk_num=chunk_count,
                    chunk_total=len(chunks),
                )
                choices = getattr(response, "choices", None)
                content = choices[0].message.content if choices else None
                if not content:
                    raise ParseError(f"empty response content for chunk {chunk_count}")

                metadata, csv_data = self._extract_blocks(content)
                self._validate_metadata(metadata)
                self._validate_csv(csv_data)

                all_csv_data += csv_data
                all_metadata = metadata

            all_csv_data = all_csv_data.replace('|""|', "||")
            all_csv_data = all_csv_data.replace('""', '"')
            all_csv_data = all_csv_data.replace('|"\n', '|""\n')
            # Generate real UUIDs
            for character in all_metadata.get("characters", []):
                new_uuid = str(uuid.uuid4())
                all_csv_data = all_csv_data.replace(character["id"], new_uuid)
                character["id"] = new_uuid

            return all_metadata, all_csv_data
        except errors.MistralError as e:
            # The base class for HTTP error responses
            logger.error(
                "Mistral API error",
                exc_info=True,
                extra={
                    "status_code": getattr(e, "status_code", None),
                    "body": getattr(e, "body", None),
                },
            )
            raise
        except (ParseError, CircuitOpenError):
            logger.error("parse failed", exc_info=True)
            raise
        except Exception:
            logger.exception("Mistral call failed")
            raise


def chunk_script(text, max_tokens=1000):
    # Approximation : 1 token ≈ 4 caractères
    chunk_size = max_tokens * 4
    for i in range(0, len(text), chunk_size):
        yield text[i:i + chunk_size]


def split_script_strategically(text, max_chunk_tokens=1000):
    # Séparateurs par ordre de priorité
    separators = [
        (r"\nACT\*+\s*\n", "ACTE"),
        (r"\nSCEN\*+\s*\n", "SCENE"),
        (r"\n\n", "PARAGRAPH"),
    ]

    current = text

    for sep, name in separators:
        parts = re.split(sep, current)
        if len(parts) > 1:
            # Reconstruire avec le séparateur
            current_parts = []
            for i, part in enumerate(parts[:-1]):
                current_parts.append(part + sep)
            current_parts.append(parts[-1])
            current = "\n".join(current_parts)

    # Estime tokens ≈ len(text) / 4
    # Maintenant split par taille approximative
    target_len = max_chunk_tokens * 4
    if len(current) <= target_len:
        return [current]

    start = 0
    chunks = []

    while start < len(current):
        end = start + target_len
        if end >= len(current):
            chunks.append(current[start:])
            break
        last_break = current.rfind("\n\n", start, end)
        if last_break == -1:
            last_break = current.rfind("\n", start, end)
        if last_break == -1 or last_break <= start:
            last_break = end
        chunks.append(current[start:last_break])
        start = last_break

    return chunks
