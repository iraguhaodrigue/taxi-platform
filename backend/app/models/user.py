import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Enum, Float
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, enum.Enum):
    passenger = "passenger"
    driver = "driver"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.passenger, nullable=False)

    # Driver live location (updated while a trip is active).
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    is_available = Column(Integer, default=0)  # 1 = available, 0 = not

    created_at = Column(DateTime, default=datetime.utcnow)

    vehicles = relationship("Vehicle", back_populates="owner")
