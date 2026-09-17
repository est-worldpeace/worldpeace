import hashlib
import json
import math
import unittest
from datetime import date, timedelta
from pathlib import Path

from app.models.bakery_model import (
    ARTIFACT_PATH,
    SalesRecord,
    forecast,
    learn_weights,
    load_model_pack,
    make_features,
    predict_base,
    weight_objective,
)


ROOT = Path(__file__).resolve().parent
FIXTURES = json.loads((ROOT / "fixtures" / "port-fixtures.json").read_text(encoding="utf-8"))


class ModelPortTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pack = load_model_pack()

    def assert_close(self, actual, expected, tolerance=2e-11):
        if isinstance(expected, list):
            self.assertEqual(len(actual), len(expected))
            for actual_item, expected_item in zip(actual, expected):
                self.assert_close(actual_item, expected_item, tolerance)
        elif expected is None:
            self.assertIsNone(actual)
        else:
            self.assertTrue(
                math.isclose(actual, expected, rel_tol=0, abs_tol=tolerance),
                f"{actual} != {expected}",
            )

    def test_artifact_checksum(self):
        digest = hashlib.sha256(ARTIFACT_PATH.read_bytes()).hexdigest()
        self.assertEqual(digest, "c309c6f5ab15539e20acd07d5acb4eeff31f460432bc6b710e13e850d579d5bb")

    def test_base_predictions_match_reference_engine(self):
        for row in FIXTURES["rows"]:
            actual = predict_base(self.pack, row["x"], row["shape"], row["scale"])
            self.assert_close(actual, row["expected"])

    def test_features_match_reference_engine(self):
        for row in FIXTURES["feature_rows"]:
            history = [
                SalesRecord(date=item["date"], sales=item["sales"])
                for item in row["history"]
            ]
            actual = make_features(
                history,
                row["target"],
                self.pack,
                known_research_product=row["product"],
            )
            for key, expected in row["x"].items():
                self.assert_close(actual["x"][key], expected)
            self.assert_close(actual["shape"], row["shape"])

    def test_weights_match_reference_engine(self):
        for case in FIXTURES["weight_cases"]:
            weights = learn_weights(case["samples"])
            self.assertAlmostEqual(sum(weights), 1.0, places=9)
            self.assertTrue(all(weight >= 0 for weight in weights))
            self.assertLess(
                weight_objective(case["samples"], weights) - case["objective"],
                0.00015,
            )

    def test_forecast_smoke(self):
        target = date(2026, 9, 18)
        history = [
            SalesRecord(
                date=(target - timedelta(days=offset)).isoformat(),
                sales=70 + (offset % 7) * 3,
                stockout=False,
            )
            for offset in range(1, 64)
        ]
        result = forecast(
            product_id="croissant",
            target_date=target.isoformat(),
            sales_history=history,
            inventory=10,
            reservations=20,
            batch_size=10,
            capacity=200,
        )
        self.assertEqual(result["mode"], "research")
        self.assertGreaterEqual(result["recommended_quantity"], 0)
        self.assertEqual(result["recommended_quantity"] % 10, 0)
        self.assertGreaterEqual(result["p75"], result["predicted_sales"])


if __name__ == "__main__":
    unittest.main()
