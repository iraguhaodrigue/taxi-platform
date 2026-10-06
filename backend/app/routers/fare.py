from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.pricing import PricingRule
from app.schemas import FareRequest, FareEstimate
from app.core.fare_logic import get_road_distance_and_time, estimate_fare

router = APIRouter(prefix="/fare", tags=["fare"])


@router.post("/estimate", response_model=FareEstimate)
def fare_estimate(data: FareRequest, db: Session = Depends(get_db)):
    """Estimate distance, time and fare before booking."""
    pricing = db.query(PricingRule).first()

    distance, time_min = get_road_distance_and_time(
        data.pickup_lat, data.pickup_lng,
        data.destination_lat, data.destination_lng,
    )
    fare = estimate_fare(
        distance, time_min,
        pricing.base_fare, pricing.rate_per_km, pricing.rate_per_min,
    )
    return FareEstimate(
        distance_km=round(distance, 2),
        time_min=round(time_min, 1),
        fare=fare,
    )
