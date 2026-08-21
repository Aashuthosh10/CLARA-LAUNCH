"""Canonical Kannada terminology for CLARA user-visible copy.

Reviewed terms — not machine translations of English labels.
Official names, department codes, and CLARA stay in their original form.
"""

from __future__ import annotations

CANONICAL_KN: dict[str, str] = {
    "hod": "ಮುಖ್ಯಸ್ಥರು",
    "principal": "ಪ್ರಾಂಶುಪಾಲರು",
    "vice_principal": "ಉಪ ಪ್ರಾಂಶುಪಾಲರು",
    "dean": "ಡೀನ್",
    "department": "ವಿಭಾಗ",
    "fees": "ಶುಲ್ಕ",
    "placements": "ಪ್ಲೇಸ್‌ಮೆಂಟ್",
    "achievements": "ಸಾಧನೆಗಳು",
    "hostel": "ಹಾಸ್ಟೆಲ್",
    "canteen": "ಕ್ಯಾಂಟೀನ್",
    "timings": "ಸಮಯ",
    "safety": "ಸುರಕ್ಷತೆ",
    "rooms": "ಕೊಠಡಿಗಳು",
    "food": "ಆಹಾರ",
    "hygiene": "ಸ್ವಚ್ಛತೆ",
    "events": "ಕಾರ್ಯಕ್ರಮಗಳು",
    "admissions": "ಪ್ರವೇಶ",
    "documents": "ದಾಖಲೆಗಳು",
    "trustees": "ಟ್ರಸ್ಟಿಗಳು",
}

# Awkward duplicates that must not appear as the primary wording for the same concept.
FORBIDDEN_KN_ALIASES: dict[str, tuple[str, ...]] = {
    "hod": ("ವಿಭಾಗ ಮುಖ್ಯಸ್ಥ ಹೆಸರು", "HOD ಹೆಸರು:"),
    "principal": ("ಪ್ರಿನ್ಸಿಪಾಲ್ ಯಾರು ಆಗಿದ್ದಾರೆ",),
}
