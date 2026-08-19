"""Canonical Content Resolution Layer (Milestone 4.0–4.2)."""

from __future__ import annotations

from backend.services.content.cache import clear_cache, set_cache_enabled
from backend.services.content.department_resolver import (
    DepartmentResolution,
    resolve_department_key,
)
from backend.services.content.registry import all_owners, get_owner, registered_surfaces
from backend.services.content.resolver import ContentResolver, resolve, resolve_surface
from backend.services.content.content_selection import ContentSelection, ContentUnitCandidate
from backend.services.content.content_unit import ContentUnit
from backend.services.content.content_unit_registry import (
    ContentUnitDescriptor,
    all_unit_descriptors,
    get_unit_descriptor,
    list_context_scoped_descriptors,
    list_department_unit_descriptors,
    unit_id_for,
)
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.surface_narration_mapper import (
    department_unlisted_segments,
    extract_department_units,
    map_canonical_content_to_segments,
    map_content_units_to_segments,
)
from backend.services.content.surface_registry import (
    SurfaceDescriptor,
    all_surfaces,
    get_surface,
    registered_surface_ids,
)
from backend.services.content.surface_selector import (
    SurfaceSelection,
    normalize_requested_card,
    select_surface,
)
from backend.services.content.types import (
    ALL_SURFACES,
    CanonicalContent,
    ContentSection,
    ContentType,
    ResolveRequest,
    ValidationResult,
)
from backend.services.content.validators import (
    compute_content_hash,
    compute_unit_hash,
    validate_canonical_content,
    validate_content_unit,
)

__all__ = [
    "ALL_SURFACES",
    "CanonicalContent",
    "ContentResolver",
    "ContentSection",
    "ContentSelection",
    "ContentType",
    "ContentUnit",
    "ContentUnitCandidate",
    "ContentUnitDescriptor",
    "DepartmentResolution",
    "ResolveRequest",
    "SurfaceDescriptor",
    "SurfaceSelection",
    "ValidationResult",
    "all_owners",
    "all_surfaces",
    "all_unit_descriptors",
    "clear_cache",
    "compute_content_hash",
    "compute_unit_hash",
    "department_unlisted_segments",
    "extract_department_units",
    "get_owner",
    "get_surface",
    "get_unit_descriptor",
    "list_context_scoped_descriptors",
    "list_department_unit_descriptors",
    "map_canonical_content_to_segments",
    "map_content_units_to_segments",
    "normalize_requested_card",
    "registered_surface_ids",
    "registered_surfaces",
    "resolve",
    "resolve_department_key",
    "resolve_surface",
    "resolve_unit",
    "select_surface",
    "set_cache_enabled",
    "unit_id_for",
    "validate_canonical_content",
    "validate_content_unit",
]
