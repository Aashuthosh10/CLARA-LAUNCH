"""Restricted / unsupported receptionist actions — clear intent, cannot fulfill here."""

from __future__ import annotations

from backend.services.content.semantic_topics import cue_in_hay
from backend.services.content.unicode_text import casefold_keep_scripts

# Latin cues use word-safe matching via cue_in_hay; Indic cues use substring
# matching (matras/virama break Python ``\b``).
_CONTACT_CUES: tuple[str, ...] = (
    "mobile",
    "phone",
    "cellphone",
    "cell phone",
    "whatsapp",
    "personal number",
    "contact number",
    "phone number",
    "mobile number",
    "call him",
    "call her",
    "call them",
    "ಮೊಬೈಲ್",
    "ಫೋನ್",
    "ನಂಬರ್",
    "मोबाइल",
    "फोन",
    "नंबर",
    "மொபைல்",
    "எண்",
    "మొబైల్",
    "నంబర్",
    "ఫోన్",
    "മൊബൈൽ",
    "നമ്പർ",
)

_ROLE_CUES: tuple[str, ...] = (
    "principal",
    "vice principal",
    "vice-principal",
    "hod",
    "head of department",
    "head of the department",
    "trustee",
    "faculty",
    "professor",
    "teacher",
    "lecturer",
    "dean",
    "ಪ್ರಿನ್ಸಿಪಾಲ್",
    "ಪ್ರಾಂಶುಪಾಲ",
    "प्रिंसिपल",
    "प्राचार्य",
    "முதல்வர்",
    "ప్రిన్సిపాల్",
    "ప్రాంశుపాల",
    "ప్రిన్సిపాల",
    "പ്രിൻസിപ്പൽ",
    "പ്രിൻസിപ്പലി",
    "പ്രിൻസിപ്പലിന്റെ",
)

_PAYMENT_CUES: tuple[str, ...] = (
    "scanner",
    "qr code",
    "upi",
    "paytm",
    "gpay",
    "google pay",
    "phonepe",
    "make the payment",
    "make payment",
    "payment",
    "pay fees",
    "pay fee",
    "pay now",
    "ಸ್ಕ್ಯಾನರ್",
    "ಪಾವತಿ",
    "भुगतान",
    "स्कैनर",
    "पेमेंट",
    "பேமெண்ட்",
    "ஸ்கேனர்",
    "పేమెంట్",
    "స్కానర్",
    "పేమెంట్",
    "പേയ്മെന്റ്",
    "സ്കാനർ",
    "പേയ്‌മെന്റ്",
)

_FEE_INFO_CUES: tuple[str, ...] = (
    "how much",
    "what is",
    "what's",
    "fee details",
    "fee structure",
    "ಎಷ್ಟು",
    "कितनी",
    "कितना",
    "என்ன",
    "ఎంత",
    "എത്ര",
)

_PAYMENT_ACTION_CUES: tuple[str, ...] = (
    "scanner",
    "qr",
    "upi",
    "paytm",
    "gpay",
    "phonepe",
    "make the payment",
    "ಸ್ಕ್ಯಾನರ್",
    "स्कैनर",
    "ஸ்கேனர்",
    "స్కానర్",
    "സ്കാനർ",
)

EVIDENCE_RESTRICTED_CONTACT = "restricted_personal_contact"
EVIDENCE_RESTRICTED_PAYMENT = "restricted_payment"

_RESTRICTED_EVIDENCE = frozenset(
    {EVIDENCE_RESTRICTED_CONTACT, EVIDENCE_RESTRICTED_PAYMENT}
)


def _hay(text: str) -> str:
    return casefold_keep_scripts(text or "")


def _has_cue(hay: str, cues: tuple[str, ...]) -> bool:
    return any(cue_in_hay(hay, cue) for cue in cues)


def is_restricted_personal_contact(text: str) -> bool:
    hay = _hay(text)
    return _has_cue(hay, _CONTACT_CUES) and _has_cue(hay, _ROLE_CUES)


def is_restricted_payment_action(text: str) -> bool:
    hay = _hay(text)
    if not _has_cue(hay, _PAYMENT_CUES):
        return False
    # Fee *information* stays answerable; payment *action* / scanner is restricted.
    if _has_cue(hay, _FEE_INFO_CUES) and not _has_cue(hay, _PAYMENT_ACTION_CUES):
        return False
    return True


def restricted_evidence(text: str) -> str | None:
    if is_restricted_personal_contact(text):
        return EVIDENCE_RESTRICTED_CONTACT
    if is_restricted_payment_action(text):
        return EVIDENCE_RESTRICTED_PAYMENT
    return None


def is_restricted_evidence(evidence: str | None) -> bool:
    return (evidence or "") in _RESTRICTED_EVIDENCE
