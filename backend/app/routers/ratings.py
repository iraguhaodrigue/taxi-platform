from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.booking import Booking
from app.models.rating import Rating
from app.schemas import RatingCreate, RatingOut
from app.core.security import get_current_user

router = APIRouter(prefix="/ratings", tags=["ratings"])


@router.post("", response_model=RatingOut)
def rate_trip(
    data: RatingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
    if not booking or booking.passenger_id != user.id:
        raise HTTPException(status_code=404, detail="Booking not found")
    if data.stars < 1 or data.stars > 5:
        raise HTTPException(status_code=400, detail="Stars must be 1 to 5")

    rating = Rating(
        booking_id=data.booking_id,
        passenger_id=user.id,
        vehicle_id=booking.vehicle_id,
        stars=data.stars,
        comment=data.comment,
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


@router.get("/vehicle/{vehicle_id}", response_model=List[RatingOut])
def vehicle_ratings(vehicle_id: int, db: Session = Depends(get_db)):
    return db.query(Rating).filter(Rating.vehicle_id == vehicle_id).all()
