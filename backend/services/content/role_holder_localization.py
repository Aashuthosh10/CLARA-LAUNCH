"""Assemble role-holder records from existing locale sources. Never calls an LLM."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.services.answer_generation import DEPARTMENT_JSON_KEY_ORDER, load_locale_data_for_lang_key
from backend.services.narration_plan import STATIC_CARDS_PATH, _init_executive_profiles
from backend.services import narration_plan as _narration_plan_mod

LOCALES_DIR = Path(__file__).resolve().parents[2] / "data" / "locales"

# Visual trustee roster identity (Trustees.tsx photos). Not the static_cards mix that
# also includes principal / vice-principal / mission slides.
TRUSTEE_ROSTER: tuple[dict[str, str], ...] = (
    {
        "id": "holla",
        "name": "Prof. M. R. Holla",
        "designation_en": "Founder Trustee & President",
        "image_key": "holla",
        "static_index": "0",
    },
    {
        "id": "padma_reddy",
        "name": "Dr. A. M. Padma Reddy",
        "designation_en": "Founder Trustee & Vice President",
        "image_key": "padma",
        "static_index": "5",
    },
    {
        "id": "srinivas_raju",
        "name": "Sri R. Srinivas Raju",
        "designation_en": "Managing Trustee & Secretary",
        "image_key": "srinivas",
        "static_index": "6",
    },
    {
        "id": "shanmukha",
        "name": "Prof. R. C. Shanmukha Swamy",
        "designation_en": "Founder Trustee & Joint Secretary",
        "image_key": "shanmukha",
        "static_index": "4",
    },
    {
        "id": "manohar",
        "name": "Sri M. K. Manohar",
        "designation_en": "Founder Trustee & Treasurer",
        "image_key": "manohar",
        "static_index": "7",
    },
    {
        "id": "jayasimha",
        "name": "Dr. Y. Jayasimha",
        "designation_en": "Founder Trustee",
        "image_key": "jayasimha",
        "static_index": "3",
    },
    {
        "id": "narayan",
        "name": "Sri Narayan Raju",
        "designation_en": "Founder Trustee (Deceased)",
        "image_key": "narayan",
        "static_index": "",
        "leadership_role": "Leadership Member 6",
    },
)

# English UI copy already shown on Trustees.tsx — not invented here.
EN_TRUSTEE_PROFILES: dict[str, dict[str, str]] = {
    "holla": {
        "description": (
            "Prof. M R Holla is a distinguished academician and recipient of the "
            "Karnataka Rajyothsava Award for Academic Excellence. With over 50 years of "
            "academic and administrative experience, he serves as the visionary leader "
            "and core architect of SVIT."
        ),
    },
    "padma_reddy": {
        "description": (
            "Dr. A M Padma Reddy is a renowned professor in Computer Science and "
            "Engineering and Dean of Student Affairs. He promotes quality education and "
            "encourages participation in sports, cultural, NSS, and NCC activities."
        ),
    },
    "srinivas_raju": {
        "description": (
            "Sri R Srinivas Raju is a serial entrepreneur with over 30 years of "
            "experience in infrastructure and business development. His industry insights "
            "strengthen SVIT's practical approach to engineering education."
        ),
    },
    "shanmukha": {
        "description": (
            "Prof. R C Shanmukha Swamy brings extensive academic and administrative "
            "expertise, contributing to SVIT's policies and strategic direction with "
            "decades of educational experience."
        ),
    },
    "manohar": {
        "description": (
            "Sri Manohar M K is a Chartered Accountant managing SVIT's financial "
            "operations, ensuring strong fiscal discipline and sustainable institutional growth."
        ),
    },
    "jayasimha": {
        "description": (
            "Dr. Y Jayasimha is an accomplished academician contributing to SVIT's "
            "development through academic leadership and institutional growth strategies."
        ),
    },
    "narayan": {
        "description": (
            "Sri Narayan Raju was a key administrator in SVIT's foundation, whose "
            "contributions to institutional systems and governance remain part of its legacy."
        ),
    },
}

BOARD_LABEL: dict[str, str] = {
    "en": "Board of Trustees",
    "kn": "SVIT ಟ್ರಸ್ಟಿಗಳು",
    "hi": "SVIT के ट्रस्टी",
    "ta": "SVIT அறங்காவலர்கள்",
    "te": "SVIT ట్రస్టీలు",
    "ml": "SVIT ട്രസ്റ്റിമാർ",
}

HOD_TITLE_TMPL: dict[str, str] = {
    "en": "Professor & HOD, {dept}",
    "kn": "{dept} ವಿಭಾಗದ ಮುಖ್ಯಸ್ಥರು",
    "hi": "{dept} विभाग के प्रमुख",
    "ta": "{dept} துறைத் தலைவர்",
    "te": "{dept} విభాగం అధిపతి",
    "ml": "{dept} വിഭാഗത്തിന്റെ മേധാവി",
}

_HOD_DEPTS_IN_EN = (
    "cse",
    "cse_aiml",
    "cse_ds",
    "ise",
    "ece",
    "civil",
    "mechanical",
    "mba",
    "mathematics",
    "physics",
    "chemistry",
)


def _load_static() -> dict[str, Any]:
    return json.loads(STATIC_CARDS_PATH.read_text(encoding="utf-8"))


def _split_designation(content: str) -> tuple[str, str]:
    """Short role line only when the source already separates it. Never invent a title."""
    text = (content or "").strip()
    if not text:
        return "", ""
    for sep in (";", "—"):
        if sep in text:
            left, right = text.split(sep, 1)
            left, right = left.strip(" ."), right.strip()
            if left and right:
                return left, text
    return "", text


def _leadership_member(data: dict[str, Any], role: str) -> str:
    rows = data.get("leadership")
    if not isinstance(rows, list):
        return ""
    for row in rows:
        if isinstance(row, dict) and str(row.get("role") or "") == role:
            return str(row.get("name") or "").strip()
    return ""


def build_trustees_for_lang(lang: str) -> tuple[list[dict[str, Any]], list[str]]:
    gaps: list[str] = []
    static = _load_static()
    pack = static.get(lang) if isinstance(static, dict) else None
    cards = pack.get("trustees") if isinstance(pack, dict) else None
    cards = cards if isinstance(cards, list) else []
    locale = load_locale_data_for_lang_key(lang)
    out: list[dict[str, Any]] = []

    for spec in TRUSTEE_ROSTER:
        tid = spec["id"]
        item: dict[str, Any] = {
            "id": tid,
            "name": spec["name"],
            "display_name": spec["name"],
            "designation": spec["designation_en"] if lang == "en" else "",
            "description": "",
            "tts_summary": "",
            "image_key": spec["image_key"],
            "localization_status": "incomplete",
        }
        if lang == "en":
            desc = EN_TRUSTEE_PROFILES[tid]["description"]
            item["description"] = desc
            item["tts_summary"] = desc
            item["localization_status"] = "complete"
            out.append(item)
            continue

        idx = spec.get("static_index") or ""
        if idx.isdigit() and int(idx) < len(cards) and isinstance(cards[int(idx)], dict):
            card = cards[int(idx)]
            display = str(card.get("title") or "").strip()
            content = str(card.get("content") or "").strip()
            designation, _full = _split_designation(content)
            item["display_name"] = display or spec["name"]
            item["designation"] = designation
            item["description"] = content
            item["tts_summary"] = content
            item["localization_status"] = "complete" if content else "incomplete"
        elif spec.get("leadership_role"):
            line = _leadership_member(locale, spec["leadership_role"])
            if line:
                display, extra = line, ""
                for sep in ("—", " - ", "-"):
                    if sep in line:
                        display, extra = line.split(sep, 1)
                        display, extra = display.strip(), extra.strip()
                        break
                item["display_name"] = display or spec["name"]
                item["designation"] = extra
                item["description"] = line
                item["tts_summary"] = line
                item["localization_status"] = "complete"
            else:
                gaps.append(f"trustees.{tid}.profile.{lang}")
        else:
            gaps.append(f"trustees.{tid}.profile.{lang}")

        if item["localization_status"] != "complete":
            gaps.append(f"trustees.{tid}.profile.{lang}")
        out.append(item)
    return out, gaps


def build_hod_by_department(lang: str) -> tuple[dict[str, Any], list[str]]:
    gaps: list[str] = []
    en = load_locale_data_for_lang_key("en")
    loc = load_locale_data_for_lang_key(lang)
    en_hods = ((en.get("role_holders") or {}) if isinstance(en, dict) else {}).get("hod_by_department")
    en_hods = en_hods if isinstance(en_hods, dict) else {}
    deps = loc.get("departments") if isinstance(loc, dict) else {}
    deps = deps if isinstance(deps, dict) else {}
    tmpl = HOD_TITLE_TMPL.get(lang) or HOD_TITLE_TMPL["en"]
    out: dict[str, Any] = {}

    for key in _HOD_DEPTS_IN_EN:
        src = en_hods.get(key)
        if not isinstance(src, dict):
            gaps.append(f"hod_by_department.{key}.missing_in_en")
            continue
        dept_rec = deps.get(key) if isinstance(deps.get(key), dict) else {}
        dept_name = str(dept_rec.get("name") or src.get("department_name") or key).strip()
        official_name = str(src.get("hod_name") or "").strip()
        row = {
            "department_name": dept_name,
            "hod_name": official_name,
            "hod_title": tmpl.format(dept=dept_name),
            "aliases": src.get("aliases") or [],
        }
        if lang == "en":
            row["hod_bio"] = str(src.get("hod_bio") or "").strip()
            row["hod_title"] = str(src.get("hod_title") or row["hod_title"])
        else:
            # Do not copy English bios. Card body uses departments.{key}.hod_voice.
            row["hod_bio_source"] = f"departments.{key}.hod_voice"
        out[key] = row

    for key in DEPARTMENT_JSON_KEY_ORDER:
        if key not in out:
            gaps.append(f"hod_by_department.{key}.no_official_record")
    return out, gaps


def build_role_holders(lang: str) -> dict[str, Any]:
    _init_executive_profiles()
    trustees, t_gaps = build_trustees_for_lang(lang)
    hods, h_gaps = build_hod_by_department(lang)
    exec_p = (_narration_plan_mod.EXEC_PRINCIPAL or {}).get(lang) or {}
    exec_v = (_narration_plan_mod.EXEC_VICE or {}).get(lang) or {}
    en = load_locale_data_for_lang_key("en")
    en_rh = en.get("role_holders") if isinstance(en, dict) else {}
    en_p = en_rh.get("principal") if isinstance(en_rh, dict) else {}
    en_v = en_rh.get("vice_principal") if isinstance(en_rh, dict) else {}

    principal = {
        "name": str(exec_p.get("name") or (en_p or {}).get("name") or "").strip(),
        "title": str(exec_p.get("title") or (en_p or {}).get("title") or "").strip(),
        "profile": str(exec_p.get("bio") or "").strip(),
    }
    vice = {
        "name": str(exec_v.get("name") or (en_v or {}).get("name") or "").strip(),
        "title": str(exec_v.get("title") or (en_v or {}).get("title") or "").strip(),
        "profile": str(exec_v.get("bio") or "").strip(),
    }
    if lang == "en":
        principal["profile"] = str((en_p or {}).get("profile") or principal["profile"])
        vice["profile"] = str((en_v or {}).get("profile") or vice["profile"])

    gaps = [*t_gaps, *h_gaps]
    if not principal["profile"]:
        gaps.append(f"principal.profile.{lang}")
    if not vice["profile"]:
        gaps.append(f"vice_principal.profile.{lang}")

    return {
        "ui": {
            "board_label": BOARD_LABEL.get(lang) or BOARD_LABEL["en"],
        },
        "principal": principal,
        "vice_principal": vice,
        "trustees": trustees,
        "hod_by_department": hods,
        "localization_gaps": gaps,
    }


def write_role_holders_into_locales() -> dict[str, int]:
    counts: dict[str, int] = {}
    for lang in ("en", "kn", "hi", "ta", "te", "ml"):
        path = LOCALES_DIR / f"{lang}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data["role_holders"] = build_role_holders(lang)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        counts[lang] = len(data["role_holders"].get("trustees") or [])
    return counts
