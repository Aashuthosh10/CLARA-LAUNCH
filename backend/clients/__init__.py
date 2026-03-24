"""External provider and data clients for CLARA."""

from .provider_clients import (
    close_clients,
    get_groq_client,
    get_http_client,
    sarvam_stt_from_wav,
    sarvam_tts_to_base64,
    warmup_clients,
)
