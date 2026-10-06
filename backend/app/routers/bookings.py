from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.booking import Booking, BookingStatus
from app.models.pricing import PricingRule
from app.schemas import BookingCreate, BookingOut
from app.core.security import get_current_user
from app.core.fare_logic import get_road_distance_and_time, estimate_fare

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut)
def create_booking(
    data: BookingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Taxi not found")

    pricing = db.query(PricingRule).first()
    distance, time_min = get_road_distance_and_time(
        data.pickup_lat, data.pickup_lng,
        data.destination_lat, data.destination_lng,
    )
    fare = estimate_fare(
        distance, time_min,
        pricing.base_fare, pricing.rate_per_km, pricing.rate_per_min,
    )

    booking = Booking(
        passenger_id=user.id,
        vehicle_id=data.vehicle_id,
        pickup_lat=data.pickup_lat,
        pickup_lng=data.pickup_lng,
        destination_lat=data.destination_lat,
        destination_lng=data.destination_lng,
        estimated_distance_km=round(distance, 2),
        estimated_time_min=round(time_min, 1),
        estimated_fare=fare,
        status=BookingStatus.requested,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/mine", response_model=List[BookingOut])
def my_bookings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(Booking)
        .filter(Booking.passenger_id == user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )


@router.patch("/{booking_id}/status", response_model=BookingOut)
def update_status(
    booking_id: int,
    status: BookingStatus,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.status = status
    if status == BookingStatus.completed:
        booking.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(booking)
    return booking
