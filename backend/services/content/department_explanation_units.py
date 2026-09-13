"""Department explanation units — one per department key.

These units power the DepartmentExplanationCard / DepartmentExplanationStage.
All titles and summaries are placeholder skeletons clearly marked
SAMPLE_REPLACE_WITH_OFFICIAL.  No curriculum facts are invented here.

video_src metadata lives in ContentUnit.metadata["video_src"] per the
ContentUnit contract (no required video fields on the schema itself).
"""

from __future__ import annotations

from backend.services.answer_generation import DEPARTMENT_JSON_KEY_ORDER
from backend.services.content.types import SURFACE_DEPARTMENT_EXPLANATION

# Stable path prefix — actual MP4 files are not committed (only .gitkeep).
_VIDEO_DIR = "/assets/department_explanations"

# Language-keyed placeholder titles (brief, neutral, no invented curriculum).
# Localized content should replace these before production deployment.
_PLACEHOLDER_TITLE: dict[str, str] = {
    "en": "[Official explanation pending]",
    "kn": "[ಅಧಿಕೃತ ವಿವರಣೆ ಬಾಕಿ ಇದೆ]",
    "hi": "[आधिकारिक विवरण प्रतीक्षित]",
    "ta": "[அதிகாரப்பூர்வ விளக்கம் நிலுவையில்]",
    "te": "[అధికారిక వివరణ పెండింగ్]",
    "ml": "[ഔദ്യോഗിക വിശദീകരണം നിൽക്കുന്നു]",
}

# Human-readable department display names (canonical English only for now).
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

# ---- Module-level descriptor catalogue -----------------------------------------

_EXPLANATION_CANONICAL_SOURCE = "SAMPLE_REPLACE_WITH_OFFICIAL — department_explanation_units.py"


class DepartmentExplanationDescriptor:
    """Minimal descriptor parallel to ContentUnitDescriptor for explanation units."""

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
    )

    def __init__(self, dept_key: str) -> None:
        self.dept_key = dept_key
        self.unit_id = f"department_explanation.{dept_key}"
        self.surface = SURFACE_DEPARTMENT_EXPLANATION
        self.content_type = "department"
        self.entity_type = "department"
        self.entity_id = dept_key
        self.context = "department"
        self.context_id = dept_key
        self.section_id = "explanation"
        self.unit_suffix = "explanation"
        self.canonical_source = _EXPLANATION_CANONICAL_SOURCE
        self.adapter_key = "department_explanation"
        self.supported_languages: tuple[str, ...] = ("en", "hi", "kn", "ta", "te", "ml")
        self.presentation_role = "explanation"
        self.display_name = _DEPT_DISPLAY_NAMES.get(dept_key, dept_key.upper())
        self.video_src = f"{_VIDEO_DIR}/{dept_key}.mp4"


# Build the complete map once at import time.
_EXPLANATION_DESCRIPTORS: dict[str, DepartmentExplanationDescriptor] = {
    dept_key: DepartmentExplanationDescriptor(dept_key)
    for dept_key in DEPARTMENT_JSON_KEY_ORDER
}


def get_explanation_descriptor(dept_key: str) -> DepartmentExplanationDescriptor | None:
    return _EXPLANATION_DESCRIPTORS.get((dept_key or "").strip().lower())


def all_explanation_descriptors() -> tuple[DepartmentExplanationDescriptor, ...]:
    return tuple(_EXPLANATION_DESCRIPTORS.values())


def explanation_unit_id(dept_key: str) -> str:
    return f"department_explanation.{(dept_key or '').strip().lower()}"


def placeholder_title(language_code: str) -> str:
    return _PLACEHOLDER_TITLE.get(language_code, _PLACEHOLDER_TITLE["en"])
