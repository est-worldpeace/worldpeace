from app.models.bakery_model import ModelInputError, SalesRecord, forecast
from app.schemas.prediction import BacktestRequest, PredictionRequest


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


def run_backtest(payload: BacktestRequest):
    """Re-run the same forecast model against each past day, using only the
    sales recorded before that day, so the trend chart compares the model's
    own historical estimate against what actually sold (no invented numbers).
    """
    records = sorted(
        (
            SalesRecord(date=record.date.isoformat(), sales=record.sales, stockout=record.stockout)
            for record in payload.sales_history
        ),
        key=lambda record: record.date,
    )
    candidates = records[-payload.days:]
    points = []
    for record in candidates:
        history = [prior for prior in records if prior.date < record.date]
        if len(history) < 7 or record.sales is None:
            continue
        try:
            result = forecast(
                product_id=payload.product_id,
                target_date=record.date,
                sales_history=history,
                inventory=0,
                reservations=0,
                batch_size=1,
                capacity=None,
            )
        except ModelInputError:
            continue
        points.append({"date": record.date, "actual": record.sales, "predicted": result["predicted_sales"]})
    return points
