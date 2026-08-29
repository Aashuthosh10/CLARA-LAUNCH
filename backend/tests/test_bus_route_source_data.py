import json
import unittest
from pathlib import Path

from backend.services.bus_routes import list_bus_routes, resolve_bus_route


class BusRouteSourceDataTests(unittest.TestCase):
    def test_source_json_is_valid_and_contains_all_eight_routes(self):
        path = Path(__file__).parents[1] / "data" / "bus_routes.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual([r["bus_id"] for r in payload["routes"]], [str(i) for i in range(1, 9)])
        self.assertEqual(len(list_bus_routes()), 8)

    def test_known_stop_returns_all_buses_serving_it(self):
        result = resolve_bus_route(stop_name="Mathikere")
        self.assertTrue(result["exact_stop_match"])
        self.assertEqual([b["bus_id"] for b in result["buses"]], ["2", "7"])

    def test_bus_returns_ordered_stops(self):
        result = resolve_bus_route(bus_id="1")
        self.assertFalse(result["exact_stop_match"])
        self.assertEqual(result["buses"][0]["route"][0]["name"], "Mallatha halli Cross")
        self.assertEqual(result["buses"][0]["route"][-1]["name"], "SVIT Campus")
        self.assertEqual(result["buses"][0]["route"][0]["time"], "07:05")

    def test_unknown_location_is_not_falsely_nearest(self):
        result = resolve_bus_route(bus_id="11", stop_name="Unknown Place")
        self.assertFalse(result["exact_stop_match"])
        self.assertIsNone(result["nearest_stop"])
        self.assertEqual(result["buses"], [])


if __name__ == "__main__":
    unittest.main()
