from __future__ import annotations

from pydantic import BaseModel, Field


class StoreSettings(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    default_batch_size: int = Field(ge=1, le=1000)
