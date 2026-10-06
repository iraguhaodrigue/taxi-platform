from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.subscription import Subscription, PLAN_DETAILS
from app.schemas import SubscriptionCreate, SubscriptionOut
from app.core.security import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.post("", response_model=SubscriptionOut)
def subscribe(
    data: SubscriptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Buy a subscription so the vehicle becomes listed on the platform.

    NOTE: payment with MTN MoMo / Airtel Money is not wired yet.
    Claude Code can add the payment step before activating the subscription.
    """
    vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
    if not vehicle or vehicle.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    details = PLAN_DETAILS[data.plan]
    end_date = datetime.utcnow() + timedelta(days=details["days"])

    sub = Subscription(
        vehicle_id=data.vehicle_id,
        plan=data.plan,
        price=details["price"],
        end_date=end_date,
        is_active=1,
    )
    # Activating the subscription lists the taxi.
    vehicle.is_listed = True

    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/vehicle/{vehicle_id}", response_model=List[SubscriptionOut])
def vehicle_subscriptions(vehicle_id: int, db: Session = Depends(get_db)):
    return db.query(Subscription).filter(Subscription.vehicle_id == vehicle_id).all()
