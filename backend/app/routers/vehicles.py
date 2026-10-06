from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas import VehicleCreate, VehicleOut
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.post("", response_model=VehicleOut)
def add_vehicle(
    data: VehicleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("driver", "admin")),
):
    if db.query(Vehicle).filter(Vehicle.plate_number == data.plate_number).first():
        raise HTTPException(status_code=400, detail="Plate already registered")

    vehicle = Vehicle(owner_id=user.id, **data.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("/mine", response_model=List[VehicleOut])
def my_vehicles(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Vehicle).filter(Vehicle.owner_id == user.id).all()


@router.patch("/{vehicle_id}/location", response_model=VehicleOut)
def update_location(
    vehicle_id: int,
    lat: float,
    lng: float,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle or vehicle.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle.lat = lat
    vehicle.lng = lng
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.patch("/{vehicle_id}/availability", response_model=VehicleOut)
def set_availability(
    vehicle_id: int,
    available: bool,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle or vehicle.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle.is_available = available
    db.commit()
    db.refresh(vehicle)
    return vehicle
