import requests
from typing import TypedDict, Optional, Any, TypeVar
from enum import Enum

# --- Types ---


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


# Generic type for procedure input/output
T = TypeVar("T")
U = TypeVar("U")


class TRPCMethod(str, Enum):
    QUERY = "query"
    MUTATION = "mutation"

# --- Client Class ---


class TRPCClient:
    def __init__(self, base_url: str, use_superjson: bool = False):
        """
        Initialize the tRPC client.

        Args:
            base_url: Base URL of the tRPC API (e.g., "http://localhost:3000/api/trpc").
        """
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.use_superjson = use_superjson

    def _request(
        self,
        procedure: str,
        method: TRPCMethod,
        input_data: Optional[dict] = None,
        id: int = 1,
    ) -> TRPCResponse:
        """
        Internal method to send a tRPC request.

        Args:
            procedure: Name of the tRPC procedure (e.g., "greet").
            method: "query" or "mutation".
            input_data: Input data for the procedure.
            id: Request ID (default: 1).

        Returns:
            Parsed tRPC response.

        Raises:
            TRPCError: If the tRPC backend returns an error.
            requests.RequestException: For HTTP/network errors.
        """
        payload = {
            "json": input_data if input_data else None,
        }

        url = f"{self.base_url}/{procedure}"
        try:
            if method is TRPCMethod.QUERY:
                response = self.session.get(url)
            else:
                response = self.session.post(url, json=payload)
            response.raise_for_status()  # Raise HTTP errors

            data = response.json()
            if "error" in data:
                error = data["error"]
                raise TRPCError(error.get("message", "Unknown error"),
                                error.get("code", -1))
            return data
        except Exception as err:
            print("TRPC call failed: {}".format(err))
            raise err

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
        else:
            return None
