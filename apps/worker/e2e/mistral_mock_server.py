"""Mock Mistral API server for E2E tests.

Serves the two endpoints the worker's MistralParser uses (via MISTRAL_API_BASE):
- GET  /v1/models/{model_id}   (models.retrieve, called once at parser init)
- POST /v1/chat/completions    (chat.complete, called once per script chunk)

The chat completion returns a deterministic fake parse: a ```json metadata
block and a ```csv lines block, exactly the fenced-block shape the parser
extracts with regexes. Character ids (CHARACTER_01, ...) are placeholders that
the parser replaces with real UUIDs before sending results to the API.

Run with: python3 e2e/mistral_mock_server.py   (PORT env var, default 8787)
"""

import json
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.getenv("PORT", "8787"))

FAKE_METADATA = {
    "title": "E2E Mock Play",
    "author": "E2E Author",
    "genre": "comedy",
    "period": "contemporary",
    "language": "en",
    "characters": [
        {
            "id": "CHARACTER_01",
            "name": "Alice",
            "description": "A mock character",
            "genre": "female",
        },
        {
            "id": "CHARACTER_02",
            "name": "Bob",
            "description": "Another mock character",
            "genre": "male",
        },
    ],
}

# CSV columns: line_type|characters|heading_level|text  (pipe-delimited,
# text double-quoted, characters as a SQL-style {{id}} array).
FAKE_CSV = "\n".join(
    [
        'heading||1|"Act I"',
        'freetext|||"A small stage."',
        'chartext|{{CHARACTER_01}}||"Hello from the mock."',
        'chartext|{{CHARACTER_02}}||"Hi Alice."',
    ]
)

CHAT_CONTENT = (
    "Here is the parsed script.\n\n"
    "```json\n" + json.dumps(FAKE_METADATA, indent=2) + "\n```\n\n"
    "```csv\n" + FAKE_CSV + "\n```"
)


def model_payload(model_id: str) -> dict:
    return {
        "id": model_id,
        "type": "base",
        "object": "model",
        "created": 1_700_000_000,
        "owned_by": "mistralai",
        "name": model_id,
        "description": "Mock model for E2E tests",
        "max_context_length": 128_000,
        "capabilities": {
            "completion_chat": True,
            "completion": True,
            "function_calling": True,
            "vision": False,
        },
    }


def chat_completion_payload(model: str) -> dict:
    return {
        "id": "mock-completion",
        "object": "chat.completion",
        "created": 1_700_000_000,
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": CHAT_CONTENT},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
    }


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if re.fullmatch(r"/v1/models/[^/?]+", self.path):
            self._send_json(model_payload(self.path.rsplit("/", 1)[-1]))
        else:
            self._send_json({"error": {"message": f"not found: {self.path}"}}, 404)

    def do_POST(self) -> None:
        if self.path == "/v1/chat/completions":
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length)
            model = "mock-model"
            try:
                model = json.loads(raw).get("model") or model
            except ValueError:
                pass
            self._send_json(chat_completion_payload(model))
        else:
            self._send_json({"error": {"message": f"not found: {self.path}"}}, 404)

    def log_message(self, fmt, *args) -> None:
        print(f"[mistral-mock] {self.address_string()} {fmt % args}", flush=True)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[mistral-mock] listening on 0.0.0.0:{PORT}", flush=True)
    server.serve_forever()
