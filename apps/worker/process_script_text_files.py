from bullmq import Job
import os
from dotenv import load_dotenv
import tempfile
from s3_client import GarageClient
from mistral_parser import MistralParser
from trpc_client import TRPCClient
import json

load_dotenv()

# Initialisation des clients
garage = GarageClient()
parser = MistralParser()


def process_script_text_files(job: Job):
    client = TRPCClient(os.getenv("API_URL"), use_superjson=True)
    temp_dir = tempfile.TemporaryDirectory()
    try:
        print("Starting process_script_text_files job")
        payload = job.data
        import_id = payload["importId"]
        files = payload["files"]
        result_lines_csv = os.path.join(import_id, 'result-lines.csv')
        result_metadata = os.path.join(import_id, 'result-metadata.json')

        script_text = ""

        for key in files:
            local_path = os.path.join(temp_dir.name, key)
            garage.download_file(
                'marivo-imports',
                os.path.join(import_id, key),
                local_path
            )
            with open(local_path, 'r', encoding='utf-8') as f:
                script_text = script_text + f.read()

        # Fetch collection metadata possible values from API
        theatrical_genres_response = client.query(
            "worker/playsCollection.listAllGenres",
        )
        theatrical_genres = ', '.join(theatrical_genres_response["genres"])
        theatrical_periods_response = client.query(
            "worker/playsCollection.listAllPeriods",
        )
        print(theatrical_periods_response)
        theatrical_periods = ', '.join(theatrical_periods_response["periods"])

        metadata, csv_data = parser.parse_script(
            script_text, theatrical_genres, theatrical_periods)
        result_lines_csv_local = os.path.join(
            temp_dir.name,
            'result-lines.csv'
        )
        with open(result_lines_csv_local, "w") as f:
            f.write(csv_data)
        garage.upload_result(
            'marivo-imports',
            result_lines_csv_local,
            result_lines_csv
        )
        result_metadata_local = os.path.join(
            temp_dir.name,
            'result-metadata.json'
        )
        with open(result_metadata_local, "w") as f:
            f.write(json.dumps(metadata))
        garage.upload_result(
            'marivo-imports',
            result_metadata_local,
            result_metadata
        )
        try:
            client.mutate(
                "worker/plays.setScriptImportResult",
                {"importId": import_id, "result": {
                    "success": True, "metadata": metadata}}
            )
        except Exception as e:
            print("error during mutate: {}".format(e))
    except Exception as e:
        print("error process_script_text_files: {}".format(e))
        raise e
    finally:
        temp_dir.cleanup()
