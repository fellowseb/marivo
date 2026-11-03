import json
import logging

from worker_logging import JsonFormatter, setup_logging


def test_json_formatter_emits_structured_fields():
    record = logging.LogRecord(
        "worker.jobs", logging.ERROR, __file__, 10, "job failed", (), None
    )
    record.job_id = "job-1"
    record.import_id = "imp-1"
    record.attempt = 3

    out = json.loads(JsonFormatter().format(record))

    assert out["service"] == "marivo-worker"
    assert out["level"] == "ERROR"
    assert out["logger"] == "worker.jobs"
    assert out["message"] == "job failed"
    assert out["job_id"] == "job-1"
    assert out["import_id"] == "imp-1"
    assert out["attempt"] == 3
    assert "ts" in out


def test_json_formatter_includes_exception_when_present():
    try:
        raise ValueError("bad")
    except ValueError:
        import sys

        exc_info = sys.exc_info()
    record = logging.LogRecord(
        "worker.jobs", logging.ERROR, __file__, 10, "job failed", (), exc_info
    )

    out = json.loads(JsonFormatter().format(record))

    assert "ValueError: bad" in out["exception"]


def test_setup_logging_is_idempotent():
    setup_logging()
    handler_count = len(logging.getLogger().handlers)
    setup_logging()
    assert len(logging.getLogger().handlers) == handler_count
