import json
import logging
import os
import tempfile

from bullmq import Job
from dotenv import load_dotenv

from mistral_parser import MistralParser
from storage_client import StorageClient
from trpc_client import TRPCClient

load_dotenv()

logger = logging.getLogger("worker.jobs")

# Initialisation des clients
parser = MistralParser()


def _is_final_attempt(job: Job) -> bool:
    attempts = (job.opts or {}).get("attempts") or 1
    return job.attemptsMade >= attempts


def _report_failure(client: TRPCClient, import_id: str, error: str) -> None:
    """Best-effort status update so failed imports are visible in the UI."""
    try:
        client.mutate(
            "worker/plays.setScriptImportResult",
            {"importId": import_id, "result": {"success": False, "error": error}},
        )
    except Exception:
        logger.exception(
            "could not report import failure to the API", extra={"import_id": import_id}
        )


def process_script_text_files(job: Job) -> None:
    client = TRPCClient(
        os.getenv("API_URL"), use_superjson=True, api_key=os.getenv("WORKER_API_KEY")
    )
    storage = StorageClient(client)
    payload = job.data or {}
    import_id = payload.get("importId")
    log = logging.LoggerAdapter(
        logger,
        {"job_id": job.id, "import_id": import_id, "attempt": job.attemptsMade},
    )
    # Context manager guarantees the temp dir is removed on success AND error.
    with tempfile.TemporaryDirectory(prefix="marivo-import-") as temp_dir:
        try:
            log.info("processing job")
            if import_id is None:
                raise ValueError("job payload is missing importId")
            files = payload["files"]
            result_lines_csv = os.path.join(import_id, "result-lines.csv")
            result_metadata = os.path.join(import_id, "result-metadata.json")

            script_text = ""
            for key in files:
                local_path = os.path.join(temp_dir, key)
                storage.download_file(
                    "marivo-imports", os.path.join(import_id, key), local_path
                )
                with open(local_path, "r", encoding="utf-8") as f:
                    script_text += f.read()

            # Fetch collection metadata possible values from API
            theatrical_genres_response = client.query("worker/playsCollection.listAllGenres")
            theatrical_genres = ", ".join(theatrical_genres_response["genres"])
            theatrical_periods_response = client.query("worker/playsCollection.listAllPeriods")
            theatrical_periods = ", ".join(theatrical_periods_response["periods"])

            metadata, csv_data = parser.parse_script(
                script_text, theatrical_genres, theatrical_periods
            )
            result_lines_csv_local = os.path.join(temp_dir, "result-lines.csv")
            with open(result_lines_csv_local, "w") as f:
                f.write(csv_data)
            storage.upload_result("marivo-imports", result_lines_csv_local, result_lines_csv)
            result_metadata_local = os.path.join(temp_dir, "result-metadata.json")
            with open(result_metadata_local, "w") as f:
                f.write(json.dumps(metadata))
            storage.upload_result("marivo-imports", result_metadata_local, result_metadata)

            client.mutate(
                "worker/plays.setScriptImportResult",
                {"importId": import_id, "result": {"success": True, "metadata": metadata}},
            )
            log.info("job completed successfully")
        except Exception as e:
            log.exception("job failed")
            # Only mark the import as failed once all retries are exhausted,
            # otherwise transient failures would flap the status.
            if import_id is not None and _is_final_attempt(job):
                _report_failure(client, import_id, str(e))
            raise
