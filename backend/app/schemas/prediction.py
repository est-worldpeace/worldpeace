from typing import Any

from pydantic import BaseModel, Field, field_validator


class PredictionRequest(BaseModel):
    # 실제 모델 입력 규격이 정해지면 이 스키마를 교체합니다.
    text: str = Field(min_length=1, max_length=10000)

    @field_validator("text")
    @classmethod
    def require_nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text must not be blank")
        return value


class PredictionResponse(BaseModel):
    result: Any
