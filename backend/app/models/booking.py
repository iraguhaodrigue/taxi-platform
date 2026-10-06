import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum

from app.database import Base


class BookingStatus(str, enum.Enum):
    requested = "requested"   # passenger asked for a taxi
    accepted = "accepted"     # driver accepted
    ongoing = "ongoing"       # trip has started
    completed = "completed"   # trip finished
    cancelled = "cancelled"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    passenger_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)

    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)

    estimated_distance_km = Column(Float, nullable=True)
    estimated_time_min = Column(Float, nullable=True)
    estimated_fare = Column(Float, nullable=True)
    final_fare = Column(Float, nullable=True)  # based on real distance after the trip

    status = Column(Enum(BookingStatus), default=BookingStatus.requested)

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
