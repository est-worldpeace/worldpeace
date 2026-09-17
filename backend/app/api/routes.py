from fastapi import APIRouter, HTTPException

from app.models.bakery_model import ModelInputError, load_model_pack
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.schemas.product import ProductInfo, ProductUpdate
from app.schemas.sales import SalesHistoryResponse
from app.schemas.store import StoreSettings
from app.services import store_repository
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


@router.get("/store", response_model=StoreSettings)
def get_store():
    return store_repository.get_store()


@router.put("/store", response_model=StoreSettings)
def update_store(payload: StoreSettings):
    return store_repository.update_store(payload.model_dump())


@router.get("/product", response_model=ProductInfo)
def get_product():
    product = store_repository.get_product("croissant")
    if product is None:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다.")
    return product


@router.put("/product", response_model=ProductInfo)
def update_product(payload: ProductUpdate):
    product = store_repository.update_product("croissant", payload.model_dump())
    if product is None:
        raise HTTPException(status_code=404, detail="제품을 찾을 수 없습니다.")
    return product


@router.get("/sales", response_model=SalesHistoryResponse)
def get_sales():
    records = store_repository.get_sales_history("croissant")
    return {"product_id": "croissant", "records": records}
