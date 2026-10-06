from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from app.models.user import UserRole
from app.models.subscription import SubscriptionPlan
from app.models.booking import BookingStatus


# ---------- Auth / Users ----------
class UserCreate(BaseModel):
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    password: str
    role: UserRole = UserRole.passenger


class UserOut(BaseModel):
    id: int
    full_name: str
    phone: str
    email: Optional[str] = None
    role: UserRole

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Vehicles ----------
class VehicleCreate(BaseModel):
    plate_number: str
    driver_name: str
    driver_phone: str
    photo_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class VehicleOut(BaseModel):
    id: int
    plate_number: str
    driver_name: str
    driver_phone: str
    photo_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_available: bool
    is_listed: bool

    class Config:
        from_attributes = True


class NearbyVehicleOut(VehicleOut):
    distance_km: float


# ---------- Subscriptions ----------
class SubscriptionCreate(BaseModel):
    vehicle_id: int
    plan: SubscriptionPlan


class SubscriptionOut(BaseModel):
    id: int
    vehicle_id: int
    plan: SubscriptionPlan
    price: float
    start_date: datetime
    end_date: datetime
    is_active: int

    class Config:
        from_attributes = True


# ---------- Fare ----------
class FareRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    destination_lat: float
    destination_lng: float


class FareEstimate(BaseModel):
    distance_km: float
    time_min: float
    fare: float


# ---------- Bookings ----------
class BookingCreate(BaseModel):
    vehicle_id: int
    pickup_lat: float
    pickup_lng: float
    destination_lat: float
    destination_lng: float


class BookingOut(BaseModel):
    id: int
    passenger_id: int
    vehicle_id: int
    status: BookingStatus
    estimated_distance_km: Optional[float] = None
    estimated_time_min: Optional[float] = None
    estimated_fare: Optional[float] = None
    final_fare: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Ratings ----------
class RatingCreate(BaseModel):
    booking_id: int
    stars: int
    comment: Optional[str] = None


class RatingOut(BaseModel):
    id: int
    vehicle_id: int
    stars: int
    comment: Optional[str] = None

    class Config:
        from_attributes = True
