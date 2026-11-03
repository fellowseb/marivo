from unittest.mock import MagicMock, patch

import httpx
import pytest

import mistral_parser
from mistral_parser import CircuitBreaker, CircuitOpenError, ParseError


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    monkeypatch.delenv("MISTRAL_MODEL", raising=False)
    monkeypatch.delenv("MISTRAL_API_BASE", raising=False)
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)


def build_parser(monkeypatch, model=None, base=None):
    monkeypatch.setenv("MISTRAL_API_KEY", "test-key")
    if model is not None:
        monkeypatch.setenv("MISTRAL_MODEL", model)
    if base is not None:
        monkeypatch.setenv("MISTRAL_API_BASE", base)
    with patch.object(mistral_parser, "Mistral") as mistral_cls:
        client = mistral_cls.return_value
        client.models.retrieve.return_value = MagicMock(max_context_length=128000)
        parser = mistral_parser.MistralParser()
    return parser, mistral_cls, client


def test_default_model_and_no_server_url(monkeypatch):
    parser, mistral_cls, client = build_parser(monkeypatch)
    assert parser.model == mistral_parser.DEFAULT_MODEL
    assert mistral_cls.call_args.kwargs["server_url"] is None
    assert mistral_cls.call_args.kwargs["api_key"] == "test-key"
    client.models.retrieve.assert_called_once_with(model_id="mistral-large-latest")


def test_env_overrides_model_and_base_url(monkeypatch):
    parser, mistral_cls, client = build_parser(
        monkeypatch, model="mistral-small-latest", base="http://mock-llm:9000/v1"
    )
    assert parser.model == "mistral-small-latest"
    assert mistral_cls.call_args.kwargs["server_url"] == "http://mock-llm:9000/v1"
    client.models.retrieve.assert_called_once_with(model_id="mistral-small-latest")


def test_parse_script_uses_configured_model(monkeypatch):
    parser, _, client = build_parser(monkeypatch, model="mistral-small-latest")
    content = '```json\n{"characters": []}\n```\n```csv\nfreetext|||"a note"\n```'
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=content))]
    client.chat.complete.return_value = response

    metadata, csv_data = parser.parse_script("hello script", "drama, comedy", "modern")

    client.chat.complete.assert_called_once()
    assert client.chat.complete.call_args.kwargs["model"] == "mistral-small-latest"
    assert metadata == {"characters": []}
    assert "freetext" in csv_data


def make_response(content):
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=content))]
    return response


GOOD_CONTENT = (
    '```json\n{"title": "T", "characters": [{"id": "C1", "name": "Alice"}]}\n```\n'
    '```csv\nheading||1|"Act I"\nchartext|{{C1}}||"Hi."\n```'
)


def test_extract_blocks_tolerates_fence_case_and_whitespace(monkeypatch):
    parser, _, client = build_parser(monkeypatch)
    content = '```JSON  \n{"characters": []}\n```\n```CSV\nfreetext|||"a note"\n```'
    client.chat.complete.return_value = make_response(content)

    metadata, csv_data = parser.parse_script("hello", "drama", "modern")

    assert metadata == {"characters": []}
    assert "freetext" in csv_data


def test_extract_blocks_falls_back_to_bare_json_and_raw_csv_lines(monkeypatch):
    parser, _, client = build_parser(monkeypatch)
    content = (
        'Here you go: {"characters": []}\n'
        'heading||1|"Act I"\n'
        'freetext|||"note"\n'
    )
    client.chat.complete.return_value = make_response(content)

    metadata, csv_data = parser.parse_script("hello", "drama", "modern")

    assert metadata == {"characters": []}
    assert 'heading||1|"Act I"' in csv_data
    assert 'freetext|||"note"' in csv_data


def test_parse_script_raises_parse_error_when_blocks_missing(monkeypatch):
    parser, _, client = build_parser(monkeypatch)
    client.chat.complete.return_value = make_response("no blocks at all")

    with pytest.raises(ParseError, match="no json block"):
        parser.parse_script("hello", "drama", "modern")


def test_parse_script_raises_parse_error_on_invalid_json(monkeypatch):
    parser, _, client = build_parser(monkeypatch)
    client.chat.complete.return_value = make_response('```json\n{not json}\n```\n```csv\nfreetext|||"x"\n```')

    with pytest.raises(ParseError, match="invalid json"):
        parser.parse_script("hello", "drama", "modern")


def test_parse_script_validates_metadata_characters(monkeypatch):
    parser, _, client = build_parser(monkeypatch)
    content = '```json\n{"characters": "nope"}\n```\n```csv\nfreetext|||"x"\n```'
    client.chat.complete.return_value = make_response(content)

    with pytest.raises(ParseError, match="characters must be a list"):
        parser.parse_script("hello", "drama", "modern")


def test_parse_script_validates_csv_rows(monkeypatch):
    parser, _, client = build_parser(monkeypatch)
    # 3 fields instead of 4, plus an invalid line type
    content = '```json\n{"characters": []}\n```\n```csv\nfreetext||"too few"\nbogus||1|"x"\n```'
    client.chat.complete.return_value = make_response(content)

    with pytest.raises(ParseError, match="invalid csv data"):
        parser.parse_script("hello", "drama", "modern")


def test_parse_script_rejects_empty_script_text(monkeypatch):
    parser, _, client = build_parser(monkeypatch)

    with pytest.raises(ParseError, match="empty"):
        parser.parse_script("   ", "drama", "modern")
    client.chat.complete.assert_not_called()


def test_transient_api_error_is_retried(monkeypatch):
    monkeypatch.setattr(mistral_parser.time, "sleep", lambda _s: None)
    parser, _, client = build_parser(monkeypatch)
    client.chat.complete.side_effect = [
        httpx.ConnectError("connection reset"),
        make_response(GOOD_CONTENT),
    ]

    metadata, csv_data = parser.parse_script("hello", "drama", "modern")

    assert client.chat.complete.call_count == 2
    assert metadata["title"] == "T"
    assert 'chartext|{{' in csv_data


def test_non_transient_api_error_is_not_retried(monkeypatch):
    monkeypatch.setattr(mistral_parser.time, "sleep", lambda _s: None)
    parser, _, client = build_parser(monkeypatch)
    client.chat.complete.side_effect = RuntimeError("bad request, do not retry")

    with pytest.raises(RuntimeError, match="do not retry"):
        parser.parse_script("hello", "drama", "modern")
    assert client.chat.complete.call_count == 1


def test_circuit_breaker_opens_after_threshold_and_fails_fast(monkeypatch):
    monkeypatch.setattr(mistral_parser.time, "sleep", lambda _s: None)
    parser, _, client = build_parser(monkeypatch)
    parser.breaker = CircuitBreaker(failure_threshold=3, cooldown_seconds=9999)
    client.chat.complete.side_effect = httpx.ConnectError("down")

    # first parse: 3 attempts, all fail transiently -> ConnectError after retries
    with pytest.raises(httpx.ConnectError):
        parser.parse_script("hello", "drama", "modern")
    assert client.chat.complete.call_count == 3
    # breaker is now open: the next parse must fail fast without hitting the API
    with pytest.raises(CircuitOpenError, match="circuit is open"):
        parser.parse_script("hello", "drama", "modern")
    assert client.chat.complete.call_count == 3


def test_circuit_breaker_half_open_after_cooldown(monkeypatch):
    parser, _, client = build_parser(monkeypatch)
    breaker = CircuitBreaker(failure_threshold=1, cooldown_seconds=60)
    breaker.on_failure()
    assert breaker.opened_at is not None
    with pytest.raises(CircuitOpenError):
        breaker.before_call()
    # simulate the cooldown having elapsed
    breaker.opened_at -= 61
    breaker.before_call()  # must not raise
    client.chat.complete.return_value = make_response(GOOD_CONTENT)
    parser.breaker = breaker
    parser.parse_script("hello", "drama", "modern")
    assert breaker.opened_at is None  # closed again after success


def test_prompt_path_defaults_next_to_module_and_env_override(monkeypatch, tmp_path):
    parser, _, _ = build_parser(monkeypatch)
    assert parser.prompt_path == mistral_parser.DEFAULT_PROMPT_PATH
    assert parser.prompt_path.endswith("IMPORT-SCRIPT-PROMPT.md")

    custom = tmp_path / "custom-prompt.md"
    custom.write_text("prompt with {script_text} {chunk_num} {chunk_num_total} {metadata} {theatrical_genres} {theatrical_periods}")
    monkeypatch.setenv("IMPORT_SCRIPT_PROMPT_PATH", str(custom))
    parser2, _, client2 = build_parser(monkeypatch)
    assert parser2.prompt_path == str(custom)
    client2.chat.complete.return_value = make_response(GOOD_CONTENT)
    parser2.parse_script("hello", "drama", "modern")
    sent = client2.chat.complete.call_args.kwargs["messages"][0]["content"]
    assert "prompt with hello" in sent


def test_missing_prompt_file_raises_parse_error(monkeypatch):
    parser, _, client = build_parser(monkeypatch)
    parser.prompt_path = "/nonexistent/prompt.md"
    client.chat.complete.return_value = make_response(GOOD_CONTENT)

    with pytest.raises(ParseError, match="cannot read prompt file"):
        parser.parse_script("hello", "drama", "modern")
