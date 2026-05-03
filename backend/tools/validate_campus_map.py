"""Validate SVIT campus map JSON (floors, rooms, navigation graph).

Run from repo root:
  python -m backend.tools.validate_campus_map

Exit code: 0 if no blocking errors, 1 if any hard validation failure.
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_MAP_PATH = _PROJECT_ROOT / "backend" / "data" / "svit-campus-map.json"

VALID_NODE_TYPES = frozenset(
    {
        "kiosk",
        "entrance",
        "junction",
        "room_door",
        "stairs",
        "lift",
        "landmark",
        "block_connector",
    }
)
VALID_EDGE_TYPES = frozenset(
    {
        "corridor",
        "door_access",
        "stairs",
        "lift",
        "block_connector",
        "entrance_path",
    }
)


def _ok(msg: str) -> None:
    print(f"[OK] {msg}")


def _bad(msg: str) -> None:
    print(f"[ERROR] {msg}")


def _warn(msg: str) -> None:
    print(f"[WARN] {msg}")


def _load_map(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        _bad(f"Campus map JSON missing at {path}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        _bad(f"Invalid JSON: {exc}")
        return None


def _index_rooms_by_floor_block(data: dict[str, Any]) -> dict[tuple[str, str, str], dict[str, Any]]:
    """(floor_id, block_code_upper, room_code_upper) -> first room dict."""
    out: dict[tuple[str, str, str], dict[str, Any]] = {}
    for floor in data.get("floors") or []:
        fid = str(floor.get("floor_id") or "").strip()
        for block in floor.get("blocks") or []:
            bcode = str(block.get("block_code") or "").strip().upper()
            for room in block.get("rooms") or []:
                if not isinstance(room, dict):
                    continue
                code = str(room.get("code") or "").strip().upper()
                if not fid or not bcode or not code:
                    continue
                key = (fid, bcode, code)
                if key not in out:
                    out[key] = room
    return out


def _find_room(data: dict[str, Any], floor_id: str, room_code: str) -> dict[str, Any] | None:
    rc = room_code.strip().upper()
    for floor in data.get("floors") or []:
        if str(floor.get("floor_id") or "").strip() != floor_id.strip():
            continue
        for block in floor.get("blocks") or []:
            for room in block.get("rooms") or []:
                if not isinstance(room, dict):
                    continue
                if str(room.get("code") or "").strip().upper() == rc:
                    return room
    return None


def _floor_bounds(floor: dict[str, Any], data: dict[str, Any]) -> tuple[float, float]:
    w = floor.get("width") or floor.get("map_width") or (data.get("coordinate_space") or {}).get("width") or 0
    h = floor.get("height") or floor.get("map_height") or (data.get("coordinate_space") or {}).get("height") or 0
    try:
        return float(w), float(h)
    except (TypeError, ValueError):
        return 0.0, 0.0


def _point_in_bounds(pt: Any, width: float, height: float) -> bool:
    if not isinstance(pt, (list, tuple)) or len(pt) != 2:
        return False
    x, y = pt
    return isinstance(x, (int, float)) and isinstance(y, (int, float)) and 0 <= x <= width and 0 <= y <= height


def _door_in_or_near_polygon(door: dict[str, Any], poly: list[Any], *, tolerance: float = 28.0) -> bool:
    xs = [p[0] for p in poly if isinstance(p, list) and len(p) == 2 and isinstance(p[0], (int, float))]
    ys = [p[1] for p in poly if isinstance(p, list) and len(p) == 2 and isinstance(p[1], (int, float))]
    if not xs or not ys:
        return False
    x = door.get("x")
    y = door.get("y")
    if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
        return False
    return min(xs) - tolerance <= x <= max(xs) + tolerance and min(ys) - tolerance <= y <= max(ys) + tolerance


def _build_graph_adjacency(nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> dict[str, list[str]]:
    node_ids = {str(n.get("id") or "") for n in nodes if str(n.get("id") or "")}
    adj: dict[str, list[str]] = {nid: [] for nid in node_ids}
    for e in edges:
        if not e.get("active", True):
            continue
        a = str(e.get("from") or "")
        b = str(e.get("to") or "")
        if a not in adj or b not in adj:
            continue
        adj[a].append(b)
        if e.get("bidirectional", True):
            adj[b].append(a)
    return adj


def _bfs_path(adj: dict[str, list[str]], start: str, goal: str) -> list[str] | None:
    if start not in adj or goal not in adj:
        return None
    if start == goal:
        return [start]
    prev: dict[str, str | None] = {start: None}
    q: deque[str] = deque([start])
    while q:
        u = q.popleft()
        for v in adj.get(u, []):
            if v in prev:
                continue
            prev[v] = u
            if v == goal:
                path = [goal]
                cur = goal
                while prev[cur] is not None:
                    cur = prev[cur]  # type: ignore[assignment]
                    path.append(cur)
                path.reverse()
                return path
            q.append(v)
    return None


def validate(data: dict[str, Any], *, map_label: str = "campus map") -> int:
    """Return number of blocking errors."""
    errors = 0

    floors = data.get("floors")
    if not isinstance(floors, list) or not floors:
        _bad(f"{map_label}: no floors array")
        return 1
    _ok("floors loaded")

    floor_ids: set[str] = set()
    for i, floor in enumerate(floors):
        if not isinstance(floor, dict):
            _bad(f"floor[{i}] is not an object")
            errors += 1
            continue
        fid = str(floor.get("floor_id") or "").strip()
        if not fid:
            _bad(f"floor[{i}] missing floor_id")
            errors += 1
        else:
            floor_ids.add(fid)
            if fid not in {"GF", "FF", "SF"}:
                _warn(f"floor_id '{fid}' is not one of GF/FF/SF (allowed for expansion)")
        for j, block in enumerate(floor.get("blocks") or []):
            if not isinstance(block, dict):
                _bad(f"floor {fid} block[{j}] is not an object")
                errors += 1
                continue
            bid = str(block.get("block_id") or "").strip()
            bcode = str(block.get("block_code") or "").strip()
            if not bid:
                _bad(f"floor {fid} block[{j}] missing block_id")
                errors += 1
            if not bcode:
                _bad(f"floor {fid} block[{j}] missing block_code")
                errors += 1

    room_keys_seen: dict[tuple[str, str, str], list[str]] = defaultdict(list)
    room_count = 0
    for floor in floors:
        if not isinstance(floor, dict):
            continue
        fid = str(floor.get("floor_id") or "").strip()
        floor_w, floor_h = _floor_bounds(floor, data)
        for block in floor.get("blocks") or []:
            if not isinstance(block, dict):
                continue
            bcode = str(block.get("block_code") or "").strip().upper()
            for room in block.get("rooms") or []:
                if not isinstance(room, dict):
                    continue
                code = str(room.get("code") or "").strip().upper()
                if not code:
                    _warn(f"room on floor {fid} block {bcode} has empty code (id={room.get('id')})")
                    continue
                room_count += 1
                key = (fid, bcode, code)
                rid = str(room.get("id") or code)
                room_keys_seen[key].append(rid)
                poly = room.get("polygon")
                door = room.get("door")
                if not poly:
                    _warn(f"room {code} on {fid}/{bcode} has no polygon (overlay optional)")
                if not door or not isinstance(door, dict):
                    _warn(f"room {code} on {fid}/{bcode} has no door object (overlay optional)")
                if room.get("geometry_source") == "exact_image":
                    if floor_w <= 0 or floor_h <= 0:
                        _bad(f"exact room {code} on {fid}/{bcode} has no usable floor width/height")
                        errors += 1
                    if not isinstance(poly, list) or len(poly) < 4:
                        _bad(f"exact room {code} on {fid}/{bcode} needs polygon with at least 4 points")
                        errors += 1
                    elif not all(_point_in_bounds(p, floor_w, floor_h) for p in poly):
                        _bad(f"exact room {code} on {fid}/{bcode} has polygon point outside floor bounds {floor_w}x{floor_h}")
                        errors += 1
                    if not isinstance(door, dict):
                        _warn(f"exact room {code} on {fid}/{bcode} has no door; route endpoint cannot be shown")
                    elif not _point_in_bounds([door.get("x"), door.get("y")], floor_w, floor_h):
                        _bad(f"exact room {code} on {fid}/{bcode} has door outside floor bounds {floor_w}x{floor_h}")
                        errors += 1
                    elif isinstance(poly, list) and len(poly) >= 4 and not _door_in_or_near_polygon(door, poly):
                        _warn(f"exact room {code} on {fid}/{bcode} door is not inside/near polygon; verify doorway coordinate")
                    route_poly = room.get("route_polyline_from_kiosk")
                    if route_poly is not None:
                        if not isinstance(route_poly, list) or len(route_poly) < 2:
                            _bad(f"exact room {code} on {fid}/{bcode} route_polyline_from_kiosk needs at least 2 points")
                            errors += 1
                        elif not all(_point_in_bounds(p, floor_w, floor_h) for p in route_poly):
                            _bad(f"exact room {code} on {fid}/{bcode} route point outside floor bounds {floor_w}x{floor_h}")
                            errors += 1
                    lift_route_poly = room.get("route_polyline_from_lift")
                    if lift_route_poly is not None:
                        if not isinstance(lift_route_poly, list) or len(lift_route_poly) < 2:
                            _bad(f"exact room {code} on {fid}/{bcode} route_polyline_from_lift needs at least 2 points")
                            errors += 1
                        elif not all(_point_in_bounds(p, floor_w, floor_h) for p in lift_route_poly):
                            _bad(f"exact room {code} on {fid}/{bcode} lift route point outside floor bounds {floor_w}x{floor_h}")
                            errors += 1

    dup_found = False
    for key, ids in room_keys_seen.items():
        if len(ids) > 1:
            dup_found = True
            fid, bcode, code = key
            _bad(f"duplicate room code '{code}' on floor {fid} block {bcode}: ids {ids}")
            errors += 1
    if not dup_found:
        _ok("rooms loaded (no duplicate codes per floor/block)")

    if room_count == 0:
        _warn("no rooms with non-empty code found")

    print("\nCampus Navigation Coverage Report")
    for floor in floors:
        if not isinstance(floor, dict):
            continue
        fid = str(floor.get("floor_id") or "").strip()
        rooms: list[dict[str, Any]] = []
        for block in floor.get("blocks") or []:
            if isinstance(block, dict):
                rooms.extend([r for r in block.get("rooms") or [] if isinstance(r, dict)])
        total = len(rooms)
        clickable = [
            r
            for r in rooms
            if r.get("geometry_source") == "exact_image"
            and isinstance(r.get("polygon"), list)
            and len(r.get("polygon") or []) >= 4
        ]
        routable = [
            r
            for r in clickable
            if r.get("route_polyline_from_kiosk")
            or r.get("route_polyline_from_lift")
            or str(r.get("code") or "").upper() == "B-LIFT"
        ]
        missing_doors = [
            str(r.get("code") or r.get("id"))
            for r in clickable
            if not isinstance(r.get("door"), dict)
        ]
        missing_routes = [
            str(r.get("code") or r.get("id"))
            for r in clickable
            if r not in routable and str(r.get("code") or "").upper() != "B-LIFT"
        ]
        print(f"{fid}: {len(clickable)}/{total} rooms exact-clickable, {len(routable)}/{total} routable")
        if missing_doors:
            _warn(f"{fid} missing exact door points: {', '.join(missing_doors)}")
        if missing_routes:
            _warn(f"{fid} missing exact route polylines: {', '.join(missing_routes)}")

    exact_lifts = {
        str(floor.get("floor_id") or ""): any(
            isinstance(room, dict)
            and str(room.get("code") or "").upper() == "B-LIFT"
            and room.get("geometry_source") == "exact_image"
            and isinstance(room.get("door"), dict)
            for block in floor.get("blocks") or []
            if isinstance(block, dict)
            for room in block.get("rooms") or []
        )
        for floor in floors
        if isinstance(floor, dict)
    }
    if exact_lifts.get("GF") and exact_lifts.get("FF"):
        _ok("Lift route markers: Ground Floor and First Floor lift are exact-mapped")
    else:
        _warn("Lift route markers incomplete for First Floor")
    if exact_lifts.get("GF") and exact_lifts.get("SF"):
        _ok("Lift route markers: Ground Floor and Second Floor lift are exact-mapped")
    else:
        _warn("Lift route markers incomplete for Second Floor")

    nodes_raw = data.get("nodes")
    nodes: list[dict[str, Any]] = nodes_raw if isinstance(nodes_raw, list) else []
    if nodes:
        _ok("nodes loaded")
    else:
        _warn("no nodes array (graph routing optional)")

    node_by_id: dict[str, dict[str, Any]] = {}
    for i, n in enumerate(nodes):
        if not isinstance(n, dict):
            _bad(f"nodes[{i}] is not an object")
            errors += 1
            continue
        nid = str(n.get("id") or "").strip()
        if not nid:
            _bad(f"nodes[{i}] missing id")
            errors += 1
            continue
        if nid in node_by_id:
            _bad(f"duplicate node id '{nid}'")
            errors += 1
        node_by_id[nid] = n
        nf = str(n.get("floor_id") or "").strip()
        if not nf:
            _bad(f"node '{nid}' missing floor_id")
            errors += 1
        elif floor_ids and nf not in floor_ids:
            _bad(f"node '{nid}' floor_id '{nf}' does not match any floor")
            errors += 1
        ntype = str(n.get("type") or "")
        if ntype and ntype not in VALID_NODE_TYPES:
            _warn(f"node '{nid}' has unknown type '{ntype}'")

    edges_raw = data.get("edges")
    edges: list[dict[str, Any]] = edges_raw if isinstance(edges_raw, list) else []
    if edges:
        _ok("edges loaded")
    else:
        _warn("no edges array (graph routing optional)")

    edge_ids_seen: set[str] = set()
    for i, e in enumerate(edges):
        if not isinstance(e, dict):
            _bad(f"edges[{i}] is not an object")
            errors += 1
            continue
        eid = str(e.get("id") or "").strip()
        if eid:
            if eid in edge_ids_seen:
                _warn(f"duplicate edge id '{eid}'")
            edge_ids_seen.add(eid)
        a = str(e.get("from") or "").strip()
        b = str(e.get("to") or "").strip()
        if not a or not b:
            _bad(f"edge {eid or i} missing from or to")
            errors += 1
            continue
        if a not in node_by_id:
            _bad(f"edge {eid or i} references missing node from='{a}'")
            errors += 1
        if b not in node_by_id:
            _bad(f"edge {eid or i} references missing node to='{b}'")
            errors += 1
        if a == b:
            _bad(f"edge {eid or i} has from==to ('{a}')")
            errors += 1
        et = str(e.get("type") or "")
        if et and et not in VALID_EDGE_TYPES:
            _warn(f"edge {eid or i} has unknown type '{et}'")

    # Bidirectional: document; optional redundant reverse-edge warning
    seen_undirected: set[frozenset[str]] = set()
    for e in edges:
        if not isinstance(e, dict):
            continue
        if not e.get("active", True):
            continue
        a, b = str(e.get("from")), str(e.get("to"))
        if not a or not b:
            continue
        key = frozenset({a, b})
        if key in seen_undirected and e.get("bidirectional", True):
            _warn(f"parallel edges between same node pair {sorted(key)} (check redundancy)")
        seen_undirected.add(key)
    _ok("bidirectional edges treated as undirected when bidirectional=true (single record is OK)")

    kiosks_raw = data.get("kiosks")
    kiosks: list[dict[str, Any]] = kiosks_raw if isinstance(kiosks_raw, list) else []
    for i, k in enumerate(kiosks):
        if not isinstance(k, dict):
            _bad(f"kiosks[{i}] is not an object")
            errors += 1
            continue
        knode = str(k.get("node_id") or "").strip()
        if knode and knode not in node_by_id:
            _bad(f"kiosk '{k.get('id')}' references missing node_id '{knode}'")
            errors += 1
    if kiosks:
        _ok("kiosks checked against nodes")

    # room_door nodes: target room exists; warn if room has no door in geometry (non-fatal)
    for nid, n in node_by_id.items():
        if str(n.get("type")) != "room_door":
            continue
        rc = str(n.get("room_code") or "").strip()
        fid = str(n.get("floor_id") or "").strip()
        if not rc:
            _bad(f"room_door node '{nid}' missing room_code")
            errors += 1
            continue
        room = _find_room(data, fid, rc)
        if not room:
            _bad(f"room_door node '{nid}' room_code '{rc}' not found on floor {fid}")
            errors += 1
            continue
        door = room.get("door")
        if not door or not isinstance(door, dict):
            _warn(f"room {rc} (node '{nid}') has no door in room geometry â€” overlay/route alignment may suffer")
        else:
            _ok(f"room_door node '{nid}' â†’ room {rc} has door geometry")

    # Default kiosk â†’ B-004 path
    start_node: str | None = None
    for k in kiosks:
        if str(k.get("id")) == "default-kiosk":
            start_node = str(k.get("node_id") or "").strip() or None
            break
    if not start_node:
        kiosk_nodes = [nid for nid, n in node_by_id.items() if str(n.get("type")) == "kiosk"]
        if kiosk_nodes:
            start_node = kiosk_nodes[0]
            _warn(f"no default-kiosk entry; using first kiosk node '{start_node}' for path check")

    goal_nodes = [
        nid
        for nid, n in node_by_id.items()
        if str(n.get("type")) == "room_door" and str(n.get("room_code") or "").strip().upper() == "B-004"
    ]
    goal = goal_nodes[0] if len(goal_nodes) == 1 else None
    if len(goal_nodes) > 1:
        _warn(f"multiple room_door nodes for B-004: {goal_nodes}; using first for path check")
        goal = goal_nodes[0]

    if nodes and edges and start_node and goal:
        adj = _build_graph_adjacency(nodes, edges)
        path = _bfs_path(adj, start_node, goal)
        if path:
            _ok(f"graph path default kiosk â†’ B-004: {' â†’ '.join(path)}")
        else:
            _bad(f"no active path from '{start_node}' to '{goal}' (B-004)")
            errors += 1
    elif not nodes or not edges:
        _warn("skip kioskâ†’B-004 path check (no graph)")
    else:
        _bad("cannot resolve start or goal node for kioskâ†’B-004 path")
        errors += 1

    # Golden kiosk routes (warnings only â€” regressions QA)
    if nodes and edges and start_node:
        GOLDEN_ROUTES = [
            ("B-011", "GF"),
            ("C-003", "GF"),
            ("B-101", "FF"),
            ("B-201", "SF"),
            ("B-LIFT", "SF"),
        ]
        adj_g = _build_graph_adjacency(nodes, edges)
        for code_u, fid_u in GOLDEN_ROUTES:
            goals_u = [
                nid
                for nid, nn in node_by_id.items()
                if str(nn.get("type")) == "room_door"
                and str(nn.get("room_code") or "").strip().upper() == code_u
                and str(nn.get("floor_id") or "") == fid_u
            ]
            g_u = goals_u[0] if goals_u else None
            if not g_u:
                _warn(f"[golden] missing room_door for {code_u} on {fid_u}")
                continue
            trail = _bfs_path(adj_g, start_node, g_u)
            if trail:
                _ok(f"[golden] kiosk â†’ {code_u} ({fid_u}): reachable")
            else:
                _warn(f"[golden] kiosk â†’ {code_u} ({fid_u}): NO PATH")

    return errors


def main() -> int:
    path = _DEFAULT_MAP_PATH
    if len(sys.argv) > 1:
        path = Path(sys.argv[1]).expanduser().resolve()
    print(f"Validating: {path}\n")
    data = _load_map(path)
    if data is None:
        return 1
    err = validate(data, map_label=str(path.name))
    print()
    if err:
        _bad(f"{err} blocking error(s)")
        return 1
    _ok("validation finished with no blocking errors")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

