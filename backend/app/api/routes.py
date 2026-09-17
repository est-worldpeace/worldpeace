from fastapi import APIRouter, HTTPException

from app.models.bakery_model import ModelInputError, load_model_pack
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.inference import run_inference

router = APIRouter()


@router.get("/health")
def health():
    pack = load_model_pack()
    return {"status": "ok", "model": "ready", "artifact_version": pack["version"]}


@router.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionRequest):
    try:
        result = run_inference(payload)
    except ModelInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PredictionResponse.model_validate(result)
