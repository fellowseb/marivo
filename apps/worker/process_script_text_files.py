from bullmq import Job
import os
from dotenv import load_dotenv
import tempfile
from s3_client import GarageClient
from mistral_parser import MistralParser
from trpc_client import TRPCClient

load_dotenv()

# Initialisation des clients
garage = GarageClient()
parser = MistralParser()


def process_script_text_files(job: Job):
    client = TRPCClient(os.getenv("API_URL"))
    temp_dir = tempfile.TemporaryDirectory()
    try:
        print("Starting process_script_text_files job")
        payload = job.data
        import_id = payload["importId"]
        # Liste des clés S3 des fichiers à traiter
        files = payload["files"]
        result_lines_csv = import_id + '/result-lines.csv'

        script_text = ""

        for key in files:
            local_path = os.path.join(temp_dir.name, key)
            garage.download_file(
                'marivo-imports',
                import_id + '/' + key,
                local_path
            )
            with open(local_path, 'r', encoding='utf-8') as f:
                script_text = script_text + f.read()

        metadata, csv_data = parser.parse_script(script_text)
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
        client.mutate(
            "worker/plays.setScriptImportResult",
            {"importId": import_id, "result": {
                "success": True, "metadata": metadata}}
        )
    except Exception as e:
        print("error process_script_text_files: {}".format(e))
    finally:
        temp_dir.cleanup()
