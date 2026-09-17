from __future__ import annotations

from pydantic import BaseModel, Field


class ProductInfo(BaseModel):
    product_id: str
    name: str
    batch_size: int = Field(ge=1, le=1000)
    storage: str
    shelf_life: str
    default_plan_quantity: int = Field(ge=0, le=100000)
    unit_cost: int | None = Field(default=None, ge=0, le=1000000)


class ProductUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    batch_size: int = Field(ge=1, le=1000)
    storage: str = Field(min_length=1, max_length=40)
    shelf_life: str = Field(min_length=1, max_length=40)
    default_plan_quantity: int = Field(ge=0, le=100000)
    unit_cost: int | None = Field(default=None, ge=0, le=1000000)
