from datetime import date

from pydantic import BaseModel, Field, model_validator


class SalesRecordInput(BaseModel):
    date: date
    sales: int = Field(ge=0, le=100000)
    stockout: bool | None = None


class PredictionRequest(BaseModel):
    product_id: str = Field(min_length=1, max_length=120)
    target_date: date
    sales_history: list[SalesRecordInput] = Field(min_length=1, max_length=5000)
    inventory: int = Field(default=0, ge=0, le=100000)
    reservations: int = Field(default=0, ge=0, le=100000)
    batch_size: int = Field(default=1, ge=1, le=1000)
    capacity: int | None = Field(default=None, ge=0, le=100000)

    @model_validator(mode="after")
    def validate_history(self):
        dates = [record.date for record in self.sales_history]
        if len(set(dates)) != len(dates):
            raise ValueError("같은 날짜의 판매기록이 중복되어 있습니다.")
        if any(record.date >= self.target_date for record in self.sales_history):
            raise ValueError("판매기록 날짜는 예측일보다 이전이어야 합니다.")
        return self


class ModelComparison(BaseModel):
    p50: float
    p75: float


class PredictionResponse(BaseModel):
    model: str
    model_version: str
    artifact_version: str
    mode: str
    product_id: str
    target_date: date
    history_count: int
    calibration_count: int
    predicted_sales: float
    p75: float
    recommended_quantity: int
    capacity_shortfall: float
    warnings: list[str]
    comparison: dict[str, ModelComparison]
