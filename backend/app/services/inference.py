from app.models.bakery_model import SalesRecord, forecast
from app.schemas.prediction import PredictionRequest


def run_inference(payload: PredictionRequest):
    return forecast(
        product_id=payload.product_id,
        target_date=payload.target_date.isoformat(),
        sales_history=[
            SalesRecord(
                date=record.date.isoformat(),
                sales=record.sales,
                stockout=record.stockout,
            )
            for record in payload.sales_history
        ],
        inventory=payload.inventory,
        reservations=payload.reservations,
        batch_size=payload.batch_size,
        capacity=payload.capacity,
    )
