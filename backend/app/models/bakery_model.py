"""Portable inference for the naeil-bbang final bakery forecasting model.

The fitted estimators live in artifacts/model-pack.json. This module ports the
reference TypeScript inference engine at SengangLemon/naeil-bbang commit
0e233c3d312674b1624ab377334af3e05683d42b.
"""

from __future__ import annotations

import json
import math
import re
import struct
from dataclasses import dataclass
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any


QUANTILES = (0.1, 0.5, 0.75, 0.9)
MODEL_VERSION = "daily-bakery-1.0 / research-base + rolling-store-calibration"
ARTIFACT_PATH = Path(__file__).with_name("artifacts") / "model-pack.json"


class ModelInputError(ValueError):
    pass


@dataclass(frozen=True)
class SalesRecord:
    date: str
    sales: int | None
    stockout: bool | None = None


def _day(value: str) -> date:
    return date.fromisoformat(value)


def _add_days(value: str, days: int) -> str:
    return (_day(value) + timedelta(days=days)).isoformat()


def _weekday(value: str) -> int:
    return _day(value).weekday()


def _f32(value: float) -> float:
    return struct.unpack("f", struct.pack("f", value))[0]


@lru_cache(maxsize=1)
def load_model_pack() -> dict[str, Any]:
    with ARTIFACT_PATH.open("r", encoding="utf-8") as stream:
        return json.load(stream)


def quantile(values: list[float], level: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    position = (len(ordered) - 1) * level
    lower = math.floor(position)
    upper = min(lower + 1, len(ordered) - 1)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def weighted_quantile(values: list[float], weights: list[float], level: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(zip(values, weights), key=lambda item: item[0])
    total = sum(weights)
    cumulative = 0.0
    for value, weight in ordered:
        cumulative += weight
        if cumulative / total >= level:
            return value
    return ordered[-1][0]


def coherent(values: list[float]) -> list[float]:
    output = [max(0.0, value) for value in values]
    output[0] = min(output[0], output[1])
    output[2] = max(output[2], output[1])
    output[3] = max(output[3], output[2])
    return output


def shape_features(sequence: list[float | None]) -> list[float]:
    observed = [value for value in sequence if value is not None]
    average = sum(observed) / len(observed) if observed else 1.0
    centered = [(average if value is None else value) - average for value in sequence]
    deviation = max(1.0, math.sqrt(sum(value * value for value in centered) / len(centered)))
    normalized = [value / deviation for value in centered]
    power: list[float] = []
    for frequency in range(1, 15):
        real = 0.0
        imaginary = 0.0
        for index, value in enumerate(normalized):
            angle = 2 * math.pi * frequency * index / 28
            real += value * math.cos(angle)
            imaginary -= value * math.sin(angle)
        power.append(real * real + imaginary * imaginary)
    total = max(1.0, sum(power))
    return [math.sqrt(value / total) for value in power] + [
        sum(normalized[-7:]) / 7,
        sum(normalized[-14:-7]) / 7,
    ]


def make_features(
    history: list[SalesRecord],
    target: str,
    pack: dict[str, Any],
    known_research_product: int | None = None,
) -> dict[str, Any]:
    usable = sorted(
        (record for record in history if record.date < target and record.sales is not None),
        key=lambda record: record.date,
    )
    by_date = {record.date: float(record.sales) for record in usable}

    def lag(days: int) -> float | None:
        return by_date.get(_add_days(target, -days))

    features: dict[str, float | None] = {}
    for days in (1, 2, 3, 7, 14, 21, 28):
        features[f"lag{days}"] = lag(days)
    for days in (7, 14, 28, 56):
        values = [value for offset in range(1, days + 1) if (value := lag(offset)) is not None]
        if len(values) >= 2:
            average = sum(values) / len(values)
            features[f"mean{days}"] = average
            features[f"median{days}"] = quantile(values, 0.5)
            features[f"std{days}"] = math.sqrt(
                sum((value - average) ** 2 for value in values) / (len(values) - 1)
            )
        else:
            features[f"mean{days}"] = None
            features[f"median{days}"] = None
            features[f"std{days}"] = None
    same_weekday = [
        value for offset in range(1, 9) if (value := lag(offset * 7)) is not None
    ]
    features["weekday_med8"] = quantile(same_weekday, 0.5) if same_weekday else None
    mean7, mean28 = features["mean7"], features["mean28"]
    features["trend"] = mean7 - mean28 if mean7 is not None and mean28 is not None else None
    target_day = _day(target)
    day_of_year = (target_day - date(target_day.year, 1, 1)).days
    for frequency in (1, 2):
        features[f"sin{frequency}"] = math.sin(frequency * 2 * math.pi * day_of_year / 365.25)
        features[f"cos{frequency}"] = math.cos(frequency * 2 * math.pi * day_of_year / 365.25)
    for weekday_index in range(7):
        features[f"dow_{weekday_index}"] = 1.0 if _weekday(target) == weekday_index else 0.0
    for product in pack["products"]:
        features[f"prod{product}"] = 1.0 if product == known_research_product else 0.0
    sequence = [lag(28 - index) for index in range(28)]
    shape = shape_features(sequence)
    scale = max(1.0, features["mean28"] or 1.0)
    cat_scale = max(1.0, features["mean28"] or features["median56"] or 1.0)
    weekday_values = same_weekday or [float(record.sales) for record in usable[-7:]]
    weekday_forecast = [quantile(weekday_values, level) for level in QUANTILES]
    return {
        "x": features,
        "shape": shape,
        "scale": scale,
        "cat_scale": cat_scale,
        "history_count": len(usable),
        "weekday": weekday_forecast,
    }


def _cat_predict(model: dict[str, Any], features: dict[str, float | None]) -> list[float]:
    values = [
        float("-inf") if features.get(column) is None else _f32(float(features[column]))
        for column in model["columns"]
    ]
    output = [0.0, 0.0, 0.0, 0.0]
    for tree in model["trees"]:
        leaf = 0
        for bit, (feature, border) in enumerate(tree.get("splits", [])):
            if values[feature] > border:
                leaf |= 1 << bit
        for level in range(4):
            output[level] += tree["values"][leaf * 4 + level]
    return [
        value * model["scale"] + (model["bias"][index] if index < len(model["bias"]) else 0)
        for index, value in enumerate(output)
    ]


def predict_base(
    pack: dict[str, Any], features: dict[str, float | None], shape: list[float], cat_scale: float
) -> list[list[float]]:
    standardized = [
        ((pack["impute"][index] if features.get(column) is None else features[column]) - pack["mean"][index])
        / pack["scale"][index]
        for index, column in enumerate(pack["columns"])
    ]
    f32_values = [_f32(float(value)) for value in standardized]
    histogram: list[float] = []
    for nodes in pack["et"]["trees"]:
        index = 0
        while nodes[index][0] >= 0:
            node = nodes[index]
            index = node[2] if f32_values[node[0]] <= node[1] else node[3]
        leaf = nodes[index]
        for value, weight in zip(leaf[1], leaf[2]):
            while len(histogram) <= value:
                histogram.append(0.0)
            histogram[value] += weight
    total = 0.0
    cumulative = []
    for value in histogram:
        total += value
        cumulative.append(total)
    extra_trees = []
    for level in QUANTILES:
        found = next((index for index, value in enumerate(cumulative) if value / total >= level), -1)
        extra_trees.append(float(len(cumulative) - 1 if found < 0 else found))

    ridge_model = pack["ridge"]
    ridge = float(ridge_model["intercept"])
    for spline in ridge_model["splines"]:
        value = standardized[spline["feature"]]
        if value < spline["low"]:
            ridge += spline["left_value"] + (value - spline["low"]) * spline["left_slope"]
            continue
        if value > spline["high"]:
            ridge += spline["right_value"] + (value - spline["high"]) * spline["right_slope"]
            continue
        segment = 0
        while segment < len(spline["knots"]) - 2 and value >= spline["knots"][segment + 1]:
            segment += 1
        difference = value - spline["knots"][segment]
        contribution = 0.0
        for coefficient in spline["coefficients"][segment]:
            contribution = contribution * difference + coefficient
        ridge += contribution
    for coefficient_index, feature_index in enumerate(ridge_model["other"]):
        ridge += standardized[feature_index] * ridge_model["coef"][coefficient_index]

    scaled = dict(features)
    for column in pack["columns"]:
        if re.match(r"^(lag|mean|std|median|weekday_med)", column) or column == "trend":
            scaled[column] = None if features.get(column) is None else features[column] / cat_scale
    scaled["loglevel"] = math.log1p(cat_scale)
    for index, value in enumerate(shape):
        scaled[f"psd{index}"] = value
    return [
        coherent(extra_trees),
        coherent(_cat_predict(pack["cat"], features)),
        coherent([ridge, ridge, ridge, ridge]),
        coherent([value * cat_scale for value in _cat_predict(pack["scaled"], scaled)]),
    ]


def _simplex(values: list[float]) -> list[float]:
    ordered = sorted(values, reverse=True)
    total = 0.0
    threshold = 0.0
    for index, value in enumerate(ordered):
        total += value
        candidate = (total - 1) / (index + 1)
        if index == len(ordered) - 1 or ordered[index + 1] <= candidate:
            threshold = candidate
            break
    return [max(0.0, value - threshold) for value in values]


def weight_objective(samples: list[dict[str, Any]], weights: list[float]) -> float:
    loss = 0.0
    for sample in samples:
        for quantile_index, level in ((1, 0.5), (2, 0.75)):
            error = (
                sample["y"]
                - sum(
                    value * sample["experts"][model][quantile_index]
                    for model, value in enumerate(weights)
                )
            ) / sample["scale"]
            loss += max(level * error, (level - 1) * error)
    regularization = 0.01 * sum((value - 0.2) ** 2 for value in weights)
    return loss / max(1, 2 * len(samples)) + regularization


def learn_weights(samples: list[dict[str, Any]], iterations: int = 7000) -> list[float]:
    if len(samples) < 7:
        return [0.2] * 5
    rows: list[list[float]] = []
    targets: list[float] = []
    levels: list[float] = []
    for sample in samples:
        for quantile_index, level in ((1, 0.5), (2, 0.75)):
            values = [expert[quantile_index] / sample["scale"] for expert in sample["experts"]]
            center = sum(values) / len(values)
            rows.append([value - center for value in values])
            targets.append(sample["y"] / sample["scale"] - center)
            levels.append(level)
    norm = sum(value * value for row in rows for value in row)
    if norm < 1e-20:
        return [0.2] * 5
    step = 2.0
    dual_step = 0.99 / (step * norm)
    dual = [0.0] * len(rows)
    weights = [0.2] * 5
    extrapolated = list(weights)
    count = len(rows)
    for _ in range(iterations):
        gradient = [0.0] * 5
        for index, row in enumerate(rows):
            residual = targets[index] - sum(value * extrapolated[model] for model, value in enumerate(row))
            dual[index] = max(
                (levels[index] - 1) / count,
                min(levels[index] / count, dual[index] + dual_step * residual),
            )
            for model, value in enumerate(row):
                gradient[model] += value * dual[index]
        next_weights = _simplex(
            [
                (value + step * gradient[index] + step * 0.02 * 0.2) / (1 + step * 0.02)
                for index, value in enumerate(weights)
            ]
        )
        extrapolated = [2 * value - weights[index] for index, value in enumerate(next_weights)]
        weights = next_weights
    return weights


def _mix(experts: list[list[float]], weights: list[float]) -> list[float]:
    return [
        sum(expert[index] * weights[model] for model, expert in enumerate(experts))
        for index in range(4)
    ]


def _production_for(
    p75: float, inventory: int, reservations: int, batch_size: int, capacity: int | None
) -> tuple[int, float]:
    need = max(0.0, max(p75, reservations) - inventory)
    unrestricted = math.ceil(need / batch_size - 1e-12) * batch_size
    quantity = unrestricted if capacity is None else min(unrestricted, capacity // batch_size * batch_size)
    shortfall = max(0.0, max(p75, reservations) - inventory - quantity)
    return quantity, shortfall


def forecast(
    *,
    product_id: str,
    target_date: str,
    sales_history: list[SalesRecord],
    inventory: int,
    reservations: int,
    batch_size: int,
    capacity: int | None,
) -> dict[str, Any]:
    pack = load_model_pack()
    records = sorted((record for record in sales_history if record.date < target_date), key=lambda row: row.date)
    if not records:
        raise ModelInputError("예측일 이전 판매기록이 필요합니다.")
    features = make_features(records, target_date, pack)
    mode = "research" if features["history_count"] >= 7 and target_date > pack["train_end"] else "fallback"
    raw_cache: dict[str, dict[str, Any]] = {}

    def raw_for(day: str) -> dict[str, Any]:
        if day not in raw_cache:
            feature_set = make_features(records, day, pack)
            raw_cache[day] = {
                "features": feature_set,
                "experts": predict_base(
                    pack, feature_set["x"], feature_set["shape"], feature_set["cat_scale"]
                )
                + [feature_set["weekday"]],
            }
        return raw_cache[day]

    if mode == "research":
        experts = raw_for(target_date)["experts"]
    else:
        experts = [list(features["weekday"]) for _ in range(5)]
    weights = [0.2] * 5
    extra_trees = list(experts[0])
    ensemble = list(features["weekday"])
    calibration_count = 0
    warnings: list[str] = []
    if mode == "research":
        target = _day(target_date)
        review = (target - timedelta(days=target.weekday())).isoformat()
        start = _add_days(target_date, -56)
        weight_start = _add_days(review, -56)
        candidates = [record for record in records if record.date >= weight_start and not record.stockout]
        samples: list[dict[str, Any]] = []
        for record in candidates:
            historic_features = make_features(records, record.date, pack)
            if historic_features["history_count"] < 7 or record.date <= pack["train_end"]:
                continue
            raw = raw_for(record.date)
            samples.append(
                {
                    "experts": raw["experts"],
                    "y": float(record.sales),
                    "scale": historic_features["scale"],
                    "shape": historic_features["shape"],
                    "date": record.date,
                }
            )
        weights = learn_weights(
            [sample for sample in samples if weight_start <= sample["date"] < review]
        )
        calibration = [sample for sample in samples if sample["date"] >= start]
        if len(calibration) < 10:
            calibration = samples[-56:]
        calibration_count = len(calibration)
        raw_ensemble = _mix(experts, weights)
        ensemble = list(raw_ensemble)
        if len(calibration) >= 7:
            distances = [
                sum((value - features["shape"][index]) ** 2 for index, value in enumerate(sample["shape"]))
                for sample in calibration
            ]
            bandwidth = max(0.001, quantile(distances, 0.5))
            similarities = [0.5 + 0.5 * math.exp(-distance / bandwidth) for distance in distances]
            ensemble = coherent(
                [
                    raw_ensemble[index]
                    + features["scale"]
                    * weighted_quantile(
                        [
                            (sample["y"] - _mix(sample["experts"], weights)[index]) / sample["scale"]
                            for sample in calibration
                        ],
                        similarities,
                        level,
                    )
                    for index, level in enumerate(QUANTILES)
                ]
            )
        if len(calibration) >= 14:
            extra_trees = coherent(
                [
                    experts[0][index]
                    + quantile(
                        [sample["y"] - sample["experts"][0][index] for sample in calibration], level
                    )
                    for index, level in enumerate(QUANTILES)
                ]
            )
        warnings.append("독일 판매 자료로 학습한 연구모델입니다. 이 매장의 성능은 기록을 쌓으며 확인해야 합니다.")
        if len(calibration) < 14:
            warnings.append(f"상품별 보정에 쓸 기록 {len(calibration)}일 · 초기 보정 단계입니다.")
    else:
        warnings.append(
            f"과거 기록 {features['history_count']}일 · AI 모델 대신 요일 기준 예측을 표시합니다. 7일 기록부터 연구모델 계산을 시작합니다."
        )
    if any(record.stockout for record in records):
        warnings.append("품절일 판매량은 실제 수요보다 적을 수 있어 오차 보정에서 제외합니다.")
    final_weight = pack["final_ensemble_weight"]
    final = coherent(
        [
            (1 - final_weight) * value + final_weight * ensemble[index]
            for index, value in enumerate(extra_trees)
        ]
    )
    quantity, shortfall = _production_for(
        final[2], inventory, reservations, batch_size, capacity
    )
    return {
        "model": "final",
        "model_version": MODEL_VERSION,
        "artifact_version": pack["version"],
        "mode": mode,
        "product_id": product_id,
        "target_date": target_date,
        "history_count": features["history_count"],
        "calibration_count": calibration_count,
        "predicted_sales": final[1],
        "p75": final[2],
        "recommended_quantity": quantity,
        "capacity_shortfall": shortfall,
        "warnings": warnings,
        "comparison": {
            "extra_trees": {"p50": extra_trees[1], "p75": extra_trees[2]},
            "ensemble": {"p50": ensemble[1], "p75": ensemble[2]},
            "weekday": {"p50": features["weekday"][1], "p75": features["weekday"][2]},
        },
    }
