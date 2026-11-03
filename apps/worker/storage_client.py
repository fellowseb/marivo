import time

import requests
from dotenv import load_dotenv

load_dotenv()

IMPORTS_BUCKET = "marivo-imports"


class StorageClient:
    """Storage access via presigned URLs issued by the API.

    The worker holds no S3/Garage credentials: for each object it asks the
    API (worker/storage.getPresignedUrl, authenticated with WORKER_API_KEY)
    for a short-lived presigned URL scoped to marivo-imports/<importId>/,
    then does a plain HTTP GET/PUT against it.
    """

    def __init__(self, trpc_client, timeout=60, retries=3, retry_delay=1):
        self.trpc = trpc_client
        self.timeout = timeout
        self.retries = retries
        self.retry_delay = retry_delay

    def _presigned_url(self, s3_key, operation):
        import_id, _, key = s3_key.partition("/")
        if not import_id or not key:
            raise ValueError(f"s3_key must be '<importId>/<key>', got {s3_key!r}")
        response = self.trpc.query(
            "worker/storage.getPresignedUrl",
            {"importId": import_id, "key": key, "operation": operation},
        )
        return response["url"]

    def _request(self, method, url, **kwargs):
        last_error = None
        for attempt in range(self.retries):
            try:
                res = requests.request(method, url, timeout=self.timeout, **kwargs)
                if res.status_code >= 500:
                    last_error = requests.HTTPError(f"{res.status_code} from {url}")
                else:
                    res.raise_for_status()
                    return res
            except requests.RequestException as err:
                last_error = err
            time.sleep(self.retry_delay * (attempt + 1))
        raise last_error

    def download_file(self, bucket_name, s3_key, local_path):
        if bucket_name != IMPORTS_BUCKET:
            raise ValueError(f"unexpected bucket {bucket_name!r}")
        url = self._presigned_url(s3_key, "download")
        res = self._request("GET", url)
        with open(local_path, "wb") as f:
            f.write(res.content)
        return local_path

    def upload_result(self, bucket_name, local_path, s3_key):
        if bucket_name != IMPORTS_BUCKET:
            raise ValueError(f"unexpected bucket {bucket_name!r}")
        url = self._presigned_url(s3_key, "upload")
        with open(local_path, "rb") as f:
            self._request("PUT", url, data=f)
