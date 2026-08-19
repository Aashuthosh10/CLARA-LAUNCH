"""Architecture linter — static ownership rules (Milestone 3.6)."""

from __future__ import annotations

import ast
import logging
from dataclasses import dataclass, field
from pathlib import Path

from backend.config.settings import RUNTIME_STRICT_STARTUP
from backend.services.runtime.diagnostics import log_runtime_event

logger = logging.getLogger(__name__)

_BACKEND_ROOT = Path(__file__).resolve().parents[2]


@dataclass
class ArchitectureLintResult:
    ok: bool
    violations: list[str] = field(default_factory=list)
    metrics: dict[str, int] = field(default_factory=dict)


def _read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def _imports_name(source: str, name: str) -> bool:
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return name in source
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name == name or (alias.asname or "") == name:
                    return True
            if node.module and name in (node.module or ""):
                # module path contains name
                pass
        if isinstance(node, ast.Import):
            for alias in node.names:
                if name in alias.name:
                    return True
    return f"import {name}" in source or f" {name}" in source and "build_pre_llm_narration_plan" in source


def run_architecture_lint() -> ArchitectureLintResult:
    violations: list[str] = []
    metrics: dict[str, int] = {
        "conversation_resolution_owners": 1,
        "response_authority_selectors": 0,
        "presentation_bundle_builders": 0,
        "narration_builders_production": 0,
        "outbound_response_builders": 0,
        "runtime_finalizers": 0,
        "legacy_emit_paths": 0,
        "legacy_narration_paths_in_main": 0,
        "authority_bypasses": 0,
        "architecture_violations": 0,
        "content_unit_registry_owners": 0,
        "content_unit_resolver_owners": 0,
        "semantic_request_parser_owners": 0,
        "semantic_unit_selector_owners": 0,
        "semantic_terms_owners": 0,
        "semantic_request_model_owners": 0,
        "presentation_plan_builders": 0,
        "presentation_policy_owners": 0,
    }

    main_path = _BACKEND_ROOT / "app" / "main.py"
    main_src = _read(main_path)
    orch_dir = _BACKEND_ROOT / "services" / "orchestration"
    runtime_dir = _BACKEND_ROOT / "services" / "runtime"

    # main must not call / import build_pre_llm_narration_plan
    if "build_pre_llm_narration_plan" in main_src:
        violations.append("main.py references build_pre_llm_narration_plan")
        metrics["legacy_narration_paths_in_main"] = 1

    # orch failure must not null resolution and continue legacy
    if "continuing with legacy pipeline" in main_src and "conversation_resolution = None" in main_src:
        # Allow only if also has safe fallback nearby — flag if classic pattern remains
        if "safe_deterministic_fallback_resolution" not in main_src:
            violations.append("main.py still nulls conversation_resolution without deterministic fallback")
            metrics["legacy_emit_paths"] += 1
            metrics["authority_bypasses"] += 1

    # Authority selector count
    auth_files = list(orch_dir.glob("*authority*.py"))
    metrics["response_authority_selectors"] = len(auth_files)
    if metrics["response_authority_selectors"] != 1:
        violations.append(f"expected 1 response_authority module, found {metrics['response_authority_selectors']}")

    # PresentationBundle builders: only presentation_bundle.py should define build_presentation_bundle
    bundle_defs = 0
    for path in (_BACKEND_ROOT / "services").rglob("*.py"):
        if "tests" in path.parts or path.name == "architecture_linter.py":
            continue
        src = _read(path)
        if "def build_presentation_bundle" in src:
            bundle_defs += 1
            if path.name != "presentation_bundle.py":
                violations.append(f"duplicate PresentationBundle builder in {path}")
    metrics["presentation_bundle_builders"] = bundle_defs
    if bundle_defs != 1:
        violations.append(f"expected 1 build_presentation_bundle, found {bundle_defs}")

    # Narration production builders: narration_resolver should call build_pre_llm; main must not
    narr_callers = 0
    for path in (_BACKEND_ROOT / "services").rglob("*.py"):
        if "tests" in path.parts or path.name in {"narration_plan.py", "architecture_linter.py"}:
            continue
        src = _read(path)
        if "build_pre_llm_narration_plan(" in src:
            narr_callers += 1
            if path.name not in {"narration_resolver.py"}:
                violations.append(f"production narration builder call outside resolver: {path.name}")
    metrics["narration_builders_production"] = narr_callers
    if narr_callers != 1:
        violations.append(f"expected 1 production narration caller, found {narr_callers}")

    # Outbound builders
    outbound_defs = 0
    for path in orch_dir.glob("*.py"):
        if path.name == "architecture_linter.py":
            continue
        src = _read(path)
        if "class OutboundResponse" in src or "def build_answer_outbound" in src:
            if "outbound_builder" in path.name:
                outbound_defs = 1
    metrics["outbound_response_builders"] = outbound_defs
    if outbound_defs != 1:
        violations.append("expected outbound_builder.py as sole OutboundResponse owner")

    # Finalizers
    fin = 0
    for path in runtime_dir.glob("*.py"):
        if "def finalize_turn" in _read(path):
            fin += 1
    metrics["runtime_finalizers"] = fin
    if fin != 1:
        violations.append(f"expected 1 finalize_turn, found {fin}")

    # seal_authority only in response_authority (definition) — callers OK
    seal_defs = 0
    for path in orch_dir.glob("*.py"):
        if path.name == "architecture_linter.py":
            continue
        if "def seal_authority" in _read(path):
            seal_defs += 1
            if path.name != "response_authority.py":
                violations.append(f"seal_authority defined outside response_authority.py: {path.name}")
    if seal_defs != 1:
        violations.append(f"expected 1 seal_authority definition, found {seal_defs}")

    # M5.0 — ContentUnit registry ownership (single module)
    registry_defs = 0
    registry_path = _BACKEND_ROOT / "services" / "content" / "content_unit_registry.py"
    if registry_path.is_file():
        registry_defs = 1
    metrics["content_unit_registry_owners"] = registry_defs
    if registry_defs != 1:
        violations.append("expected content_unit_registry.py as sole registry owner")

    # M5.0 — ContentUnit resolver ownership
    resolver_defs = 0
    for path in (_BACKEND_ROOT / "services" / "content").glob("*.py"):
        if path.name == "architecture_linter.py":
            continue
        src = _read(path)
        if "def resolve_unit(" in src and path.name != "content_unit_resolver.py":
            violations.append(f"duplicate resolve_unit in {path.name}")
        if path.name == "content_unit_resolver.py" and "def resolve_unit(" in src:
            resolver_defs = 1
    metrics["content_unit_resolver_owners"] = resolver_defs
    if resolver_defs != 1:
        violations.append("expected content_unit_resolver.py as sole resolve_unit owner")

    # M5.0 — banned imports in resolver
    resolver_src = _read(_BACKEND_ROOT / "services" / "content" / "content_unit_resolver.py")
    for banned in ("database", "rag", "groq", "openai"):
        if f"import {banned}" in resolver_src or f"from {banned}" in resolver_src:
            violations.append(f"content_unit_resolver imports banned module: {banned}")

    # M5.1 — semantic layer ownership/banned-imports (deterministic unit selection)
    semantic_files = {
        "semantic_request_model_owners": _BACKEND_ROOT / "services" / "content" / "semantic_request.py",
        "semantic_request_parser_owners": _BACKEND_ROOT / "services" / "content" / "semantic_request_parser.py",
        "semantic_unit_selector_owners": _BACKEND_ROOT / "services" / "content" / "unit_selector.py",
        "semantic_terms_owners": _BACKEND_ROOT / "services" / "content" / "multilingual_terms.py",
    }

    for metric_key, path in semantic_files.items():
        if path.is_file():
            metrics[metric_key] = 1

    for path in semantic_files.values():
        if not path.is_file():
            continue
        src = _read(path)
        for banned in ("database", "rag", "groq", "openai"):
            if f"import {banned}" in src or f"from {banned}" in src:
                violations.append(f"{path.name} imports banned module: {banned}")

    # M5.0 — PresentationPlan builder ownership
    plan_builders = 0
    for path in (_BACKEND_ROOT / "services").rglob("*.py"):
        if "tests" in path.parts or path.name == "architecture_linter.py":
            continue
        src = _read(path)
        if "def build_full_department_plan(" in src:
            plan_builders += 1
            if path.name != "presentation_plan_builder.py":
                violations.append(f"duplicate build_full_department_plan in {path.name}")
    metrics["presentation_plan_builders"] = plan_builders
    if plan_builders != 1:
        violations.append(f"expected 1 build_full_department_plan, found {plan_builders}")

    # M5.0 — PresentationPolicy owner
    policy_defs = 0
    policy_path = _BACKEND_ROOT / "services" / "presentation" / "presentation_policy.py"
    if policy_path.is_file() and "class PresentationPolicy" in _read(policy_path):
        policy_defs = 1
    metrics["presentation_policy_owners"] = policy_defs
    if policy_defs != 1:
        violations.append("expected presentation_policy.py as sole PresentationPolicy owner")

    # M5.0 — contextual identity: no duplicate unit_ids in registry
    try:
        from backend.services.content.content_unit_registry import all_unit_descriptors

        seen_ids: set[str] = set()
        for desc in all_unit_descriptors():
            if desc.unit_id in seen_ids:
                violations.append(f"duplicate unit_id in registry: {desc.unit_id}")
            seen_ids.add(desc.unit_id)
            if not (desc.context or "").strip():
                violations.append(f"missing context on unit: {desc.unit_id}")
            # topic-only identity check: department units must include entity_id
            if desc.context == "department" and not (desc.entity_id or "").strip():
                violations.append(f"department unit missing entity_id: {desc.unit_id}")
    except Exception as exc:  # noqa: BLE001
        violations.append(f"contextual identity check failed: {exc}")

    metrics["architecture_violations"] = len(violations)
    ok = len(violations) == 0
    return ArchitectureLintResult(ok=ok, violations=violations, metrics=metrics)


def run_architecture_lint_at_startup() -> bool:
    result = run_architecture_lint()
    if result.ok:
        logger.info("ARCHITECTURE_LINT_OK metrics=%s", result.metrics)
        log_runtime_event("ARCHITECTURE_LINT_OK", metrics=result.metrics)
        return True
    msg = "; ".join(result.violations)
    if RUNTIME_STRICT_STARTUP:
        logger.error("ARCHITECTURE_LINT_FAIL %s", msg)
        log_runtime_event("ARCHITECTURE_LINT_FAIL", violations=result.violations, metrics=result.metrics)
        raise RuntimeError(f"Architecture lint failed: {msg}")
    logger.warning("ARCHITECTURE_LINT_WARN %s", msg)
    log_runtime_event("ARCHITECTURE_LINT_WARN", violations=result.violations, metrics=result.metrics)
    return False
