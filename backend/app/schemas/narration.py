from __future__ import annotations

from pydantic import BaseModel


class NarrationFactors(BaseModel):
    """Every number the LLM is allowed to mention. Add a field here before the
    prompt may reference it — the model must never introduce a number that
    didn't come from this payload.
    """

    target_weekday: str  # e.g. "목"
    predicted_sales: float
    weekday_p50: float
    mean7: float | None = None
    mean28: float | None = None
    weekend_avg: float | None = None
    weekday_avg: float | None = None
    is_weekend: bool


class NarrationResponse(BaseModel):
    weekday_effect: str
    recent_trend: str
    weekend_note: str
