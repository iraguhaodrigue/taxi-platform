from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.booking import Booking
from app.models.subscription import Subscription
from app.models.pricing import PricingRule
from app.schemas import UserOut, VehicleOut, BookingOut, SubscriptionOut
from app.core.security import require_role

router = APIRouter(prefix="/admin", tags=["admin"])

# Every route here requires an admin login.
admin_only = require_role("admin")


@router.get("/users", response_model=List[UserOut])
def all_users(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    return db.query(User).all()


@router.get("/vehicles", response_model=List[VehicleOut])
def all_vehicles(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    return db.query(Vehicle).all()


@router.get("/bookings", response_model=List[BookingOut])
def all_bookings(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    return db.query(Booking).order_by(Booking.created_at.desc()).all()


@router.get("/subscriptions", response_model=List[SubscriptionOut])
def all_subscriptions(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    return db.query(Subscription).all()


@router.get("/reports/summary")
def summary(db: Session = Depends(get_db), _: User = Depends(admin_only)):
    """Simple report numbers for the admin dashboard."""
    return {
        "total_users": db.query(User).count(),
        "total_vehicles": db.query(Vehicle).count(),
        "listed_vehicles": db.query(Vehicle).filter(Vehicle.is_listed == True).count(),  # noqa: E712
        "total_bookings": db.query(Booking).count(),
        "active_subscriptions": db.query(Subscription).filter(Subscription.is_active == 1).count(),
    }


@router.put("/pricing")
def update_pricing(
    base_fare: float,
    rate_per_km: float,
    rate_per_min: float,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    pricing = db.query(PricingRule).first()
    if not pricing:
        raise HTTPException(status_code=404, detail="No pricing rule found")
    pricing.base_fare = base_fare
    pricing.rate_per_km = rate_per_km
    pricing.rate_per_min = rate_per_min
    db.commit()
    return {"message": "Pricing updated"}
