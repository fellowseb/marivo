import asyncio
import logging
import os
import signal

from bullmq import Job, Worker

from process_script_text_files import process_script_text_files
from worker_logging import setup_logging

setup_logging()
logger = logging.getLogger("worker.main")

JOB_TIMEOUT_SECONDS = int(os.getenv("JOB_TIMEOUT_SECONDS", "600"))
WORKER_CONCURRENCY = int(os.getenv("WORKER_CONCURRENCY", "2"))


async def process(job: Job, token: str) -> None:
    """Run the sync processor in an executor with a hard timeout."""
    loop = asyncio.get_running_loop()
    try:
        await asyncio.wait_for(
            loop.run_in_executor(None, process_script_text_files, job),
            timeout=JOB_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.error(
            "job exceeded timeout",
            extra={
                "job_id": job.id,
                "import_id": (job.data or {}).get("importId"),
                "timeout_s": JOB_TIMEOUT_SECONDS,
            },
        )
        raise TimeoutError(
            f"job {job.id} exceeded timeout of {JOB_TIMEOUT_SECONDS}s"
        ) from None


def _job_extra(job: Job) -> dict:
    return {"job_id": job.id, "import_id": (job.data or {}).get("importId")}


async def main() -> None:
    logger.info(
        "starting worker",
        extra={"timeout_s": JOB_TIMEOUT_SECONDS, "concurrency": WORKER_CONCURRENCY},
    )

    # Create an event that will be triggered for shutdown
    shutdown_event = asyncio.Event()

    def signal_handler(sig, frame):
        logger.info("signal received, shutting down", extra={"signal": sig})
        shutdown_event.set()

    # Assign signal handlers to SIGTERM and SIGINT
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    # The lock must outlive the job timeout, otherwise long-running jobs are
    # considered stalled and re-processed while still running.
    lock_duration_ms = (JOB_TIMEOUT_SECONDS + 60) * 1000
    worker = Worker(
        "marivo-jobs",
        process,
        {
            "connection": redis_url,
            "concurrency": WORKER_CONCURRENCY,
            "lockDuration": lock_duration_ms,
            "maxStalledCount": 1,
        },
    )

    def on_failed(job: Job, err: Exception) -> None:
        logger.error(
            "job failed",
            extra={**_job_extra(job), "attempt": job.attemptsMade, "error": str(err)},
        )

    def on_completed(job: Job, result) -> None:
        logger.info("job completed", extra=_job_extra(job))

    def on_stalled(job_id) -> None:
        logger.warning("job stalled", extra={"job_id": job_id})

    def on_error(err: Exception) -> None:
        logger.error("worker error", extra={"error": str(err)})

    worker.on("failed", on_failed)
    worker.on("completed", on_completed)
    worker.on("stalled", on_stalled)
    worker.on("error", on_error)

    # Wait until the shutdown event is set
    await shutdown_event.wait()

    # close the worker
    logger.info("cleaning up worker")
    await worker.close()
    logger.info("worker shut down successfully")


if __name__ == "__main__":
    asyncio.run(main())
