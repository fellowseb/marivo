import json
from enum import Enum
from typing import Any, Optional, TypedDict, TypeVar

import requests

# Generic types for procedure input/output
T = TypeVar("T")
U = TypeVar("U")

DEFAULT_TIMEOUT_SECONDS = 30


class TRPCResponse(TypedDict):
    jsonrpc: str
    id: int
    result: Optional[dict]
    error: Optional[dict]


class TRPCError(Exception):
    """Custom exception for tRPC errors."""

    def __init__(self, message: str, code: int):
        self.message = message
        self.code = code
        super().__init__(f"tRPC Error {code}: {message}")


class TRPCMethod(str, Enum):
    QUERY = "query"
    MUTATION = "mutation"


class TRPCClient:
    def __init__(
        self,
        base_url: str,
        use_superjson: bool = False,
        api_key: str | None = None,
        timeout: int = DEFAULT_TIMEOUT_SECONDS,
    ):
        """
        Initialize the tRPC client.

        Args:
            base_url: Base URL of the API (e.g., "http://localhost:3001").
            use_superjson: Whether responses use the superjson transformer.
            api_key: Sent as the `x-marivo-worker-api-key` header.
            timeout: Per-request timeout in seconds (queries and mutations).
        """
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        if api_key:
            self.session.headers.update({"x-marivo-worker-api-key": api_key})
        self.use_superjson = use_superjson
        self.timeout = timeout

    def _request(
        self,
        procedure: str,
        method: TRPCMethod,
        input_data: Optional[dict] = None,
        id: int = 1,
    ) -> TRPCResponse:
        """
        Internal method to send a tRPC request.

        Queries go over GET with the input URL-encoded in the `input` query
        param (tRPC rejects POST on query procedures with 405); mutations go
        over POST with a JSON body. Every request has a timeout.
        """
        url = f"{self.base_url}/{procedure}"
        try:
            if method is TRPCMethod.QUERY:
                # tRPC query protocol: GET ?input={"json": ...}
                params = (
                    {"input": json.dumps({"json": input_data})}
                    if input_data is not None
                    else None
                )
                response = self.session.get(url, params=params, timeout=self.timeout)
            else:
                payload = {"json": input_data if input_data is not None else None}
                response = self.session.post(url, json=payload, timeout=self.timeout)
        except requests.Timeout as err:
            raise TRPCError(f"Request to {procedure} timed out after {self.timeout}s", -32001) from err
        except requests.RequestException as err:
            raise TRPCError(f"Request to {procedure} failed: {err}", -32003) from err

        # tRPC reports procedure errors as a JSON body with an `error` field,
        # often with a non-200 HTTP status (e.g. 400 for validation errors).
        # Parse the body first so those surface with the server's own code.
        try:
            data = response.json()
        except ValueError:
            data = None
        if isinstance(data, dict) and data.get("error") is not None:
            error = data["error"]
            if self.use_superjson and isinstance(error.get("json"), dict):
                error = error["json"]
            raise TRPCError(error.get("message", "Unknown error"), error.get("code", -1))
        if not response.ok:
            raise TRPCError(f"HTTP {response.status_code} from {procedure}", -32002)
        return data

    def query(self, procedure: str, input_data: Optional[dict] = None) -> Any:
        """
        Call a tRPC query procedure.

        Args:
            procedure: Name of the query procedure.
            input_data: Input data (optional).

        Returns:
            Result data from the procedure.
        """
        response = self._request(procedure, TRPCMethod.QUERY, input_data)
        return response["result"]["data"]["json"] if self.use_superjson else response["result"]["data"]

    def mutate(self, procedure: str, input_data: Optional[dict] = None) -> Any:
        """
        Call a tRPC mutation procedure.

        Args:
            procedure: Name of the mutation procedure.
            input_data: Input data (optional).

        Returns:
            Result data from the procedure.
        """
        response = self._request(procedure, TRPCMethod.MUTATION, input_data)
        if response is not None:
            return response["result"]["data"]["json"] if self.use_superjson else response["result"]["data"]
        return None
