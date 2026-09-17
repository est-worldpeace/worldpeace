from fastapi import APIRouter, HTTPException

from app.models.adapter import ModelNotConfiguredError
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.inference import run_inference

router = APIRouter()


@router.get("/health")
def health():
    """API 실행 상태 확인. 모델 준비 여부와는 별개입니다."""
    return {"status": "ok"}


@router.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionRequest):
    try:
        result = run_inference(payload.text)
    except ModelNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return PredictionResponse(result=result)
