"""Official dean profile copy for leadership ContentUnits."""

from __future__ import annotations

from typing import Any

# section_id / topic → multilingual packs (lang_key → fields)
DEAN_PROFILES: dict[str, dict[str, dict[str, str]]] = {
    "dean_academics": {
        "en": {
            "label": "Executive Profile",
            "name": "Dr. Vrinda Shetty",
            "title": "Dean Academics",
            "bio": (
                "Manages academic policies, curriculum delivery, timetables, "
                "internal assessment schedules, and overall educational standards across all departments."
            ),
        },
    },
    "dean_administration": {
        "en": {
            "label": "Executive Profile",
            "name": "Prof. R C Shanmukhaswamy",
            "title": "Dean Administration",
            "bio": (
                "Handles campus administrative policies, regulatory compliance, "
                "infrastructure coordination, and operational management of institutional resources."
            ),
        },
    },
    "dean_student_affairs": {
        "en": {
            "label": "Executive Profile",
            "name": "Dr. T G Manjunatha",
            "title": "Dean Student Affairs",
            "bio": (
                "Directs student welfare programs, discipline, extracurricular activities, "
                "student clubs, and campus events to ensure holistic student development."
            ),
        },
    },
    "associate_dean_rnd": {
        "en": {
            "label": "Executive Profile",
            "name": "Dr. Shantha Kumar B Patil",
            "title": "Associate Dean R&D",
            "bio": (
                "Supports institutional research ecosystem initiatives, interdisciplinary "
                "project development, research grant applications, and scholarly publications."
            ),
        },
    },
    "dean_innovation": {
        "en": {
            "label": "Executive Profile",
            "name": "Dr. Venkatesha M",
            "title": "Professor & Dean (Innovation, Consultancy & Entrepreneurship)",
            "bio": (
                "Drives innovation culture, industry consultancy initiatives, start-up incubation, "
                "and institutional entrepreneurship cells to bridge academia with industry."
            ),
        },
    },
}

DEAN_TOPICS: tuple[str, ...] = tuple(DEAN_PROFILES.keys())


def dean_profile_for(topic: str, lang_key: str) -> dict[str, str] | None:
    pack = DEAN_PROFILES.get((topic or "").strip().lower())
    if not pack:
        return None
    lk = (lang_key or "en").strip().lower()
    return pack.get(lk) or pack.get("en")


def dean_spoken_line(topic: str, lang_key: str) -> str:
    p = dean_profile_for(topic, lang_key) or {}
    name = str(p.get("name") or "").strip()
    title = str(p.get("title") or "").strip()
    if name and title:
        return f"{title} is {name}."
    return name or title
