"""Security contracts for the intentionally public campus endpoints."""

from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import main
from backend.security.rate_limit import BoundedKeyedRateLimiter


def _limiter(capacity: int = 100) -> BoundedKeyedRateLimiter:
    return BoundedKeyedRateLimiter(capacity, capacity)


class CampusApiSecurityTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(main.app)

    def test_valid_route_uses_fixed_graph(self) -> None:
        response = self.client.post(
            "/api/campus/route",
            json={
                "origin_node_id": "GF-NAV-KIOSK-MAIN",
                "destination_room_code": "A-002",
                "destination_floor_id": "GF",
                "mode": "shortest",
                "language": "en",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertGreater(len(response.json()["path_nodes"]), 1)

    def test_route_endpoint_uses_named_validated_fields(self) -> None:
        expected = {"status": "ok", "path_nodes": []}
        with patch.object(main, "compute_campus_route", return_value=expected) as compute:
            response = self.client.post(
                "/api/campus/route",
                json={
                    "origin_node_id": "GF-NAV-KIOSK-MAIN",
                    "destination_room_code": "A-002",
                    "destination_floor_id": "GF",
                    "mode": "shortest",
                    "language": "en",
                },
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)
        compute.assert_called_once_with(
            origin_node_id="GF-NAV-KIOSK-MAIN",
            destination_room_code="A-002",
            destination_floor_id="GF",
            mode="shortest",
            language="en",
        )

    def test_invalid_source_and_destination_fail_closed_in_fixed_graph(self) -> None:
        source = self.client.post(
            "/api/campus/route",
            json={"origin_node_id": "NOT-A-NODE", "destination_room_code": "A-002"},
        )
        destination = self.client.post(
            "/api/campus/route",
            json={
                "origin_node_id": "GF-NAV-KIOSK-MAIN",
                "destination_room_code": "NOT-A-ROOM",
            },
        )
        self.assertEqual(source.status_code, 200)
        self.assertEqual(source.json()["status"], "error")
        self.assertEqual(destination.status_code, 200)
        self.assertEqual(destination.json()["status"], "no_route")

    def test_oversized_field_and_body_are_rejected(self) -> None:
        field = self.client.post("/api/campus/match", json={"transcript": "x" * 1025})
        body = self.client.post("/api/campus/match", json={"transcript": "x" * 5000})
        self.assertEqual(field.status_code, 422)
        self.assertEqual(body.status_code, 413)

    def test_malformed_json_is_rejected(self) -> None:
        response = self.client.post(
            "/api/campus/match",
            content=b'{"transcript":',
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 422)

    def test_repeated_route_requests_hit_endpoint_limiter(self) -> None:
        with patch.object(main, "_campus_route_limiter", _limiter(1)), patch.object(
            main, "compute_campus_route", return_value={"status": "ok"}
        ):
            first = self.client.post(
                "/api/campus/route", json={"destination_room_code": "A-002"}
            )
            second = self.client.post(
                "/api/campus/route", json={"destination_room_code": "A-002"}
            )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 429)

    def test_client_cannot_replace_authoritative_graph(self) -> None:
        response = self.client.post(
            "/api/campus/route",
            json={
                "destination_room_code": "A-002",
                "nodes": [{"id": "attacker"}],
                "edges": [],
            },
        )
        self.assertEqual(response.status_code, 422)

    def test_cors_allows_only_required_methods_and_headers(self) -> None:
        response = self.client.options(
            "/api/campus/route",
            headers={
                "Origin": "http://localhost:5176",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-methods"], "GET, POST, OPTIONS")
        self.assertNotIn("access-control-allow-credentials", response.headers)


if __name__ == "__main__":
    unittest.main()
