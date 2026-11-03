import pytest
from unittest.mock import MagicMock, patch

from storage_client import StorageClient


def make_client():
    trpc = MagicMock()
    trpc.query.return_value = {"url": "https://s3.example/presigned"}
    return StorageClient(trpc, retry_delay=0), trpc


def test_download_file_fetches_presigned_url(tmp_path):
    client, trpc = make_client()
    with patch("storage_client.requests.request") as req:
        res = MagicMock(status_code=200, content=b"file-bytes")
        res.raise_for_status = lambda: None
        req.return_value = res
        out = tmp_path / "a.txt"
        result = client.download_file("marivo-imports", "imp-1/files/a.txt", str(out))

    assert result == str(out)
    assert out.read_bytes() == b"file-bytes"
    trpc.query.assert_called_once_with(
        "worker/storage.getPresignedUrl",
        {"importId": "imp-1", "key": "files/a.txt", "operation": "download"},
    )
    req.assert_called_once_with("GET", "https://s3.example/presigned", timeout=60)


def test_upload_result_puts_file_bytes(tmp_path):
    client, trpc = make_client()
    local = tmp_path / "result.csv"
    local.write_bytes(b"csv-data")
    captured = {}

    def fake_request(method, url, **kwargs):
        data = kwargs.get("data")
        captured["method"] = method
        captured["url"] = url
        captured["bytes"] = data.read() if data is not None else None
        res = MagicMock(status_code=200)
        res.raise_for_status = lambda: None
        return res

    with patch("storage_client.requests.request", side_effect=fake_request):
        client.upload_result("marivo-imports", str(local), "imp-1/result-lines.csv")

    trpc.query.assert_called_once_with(
        "worker/storage.getPresignedUrl",
        {"importId": "imp-1", "key": "result-lines.csv", "operation": "upload"},
    )
    assert captured["method"] == "PUT"
    assert captured["url"] == "https://s3.example/presigned"
    assert captured["bytes"] == b"csv-data"


def test_rejects_key_without_import_prefix():
    client, _ = make_client()
    with pytest.raises(ValueError):
        client._presigned_url("no-import-separator", "download")


def test_rejects_wrong_bucket(tmp_path):
    client, _ = make_client()
    with pytest.raises(ValueError):
        client.download_file("other-bucket", "imp-1/a.txt", str(tmp_path / "x"))


def test_retries_on_server_error_then_succeeds(tmp_path):
    client, _ = make_client()
    with patch("storage_client.requests.request") as req:
        bad = MagicMock(status_code=500)
        good = MagicMock(status_code=200, content=b"ok")
        good.raise_for_status = lambda: None
        req.side_effect = [bad, good]
        out = tmp_path / "a.txt"
        client.download_file("marivo-imports", "imp-1/a.txt", str(out))
    assert req.call_count == 2
    assert out.read_bytes() == b"ok"


def test_raises_after_exhausting_retries(tmp_path):
    client, _ = make_client()
    with patch("storage_client.requests.request") as req:
        req.side_effect = requests_connection_error()
        with pytest.raises(Exception):
            client.download_file("marivo-imports", "imp-1/a.txt", str(tmp_path / "a.txt"))
    assert req.call_count == 3


def requests_connection_error():
    import requests

    return requests.ConnectionError("boom")
