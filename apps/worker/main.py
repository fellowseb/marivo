from bullmq import Worker, Job
import asyncio
import signal
from process_script_text_files import process_script_text_files


def process(job: Job, job_token):
    process_script_text_files(job)


async def main():
    print("[WORKER] Starting")

    # Create an event that will be triggered for shutdown
    shutdown_event = asyncio.Event()

    def signal_handler(signal, frame):
        print("[WORKER] Signal received, shutting down.")
        shutdown_event.set()

    # Assign signal handlers to SIGTERM and SIGINT
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    # Feel free to remove the connection parameter, if your redis runs on localhost
    worker = Worker(
        "marivo-jobs",
        process,
        {"connection": "redis://redis:6379"}
    )

    # Wait until the shutdown event is set
    await shutdown_event.wait()

    # close the worker
    print("[WORKER] Cleaning up worker...")
    await worker.close()
    print("[WORKER] Worker shut down successfully.")

if __name__ == "__main__":
    asyncio.run(main())
