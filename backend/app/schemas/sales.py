from __future__ import annotations

from pydantic import BaseModel, Field


class SalesRecord(BaseModel):
    date: str
    day: str
    sold: int = Field(ge=0, le=100000)
    note: str = ""


class SalesHistoryResponse(BaseModel):
    product_id: str
    records: list[SalesRecord]
