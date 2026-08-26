"""Regression coverage for the approved 37-row Kannada V2 content import."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path
from types import SimpleNamespace

from backend.services.answer_generation import load_locale_data_for_lang_key
from backend.services.content.content_unit_resolver import resolve_unit
from backend.services.content.surface_narration_mapper import map_content_units_to_segments
from backend.services.orchestration.presentation_bundle import build_presentation_bundle
from backend.services.tts_text_contract import build_narration_text_contract


REPO_ROOT = Path(__file__).resolve().parents[2]
LOCALE_DIR = REPO_ROOT / "backend" / "data" / "locales"

EXPECTED_VALUE_HASHES = {
    "institution_overview.about": "b60b60189a15eb29446e565701738617ffbb945a3986669537dcc729dc0b13bd",
    "institution_overview.additional_details.motto": "ffbbb3187fa7ff6fb4f362002b94918b899760125d480f677d787e572d85a29a",
    "institution_overview.additional_details.core_values[0]": "d71c8a12317a4c5990236e718b13fc39dffd8c206d9ec4cfb2cf1cac3560edf7",
    "leadership[0].role": "3e7e828b35af74485fc7dede4beca838cfa7c570953c9a0a5721654eaa053ecf",
    "role_holders.trustees[1].designation": "a7b2908c7c9f060ee1e35422d464c3d5e1903b013dbc691b5c532f6d493669dd",
    "role_holders.trustees[3].designation": "cf45bc6a189ef0bc6710ec6b338c5bd0c1be6e893f11d37efc9e736c7d1aaeee",
    "role_holders.trustees[5].designation": "58de16d75f43f90661e4e499014f4f9ee5c7813a6f886bbabec258478a22bdcd",
    "role_holders.hod_by_department.mathematics.department_name": "31edda471ca5279f007471d888dc0f08e5bf26b9a90d1482e9dc64ab8b7e5d53",
    "role_holders.hod_by_department.physics.department_name": "aa969762bfeacc794fe07b77a46abd70e8b239d74de3fd7379ecd6fdcdd4be22",
    "role_holders.hod_by_department.chemistry.department_name": "0789883771d608e6ebe3a8d073eb0c02ee533553fe7c980030924597d34afb8f",
    "admissions_and_fees.entrance_exams[2]": "01919bd224a627d8925c66ea67b14a8e3f015f9acb50a03a258fa49143b6006f",
    "admissions_and_fees.fee_structures.additional_fees": "5ab6faee6b551f89a1bfbfa52df7d84cf2022d246867728a5a28a0023db7e1cb",
    "admissions_and_fees.additional_details.admission_and_eligibility.mba_programs.qualification": "4139545f5080ddbe6d2660655d2e830df5e55bca69c99c5bd4d58702250e530e",
    "admissions_and_fees.additional_details.admission_and_eligibility.mba_programs.expected_cutoff": "2226628bb435bfafa861c74893b25d9b4d8c8f3e019f120238a7f77e32e55e62",
    "departments.cse.intro": "be765322db3b6bfb09fcf3702b7fec9fbfcbfbb93a7967d01eeae09a03b84484",
    "departments.cse.hod_voice": "4b2d4b820924f09956dc7d80adfef583b7b184790d0f153783dda7db224b3a5b",
    "departments.cse_cysec.placement": "d78509b086dbdafa7a7e3058bdc2c87acd99255124f6bf7bd24c862290140221",
    "departments.cse_cysec.fees": "2e7ef6d9464e0ce68450cd7ef3af5f1ef75b91b79ea379cc9a846ca5aa6027b1",
    "departments.cse_bs.placement": "6a39840a2715a61028c76b8dd574e5b73d060e4fd7367567871f8766a9cc662b",
    "departments.cse_bs.fees": "c0767a2e30d147e1c72e9df27c9fd1d8a3ae565971ff53069c569e893c36d99d",
    "departments.ise.placement": "8a662f49c52ac80d7ca6b65f7b6351b20b8b83cfaebf5aef47d72a3a57c4cb9a",
    "departments.ise.fees": "507daf7ccd4b50fe56da99945f8767169d175005dd07aa863f8f110555709ef4",
    "departments.ece.hod_voice": "35bdd338ac62c903b70e98cd853c043a00cc1ea53f6a940183d5ca9688fe2984",
    "departments.ece.achievements": "2f8fa7ac1eb98285b69486cda9ece5a09b0c38996f48cfa451d0c21baf113031",
    "departments.mechanical.intro": "8ea9a7fe7c2f8db1702447670dc85aed0e1918cc1e600748ed714962a9d2fec8",
    "departments.mba.hod_voice": "096c361f1c7e8ce5c46ba627483ed88b6f2e0441dc787356a79e3e3e9dca1eba",
    "departments.mba.fees": "50692b3f6c3afbad03f8a4abc0206356cff4ebcbb8f8f47cb18f316053ea498b",
    "departments.basic_sciences.placement": "0667d3e32d320131daf7c44862bd56cef0563fd58b8b7c08cfdd8c240f589130",
    "departments.basic_sciences.fees": "030c1ef756a9fddc706bcd2dcc7e30cb6e5c5a2f6d6d713f43411ae291864518",
    "placements_and_training.objectives": "1e3a9ad5ad9bcd5c1aa85b92a91dbc3276964ce811c2c420f4294f8cbdde4131",
    "placements_and_training.training_programs": "0d40bf58ce92d150f8fe8d2eeb456a4277f809c2cade8d0b67c1cb035b9d9b13",
    "placements_and_training.additional_details.objectives[0]": "d9b4adbda61fa3117f365f6dae6a6c095e3549e1ca2af25bce147c77ad6ad314",
    "placements_and_training.additional_details.objectives[1]": "a1cdd00325b1a57657886482ab1c1228152dc6d2e105be42855994fe0e6ff7ba",
    "placements_and_training.additional_details.objectives[2]": "e8f6023f60664cfdb0d4f600c34173d6b10abbbb92d60240e1640f9d15091cf3",
    "placements_and_training.additional_details.training_programs[0]": "17828b19e06379635d6bb65edad462738ccc11f9760c62c5bbc5d31b985db181",
    "placements_and_training.additional_details.training_programs[1]": "daad691107e850221e6f925aac0d261c33485815d59ba99da393bd2af0647842",
    "placements_and_training.additional_details.training_programs[4]": "216e72635a5b7880eaab8f9f8a084a11cd5bd7918c496f5f37ce1b8df9919a63",
}


def _get_path(root: object, path: str) -> object:
    current = root
    for key, index in re.findall(r"([^.[\]]+)|\[(\d+)\]", path):
        current = current[int(index)] if index else current[key]  # type: ignore[index]
    return current


def _shape(root: object, prefix: str = "$") -> dict[str, str]:
    result = {prefix: type(root).__name__}
    if isinstance(root, dict):
        for key, value in root.items():
            result.update(_shape(value, f"{prefix}.{key}"))
    elif isinstance(root, list):
        for index, value in enumerate(root):
            result.update(_shape(value, f"{prefix}[{index}]"))
    return result


def test_exact_v2_values_and_locale_integrity() -> None:
    kn = json.loads((LOCALE_DIR / "kn.json").read_text(encoding="utf-8"))
    en = json.loads((LOCALE_DIR / "en.json").read_text(encoding="utf-8"))

    assert len(EXPECTED_VALUE_HASHES) == 37
    for path, expected_hash in EXPECTED_VALUE_HASHES.items():
        value = _get_path(kn, path)
        assert isinstance(value, str), path
        assert hashlib.sha256(value.encode("utf-8")).hexdigest() == expected_hash, path
        assert unicodedata.normalize("NFC", value) == value, path
        assert "\ufffd" not in value, path
        assert not re.search(r"[\u0b80-\u0bff\u0c00-\u0c7f\u0d00-\u0d7f]", value), path
        assert type(_get_path(en, path)) is type(value), path

    kn_shape = _shape(kn)
    en_shape = _shape(en)
    assert len(kn_shape) == len(en_shape) == 613
    shape_difference = set(kn_shape) ^ set(en_shape)
    assert len(shape_difference) == 22
    assert all(
        path.startswith("$.role_holders.hod_by_department.")
        and path.endswith((".hod_bio", ".hod_bio_source"))
        for path in shape_difference
    )


def test_protected_id_229_facts_and_acronyms() -> None:
    kn = load_locale_data_for_lang_key("kn")
    text = kn["departments"]["mba"]["hod_voice"]
    for protected in ("HR", "IT", "25+", "ಡಾ. ಜೋಗೀಶ್ ಡಿ"):
        assert protected in text

    expected = {
        "SVIT": ("institution_overview.about", "departments.basic_sciences.placement"),
        "IT": (
            "departments.cse_cysec.placement",
            "departments.ise.placement",
            "departments.mba.hod_voice",
            "placements_and_training.training_programs",
        ),
        "KCET": (
            "departments.cse_cysec.fees",
            "departments.cse_bs.fees",
            "departments.ise.fees",
        ),
        "KEA": (
            "departments.cse_cysec.fees",
            "departments.cse_bs.fees",
            "departments.ise.fees",
        ),
        "NBA": ("departments.ece.hod_voice",),
        "MATLAB": ("departments.ece.achievements",),
        "HR": ("departments.mba.hod_voice",),
    }
    for acronym, paths in expected.items():
        for path in paths:
            assert acronym in _get_path(kn, path), (acronym, path)


def test_real_presentation_bundle_ws_and_tts_boundaries() -> None:
    kn = load_locale_data_for_lang_key("kn")
    unit_ids = ("cse.overview", "cse.hod", "ece.achievements", "mba.hod", "mba.fees")
    units = [resolve_unit(unit_id=unit_id, language="Kannada", language_code="kn") for unit_id in unit_ids]
    assert all(unit is not None for unit in units)
    resolved = [unit for unit in units if unit is not None]

    expected_bodies = (
        kn["departments"]["cse"]["intro"],
        kn["departments"]["cse"]["hod_voice"],
        kn["departments"]["ece"]["achievements"],
        kn["departments"]["mba"]["hod_voice"],
        kn["departments"]["mba"]["fees"],
    )
    assert tuple(unit.body for unit in resolved) == expected_bodies

    segments = map_content_units_to_segments(resolved, lang_key="kn")
    bundle = build_presentation_bundle(
        resolution=SimpleNamespace(
            show_card="department_overview",
            language="Kannada",
            language_code_key="kn",
            tts_code="kn-IN",
        ),
        segments=segments,
        turn_id="kannada-v2",
    )
    ws_plan = bundle.narration_plan_payload("kannada-v2")

    assert bundle.language_code == "kn"
    assert bundle.tts_language == "kn-IN"
    assert [segment["unitId"] for segment in ws_plan["segments"]] == list(unit_ids)
    for expected, segment in zip(expected_bodies, ws_plan["segments"], strict=True):
        assert expected in segment["displayText"]

    spoken_by_unit = {
        segment["unitId"]: build_narration_text_contract(
            narration_text=segment["ttsText"]
        ).sanitized_tts_text
        for segment in ws_plan["segments"]
    }
    assert expected_bodies[0] in spoken_by_unit["cse.overview"]
    assert expected_bodies[2] in spoken_by_unit["ece.achievements"]
    assert expected_bodies[4] in spoken_by_unit["mba.fees"]
    assert expected_bodies[1] not in spoken_by_unit["cse.hod"]
    assert expected_bodies[3] not in spoken_by_unit["mba.hod"]
    for text in spoken_by_unit.values():
        assert text
        assert "[cite:" not in text.lower()
        assert not re.search(r"^\s*\{.*['\"]\s*:", text)
