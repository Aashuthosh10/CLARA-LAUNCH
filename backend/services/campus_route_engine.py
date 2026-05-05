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


def _find_room_by_code(
    data: dict[str, Any], room_code: str, floor_id: str | None = None
) -> dict[str, Any] | None:
    want = room_code.strip().upper()
    found: list[dict[str, Any]] = []
    for floor in data.get("floors") or []:
        for block in floor.get("blocks") or []:
            for room in block.get("rooms") or []:
                if not isinstance(room, dict):
                    continue
                if str(room.get("code") or "").strip().upper() != want:
                    continue
                out = dict(room)
                out["_floor_id"] = str(floor.get("floor_id") or "")
                out["_floor_name"] = str(floor.get("floor_name") or "")
                out["_block_code"] = str(block.get("block_code") or "")
                found.append(out)
    if not found:
        return None
    fid = str(floor_id or "").strip().upper()
    if fid in {"GF", "FF", "SF"}:
        for r in found:
            if str(r.get("_floor_id")) == fid:
                return r
    return found[0]


def _find_room_door_nodes(
    data: dict[str, Any], room_code: str, floor_id: str | None = None
) -> list[dict[str, Any]]:
    want = room_code.strip().upper()
    out: list[dict[str, Any]] = []
    for n in data.get("nodes") or []:
        if not isinstance(n, dict):
            continue
        if str(n.get("type")) != "room_door":
            continue
        if str(n.get("room_code") or "").strip().upper() != want:
            continue
        out.append(n)
    fid = str(floor_id or "").strip().upper()
    if fid in {"GF", "FF", "SF"}:
        hit = [n for n in out if str(n.get("floor_id") or "").upper() == fid]
        return hit if hit else out
    return out


def _synthesize_room_door_target(
    *,
    data: dict[str, Any],
    room_code: str,
    floor_id: str | None,
    nodes_by_id: dict[str, dict[str, Any]],
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]] | None:
    """
    Build a temporary destination door node for rooms missing explicit room_door graph nodes.
    Returns (synthetic_goal_node, synthetic_edge, anchor_node).
    """
    room = _find_room_by_code(data, room_code, floor_id)
    if not room:
        return None
    door = room.get("door")
    if not isinstance(door, dict):
        return None
    x = door.get("x")
    y = door.get("y")
    if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
        return None

    fid = str(room.get("_floor_id") or "").upper()
    if fid not in {"GF", "FF", "SF"}:
        return None

    block_code = str(room.get("_block_code") or room.get("block_code") or "").strip().upper()
    candidates: list[dict[str, Any]] = []
    for n in nodes_by_id.values():
        if str(n.get("floor_id") or "").upper() != fid:
            continue
        if str(n.get("type") or "") != "junction":
            continue
        nx = n.get("x")
        ny = n.get("y")
        if not isinstance(nx, (int, float)) or not isinstance(ny, (int, float)):
            continue
        candidates.append(n)
    if not candidates:
        return None

    # Prefer same-block junction ids (e.g. "...-C-...") to keep paths in correct wing.
    preferred = candidates
    if block_code in {"A", "B", "C"}:
        scoped = [n for n in candidates if f"-{block_code}-" in str(n.get("id") or "").upper()]
        if scoped:
            preferred = scoped

    anchor = min(
        preferred,
        key=lambda n: math.hypot(float(n.get("x") or 0.0) - float(x), float(n.get("y") or 0.0) - float(y)),
    )
    anchor_id = str(anchor.get("id") or "")
    if not anchor_id:
        return None

    goal_id = f"TMP-DOOR-{fid}-{room_code.strip().upper().replace(' ', '').replace('_', '-')}"
    synthetic_goal = {
        "id": goal_id,
        "type": "room_door",
        "floor_id": fid,
        "label": str(room.get("code") or room_code).strip().upper(),
        "x": float(x),
        "y": float(y),
        "room_code": str(room.get("code") or room_code).strip().upper(),
        "block_code": block_code,
        "accessible": True,
    }
    # Convert map-pixel-ish distance to coarse meters for weighting.
    px = math.hypot(float(anchor.get("x") or 0.0) - float(x), float(anchor.get("y") or 0.0) - float(y))
    synthetic_edge = {
        "id": f"TMP-EDGE-{anchor_id}-TO-{goal_id}",
        "from": anchor_id,
        "to": goal_id,
        "type": "door_access",
        "distance_m": max(1.0, round(px * 0.05, 2)),
        "bidirectional": True,
        "accessible": True,
        "active": True,
    }
    return synthetic_goal, synthetic_edge, anchor


_FLOOR_LABEL_EN = {"GF": "Ground floor", "FF": "First floor", "SF": "Second floor"}


def _node_floor(nodes_by_id: dict[str, dict[str, Any]], nid: str) -> str:
    return str(nodes_by_id.get(nid, {}).get("floor_id") or "")


def _floor_runs(path: list[str], nodes_by_id: dict[str, dict[str, Any]]) -> list[tuple[str, list[str]]]:
    if not path:
        return []
    runs: list[tuple[str, list[str]]] = []
    i0 = 0
    cur_f = _node_floor(nodes_by_id, path[0])
    for i in range(1, len(path)):
        f = _node_floor(nodes_by_id, path[i])
        if f != cur_f:
            runs.append((cur_f, path[i0:i]))
            i0 = i
            cur_f = f
    runs.append((cur_f, path[i0:]))
    return runs


def _tagged_steps(
    path: list[str],
    path_edges: list[dict[str, Any]],
    nodes_by_id: dict[str, dict[str, Any]],
    room: dict[str, Any] | None,
) -> list[tuple[str, str]]:
    msgs: list[tuple[str, str]] = []
    if not path:
        return msgs
    start = nodes_by_id.get(path[0]) or {}
    msgs.append((_node_floor(nodes_by_id, path[0]), f"Start at {str(start.get('label') or 'Kiosk')}."))

    for i, e in enumerate(path_edges):
        et = str(e.get("type") or "corridor")
        u, v = str(e.get("from")), str(e.get("to"))
        if i + 1 < len(path) and path[i] == u and path[i + 1] == v:
            pass
        elif i + 1 < len(path) and path[i] == v and path[i + 1] == u:
            u, v = v, u
        uf = _node_floor(nodes_by_id, u)
        vf = _node_floor(nodes_by_id, v)
        n_to = nodes_by_id.get(path[i + 1]) if i + 1 < len(path) else {}
        seg_label = str(n_to.get("label") or "the next point")

        if et == "lift":
            dest = _FLOOR_LABEL_EN.get(vf, vf or "your floor")
            msgs.append((uf, f"Take the lift to {dest}."))
            msgs.append((vf, f"Exit the lift on {dest}; continue toward {seg_label}."))
        elif et == "stairs":
            dest = _FLOOR_LABEL_EN.get(vf, vf or "your floor")
            msgs.append((uf, f"Use the stairs to {dest}."))
            msgs.append((vf, f"On {dest}, continue toward {seg_label}."))
        elif et == "door_access":
            msgs.append((uf, f"Use the doorway access toward {seg_label}."))
        elif et == "corridor":
            msgs.append((uf, f"Continue along the corridor toward {seg_label}."))
        elif et == "entrance_path":
            msgs.append((uf, f"From the entrance, move toward {seg_label}."))
        else:
            msgs.append((uf, f"Proceed toward {seg_label}."))

    if room:
        name = str(room.get("name") or room.get("code") or "destination")
        code = str(room.get("code") or "")
        lf = str(room.get("_floor_id") or "") or _node_floor(nodes_by_id, path[-1])
        msgs.append((lf, f"You have arrived at {name} ({code})."))
    else:
        msgs.append((_node_floor(nodes_by_id, path[-1]), "You have arrived at the destination."))
    return msgs


def _build_floor_segments_for_path(
    path: list[str],
    path_edges: list[dict[str, Any]],
    nodes_by_id: dict[str, dict[str, Any]],
    room: dict[str, Any] | None,
) -> tuple[list[dict[str, Any]], list[str]]:
    tagged = _tagged_steps(path, path_edges, nodes_by_id, room)
    flat = [msg for (_, msg) in tagged]
    runs = _floor_runs(path, nodes_by_id)
    segments: list[dict[str, Any]] = []
    for fid, node_ids in runs:
        poly = _densify_polyline(_polyline_from_nodes(nodes_by_id, node_ids))
        steps_here = [m for (sf, m) in tagged if sf == fid]
        if not steps_here:
            steps_here = [flat[0]] if flat else []
        segments.append({"floor_id": fid, "polyline": poly, "steps": steps_here})
    return segments, flat


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


def _densify_polyline(points: list[list[float]], *, max_step: float = 56.0) -> list[list[float]]:
    """Insert points along straight segments for smoother on-map polylines (map x/y units, ~px)."""
    if len(points) < 2:
        return list(points)
    out: list[list[float]] = [points[0]]
    for i in range(len(points) - 1):
        x0, y0 = float(points[i][0]), float(points[i][1])
        x1, y1 = float(points[i + 1][0]), float(points[i + 1][1])
        dx, dy = x1 - x0, y1 - y0
        span = math.hypot(dx, dy)
        if span < max_step * 2:
            out.append([x1, y1])
            continue
        n_chunks = max(1, int(math.ceil(span / max_step)))
        for s in range(1, n_chunks):
            t = s / n_chunks
            out.append([x0 + dx * t, y0 + dy * t])
        out.append([x1, y1])
    return out


def compute_campus_route(
    *,
    origin_node_id: str | None,
    destination_room_code: str,
    destination_floor_id: str | None = None,
    mode: str = "shortest",
    language: str = "en",
) -> dict[str, Any]:
    """
    Compute a route. Returns payload shaped for POST /api/campus/route.
    On failure, status is 'no_route' or 'error' with warnings / reason.
    """
    warnings: list[str] = []
    dest_floor_hint = str(destination_floor_id or "").strip().upper()
    if dest_floor_hint not in {"GF", "FF", "SF"}:
        dest_floor_hint = None
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

    dest_nodes = _find_room_door_nodes(data, destination_room_code, dest_floor_hint)
    synthetic_goal: dict[str, Any] | None = None
    synthetic_edge: dict[str, Any] | None = None
    if not dest_nodes:
        synth = _synthesize_room_door_target(
            data=data,
            room_code=destination_room_code,
            floor_id=dest_floor_hint,
            nodes_by_id=nodes_by_id,
        )
        if synth:
            synthetic_goal, synthetic_edge, _ = synth
            nodes_by_id[str(synthetic_goal["id"])] = synthetic_goal
            dest_nodes = [synthetic_goal]
            warnings.append(
                f"Room {destination_room_code.strip().upper()} has no explicit graph door node; using synthesized door target."
            )
        else:
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
            f"Multiple room_door nodes for {destination_room_code.strip().upper()}"
            + ("; narrowed by destination_floor_id." if dest_floor_hint else "; using first match.")
        )
    goal_node = dest_nodes[0]
    goal_id = str(goal_node.get("id"))

    filtered_edges = _filter_edges_for_mode([e for e in edges_raw if isinstance(e, dict)], mode_l, warnings)
    if synthetic_edge:
        filtered_edges = [*filtered_edges, synthetic_edge]
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

    room = _find_room_by_code(data, destination_room_code.strip(), dest_floor_hint)
    floors_involved: list[str] = []
    for nid in path:
        n = nodes_by_id.get(nid)
        if n:
            fid = str(n.get("floor_id") or "")
            if fid and fid not in floors_involved:
                floors_involved.append(fid)

    floor_segments, _ = _build_floor_segments_for_path(path, path_edges, nodes_by_id, room)

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
        "floor_segments": floor_segments,
        "warnings": warnings,
    }
