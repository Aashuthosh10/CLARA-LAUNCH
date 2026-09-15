"""Canonical card identity registry.

Natural-language aliases and localized labels never enter this module. It maps
language-independent semantic topics/ContentUnit IDs to stable card IDs only.
"""

from __future__ import annotations


TOPIC_TO_INTENT_ID: dict[str, str] = {
    "overview": "show_department",
    "hod": "show_hod",
    "faculty": "show_faculty",
    "admissions": "show_admissions",
    "fees": "show_fees",
    "placements": "show_placements",
    "contact": "show_contact",
    "location": "show_location",
    "principal": "show_principal",
    "vice_principal": "show_vice_principal",
    "dean_academics": "show_dean_academics",
    "dean_administration": "show_dean_administration",
    "dean_student_affairs": "show_dean_student_affairs",
    "associate_dean_rnd": "show_associate_dean_rnd",
    "dean_innovation": "show_dean_innovation",
    "trustees": "show_trustees",
}

TOPIC_TO_CARD_ID: dict[str, str] = {
    "overview": "department_overview",
    "hod": "hod_profile",
    "faculty": "faculty_list",
    "admissions": "admissions",
    "fees": "fees",
    "placements": "placements",
    "contact": "contact_details",
    "location": "location",
    "principal": "principal_profile",
    "vice_principal": "vice_principal_profile",
    "dean_academics": "dean_academics",
    "dean_administration": "dean_administration",
    "dean_student_affairs": "dean_student_affairs",
    "associate_dean_rnd": "associate_dean_rnd",
    "dean_innovation": "dean_innovation",
    "trustees": "trustees",
}


def intent_id_for_topic(topic: str) -> str:
    key = (topic or "").strip().lower()
    return TOPIC_TO_INTENT_ID.get(key, f"show_{key}" if key else "unknown")


def card_id_for_topic(topic: str) -> str:
    key = (topic or "").strip().lower()
    return TOPIC_TO_CARD_ID.get(key, key)


def card_id_for_unit_id(unit_id: str) -> str | None:
    """Resolve a registered ContentUnit identity to one canonical card ID."""
    uid = (unit_id or "").strip().lower()
    if not uid or "." not in uid:
        return None
    if uid.startswith("department_explanation."):
        return "department_explanation"
    if uid.startswith("about_me.creator."):
        return "creator_profile"
    if uid == "about_me.guide" or uid.startswith("about_me.guide."):
        return "guide_profile"
    if uid in {"about_me.overview", "clara.overview"}:
        return "clara_intro"
    if uid.startswith("about_me.capability.") or uid.startswith("clara.capabilities."):
        return "clara_capability"
    if uid == "fees.overview":
        return "fees"
    if uid in {"documents.overview", "admission.documents_required"}:
        return "admissions"
    if uid == "leadership.principal":
        return "principal_profile"
    if uid == "leadership.vice_principal":
        return "vice_principal_profile"
    if uid == "leadership.dean_academics":
        return "dean_academics"
    if uid == "leadership.dean_administration":
        return "dean_administration"
    if uid == "leadership.dean_student_affairs":
        return "dean_student_affairs"
    if uid == "leadership.associate_dean_rnd":
        return "associate_dean_rnd"
    if uid == "leadership.dean_innovation":
        return "dean_innovation"
    if uid == "leadership.trustees":
        return "trustees"
    if uid.startswith("hostel."):
        return "hostel"
    if uid.startswith("canteen."):
        return "canteen"
    if uid.startswith("ncc."):
        return "ncc"
    if uid.startswith("placement."):
        return "placement"
    if uid.startswith("events."):
        return "event"
    return card_id_for_topic(uid.split(".", 1)[1]) or None


def department_id_for_unit_id(unit_id: str) -> str | None:
    uid = (unit_id or "").strip().lower()
    if not uid or "." not in uid:
        return None
    if uid.startswith("department_explanation."):
        rest = uid.split(".", 1)[1] or None
        if not rest:
            return None
        if rest == "difference":
            return "difference"
        parts = rest.split(".")
        if len(parts) >= 2 and parts[-1] in {"what_is", "learn", "lead"}:
            return ".".join(parts[:-1]) or None
        return rest or None
    if uid.startswith("hostel."):
        parts = uid.split(".")
        # Shared: hostel.facilities|mess|safety → entity "hostel"
        if len(parts) == 2:
            return "hostel"
        # Gendered: hostel.boys.overview → hostel.boys
        return ".".join(parts[:2]) if len(parts) >= 2 else None
    if uid.startswith(("leadership.", "college.", "canteen.", "ncc.", "events.", "fees.", "documents.", "admission.", "placement.")):
        return None
    return uid.split(".", 1)[0]
