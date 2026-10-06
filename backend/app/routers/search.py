from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.vehicle import Vehicle
from app.schemas import NearbyVehicleOut, VehicleOut
from app.core.fare_logic import haversine_km

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/nearby", response_model=List[NearbyVehicleOut])
def taxi_near_me(
    lat: float,
    lng: float,
    radius_km: float = 5,
    db: Session = Depends(get_db),
):
    """Find available, listed taxis within radius_km of the passenger.

    This version loads listed taxis and measures distance in Python.
    It works on any database. For a large number of taxis, Claude Code
    can upgrade this to a PostGIS query (see backend/README.md).
    """
    taxis = (
        db.query(Vehicle)
        .filter(Vehicle.is_listed == True)  # noqa: E712
        .filter(Vehicle.is_available == True)  # noqa: E712
        .filter(Vehicle.lat.isnot(None))
        .all()
    )

    results = []
    for t in taxis:
        distance = haversine_km(lat, lng, t.lat, t.lng)
        if distance <= radius_km:
            base = VehicleOut.model_validate(t)
            item = NearbyVehicleOut(**base.model_dump(), distance_km=round(distance, 2))
            results.append(item)

    results.sort(key=lambda x: x.distance_km)
    return results
