import json
from unittest.mock import MagicMock, patch

import pytest
import requests

from trpc_client import DEFAULT_TIMEOUT_SECONDS, TRPCClient, TRPCError


def make_client(session, **kwargs):
    with patch("trpc_client.requests.Session", return_value=session):
        return TRPCClient("http://api.test/trpc/", **kwargs)


def ok_response(payload):
    res = MagicMock()
    res.raise_for_status = lambda: None
    res.json.return_value = payload
    return res


def result_payload(data):
    return {"jsonrpc": "2.0", "id": 1, "result": {"data": data}}


def test_query_uses_get_with_url_encoded_input_and_timeout():
    session = MagicMock()
    session.get.return_value = ok_response(result_payload({"url": "https://s3.example/x"}))
    client = make_client(session, api_key="secret", timeout=12)

    out = client.query("worker/storage.getPresignedUrl", {"importId": "imp-1", "operation": "download"})

    assert out == {"url": "https://s3.example/x"}
    session.get.assert_called_once_with(
        "http://api.test/trpc/worker/storage.getPresignedUrl",
        params={"input": json.dumps({"json": {"importId": "imp-1", "operation": "download"}})},
        timeout=12,
    )
    session.post.assert_not_called()


def test_query_without_input_sends_no_params():
    session = MagicMock()
    session.get.return_value = ok_response(result_payload({"ok": True}))
    client = make_client(session)

    out = client.query("worker/health")

    assert out == {"ok": True}
    session.get.assert_called_once_with(
        "http://api.test/trpc/worker/health", params=None, timeout=DEFAULT_TIMEOUT_SECONDS
    )


def test_mutation_uses_post_with_json_body_and_timeout():
    session = MagicMock()
    session.post.return_value = ok_response(result_payload({"done": True}))
    client = make_client(session, timeout=7)

    out = client.mutate("worker/playsCollection.listAllGenres", {"playId": "p-1"})

    assert out == {"done": True}
    session.post.assert_called_once_with(
        "http://api.test/trpc/worker/playsCollection.listAllGenres",
        json={"json": {"playId": "p-1"}},
        timeout=7,
    )
    session.get.assert_not_called()


def test_superjson_unwraps_data_json():
    session = MagicMock()
    session.get.return_value = ok_response(result_payload({"json": {"n": 1}, "meta": {}}))
    client = make_client(session, use_superjson=True)

    assert client.query("some.query", {"a": 1}) == {"n": 1}


def test_api_key_sent_as_header_and_content_type_json():
    session = MagicMock()
    client = make_client(session, api_key="worker-key")
    session.headers.update.assert_any_call({"x-marivo-worker-api-key": "worker-key"})
    session.headers.update.assert_any_call({"Content-Type": "application/json"})
    assert client.base_url == "http://api.test/trpc"


def test_trpc_error_payload_raises_with_server_code():
    session = MagicMock()
    session.get.return_value = ok_response(
        {"jsonrpc": "2.0", "id": 1, "error": {"message": "boom", "code": -32602}}
    )
    client = make_client(session)

    with pytest.raises(TRPCError) as exc:
        client.query("some.query")
    assert exc.value.code == -32602
    assert "boom" in exc.value.message


def test_http_error_status_with_trpc_error_body_uses_server_code():
    # tRPC validation errors come back as HTTP 400 with a JSON error body:
    # the server's own code/message must win over the HTTP status.
    session = MagicMock()
    res = MagicMock(ok=False, status_code=400)
    res.json.return_value = {"error": {"message": "invalid input", "code": -32602}}
    session.post.return_value = res
    client = make_client(session)

    with pytest.raises(TRPCError) as exc:
        client.mutate("some.mutation", {"a": 1})
    assert exc.value.code == -32602
    assert "invalid input" in exc.value.message


def test_superjson_wrapped_error_body_is_unwrapped():
    session = MagicMock()
    res = MagicMock(ok=False, status_code=400)
    res.json.return_value = {
        "error": {"json": {"message": "Invalid UUID", "code": -32600, "data": {"code": "BAD_REQUEST"}}}
    }
    session.get.return_value = res
    client = make_client(session, use_superjson=True)

    with pytest.raises(TRPCError) as exc:
        client.query("some.query", {"a": 1})
    assert exc.value.code == -32600
    assert "Invalid UUID" in exc.value.message


def test_timeout_raises_trpc_error_minus_32001():
    session = MagicMock()
    session.post.side_effect = requests.Timeout("timed out")
    client = make_client(session)

    with pytest.raises(TRPCError) as exc:
        client.mutate("some.mutation", {"a": 1})
    assert exc.value.code == -32001
    assert "timed out" in exc.value.message


def test_http_error_without_json_body_raises_trpc_error_minus_32002():
    session = MagicMock()
    res = MagicMock(ok=False, status_code=500)
    res.json.side_effect = ValueError("not json")
    session.get.return_value = res
    client = make_client(session)

    with pytest.raises(TRPCError) as exc:
        client.query("some.query")
    assert exc.value.code == -32002
    assert "500" in exc.value.message


def test_connection_error_raises_trpc_error_minus_32003():
    session = MagicMock()
    session.get.side_effect = requests.ConnectionError("refused")
    client = make_client(session)

    with pytest.raises(TRPCError) as exc:
        client.query("some.query")
    assert exc.value.code == -32003
