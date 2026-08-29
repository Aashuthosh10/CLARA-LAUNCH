"""Photo-verified college bus route lookup.

This module deliberately performs only deterministic source-data lookup. It
does not geocode, invent a nearby stop, or translate route facts.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

_DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "bus_routes.json"


def _load_routes() -> list[dict[str, Any]]:
    payload = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    routes = payload.get("routes") if isinstance(payload, dict) else None
    return [route for route in routes if isinstance(route, dict)] if isinstance(routes, list) else []


def _key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def list_bus_routes() -> list[dict[str, Any]]:
    """Return a defensive copy of the verified routes."""
    return json.loads(json.dumps(_load_routes()))


def resolve_bus_route(*, bus_id: str | int | None = None, stop_name: str | None = None) -> dict[str, Any]:
    """Resolve a bus and/or exact stop without geographic inference."""
    requested_bus = str(bus_id).strip() if bus_id is not None else None
    requested_stop = stop_name.strip() if isinstance(stop_name, str) and stop_name.strip() else None
    routes = _load_routes()
    candidates = [r for r in routes if requested_bus is None or str(r.get("bus_id")) == requested_bus]
    matches: list[dict[str, Any]] = []
    if requested_stop:
        stop_key = _key(requested_stop)
        for route in candidates:
            for stop in route.get("stops", []):
                if isinstance(stop, dict) and _key(str(stop.get("name", ""))) == stop_key:
                    matches.append({"bus_id": str(route.get("bus_id")), "stop": dict(stop)})
    result: dict[str, Any] = {
        "intent": "bus_route",
        "requested_location": requested_stop,
        "resolved_location": matches[0]["stop"]["name"] if len(matches) == 1 else None,
        "exact_stop_match": bool(matches),
        "nearest_stop": None,
        "buses": [],
        "geocoding_status": "not_available_from_source_data",
    }
    if requested_stop:
        matching_bus_ids = {m["bus_id"] for m in matches}
        selected = [r for r in candidates if str(r.get("bus_id")) in matching_bus_ids]
    else:
        selected = candidates
    result["buses"] = [
        {"bus_id": str(route.get("bus_id")), "route": [dict(stop) for stop in route.get("stops", [])]}
        for route in selected
    ]
    return result
