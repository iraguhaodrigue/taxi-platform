from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    plate_number = Column(String, unique=True, index=True, nullable=False)
    photo_url = Column(String, nullable=True)
    driver_name = Column(String, nullable=False)
    driver_phone = Column(String, nullable=False)

    # Where the taxi currently is. Used for the "taxi near me" search.
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    is_available = Column(Boolean, default=True)
    is_listed = Column(Boolean, default=False)  # becomes True with an active subscription

    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="vehicles")
