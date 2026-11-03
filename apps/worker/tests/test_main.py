import asyncio
import time
from unittest.mock import MagicMock, patch

import pytest

# main.py imports process_script_text_files, which instantiates
# MistralParser() (network call) at import time: patch Mistral first.
with patch("mistral_parser.Mistral"):
    import main as worker_main


def make_job():
    job = MagicMock()
    job.id = "job-1"
    job.data = {"importId": "imp-1"}
    return job


def test_process_runs_processor_with_job():
    job = make_job()
    with patch.object(worker_main, "process_script_text_files") as processor:
        asyncio.run(worker_main.process(job, "token"))
    processor.assert_called_once_with(job)


def test_process_raises_timeout_error_when_processor_hangs():
    job = make_job()

    def slow(_job):
        time.sleep(5)

    with (
        patch.object(worker_main, "process_script_text_files", side_effect=slow),
        patch.object(worker_main, "JOB_TIMEOUT_SECONDS", 0.2),
    ):
        with pytest.raises(TimeoutError, match="exceeded timeout"):
            asyncio.run(worker_main.process(job, "token"))


def test_process_propagates_processor_errors():
    job = make_job()
    with patch.object(
        worker_main, "process_script_text_files", side_effect=RuntimeError("boom")
    ):
        with pytest.raises(RuntimeError, match="boom"):
            asyncio.run(worker_main.process(job, "token"))
