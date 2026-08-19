"""Content registry completeness tests."""

from __future__ import annotations

import unittest

from backend.services.content.adapters import ADAPTERS, get_adapter
from backend.services.content.registry import (
    assert_registry_complete,
    get_owner,
    registered_surfaces,
)
from backend.services.content.types import ALL_SURFACES


class TestContentRegistry(unittest.TestCase):
    def test_all_listed_surfaces_registered(self) -> None:
        assert_registry_complete()
        self.assertEqual(registered_surfaces(), ALL_SURFACES)

    def test_adapter_keys_resolve(self) -> None:
        for surface in sorted(ALL_SURFACES):
            owner = get_owner(surface)
            self.assertIsNotNone(owner, msg=surface)
            assert owner is not None
            self.assertTrue(owner.adapter_key, msg=surface)
            self.assertIn(owner.adapter_key, ADAPTERS, msg=surface)
            self.assertIsNotNone(get_adapter(owner.adapter_key), msg=surface)
            self.assertTrue(owner.canonical_source, msg=surface)
            self.assertTrue(owner.owner_id, msg=surface)


if __name__ == "__main__":
    unittest.main()
