import json
import logging
import os
import sys
from datetime import datetime, timezone

# Record attributes that are promoted to top-level JSON fields when present.
CONTEXT_FIELDS = (
    "job_id",
    "import_id",
    "attempt",
    "timeout_s",
    "error",
    "signal",
    "concurrency",
)


class JsonFormatter(logging.Formatter):
    """Emit log records as single-line JSON for log aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "service": "marivo-worker",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for field in CONTEXT_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def setup_logging() -> None:
    """Attach a JSON stream handler to the root logger (idempotent)."""
    root = logging.getLogger()
    if any(isinstance(h.formatter, JsonFormatter) for h in root.handlers):
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    root.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())
