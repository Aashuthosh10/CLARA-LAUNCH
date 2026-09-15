"""Department explanation units — progressive parent-friendly stages.

Each department expands to three independently addressable stage units:

  department_explanation.{dept}.what_is
  department_explanation.{dept}.learn
  department_explanation.{dept}.lead

video_src maps only to files that actually exist under
frontend/public/assets/department_explanations/.
"""

from __future__ import annotations

from backend.services.answer_generation import DEPARTMENT_JSON_KEY_ORDER
from backend.services.content.types import SURFACE_DEPARTMENT_EXPLANATION

_VIDEO_DIR = "/assets/department_explanations"

# Only real on-disk filenames — do not invent missing assets.
_VIDEO_FILE_BY_DEPT: dict[str, str] = {
    "cse_ds": "datascience.mp4",
    "cse_cysec": "cyber_security.mp4",
    "ece": "ece.mp4",
    "cse_bs": "business_studies.mp4",
}

STAGE_WHAT_IS = "what_is"
STAGE_LEARN = "learn"
STAGE_LEAD = "lead"
EXPLANATION_STAGES: tuple[str, ...] = (STAGE_WHAT_IS, STAGE_LEARN, STAGE_LEAD)

_STAGE_HEADINGS: dict[str, str] = {
    STAGE_WHAT_IS: "What is it?",
    STAGE_LEARN: "What will a student learn?",
    STAGE_LEAD: "Where can it lead?",
}

_DEPT_DISPLAY_NAMES: dict[str, str] = {
    "cse": "Computer Science & Engineering",
    "ise": "Information Science & Engineering",
    "cse_aiml": "CSE (AI & ML)",
    "cse_ds": "CSE (Data Science)",
    "cse_cysec": "CSE (Cyber Security)",
    "cse_bs": "CSE (Business Systems)",
    "ece": "Electronics & Communication Engineering",
    "civil": "Civil Engineering",
    "mechanical": "Mechanical Engineering",
    "mba": "Master of Business Administration",
    "basic_sciences": "Basic Sciences",
}

# Parent-friendly progressive stages (English base).
_STAGES_EN: dict[str, dict[str, str]] = {
    "cse": {
        STAGE_WHAT_IS: (
            "Computer Science and Engineering is about understanding how computers, "
            "software and digital systems work, and learning how to build them to "
            "solve real-world problems."
        ),
        STAGE_LEARN: (
            "Students learn programming, problem solving, databases, software "
            "development, computer networks, operating systems and other foundations "
            "of computing. They learn how to turn an idea or problem into a working "
            "software solution."
        ),
        STAGE_LEAD: (
            "Depending on their interests and further specialization, graduates can "
            "move toward roles such as software developer, application engineer, "
            "backend or frontend developer, systems engineer, cloud engineer or "
            "technology consultant."
        ),
    },
    "ise": {
        STAGE_WHAT_IS: (
            "Information Science and Engineering focuses on using computing and "
            "information technology to build systems that help people and "
            "organizations manage information and solve problems."
        ),
        STAGE_LEARN: (
            "Students learn programming, databases, software engineering, "
            "information systems, data handling, web technologies and other "
            "computing fundamentals."
        ),
        STAGE_LEAD: (
            "Possible career directions include software developer, application "
            "engineer, information systems specialist, database-related roles, "
            "business technology roles, systems engineer and technology consultant."
        ),
    },
    "cse_ds": {
        STAGE_WHAT_IS: (
            "Data Science is about turning information into useful understanding. "
            "It teaches students how to collect, organize, study and interpret data "
            "so that meaningful patterns and insights can be found."
        ),
        STAGE_LEARN: (
            "Students learn programming, statistics, data analysis, databases, "
            "data visualization and machine-learning foundations. They learn how to "
            "work with real datasets and use evidence to understand problems and "
            "support decisions."
        ),
        STAGE_LEAD: (
            "Possible career directions include data analyst, data scientist, "
            "business intelligence analyst, data engineer and, with further "
            "specialization, machine-learning or analytics roles."
        ),
    },
    "cse_aiml": {
        STAGE_WHAT_IS: (
            "Artificial Intelligence and Machine Learning is about building "
            "computer systems that can learn patterns from data and use what they "
            "learn to make predictions, recognize things or support decisions."
        ),
        STAGE_LEARN: (
            "Students learn programming, mathematics, statistics, machine-learning "
            "methods, data handling and artificial-intelligence concepts. They learn "
            "how systems can recognize patterns, work with information and improve "
            "their results using data."
        ),
        STAGE_LEAD: (
            "Possible career directions include machine-learning engineer, AI "
            "engineer, data scientist, AI application developer, computer-vision "
            "engineer or related intelligent-systems roles."
        ),
    },
    "cse_cysec": {
        STAGE_WHAT_IS: (
            "Cyber Security is about protecting computers, software, networks and "
            "digital information from unauthorized access, misuse and cyber attacks."
        ),
        STAGE_LEARN: (
            "Students learn computer networks, operating systems, security "
            "principles, secure software practices, threat identification, "
            "cryptography foundations and ways to protect digital systems."
        ),
        STAGE_LEAD: (
            "Possible career directions include security analyst, security engineer, "
            "SOC analyst, ethical-security roles, incident response and other "
            "cyber-security positions."
        ),
    },
    "ece": {
        STAGE_WHAT_IS: (
            "Electronics and Communication Engineering is about understanding "
            "electronic devices, circuits and systems that allow information and "
            "signals to be processed, transmitted and communicated."
        ),
        STAGE_LEARN: (
            "Students learn electronics, circuits, digital systems, "
            "microcontrollers, communication systems, signal processing and "
            "embedded-system foundations."
        ),
        STAGE_LEAD: (
            "Possible career directions include electronics engineer, embedded "
            "systems engineer, hardware engineer, communication engineer, test "
            "engineer and roles in automation or connected devices."
        ),
    },
    "civil": {
        STAGE_WHAT_IS: (
            "Civil Engineering is about designing, constructing and maintaining the "
            "physical infrastructure people use every day."
        ),
        STAGE_LEARN: (
            "Students learn structural concepts, construction methods, materials, "
            "surveying, transportation, water systems, environmental engineering "
            "and how buildings and infrastructure are planned."
        ),
        STAGE_LEAD: (
            "Possible career directions include structural engineer, site engineer, "
            "construction engineer, transportation engineer, project engineer, "
            "environmental engineer and infrastructure-related roles."
        ),
    },
    "mechanical": {
        STAGE_WHAT_IS: (
            "Mechanical Engineering is about understanding how machines and "
            "mechanical systems work and learning how to design, build and improve "
            "them."
        ),
        STAGE_LEARN: (
            "Students learn mechanics, machine design, manufacturing, materials, "
            "thermodynamics, fluid systems and engineering methods used to design "
            "and operate machines."
        ),
        STAGE_LEAD: (
            "Possible career directions include mechanical design engineer, "
            "manufacturing engineer, production engineer, automotive engineer, "
            "maintenance engineer, thermal engineer and roles in automation and "
            "industrial systems."
        ),
    },
    "mba": {
        STAGE_WHAT_IS: (
            "An MBA focuses on understanding how organizations and businesses are "
            "managed and how decisions are made."
        ),
        STAGE_LEARN: (
            "Students study areas such as finance, marketing, human resources, "
            "operations, strategy, business communication and organizational "
            "decision-making."
        ),
        STAGE_LEAD: (
            "Possible career directions include business analyst, marketing roles, "
            "operations roles, HR roles, management positions, consulting and "
            "entrepreneurship."
        ),
    },
    "basic_sciences": {
        STAGE_WHAT_IS: (
            "Basic Sciences provides the scientific foundation needed to understand "
            "engineering and technology."
        ),
        STAGE_LEARN: (
            "Students build foundations in subjects such as mathematics, physics, "
            "chemistry and other scientific concepts that support later engineering "
            "study."
        ),
        STAGE_LEAD: (
            "Basic Sciences is primarily a foundation rather than a single "
            "professional engineering specialization. The knowledge gained supports "
            "students as they progress into engineering disciplines and further "
            "specialized study."
        ),
    },
    # Official locale title: CSE (Business Systems) / CS(Business System).
    "cse_bs": {
        STAGE_WHAT_IS: (
            "CSE Business Systems connects computing with how businesses and "
            "organizations work. It focuses on using technology to support "
            "business processes and decisions."
        ),
        STAGE_LEARN: (
            "Students learn computing fundamentals together with business-oriented "
            "technology skills such as information systems, software applications "
            "and how organizations use data and digital tools."
        ),
        STAGE_LEAD: (
            "Possible career directions include business technology roles, "
            "application or systems-related positions, business analyst paths and "
            "other roles that bridge software and organizational needs."
        ),
    },
}

_DIFFERENCE_DS_AIML = (
    "Both fields work with data and computing, but their main goals are different.\n\n"
    "Data Science focuses more on understanding data, finding patterns and using "
    "information to answer questions and support decisions.\n\n"
    "Artificial Intelligence and Machine Learning focuses more on building systems "
    "that learn from data and use those learned patterns to make predictions, "
    "recognize things or perform intelligent tasks.\n\n"
    "Simply put:\n"
    "Data Science is more about understanding and using data.\n"
    "AI and Machine Learning is more about building systems that learn from data."
)

_EXPLANATION_CANONICAL_SOURCE = "department_explanation_units.py — progressive parent-friendly stages"


class DepartmentExplanationDescriptor:
    """Descriptor for one progressive explanation stage unit."""

    __slots__ = (
        "unit_id",
        "surface",
        "content_type",
        "entity_type",
        "entity_id",
        "context",
        "context_id",
        "section_id",
        "unit_suffix",
        "canonical_source",
        "adapter_key",
        "supported_languages",
        "presentation_role",
        "dept_key",
        "display_name",
        "video_src",
        "stage",
        "stage_heading",
        "explanation",
    )

    def __init__(self, dept_key: str, stage: str) -> None:
        self.dept_key = dept_key
        self.stage = stage
        self.unit_id = f"department_explanation.{dept_key}.{stage}"
        self.surface = SURFACE_DEPARTMENT_EXPLANATION
        self.content_type = "department"
        self.entity_type = "department"
        self.entity_id = dept_key
        self.context = "department"
        self.context_id = dept_key
        self.section_id = stage
        self.unit_suffix = stage
        self.canonical_source = _EXPLANATION_CANONICAL_SOURCE
        self.adapter_key = "department_explanation"
        self.supported_languages: tuple[str, ...] = ("en", "hi", "kn", "ta", "te", "ml")
        self.presentation_role = "explanation"
        self.display_name = _DEPT_DISPLAY_NAMES.get(dept_key, dept_key.upper())
        video_file = _VIDEO_FILE_BY_DEPT.get(dept_key)
        self.video_src = f"{_VIDEO_DIR}/{video_file}" if video_file else ""
        self.stage_heading = _STAGE_HEADINGS.get(stage, stage)
        self.explanation = (_STAGES_EN.get(dept_key) or {}).get(stage, "")


# Build stage descriptors + legacy alias department_explanation.{dept} → what_is body.
_EXPLANATION_DESCRIPTORS: dict[str, DepartmentExplanationDescriptor] = {}
for _dept in DEPARTMENT_JSON_KEY_ORDER:
    for _stage in EXPLANATION_STAGES:
        desc = DepartmentExplanationDescriptor(_dept, _stage)
        _EXPLANATION_DESCRIPTORS[desc.unit_id] = desc
    legacy = DepartmentExplanationDescriptor(_dept, STAGE_WHAT_IS)
    legacy.unit_id = f"department_explanation.{_dept}"
    _EXPLANATION_DESCRIPTORS[legacy.unit_id] = legacy

# Difference unit (no video) — body filled at narration time for the pair; default DS/AIML text.
_DIFF_DESC = DepartmentExplanationDescriptor("cse_ds", STAGE_WHAT_IS)
_DIFF_DESC.unit_id = "department_explanation.difference"
_DIFF_DESC.dept_key = "difference"
_DIFF_DESC.entity_id = "difference"
_DIFF_DESC.context_id = "difference"
_DIFF_DESC.section_id = "difference"
_DIFF_DESC.unit_suffix = "difference"
_DIFF_DESC.display_name = "Key difference"
_DIFF_DESC.stage = "difference"
_DIFF_DESC.stage_heading = "Key difference"
_DIFF_DESC.video_src = ""
_DIFF_DESC.explanation = _DIFFERENCE_DS_AIML
_EXPLANATION_DESCRIPTORS["department_explanation.difference"] = _DIFF_DESC


def get_explanation_descriptor(dept_or_unit: str) -> DepartmentExplanationDescriptor | None:
    key = (dept_or_unit or "").strip().lower()
    if not key:
        return None
    if key in _EXPLANATION_DESCRIPTORS:
        return _EXPLANATION_DESCRIPTORS[key]
    if key.startswith("department_explanation."):
        return _EXPLANATION_DESCRIPTORS.get(key)
    # Plain dept key → first stage descriptor (legacy).
    return _EXPLANATION_DESCRIPTORS.get(f"department_explanation.{key}.{STAGE_WHAT_IS}") or (
        _EXPLANATION_DESCRIPTORS.get(f"department_explanation.{key}")
    )


def all_explanation_descriptors() -> tuple[DepartmentExplanationDescriptor, ...]:
    # Prefer stage units + difference; include legacy bare ids once.
    seen: set[str] = set()
    out: list[DepartmentExplanationDescriptor] = []
    for uid, desc in _EXPLANATION_DESCRIPTORS.items():
        if uid in seen:
            continue
        seen.add(uid)
        out.append(desc)
    return tuple(out)


def explanation_stage_unit_ids(dept_key: str) -> tuple[str, ...]:
    key = (dept_key or "").strip().lower()
    return tuple(f"department_explanation.{key}.{stage}" for stage in EXPLANATION_STAGES)


def explanation_unit_id(dept_key: str) -> str:
    """Legacy single-id helper — points at stage 1."""
    return f"department_explanation.{(dept_key or '').strip().lower()}.{STAGE_WHAT_IS}"


def explanation_body(dept_key: str, stage: str = STAGE_WHAT_IS, language_code: str = "en") -> str:
    key = (dept_key or "").strip().lower()
    code = (language_code or "en").strip().lower() or "en"
    from backend.services.content.department_explanation_i18n import explanation_body_localized

    localized = explanation_body_localized(key, stage, code)
    if localized:
        return localized
    return (_STAGES_EN.get(key) or {}).get(stage, "")


def explanation_display_name(dept_key: str) -> str:
    key = (dept_key or "").strip().lower()
    return _DEPT_DISPLAY_NAMES.get(key, key.replace("_", " ").upper())


def stage_heading(stage: str, language_code: str = "en") -> str:
    code = (language_code or "en").strip().lower() or "en"
    from backend.services.content.department_explanation_i18n import stage_heading_localized

    localized = stage_heading_localized(stage, code)
    if localized:
        return localized
    return _STAGE_HEADINGS.get(stage, stage)


def video_src_for_dept(dept_key: str) -> str:
    desc = get_explanation_descriptor(f"department_explanation.{(dept_key or '').strip().lower()}.{STAGE_WHAT_IS}")
    return desc.video_src if desc else ""


def parse_explanation_unit_id(unit_id: str) -> tuple[str, str] | None:
    """Return (dept_key, stage) or None."""
    uid = (unit_id or "").strip().lower()
    if uid == "department_explanation.difference":
        return ("difference", "difference")
    if not uid.startswith("department_explanation."):
        return None
    rest = uid[len("department_explanation.") :]
    if not rest:
        return None
    parts = rest.split(".")
    if len(parts) == 1:
        return (parts[0], STAGE_WHAT_IS)
    if len(parts) >= 2 and parts[-1] in EXPLANATION_STAGES:
        return (".".join(parts[:-1]), parts[-1])
    return (rest, STAGE_WHAT_IS)


def build_parent_friendly_difference(dept_a: str, dept_b: str, language_code: str = "en") -> str:
    a = (dept_a or "").strip().lower()
    b = (dept_b or "").strip().lower()
    pair = frozenset({a, b})
    if pair == frozenset({"cse_ds", "cse_aiml"}):
        from backend.services.content.department_explanation_i18n import difference_localized

        localized = difference_localized(language_code)
        return localized or _DIFFERENCE_DS_AIML
    name_a = explanation_display_name(a)
    name_b = explanation_display_name(b)
    return (
        f"Both {name_a} and {name_b} are related fields of study, but each has a different "
        f"main focus. {name_a} emphasizes one set of skills and applications, while {name_b} "
        f"emphasizes another. The earlier explanations describe what each department teaches.\n\n"
        f"Simply put: compare what students learn in each field, then choose based on the "
        f"kind of work your child finds most interesting."
    )


def placeholder_title(language_code: str) -> str:
    _ = language_code
    return "[Official explanation pending]"
