"""Rule-first entity extraction for conversation intelligence."""

from __future__ import annotations

import logging
import re
from typing import Any

from backend.services.answer_generation import detect_department_name
from backend.services.conversation.types import ExtractedEntities
from backend.services.greetings import normalize_guest_name

logger = logging.getLogger(__name__)

_NAME_INTRO_RE = re.compile(
    r"^\s*(?:my\s+name\s+is|i\s+am|i'm|this\s+is|myself)\s+(.+?)\s*$",
    re.I,
)
_FROM_LOCATION_RE = re.compile(
    r"\b(?:i\s+am\s+from|i'm\s+from|from)\s+([A-Za-z][A-Za-z\s.'-]{1,40})\b",
    re.I,
)
_YEAR_RE = re.compile(
    r"\b((?:first|second|third|fourth|1st|2nd|3rd|4th)\s*year|year\s*[1-4]|[1-4]\s*st\s*year)\b",
    re.I,
)
_COURSE_RE = re.compile(
    r"\b(b\.?\s*e\.?|b\.?\s*tech|m\.?\s*tech|mba|mca|diploma|bca)\b",
    re.I,
)
_BUS_ROUTE_RE = re.compile(r"\b(?:bus|route)\s*(?:no\.?|number|#)?\s*(\d{1,3})\b", re.I)
_PHONE_RE = re.compile(r"(?:\+?91[-\s]?)?[6-9]\d{9}\b")
_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")


def extract_entities_rules(text: str | None) -> ExtractedEntities:
    raw = str(text or "").strip()
    entities = ExtractedEntities()
    if not raw:
        return entities

    name_m = _NAME_INTRO_RE.match(raw)
    if name_m:
        name = normalize_guest_name(name_m.group(1))
        if name:
            entities.person_name = name
            entities.name_introduction = True

    loc_m = _FROM_LOCATION_RE.search(raw)
    if loc_m:
        loc = " ".join(loc_m.group(1).strip().split()).rstrip(".,!?")
        if loc and len(loc) >= 2:
            entities.location = loc

    year_m = _YEAR_RE.search(raw)
    if year_m:
        entities.year = " ".join(year_m.group(1).strip().split())

    course_m = _COURSE_RE.search(raw)
    if course_m:
        entities.course = course_m.group(1).strip()

    bus_m = _BUS_ROUTE_RE.search(raw)
    if bus_m:
        entities.bus_route = bus_m.group(1)

    phone_m = _PHONE_RE.search(raw)
    if phone_m:
        entities.phone = re.sub(r"\s+", "", phone_m.group(0))

    email_m = _EMAIL_RE.search(raw)
    if email_m:
        entities.email = email_m.group(0)

    dept = detect_department_name(raw)
    if dept:
        entities.department = dept

    return entities


def entities_need_llm(entities: ExtractedEntities, text: str | None) -> bool:
    """True when rules found nothing useful but text looks like it may hold entities."""
    if entities.person_name or entities.department or entities.location:
        return False
    s = (text or "").strip()
    if len(s.split()) < 4:
        return False
    # Ambiguous name-like phrases without clear "my name is"
    lowered = s.lower()
    if "name" in lowered or "call me" in lowered:
        return True
    return False


async def extract_entities_llm_optional(
    text: str,
    *,
    groq_client: Any | None = None,
    model: str | None = None,
) -> ExtractedEntities | None:
    """
    Optional Groq JSON extraction when rules are ambiguous.
    Returns None on skip/failure so callers keep rule results.
    """
    if groq_client is None or not model:
        return None
    try:
        import json

        completion = await groq_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Extract entities from the user utterance as JSON only with keys: "
                        "person_name, department, course, year, bus_route, location, phone, email. "
                        "Use null when unknown. person_name must be the bare name only."
                    ),
                },
                {"role": "user", "content": text},
            ],
            temperature=0.0,
            max_tokens=200,
        )
        raw_out = (completion.choices[0].message.content or "").strip()
        if raw_out.startswith("```"):
            raw_out = re.sub(r"^```(?:json)?\s*", "", raw_out)
            raw_out = re.sub(r"\s*```$", "", raw_out)
        data = json.loads(raw_out)
        if not isinstance(data, dict):
            return None
        name = normalize_guest_name(data.get("person_name"))
        return ExtractedEntities(
            person_name=name,
            department=(str(data["department"]).strip() if data.get("department") else None),
            course=(str(data["course"]).strip() if data.get("course") else None),
            year=(str(data["year"]).strip() if data.get("year") else None),
            bus_route=(str(data["bus_route"]).strip() if data.get("bus_route") else None),
            location=(str(data["location"]).strip() if data.get("location") else None),
            phone=(str(data["phone"]).strip() if data.get("phone") else None),
            email=(str(data["email"]).strip() if data.get("email") else None),
            name_introduction=bool(name) and "name" in text.lower(),
        )
    except Exception as exc:
        logger.debug("entity LLM extraction skipped: %s", exc)
        return None


def merge_entities(base: ExtractedEntities, overlay: ExtractedEntities | None) -> ExtractedEntities:
    if overlay is None:
        return base
    return ExtractedEntities(
        person_name=overlay.person_name or base.person_name,
        department=overlay.department or base.department,
        course=overlay.course or base.course,
        year=overlay.year or base.year,
        bus_route=overlay.bus_route or base.bus_route,
        location=overlay.location or base.location,
        phone=overlay.phone or base.phone,
        email=overlay.email or base.email,
        name_introduction=overlay.name_introduction or base.name_introduction,
    )
