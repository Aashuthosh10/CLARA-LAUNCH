"""Small ASGI request-body limiter for selected JSON API routes."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from starlette.responses import JSONResponse

AsgiReceive = Callable[[], Awaitable[dict[str, Any]]]
AsgiSend = Callable[[dict[str, Any]], Awaitable[None]]


class PathBodyLimitMiddleware:
    """Buffer and cap request bodies before FastAPI attempts JSON decoding."""

    def __init__(self, app: Any, *, paths: set[str], max_body_bytes: int) -> None:
        self.app = app
        self.paths = frozenset(paths)
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope: dict[str, Any], receive: AsgiReceive, send: AsgiSend) -> None:
        if (
            scope.get("type") != "http"
            or scope.get("method") != "POST"
            or scope.get("path") not in self.paths
        ):
            await self.app(scope, receive, send)
            return

        for key, value in scope.get("headers") or []:
            if key.lower() == b"content-length":
                try:
                    if int(value) > self.max_body_bytes:
                        await self._reject(scope, receive, send)
                        return
                except ValueError:
                    await JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)(
                        scope, receive, send
                    )
                    return

        body = bytearray()
        while True:
            message = await receive()
            if message.get("type") == "http.disconnect":
                return
            body.extend(message.get("body") or b"")
            if len(body) > self.max_body_bytes:
                await self._reject(scope, receive, send)
                return
            if not message.get("more_body", False):
                break

        replayed = False

        async def replay_receive() -> dict[str, Any]:
            nonlocal replayed
            if not replayed:
                replayed = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return {"type": "http.request", "body": b"", "more_body": False}

        await self.app(scope, replay_receive, send)

    async def _reject(self, scope: dict[str, Any], receive: AsgiReceive, send: AsgiSend) -> None:
        await JSONResponse(
            {"detail": f"Request body exceeds {self.max_body_bytes} bytes"},
            status_code=413,
        )(scope, receive, send)
