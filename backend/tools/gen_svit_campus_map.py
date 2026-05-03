"""Author svit-campus-map.json + matching per-floor SVGs (single coordinate space).

This script is the **layout source of truth** until CAD-traced polygons replace it.
Coordinates are authored in logical 1000×1000 space then scaled by (SX, SY)
so the footprint matches widescreen kiosk displays while preserving graph topology.

Run from repo root: python backend/tools/gen_svit_campus_map.py

To replace with true facility geometry: preserve node ids + room codes,
edit polygons in JSON from Inkscape anchors, regenerate SVG—or hand-edit SVG/JSON pairs.
"""

from __future__ import annotations

import json
import math
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACK = ROOT / "backend" / "data" / "svit-campus-map.json"
PUBLIC = ROOT / "frontend" / "public" / "data" / "svit-campus-map.json"
MAP_DIR = ROOT / "frontend" / "public" / "maps"

# Target canvas — must match intrinsic SVG dimensions and floor.map_width/map_height.
CANVAS_W, CANVAS_H = 1320, 920
SX = CANVAS_W / 1000.0
SY = CANVAS_H / 1000.0

SCALE_M = 0.065

AX_L, BX_L, BW_OFST_L, CX_L = 228.0, 420.0, 360.0, 788.0
AX = AX_L * SX
BX = BX_L * SX
BW = BW_OFST_L * SX
CX = CX_L * SX

ROOM_SPECS: list[tuple[str, str, str, str, str, str, tuple[float, float], float, float]] = []


def S(lx: float, ly: float) -> tuple[float, float]:
    return round(lx * SX, 2), round(ly * SY, 2)


def _dist(ax: float, ay: float, bx: float, by: float) -> float:
    return max(round(math.hypot(ax - bx, ay - by) * SCALE_M, 2), 0.08)


def _rect(cx: float, cy: float, w: float, h: float) -> list[list[float]]:
    hw, hh = w / 2, h / 2
    return [
        [cx - hw, cy - hh],
        [cx + hw, cy - hh],
        [cx + hw, cy + hh],
        [cx - hw, cy + hh],
    ]


def cxr_blk(b: str) -> float:
    if b == "A":
        return AX
    return BX if b == "B" else CX - 64 * SX


def _door(corridor_x: float, rcx: float, rcy: float) -> dict[str, float]:
    ofs = round(14 * SX, 2)
    nx = rcx + (ofs if corridor_x <= rcx else -ofs)
    return {"x": nx, "y": rcy}


def p(
    fid: str,
    b: str,
    rid: str,
    code: str,
    nm: str,
    cat: str,
    ox: float,
    oy: float,
    w: float = 64,
    h: float = 48,
) -> None:
    """Logical 1000-authoring-plane center (ox,oy) and footprint (w,h) — scaled into canvas coords."""
    cx, cy = S(ox, oy)
    w_px = round(w * SX, 2)
    h_px = round(h * SY, 2)
    ROOM_SPECS.append((fid, b, rid, code, nm, cat, (cx, cy), w_px, h_px))


def specs() -> None:
    """Room centers (logical 1k space) preserved from schematic v3."""
    # GF A
    y = 300.0
    for code, nm, cat in (
        ("A-002", "CAED Lab", "lab"),
        ("A-005", "Railway Skills Development Lab", "lab"),
        ("A-008", "Department of Physics", "department"),
        ("A-009", "Department of Chemistry", "department"),
        ("A-010", "Research Center — CSE", "lab"),
        ("A-011", "NCC Room", "activity"),
        ("A-012", "Store Room", "utility"),
    ):
        p("GF", "A", f"gf-a-{code.lower().replace('-', '_')}", code, nm, cat, AX_L + 108, y, w=92, h=52)
        y += 86
    p("GF", "A", "gf-a-str", "A-STR", "Stairs — Block A", "circulation", AX_L - 96, 640, 54, 74)
    # GF B
    p("GF", "B", "gf-b-002", "B-002", "Entrepreneurship Incubation Cell", "startup", BW_OFST_L - 40, 210, 88, 50)
    p("GF", "B", "gf-b-003", "B-003", "Training & Placement Centre", "placement", BW_OFST_L + 72, 210, 96, 50)
    p("GF", "B", "gf-b-004", "B-004", "Principal Chamber", "admin", BX_L + 118, 168, 88, 52)
    p("GF", "B", "gf-b-005", "B-005", "Board Room", "admin", BX_L + 218, 165, 74, 48)
    p("GF", "B", "gf-b-006", "B-006", "Director Room", "admin", BX_L + 300, 166, 74, 48)
    p("GF", "B", "gf-b-008", "B-008", "Gymnasium & Fitness", "facility", BX_L + 294, 250, 118, 76)
    p("GF", "B", "gf-b-009", "B-009", "Administrative Office", "admin", BX_L + 120, 246, 96, 54)
    p("GF", "B", "gf-b-010", "B-010", "Medical Room", "medical", BX_L + 28, 330, 74, 46)
    p("GF", "B", "gf-b-011", "B-011", "Admission Room", "admin", BX_L + 160, 330, 92, 50)
    p("GF", "B", "gf-b-012", "B-012", "Examination Section", "admin", BX_L + 276, 330, 100, 52)
    p("GF", "B", "gf-b-015", "B-015", "Stationery / SVIT Store", "facility", BX_L + 36, 420, 72, 44)
    p("GF", "B", "gf-b-lift", "B-LIFT", "Lift — Block B", "circulation", BX_L - 60, 310, 54, 62)
    # GF C
    p("GF", "C", "gf-c-001", "C-001", "Department of ISE Lab (1)", "lab", CX_L - 114, 200, 90, 48)
    p("GF", "C", "gf-c-002", "C-002", "Department of ISE Lab (2)", "lab", CX_L + 4, 200, 86, 48)
    p("GF", "C", "gf-c-003", "C-003", "Library & Information Center", "library", CX_L + 110, 186, 108, 62)
    p("GF", "C", "gf-c-005", "C-005", "Survey Lab", "lab", CX_L + 118, 334, 76, 46)
    p("GF", "C", "gf-c-006", "C-006", "Geology Lab", "lab", CX_L + 24, 358, 74, 46)
    p("GF", "C", "gf-c-007", "C-007", "Swamy Vivekananda Main Seminar Hall", "seminar", CX_L - 124, 388, 128, 90)
    p("GF", "C", "gf-c-008", "C-008", "Medical Room", "medical", CX_L - 90, 500, 74, 46)
    p("GF", "C", "gf-c-011", "C-011", "UPS Room", "utility", CX_L + 112, 500, 58, 44)
    p("GF", "C", "gf-c-str", "C-STR", "Stairs — Block C", "circulation", CX_L - 184, 302, 54, 74)
    # FF A
    p("FF", "A", "ff-a-108", "A-108", "E&C HOD Room", "hod", AX_L + 100, 310, 76, 42)
    fy = 378.0
    labs = (
        ("A-109", "Carver Lab — E&C Lab 6"),
        ("A-110", "Richard Feynman Lab — E&C Lab 5"),
        ("A-111", "David Huffman Lab — E&C Lab 4"),
        ("A-112", "Claude Shannon Lab — E&C Lab 3"),
        ("A-113", "James Clerk Maxwell Lab — E&C Lab 2"),
        ("A-114", "William Shockley Lab — E&C Lab 1"),
    )
    for code, nm in labs:
        p("FF", "A", f"ff-{code.lower().replace('-', '_')}", code, nm, "lab", AX_L + 100, fy, 94, 46)
        fy += 72
    p("FF", "A", "ff-a-115", "A-115", "Department of Mathematics", "department", AX_L + 100, 776, 98, 52)
    p("FF", "A", "ff-a-hod-math", "A-HOD-MATH", "Maths HOD Room", "hod", AX_L - 96, 766, 74, 42)
    p("FF", "A", "ff-a-str", "A-STR", "Stairs — Block A", "circulation", AX_L - 96, 628, 54, 74)
    # FF B
    p("FF", "B", "ff-b-101", "B-101", "CSE HOD Room", "hod", BW_OFST_L + 38, 180, 76, 42)
    p("FF", "B", "ff-b-102", "B-102", "ISE HOD Room", "hod", BW_OFST_L + 152, 180, 78, 42)
    p("FF", "B", "ff-b-103", "B-103", "ISE Faculty Room", "faculty", BW_OFST_L + 262, 186, 90, 46)
    p("FF", "B", "ff-b-107", "B-107", "L2M Cyber Signaling Lab — 2", "lab", BW_OFST_L - 18, 296, 114, 50)
    p("FF", "B", "ff-b-110", "B-110", "L2M AIML Lab for Railways R&D", "lab", BW_OFST_L + 130, 308, 126, 54)
    p("FF", "B", "ff-b-111", "B-111", "CSE Faculty Room — 2", "faculty", BW_OFST_L + 290, 308, 96, 46)
    p("FF", "B", "ff-b-112", "B-112", "Dr. Vikram Sarabhai Computer Lab", "lab", BW_OFST_L + 60, 410, 120, 52)
    p("FF", "B", "ff-b-113", "B-113", "Dr. Radhakrishnan Seminar Hall", "seminar", BW_OFST_L + 224, 410, 106, 56)
    p("FF", "B", "ff-b-114", "B-114", "CSE Faculty Room — 1", "faculty", BW_OFST_L - 40, 512, 94, 46)
    p("FF", "B", "ff-b-115", "B-115", "Dept of Mechanical Faculty Room", "faculty", BW_OFST_L + 108, 514, 104, 48)
    p("FF", "B", "ff-b-116", "B-116", "CSE Faculty Room — 3", "faculty", BW_OFST_L + 252, 516, 96, 46)
    p("FF", "B", "ff-b-117", "B-117", "Centre for Research & Development — E&C", "rd", BW_OFST_L + 58, 632, 132, 56)
    p("FF", "B", "ff-b-119", "B-119", "KSCST Room", "activity", BW_OFST_L + 270, 640, 96, 48)
    p("FF", "B", "ff-b-lift", "B-LIFT", "Lift — Block B", "circulation", BX_L - 56, 318, 54, 62)
    for i, xc in enumerate((-112, -12, 88, 198)):
        p("FF", "C", f"ff-c-{101 + i}", f"C-{101 + i}", "Dept of CSE Lab", "lab", CX_L + xc, 210, 88, 46)
    p("FF", "C", "ff-c-112", "C-112", "ISE R&D Center", "rd", CX_L + 34, 350, 104, 52)
    p("FF", "C", "ff-c-str", "C-STR", "Stairs — Block C", "circulation", CX_L - 176, 300, 54, 74)
    # SF
    p("SF", "A", "sf-a-207", "A-207", "NSS Cell", "activity", AX_L + 96, 328, 80, 42)
    p("SF", "A", "sf-a-209", "A-209", "Photonics Lab for Railways R&D", "lab", AX_L + 100, 446, 112, 54)
    p("SF", "A", "sf-a-217", "A-217", "IQAC Cell", "admin", AX_L + 100, 596, 94, 50)
    p("SF", "A", "sf-a-218", "A-218", "Dept of ECE Faculty Room", "faculty", AX_L + 100, 734, 104, 50)
    p("SF", "A", "sf-a-str", "A-STR", "Stairs — Block A", "circulation", AX_L - 96, 632, 54, 74)
    p("SF", "B", "sf-b-201", "B-201", "Dept of CSE Data Science HOD Room", "hod", BW_OFST_L + 38, 176, 94, 42)
    p("SF", "B", "sf-b-202", "B-202", "Dept of AIML HOD Room", "hod", BW_OFST_L + 176, 176, 96, 42)
    p("SF", "B", "sf-b-210", "B-210", "Civil & Mechanical CAD Lab", "lab", BW_OFST_L + 322, 190, 124, 54)
    p("SF", "B", "sf-b-211", "B-211", "Dept of Mechanical Engineering HOD Room", "hod", BW_OFST_L + 106, 314, 110, 44)
    p("SF", "B", "sf-b-212", "B-212", "Dept of Civil Engineering HOD Room", "hod", BW_OFST_L + 272, 318, 106, 42)
    p("SF", "B", "sf-b-213", "B-213", "Dept of CSE AIML Staff Room", "faculty", BW_OFST_L - 42, 430, 104, 46)
    p("SF", "B", "sf-b-214", "B-214", "Dept of CSE DS Staff Room", "faculty", BW_OFST_L + 126, 432, 104, 46)
    p("SF", "B", "sf-b-215", "B-215", "Sir M. Visvesvaraya Seminar Hall", "seminar", BW_OFST_L + 270, 428, 118, 56)
    p("SF", "B", "sf-b-216", "B-216", "Civil & Mechanical Staff Room", "faculty", BW_OFST_L - 54, 558, 118, 46)
    p("SF", "B", "sf-b-217", "B-217", "CSE DS Lab — 2", "lab", BW_OFST_L + 128, 558, 118, 52)
    p("SF", "B", "sf-b-218", "B-218", "CSE AIML Lab — 2", "lab", BW_OFST_L + 294, 556, 120, 52)
    p("SF", "B", "sf-b-219", "B-219", "Sangama Cultural Club", "activity", BW_OFST_L + 80, 690, 114, 52)
    p("SF", "B", "sf-b-222", "B-222", "Faculty Room", "faculty", BW_OFST_L + 276, 694, 88, 44)
    p("SF", "B", "sf-b-lift", "B-LIFT", "Lift — Block B", "circulation", BX_L - 56, 318, 54, 62)
    p("SF", "C", "sf-c-201", "C-201", "CoE AIML Skill Lab", "lab", CX_L + 60, 210, 124, 54)
    p("SF", "C", "sf-c-202", "C-202", "CSE DS Lab — 1 / John Tukey Lab", "lab", CX_L + 36, 342, 126, 54)
    p("SF", "C", "sf-c-203", "C-203", "CSE AIML Lab — 1 / John McCarthy Lab", "lab", CX_L + 30, 474, 132, 54)
    p("SF", "C", "sf-c-206", "C-206", "Dept of ISE Lab", "lab", CX_L - 140, 402, 120, 52)
    p("SF", "C", "sf-c-214", "C-214", "CSE DS R&D Center", "rd", CX_L - 146, 586, 114, 52)
    p("SF", "C", "sf-c-str", "C-STR", "Stairs — Block C", "circulation", CX_L - 176, 300, 54, 74)


def room_row(spec: tuple) -> dict:
    fid, b, rid, code, name, cat, (cx, cy), w, h = spec
    cxr_v = cxr_blk(b)
    poly = _rect(cx, cy, w, h)
    door = _door(cxr_v, cx, cy)
    aliases: list[str] = []
    lname = name.lower()
    if "principal" in lname:
        aliases += ["principal office", "principal cabin"]
    if "placement" in lname or cat == "placement":
        aliases += ["t&p", "tnp", "placement cell"]
    if "library" in lname:
        aliases += ["library", "lic", "central library"]
    if cat == "seminar":
        aliases.append("seminar hall")
    if code == "B-LIFT":
        aliases += ["lift", "elevator"]
    if "stairs" in lname:
        aliases += ["stairs", "staircase"]
    if "admission" in lname:
        aliases += ["admissions", "admission office"]
    if cat == "admin" and "administrative office" in lname:
        aliases += ["admin office", "administration"]
    if cat == "hod":
        aliases += ["head of department"]
    out = {
        "id": rid,
        "code": code,
        "name": name,
        "category": cat,
        "type": cat,
        "polygon": poly,
        "door": door,
        "department": None,
        "aliases": aliases,
    }
    return out


def floors_payload() -> list[dict]:
    grp: dict[str, dict[str, list]] = {}
    for s in ROOM_SPECS:
        fid, bc = s[0], s[1]
        grp.setdefault(fid, {}).setdefault(bc, []).append(room_row(s))
    out = []
    for fid, title, fn in (("GF", "Ground Floor", 0), ("FF", "First Floor", 1), ("SF", "Second Floor", 2)):
        blocks = []
        for bc in ("A", "B", "C"):
            blocks.append(
                {
                    "block_id": f"blk-{bc.lower()}",
                    "block_code": bc,
                    "block_name": f"Block {bc}",
                    "rooms": grp.get(fid, {}).get(bc, []),
                }
            )
        png = {"GF": "ground-floor", "FF": "first-floor", "SF": "second-floor"}
        out.append(
            {
                "floor_id": fid,
                "floor_number": fn,
                "floor_name": title,
                "image_ref": f"/maps/{png[fid]}.svg",
                "map_width": CANVAS_W,
                "map_height": CANVAS_H,
                "blocks": blocks,
            }
        )
    return out


# B-011 (Admission) schematic center in logical space — kiosk sits just west (corridor side).
B011_CX_L = BX_L + 160.0
B011_CY_L = 330.0
B011_W_L = 92.0


def kiosk_logical_xy() -> tuple[float, float]:
    """West of B-011 outer edge; same row as admissions for corridor UX."""
    ofs = 52.0  # logical px past room half-width — “left of B-011”
    kx_l = B011_CX_L - (B011_W_L / 2.0) - ofs
    return kx_l, B011_CY_L


def kiosk_xy() -> tuple[float, float]:
    return S(*kiosk_logical_xy())


def graph(slist: list) -> tuple[list[dict], list[dict]]:
    F = ("GF", "FF", "SF")
    kx, ky = kiosk_xy()
    nodes: list[dict] = []
    edges: list[dict] = []

    def nv(**k) -> None:
        nodes.append(k)

    nv(id="GF-NAV-KIOSK-MAIN", type="kiosk", floor_id="GF", label="Main entrance kiosk", x=kx, y=ky)
    for fid in F:
        jk = {"GF": 1.02, "FF": 0.94, "SF": 0.98}[fid]
        jx, jy = S(308.0 + 34.0, 258.0 + 54.0 * jk)
        nv(id=f"{fid}-J-AB-CORE", type="junction", floor_id=fid, label="A-B junction", x=jx, y=jy)

        jax, jay = S(228.0, 514.0)
        nv(id=f"{fid}-J-A-SPINE", type="junction", floor_id=fid, label="Block A spine", x=jax, y=jay)

        jbx, jby = S(420.0 + 120.0, 256.0)
        nv(id=f"{fid}-J-B-SPINE", type="junction", floor_id=fid, label="Block B spine", x=jbx, y=jby)

        jcw, jch = S(788.0 - 214.0, 268.0)
        nv(id=f"{fid}-J-C-WEST", type="junction", floor_id=fid, label="Block C west", x=jcw, y=jch)

        jlx, jly = S(420.0 - 8.0, 298.0)
        nv(id=f"{fid}-J-LIFT-WING", type="junction", floor_id=fid, label="Lift lobby", x=jlx, y=jly)

        jsx, jsy = S(228.0 - 48.0, 642.0)
        nv(id=f"{fid}-J-A-STAIR-WING", type="junction", floor_id=fid, label="Stairs A", x=jsx, y=jsy)

        jsc_x, jsc_y = S(788.0 - 172.0, 294.0)
        nv(id=f"{fid}-J-C-STAIR-WING", type="junction", floor_id=fid, label="Stairs C", x=jsc_x, y=jsc_y)

    for s in slist:
        fid, b, rid, code = s[0], s[1], s[2], s[3]
        rcx, rcy = s[6]
        cxv = cxr_blk(b)
        hub = ""
        dx_unscaled = 0.0
        if code == "A-STR":
            hub, dx_unscaled = f"{fid}-J-A-STAIR-WING", -20.0
        elif code == "C-STR":
            hub, dx_unscaled = f"{fid}-J-C-STAIR-WING", -18.0
        elif code == "B-LIFT":
            hub, dx_unscaled = f"{fid}-J-LIFT-WING", 22.0
        else:
            hub = {"A": f"{fid}-J-A-SPINE", "B": f"{fid}-J-B-SPINE", "C": f"{fid}-J-C-WEST"}[b]
            dx_unscaled = 28.0 if rcx >= cxv else -28.0
        dx = round(dx_unscaled * SX, 2)
        nv(
            id=f"DOOR-{rid.upper()}",
            type="room_door",
            floor_id=fid,
            label=code,
            x=rcx + dx,
            y=rcy,
            room_code=code,
        )

    return nodes, []


def graph2(slist: list) -> tuple[list[dict], list[dict]]:
    nodes, _ = graph(slist)
    nd = {n["id"]: n for n in nodes}
    edges: list[dict] = []

    def eadd(eid: str, frm: str, to: str, typ: str, dm: float | None = None, **ex) -> None:
        dx = dm if dm is not None else _dist(nd[frm]["x"], nd[frm]["y"], nd[to]["x"], nd[to]["y"])
        row = {"id": eid, "from": frm, "to": to, "type": typ, "distance_m": round(dx, 2), "bidirectional": True}
        row["accessible"] = typ != "stairs"
        row.update(ex)
        edges.append(row)

    for fid in ("GF", "FF", "SF"):
        eadd(f"n-{fid}-ab-a", f"{fid}-J-AB-CORE", f"{fid}-J-A-SPINE", "corridor")
        eadd(f"n-{fid}-ab-b", f"{fid}-J-AB-CORE", f"{fid}-J-B-SPINE", "corridor")
        eadd(f"n-{fid}-b-c", f"{fid}-J-B-SPINE", f"{fid}-J-C-WEST", "corridor")
        dbl = max(
            _dist(
                nd[f"{fid}-J-B-SPINE"]["x"],
                nd[f"{fid}-J-B-SPINE"]["y"],
                nd[f"{fid}-J-LIFT-WING"]["x"],
                nd[f"{fid}-J-LIFT-WING"]["y"],
            ),
            6.5,
        )
        dal = max(
            _dist(
                nd[f"{fid}-J-AB-CORE"]["x"],
                nd[f"{fid}-J-AB-CORE"]["y"],
                nd[f"{fid}-J-LIFT-WING"]["x"],
                nd[f"{fid}-J-LIFT-WING"]["y"],
            ),
            8.5,
        )
        eadd(f"n-{fid}-b-lift", f"{fid}-J-B-SPINE", f"{fid}-J-LIFT-WING", "corridor", dbl)
        eadd(f"n-{fid}-ab-lift", f"{fid}-J-AB-CORE", f"{fid}-J-LIFT-WING", "corridor", dal)
        eadd(f"n-{fid}-sa", f"{fid}-J-A-SPINE", f"{fid}-J-A-STAIR-WING", "corridor")
        eadd(f"n-{fid}-sc", f"{fid}-J-C-WEST", f"{fid}-J-C-STAIR-WING", "corridor")

    # Kiosk is in Block B belt — first hop to B spine (not A–B core).
    eadd("e-enter", "GF-NAV-KIOSK-MAIN", "GF-J-B-SPINE", "entrance_path")

    for s in slist:
        fid, b, rid, code = s[0], s[1], s[2], s[3]
        hub = ""
        if code == "A-STR":
            hub = f"{fid}-J-A-STAIR-WING"
        elif code == "C-STR":
            hub = f"{fid}-J-C-STAIR-WING"
        elif code == "B-LIFT":
            hub = f"{fid}-J-LIFT-WING"
        else:
            hub = {"A": f"{fid}-J-A-SPINE", "B": f"{fid}-J-B-SPINE", "C": f"{fid}-J-C-WEST"}[b]
        dv = max(
            _dist(nd[hub]["x"], nd[hub]["y"], nd[f"DOOR-{rid.upper()}"]["x"], nd[f"DOOR-{rid.upper()}"]["y"]) + 11.0,
            12.0,
        )
        eadd(f"eda-{rid}", hub, f"DOOR-{rid.upper()}", "door_access", round(dv, 2))

    eadd("vlift-GF-FF", "GF-J-LIFT-WING", "FF-J-LIFT-WING", "lift", 15.0)
    eadd("vlift-FF-SF", "FF-J-LIFT-WING", "SF-J-LIFT-WING", "lift", 15.0)
    for w in ("J-A-STAIR-WING", "J-C-STAIR-WING"):
        eadd(f"vs-{w}-gf-ff", f"GF-{w}", f"FF-{w}", "stairs", 17.0, accessible=False)
        eadd(f"vs-{w}-ff-sf", f"FF-{w}", f"SF-{w}", "stairs", 17.0, accessible=False)

    return nodes, edges


_NS = "{http://www.w3.org/2000/svg}"


def _block_bboxes_for_floor(specs_list: list, fid: str) -> dict[str, tuple[float, float, float, float]]:
    """Per block_code on floor: (min_x, min_y, max_x, max_y) in canvas coords."""
    acc: dict[str, list[float]] = {}
    pad = 18.0
    for spec in specs_list:
        if spec[0] != fid:
            continue
        b = spec[1]
        cx, cy, w, h = spec[6][0], spec[6][1], spec[7], spec[8]
        hw, hh = w / 2, h / 2
        x0, y0, x1, y1 = cx - hw - pad, cy - hh - pad, cx + hw + pad, cy + hh + pad
        if b not in acc:
            acc[b] = [x0, y0, x1, y1]
        else:
            o = acc[b]
            o[0] = min(o[0], x0)
            o[1] = min(o[1], y0)
            o[2] = max(o[2], x1)
            o[3] = max(o[3], y1)
    return {k: (v[0], v[1], v[2], v[3]) for k, v in acc.items()}


def write_svgs(specs_list: list) -> None:
    MAP_DIR.mkdir(parents=True, exist_ok=True)
    FMAP = {"GF": "ground-floor", "FF": "first-floor", "SF": "second-floor"}

    fills = {
        "lab": "#dbeafe",
        "department": "#d1fae5",
        "hod": "#ede9fe",
        "admin": "#ffedd5",
        "library": "#fef3c7",
        "seminar": "#fbcfe8",
        "circulation": "#e0e7ff",
        "startup": "#e2e8f0",
        "facility": "#e2e8f0",
        "placement": "#e2e8f0",
        "medical": "#e2e8f0",
        "utility": "#e2e8f0",
        "activity": "#e5e7eb",
        "faculty": "#f1f5f9",
        "rd": "#fce7f3",
        "default": "#e8ecf2",
    }

    for fid in ("GF", "FF", "SF"):
        svg = ET.Element(f"{_NS}svg", {"xmlns": "http://www.w3.org/2000/svg"})
        vb = f"0 0 {CANVAS_W} {CANVAS_H}"
        svg.set("viewBox", vb)
        svg.set("width", str(CANVAS_W))
        svg.set("height", str(CANVAS_H))

        defs = ET.SubElement(svg, f"{_NS}defs")
        room_style = ET.SubElement(defs, f"{_NS}style")
        room_style.set("type", "text/css")
        room_style.text = (
            ".r{stroke:#475569;stroke-width:1.5;stroke-linejoin:round} "
            ".lbl{font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-weight:600;fill:#0f172a}"
        )

        ET.SubElement(svg, f"{_NS}title").text = f"SVIT {fid} — campus navigation (coordinate space with JSON)"

        bg = ET.SubElement(svg, f"{_NS}rect")
        bg.set("class", "map-bg")
        bg.set("width", str(CANVAS_W))
        bg.set("height", str(CANVAS_H))
        bg.set("fill", "#eef2f7")
        bg.set("rx", "12")

        g_cor = ET.SubElement(svg, f"{_NS}g")
        g_cor.set("id", "corridor-tint")
        for b in ("A", "B", "C"):
            bb = _block_bboxes_for_floor(specs_list, fid).get(b)
            if not bb:
                continue
            x0, y0, x1, y1 = bb
            cr = ET.SubElement(g_cor, f"{_NS}rect")
            cr.set("x", f"{x0:.1f}")
            cr.set("y", f"{y0:.1f}")
            cr.set("width", f"{x1 - x0:.1f}")
            cr.set("height", f"{y1 - y0:.1f}")
            cr.set("rx", "10")
            cr.set("fill", "#ecfdf5")
            cr.set("fill-opacity", "0.55")
            cr.set("stroke", "none")

        g_rooms = ET.SubElement(svg, f"{_NS}g")
        g_rooms.set("id", "rooms")

        for spec in specs_list:
            if spec[0] != fid:
                continue
            cx, cy, w, h = spec[6][0], spec[6][1], spec[7], spec[8]
            hw, hh = w / 2, h / 2
            rx = ET.SubElement(g_rooms, f"{_NS}rect")
            rx.set("x", f"{cx - hw:.2f}")
            rx.set("y", f"{cy - hh:.2f}")
            rx.set("width", f"{w:.2f}")
            rx.set("height", f"{h:.2f}")
            rx.set("rx", "4")
            rx.set("class", "r")
            cat = spec[5]
            rx.set("fill", fills.get(cat, fills["default"]))
            txt = ET.SubElement(svg, f"{_NS}text")
            txt.set("x", str(round(cx, 2)))
            txt.set("y", str(round(min(cy + 3, CANVAS_H - 6), 2)))
            sz = 11 if fid == "GF" else 10
            txt.set("font-size", str(sz))
            txt.set("class", "lbl")
            txt.set("text-anchor", "middle")
            txt.text = spec[3]

        g_bl = ET.SubElement(svg, f"{_NS}g")
        g_bl.set("id", "block-labels")
        for b in ("A", "B", "C"):
            bb = _block_bboxes_for_floor(specs_list, fid).get(b)
            if not bb:
                continue
            x0, y0, x1, y1 = bb
            tx, ty = (x0 + x1) / 2, y0 + 14
            bt = ET.SubElement(g_bl, f"{_NS}text")
            bt.set("x", f"{tx:.1f}")
            bt.set("y", f"{ty:.1f}")
            bt.set("text-anchor", "middle")
            bt.set("font-size", "11")
            bt.set("font-weight", "700")
            bt.set("fill", "#64748b")
            bt.set("font-family", "system-ui,-apple-system,Segoe UI,sans-serif")
            bt.text = f"BLOCK — {b}"

        if fid == "GF":
            kb = kiosk_xy()
            gk = ET.SubElement(svg, f"{_NS}g")
            gk.set("id", "kiosk-marker")
            kc = ET.SubElement(gk, f"{_NS}circle")
            kc.set("cx", str(kb[0]))
            kc.set("cy", str(kb[1]))
            kc.set("r", "11")
            kc.set("fill", "#6d28d9")
            kc.set("stroke", "#fbbf24")
            kc.set("stroke-width", "3")
            kring = ET.SubElement(gk, f"{_NS}circle")
            kring.set("cx", str(kb[0]))
            kring.set("cy", str(kb[1]))
            kring.set("r", "17")
            kring.set("fill", "none")
            kring.set("stroke", "#7c3aed")
            kring.set("stroke-opacity", "0.35")

            kt = ET.SubElement(svg, f"{_NS}text")
            kt.set("x", str(kb[0]))
            kt.set("y", str(round(kb[1] - 22, 2)))
            kt.set("text-anchor", "middle")
            kt.set("font-size", "11")
            kt.set("font-weight", "700")
            kt.set("fill", "#4c1d95")
            kt.set("font-family", "system-ui,-apple-system,Segoe UI,sans-serif")
            kt.text = "Kiosk"

        out = MAP_DIR / f"{FMAP[fid]}.svg"
        ET.ElementTree(svg).write(out, encoding="unicode", xml_declaration=True)


def main() -> None:
    specs()
    sl = ROOM_SPECS
    floors = floors_payload()
    nodes, edges = graph2(sl)

    kk = kiosk_xy()
    doc = {
        "version": "4.1.0-kiosk-near-b011",
        "institution": "Sai Vidya Institute of Technology (SVIT)",
        "coordinate_space": {
            "unit": "svg_user",
            "width": CANVAS_W,
            "height": CANVAS_H,
            "note": "Logical layout scaled from 1k authoring grid; overlays match authored SVG intrinsic size.",
        },
        "kiosk": {"floor_id": "GF", "x": kk[0], "y": kk[1], "label": "Kiosk"},
        "kiosks": [{"id": "default-kiosk", "node_id": "GF-NAV-KIOSK-MAIN"}],
        "floors": floors,
        "nodes": nodes,
        "edges": edges,
    }

    BACK.parent.mkdir(parents=True, exist_ok=True)
    for path in (BACK, PUBLIC):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False), encoding="utf-8")

    shutil.copyfile(BACK, PUBLIC)
    write_svgs(sl)
    print(f"CANVAS={CANVAS_W}x{CANVAS_H} | rooms={len(sl)} nodes={len(nodes)} edges={len(edges)}")


if __name__ == "__main__":
    main()
