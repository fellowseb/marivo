import threading
from http.server import ThreadingHTTPServer

import pytest

from e2e.mistral_mock_server import FAKE_METADATA, Handler


@pytest.fixture
def mock_server(monkeypatch):
    """Run the E2E mock Mistral API on an ephemeral port and point the SDK at it."""
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    monkeypatch.setenv("MISTRAL_API_BASE", f"http://127.0.0.1:{server.server_address[1]}")
    monkeypatch.setenv("MISTRAL_API_KEY", "mock-key")
    monkeypatch.delenv("MISTRAL_MODEL", raising=False)
    yield server
    server.shutdown()
    thread.join()


def test_parser_against_mock_server(mock_server):
    """The real MistralParser must accept the mock's responses and produce the
    metadata + pipe-delimited CSV that the API's createScriptFromStream expects."""
    from mistral_parser import MistralParser

    parser = MistralParser()
    metadata, csv_data = parser.parse_script(
        "ACT I\n\nALICE. Hello from the mock.\n\nBOB. Hi Alice.",
        "comedy, drama",
        "contemporary",
    )

    assert metadata["title"] == FAKE_METADATA["title"]
    # placeholder ids (CHARACTER_01, ...) are replaced with 36-char UUIDs
    assert [c["name"] for c in metadata["characters"]] == ["Alice", "Bob"]
    assert all(len(c["id"]) == 36 for c in metadata["characters"])
    assert csv_data.startswith('heading||1|"Act I"')
    assert 'chartext|{{' in csv_data
    assert '"Hello from the mock."' in csv_data
