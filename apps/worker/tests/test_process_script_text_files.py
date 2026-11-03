import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

# process_script_text_files instantiates MistralParser() at import time,
# which performs a network call: patch the Mistral client before importing.
with patch("mistral_parser.Mistral"):
    import process_script_text_files as pstf


def make_job(data=None, attempts=3, attempts_made=1, job_id="job-1"):
    job = MagicMock()
    job.id = job_id
    job.data = data if data is not None else {"importId": "imp-1", "files": ["a.txt"]}
    job.opts = {"attempts": attempts}
    job.attemptsMade = attempts_made
    return job


@pytest.fixture
def mocks():
    with (
        patch.object(pstf, "TRPCClient") as trpc_cls,
        patch.object(pstf, "StorageClient") as storage_cls,
        patch.object(pstf, "parser") as parser,
    ):
        trpc = trpc_cls.return_value
        trpc.query.side_effect = [
            {"genres": ["comedy", "drama"]},
            {"periods": ["ancient_greek"]},
        ]
        storage = storage_cls.return_value

        def fake_download(bucket, key, dest):
            with open(dest, "w", encoding="utf-8") as f:
                f.write("script text of " + key)

        storage.download_file.side_effect = fake_download
        parser.parse_script.return_value = ({"title": "A play"}, "csv-data")
        yield trpc, storage, parser


def test_success_uploads_results_and_reports_success(mocks):
    trpc, storage, parser = mocks
    pstf.process_script_text_files(make_job())

    assert storage.download_file.call_count == 1
    assert storage.upload_result.call_count == 2
    uploaded_keys = [c.args[2] for c in storage.upload_result.call_args_list]
    assert uploaded_keys == [
        os.path.join("imp-1", "result-lines.csv"),
        os.path.join("imp-1", "result-metadata.json"),
    ]
    trpc.mutate.assert_called_once_with(
        "worker/plays.setScriptImportResult",
        {"importId": "imp-1", "result": {"success": True, "metadata": {"title": "A play"}}},
    )


def test_failure_on_non_final_attempt_does_not_report(mocks):
    trpc, _, parser = mocks
    parser.parse_script.side_effect = RuntimeError("LLM exploded")

    with pytest.raises(RuntimeError, match="LLM exploded"):
        pstf.process_script_text_files(make_job(attempts=3, attempts_made=1))

    trpc.mutate.assert_not_called()


def test_failure_on_final_attempt_reports_error_status(mocks):
    trpc, _, parser = mocks
    parser.parse_script.side_effect = RuntimeError("LLM exploded")

    with pytest.raises(RuntimeError, match="LLM exploded"):
        pstf.process_script_text_files(make_job(attempts=3, attempts_made=3))

    trpc.mutate.assert_called_once()
    procedure, payload = trpc.mutate.call_args.args
    assert procedure == "worker/plays.setScriptImportResult"
    assert payload["importId"] == "imp-1"
    assert payload["result"]["success"] is False
    assert "LLM exploded" in payload["result"]["error"]


def test_missing_import_id_raises_without_reporting(mocks):
    trpc, _, _ = mocks
    with pytest.raises(ValueError, match="importId"):
        pstf.process_script_text_files(make_job(data={"files": ["a.txt"]}))
    trpc.mutate.assert_not_called()


def test_failure_report_error_is_swallowed(mocks):
    trpc, _, parser = mocks
    parser.parse_script.side_effect = RuntimeError("LLM exploded")
    trpc.mutate.side_effect = ConnectionError("API down")

    # original error still propagates, reporting failure must not mask it
    with pytest.raises(RuntimeError, match="LLM exploded"):
        pstf.process_script_text_files(make_job(attempts=1, attempts_made=1))


def test_temp_dir_is_cleaned_up_on_failure(mocks):
    _, _, parser = mocks
    parser.parse_script.side_effect = RuntimeError("boom")
    created = []
    real_td = tempfile.TemporaryDirectory

    def spy(*args, **kwargs):
        td = real_td(*args, **kwargs)
        created.append(td.name)
        return td

    with patch.object(pstf.tempfile, "TemporaryDirectory", spy):
        with pytest.raises(RuntimeError):
            pstf.process_script_text_files(make_job())

    assert created, "expected a temp dir to have been created"
    assert not os.path.exists(created[0])
