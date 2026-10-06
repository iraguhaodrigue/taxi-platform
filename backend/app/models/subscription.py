import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum

from app.database import Base


class SubscriptionPlan(str, enum.Enum):
    weekly = "weekly"
    monthly = "monthly"
    annual = "annual"


# How many days each plan lasts, and a sample price (RWF).
PLAN_DETAILS = {
    SubscriptionPlan.weekly: {"days": 7, "price": 5000},
    SubscriptionPlan.monthly: {"days": 30, "price": 15000},
    SubscriptionPlan.annual: {"days": 365, "price": 120000},
}


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    plan = Column(Enum(SubscriptionPlan), nullable=False)
    price = Column(Float, nullable=False)

    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=False)
    is_active = Column(Integer, default=1)  # 1 = active, 0 = expired

    created_at = Column(DateTime, default=datetime.utcnow)
