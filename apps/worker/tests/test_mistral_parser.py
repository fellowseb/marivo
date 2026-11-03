from unittest.mock import MagicMock, patch

import pytest

import mistral_parser


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
