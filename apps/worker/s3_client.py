import boto3
import logging
from botocore.config import Config
from dotenv import load_dotenv
import os

load_dotenv()


class GarageClient:
    def __init__(self):
        self.client = boto3.client(
            's3',
            endpoint_url=os.getenv('GARAGE_ENDPOINT'),
            aws_access_key_id=os.getenv('GARAGE_ACCESS_KEY'),
            aws_secret_access_key=os.getenv('GARAGE_SECRET_KEY'),
            region_name='garage',
            config=Config(**{
                's3': {
                    'addressing_style': 'path'
                }
            })
        )
        boto3.set_stream_logger('', logging.INFO)

    def download_file(self, bucket_name, s3_key, local_path):
        self.client.download_file(bucket_name, s3_key, local_path)
        return local_path

    def upload_result(self, bucket_name, local_path, s3_key):
        self.client.upload_file(local_path, bucket_name, s3_key)
