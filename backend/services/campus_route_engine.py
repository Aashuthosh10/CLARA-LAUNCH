"""Deterministic campus routing (Dijkstra on map graph; no AI)."""

from __future__ import annotations

import heapq
import math
import uuid
from typing import Any

from backend.services.campus_room_match import get_campus_map_json

# Optional origin aliases (docs / older ids) → canonical node id
ORIGIN_NODE_ALIASES: dict[str, str] = {
    "kiosk_g_b_main": "GF-NAV-KIOSK-MAIN",
    "default-kiosk": "GF-NAV-KIOSK-MAIN",
    "kiosk-main": "GF-NAV-KIOSK-MAIN",
}

ROUTE_MODES = frozenset({"shortest", "accessible", "lift", "stairs"})
WALK_SPEED_M_S = 1.35  # conservative indoor walking speed for ETA


def _public_node(n: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": n.get("id"),
        "type": n.get("type"),
        "floor_id": n.get("floor_id"),
        "label": n.get("label"),
        "x": n.get("x"),
        "y": n.get("y"),
        "room_code": n.get("room_code"),
        "block_code": n.get("block_code"),
        "accessible": n.get("accessible"),
    }


def _public_edge(e: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": e.get("id"),
        "from": e.get("from"),
        "to": e.get("to"),
        "type": e.get("type"),
        "distance_m": float(e.get("distance_m") or 0.0),
        "accessible": bool(e.get("accessible", True)),
        "bidirectional": bool(e.get("bidirectional", True)),
        "active": bool(e.get("active", True)),
    }


def _find_room_by_code(data: dict[str, Any], room_code: str) -> dict[str, Any] | None:
    want = room_code.strip().upper()
    for floor in data.get("floors") or []:
        for block in floor.get("blocks") or []:
            for room in block.get("rooms") or []:
                if not isinstance(room, dict):
                    continue
                if str(room.get("code") or "").strip().upper() == want:
                    out = dict(room)
                    out["_floor_id"] = str(floor.get("floor_id") or "")
                    out["_floor_name"] = str(floor.get("floor_name") or "")
                    out["_block_code"] = str(block.get("block_code") or "")
                    return out
    return None


def _find_room_door_nodes(data: dict[str, Any], room_code: str) -> list[dict[str, Any]]:
    want = room_code.strip().upper()
    out: list[dict[str, Any]] = []
    for n in data.get("nodes") or []:
        if not isinstance(n, dict):
            continue
        if str(n.get("type")) != "room_door":
            continue
        if str(n.get("room_code") or "").strip().upper() == want:
            out.append(n)
    return out


def _resolve_origin_node_id(data: dict[str, Any], origin_node_id: str | None) -> str | None:
    raw = (origin_node_id or "").strip()
    if not raw:
        for k in data.get("kiosks") or []:
            if isinstance(k, dict) and str(k.get("id")) == "default-kiosk":
                nid = str(k.get("node_id") or "").strip()
                if nid:
                    return nid
        for n in data.get("nodes") or []:
            if isinstance(n, dict) and str(n.get("type")) == "kiosk":
                nid = str(n.get("id") or "").strip()
                if nid:
                    return nid
        return None
    key = raw.lower()
    return ORIGIN_NODE_ALIASES.get(key, raw)


def _filter_edges_for_mode(edges: list[dict[str, Any]], mode: str, warnings: list[str]) -> list[dict[str, Any]]:
    active_edges = [e for e in edges if isinstance(e, dict) and e.get("active", True)]
    if mode == "accessible":
        return [e for e in active_edges if e.get("accessible", True)]

    if mode == "lift":
        lift_edges = [e for e in active_edges if str(e.get("type")) == "lift"]
        if not lift_edges:
            warnings.append("No lift edges in map; using shortest corridor path for this floor.")
        return active_edges

    if mode == "stairs":
        stair_edges = [e for e in active_edges if str(e.get("type")) == "stairs"]
        if not stair_edges:
            warnings.append("No stairs edges in map; using shortest corridor path for this floor.")
        return active_edges

    # shortest
    return active_edges


def _build_adjacency(
    node_ids: set[str],
    edges: list[dict[str, Any]],
) -> dict[str, list[tuple[str, float, str]]]:
    """Directed weighted adjacency: u -> [(v, distance_m, edge_id), ...]."""
    adj: dict[str, list[tuple[str, float, str]]] = {nid: [] for nid in node_ids}
    for e in edges:
        if not isinstance(e, dict):
            continue
        eid = str(e.get("id") or "")
        a = str(e.get("from") or "")
        b = str(e.get("to") or "")
        w = float(e.get("distance_m") or 0.0)
        if w <= 0:
            w = 1e-6
        if a not in adj or b not in adj:
            continue
        bidir = bool(e.get("bidirectional", True))
        adj[a].append((b, w, eid))
        if bidir:
            adj[b].append((a, w, eid))
    return adj


def _dijkstra(
    adj: dict[str, list[tuple[str, float, str]]],
    start: str,
    goal: str,
) -> tuple[list[str], float] | None:
    if start not in adj or goal not in adj:
        return None
    if start == goal:
        return [start], 0.0

    dist: dict[str, float] = {start: 0.0}
    prev_node: dict[str, str] = {}
    prev_edge: dict[str, str] = {}
    pq: list[tuple[float, str]] = [(0.0, start)]
    visited: set[str] = set()

    while pq:
        d_u, u = heapq.heappop(pq)
        if u in visited:
            continue
        visited.add(u)
        if u == goal:
            break
        if d_u > dist.get(u, math.inf):
            continue
        for v, w, eid in adj.get(u, []):
            alt = d_u + w
            if alt < dist.get(v, math.inf):
                dist[v] = alt
                prev_node[v] = u
                prev_edge[v] = eid
                heapq.heappush(pq, (alt, v))

    if goal not in prev_node and goal != start:
        return None

    path = [goal]
    cur = goal
    while cur != start:
        p = prev_node.get(cur)
        if p is None:
            return None
        path.append(p)
        cur = p
    path.reverse()
    total = dist.get(goal, 0.0)
    return path, total


def _edge_between(
    edges_by_id: dict[str, dict[str, Any]],
    u: str,
    v: str,
    adj_used: dict[str, list[tuple[str, float, str]]],
) -> dict[str, Any] | None:
    """Find edge record used from u -> v (first match on weight list)."""
    for _, _, eid in adj_used.get(u, []):
        e = edges_by_id.get(eid)
        if not e:
            continue
        a, b = str(e.get("from")), str(e.get("to"))
        if a == u and b == v:
            return e
        if e.get("bidirectional", True) and a == v and b == u:
            return e
    return None


def _polyline_from_nodes(nodes_by_id: dict[str, dict[str, Any]], path: list[str]) -> list[list[float]]:
    line: list[list[float]] = []
    for nid in path:
        n = nodes_by_id.get(nid)
        if not n:
            continue
        line.append([float(n.get("x") or 0), float(n.get("y") or 0)])
    return line


def _steps_for_path(
    path: list[str],
    path_edges: list[dict[str, Any]],
    nodes_by_id: dict[str, dict[str, Any]],
    room: dict[str, Any] | None,
    language: str,
) -> list[str]:
    """Deterministic English (en) strings; other languages fall back to en for MVP."""
    lang = (language or "en").lower().split("-", 1)[0]
    _ = lang  # future: branch per locale

    steps: list[str] = []
    if not path:
        return steps

    start = nodes_by_id.get(path[0]) or {}
    start_label = str(start.get("label") or "Kiosk")
    steps.append(f"Start at {start_label}.")

    for i, e in enumerate(path_edges):
        et = str(e.get("type") or "corridor")
        u = str(e.get("from"))
        v = str(e.get("to"))
        # orient edge along path direction
        if i + 1 < len(path) and path[i] == u and path[i + 1] == v:
            pass
        elif i + 1 < len(path) and path[i] == v and path[i + 1] == u:
            u, v = v, u
        n_to = nodes_by_id.get(path[i + 1]) if i + 1 < len(path) else {}
        seg_label = str(n_to.get("label") or "the next point")

        if et == "door_access":
            steps.append(f"Use the doorway access toward {seg_label}.")
        elif et == "corridor":
            steps.append(f"Continue along the corridor toward {seg_label}.")
        elif et in ("lift", "stairs"):
            steps.append(f"Use the {et} connection toward {seg_label}.")
        else:
            steps.append(f"Proceed toward {seg_label}.")

    if room:
        name = str(room.get("name") or room.get("code") or "destination")
        code = str(room.get("code") or "")
        steps.append(f"You have arrived at {name} ({code}).")
    else:
        steps.append("You have arrived at the destination.")

    return steps


def compute_campus_route(
    *,
    origin_node_id: str | None,
    destination_room_code: str,
    mode: str = "shortest",
    language: str = "en",
) -> dict[str, Any]:
    """
    Compute a route. Returns payload shaped for POST /api/campus/route.
    On failure, status is 'no_route' or 'error' with warnings / reason.
    """
    warnings: list[str] = []
    mode_l = str(mode or "shortest").strip().lower()
    if mode_l not in ROUTE_MODES:
        mode_l = "shortest"
        warnings.append(f"Unknown mode '{mode}'; using 'shortest'.")

    data = get_campus_map_json()
    if not data.get("floors"):
        return {
            "status": "error",
            "route_id": "",
            "mode": mode_l,
            "origin": {},
            "destination": {},
            "distance_m": 0.0,
            "eta_s": 0,
            "floors_involved": [],
            "path_nodes": [],
            "path_edges": [],
            "floor_segments": [],
            "warnings": ["Campus map unavailable."],
        }

    nodes_raw = data.get("nodes") or []
    edges_raw = data.get("edges") or []
    if not nodes_raw or not edges_raw:
        return {
            "status": "no_route",
            "route_id": str(uuid.uuid4()),
            "mode": mode_l,
            "origin": {},
            "destination": {},
            "distance_m": 0.0,
            "eta_s": 0,
            "floors_involved": [],
            "path_nodes": [],
            "path_edges": [],
            "floor_segments": [],
            "warnings": ["Graph has no nodes or edges yet."],
        }

    nodes_by_id: dict[str, dict[str, Any]] = {}
    for n in nodes_raw:
        if isinstance(n, dict) and str(n.get("id")):
            nodes_by_id[str(n["id"])] = n

    edges_by_id: dict[str, dict[str, Any]] = {}
    for e in edges_raw:
        if isinstance(e, dict) and str(e.get("id")):
            edges_by_id[str(e["id"])] = e

    origin_resolved = _resolve_origin_node_id(data, origin_node_id)
    if not origin_resolved or origin_resolved not in nodes_by_id:
        return {
            "status": "error",
            "route_id": str(uuid.uuid4()),
            "mode": mode_l,
            "origin": {},
            "destination": {},
            "distance_m": 0.0,
            "eta_s": 0,
            "floors_involved": [],
            "path_nodes": [],
            "path_edges": [],
            "floor_segments": [],
            "warnings": warnings
            + [f"Unknown or missing origin node: {origin_node_id!r} (resolved={origin_resolved!r})."],
        }

    dest_nodes = _find_room_door_nodes(data, destination_room_code)
    if not dest_nodes:
        return {
            "status": "no_route",
            "route_id": str(uuid.uuid4()),
            "mode": mode_l,
            "origin": _public_node(nodes_by_id[origin_resolved]),
            "destination": {"room_code": destination_room_code.strip().upper()},
            "distance_m": 0.0,
            "eta_s": 0,
            "floors_involved": [],
            "path_nodes": [],
            "path_edges": [],
            "floor_segments": [],
            "warnings": warnings
            + [f"No room_door graph node for room code {destination_room_code.strip().upper()!r}."],
        }
    if len(dest_nodes) > 1:
        warnings.append(
            f"Multiple room_door nodes for {destination_room_code.strip().upper()}; using first match."
        )
    goal_node = dest_nodes[0]
    goal_id = str(goal_node.get("id"))

    filtered_edges = _filter_edges_for_mode([e for e in edges_raw if isinstance(e, dict)], mode_l, warnings)
    node_ids = set(nodes_by_id.keys())
    adj = _build_adjacency(node_ids, filtered_edges)
    result = _dijkstra(adj, origin_resolved, goal_id)
    if not result:
        return {
            "status": "no_route",
            "route_id": str(uuid.uuid4()),
            "mode": mode_l,
            "origin": _public_node(nodes_by_id[origin_resolved]),
            "destination": _public_node(goal_node),
            "distance_m": 0.0,
            "eta_s": 0,
            "floors_involved": [],
            "path_nodes": [],
            "path_edges": [],
            "floor_segments": [],
            "warnings": warnings + ["No path found between origin and destination with current graph and filters."],
        }

    path, distance_m = result
    path_edges: list[dict[str, Any]] = []
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        e = _edge_between(edges_by_id, u, v, adj)
        if e:
            path_edges.append(_public_edge(e))

    room = _find_room_by_code(data, destination_room_code)
    floors_involved: list[str] = []
    for nid in path:
        n = nodes_by_id.get(nid)
        if n:
            fid = str(n.get("floor_id") or "")
            if fid and fid not in floors_involved:
                floors_involved.append(fid)

    floor_id = floors_involved[0] if floors_involved else str(goal_node.get("floor_id") or "GF")
    poly = _polyline_from_nodes(nodes_by_id, path)
    steps = _steps_for_path(path, path_edges, nodes_by_id, room, language)

    eta_s = int(max(1, round(distance_m / WALK_SPEED_M_S)))

    dest_public = _public_node(goal_node)
    if room:
        dest_public["room_name"] = room.get("name")
        dest_public["floor_name"] = room.get("_floor_name")

    route_id = str(uuid.uuid4())
    return {
        "status": "ok",
        "route_id": route_id,
        "mode": mode_l,
        "origin": _public_node(nodes_by_id[origin_resolved]),
        "destination": dest_public,
        "distance_m": round(distance_m, 2),
        "eta_s": eta_s,
        "floors_involved": floors_involved,
        "path_nodes": [_public_node(nodes_by_id[nid]) for nid in path],
        "path_edges": path_edges,
        "floor_segments": [
            {
                "floor_id": floor_id,
                "polyline": poly,
                "steps": steps,
            }
        ],
        "warnings": warnings,
    }
