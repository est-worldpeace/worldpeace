"""File-backed persistence for store settings, product info, and seed sales history.

The MVP has no database; a single JSON file under app/data acts as the store.
This keeps GET/PUT state consistent across requests without adding infra.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "app_state.json"

_KST = timezone(timedelta(hours=9))
_WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"]
_DEMO_SOLD = [72, 78, 91, 88, 70, 75, 58]

_lock = threading.Lock()


def _seed_sales_history() -> list[dict]:
    today = datetime.now(_KST).date()
    records = []
    for index, sold in enumerate(_DEMO_SOLD):
        day_date = today + timedelta(days=index - 6)
        records.append({
            "date": day_date.isoformat(),
            "day": _WEEKDAY_KO[day_date.weekday()],
            "sold": sold,
            "note": "주말" if index in (2, 3) else "평일",
        })
    return records


def _default_state() -> dict:
    return {
        "store": {"name": "행복한 빵집", "default_batch_size": 10},
        "product": {
            "product_id": "croissant",
            "name": "크루아상",
            "batch_size": 10,
            "storage": "상온",
            "shelf_life": "당일",
            "default_plan_quantity": 100,
        },
        "sales_history": {"croissant": _seed_sales_history()},
    }


def _read_state() -> dict:
    if not DATA_PATH.exists():
        return _default_state()
    with DATA_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _write_state(state: dict) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as fh:
        json.dump(state, fh, ensure_ascii=False, indent=2)


def get_store() -> dict:
    with _lock:
        return _read_state()["store"]


def update_store(fields: dict[str, Any]) -> dict:
    with _lock:
        state = _read_state()
        state["store"] = {**state["store"], **fields}
        _write_state(state)
        return state["store"]


def get_product(product_id: str) -> dict | None:
    with _lock:
        product = _read_state()["product"]
        return product if product["product_id"] == product_id else None


def update_product(product_id: str, fields: dict[str, Any]) -> dict | None:
    with _lock:
        state = _read_state()
        product = state["product"]
        if product["product_id"] != product_id:
            return None
        product.update(fields)
        _write_state(state)
        return product


def get_sales_history(product_id: str) -> list[dict]:
    with _lock:
        state = _read_state()
        history = state.get("sales_history", {})
        if product_id not in history:
            return []
        return history[product_id]
