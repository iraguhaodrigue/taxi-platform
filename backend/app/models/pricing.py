from sqlalchemy import Column, Integer, Float

from app.database import Base


class PricingRule(Base):
    """One row that holds the current pricing. Admin can edit these values.

    fare = base_fare + (distance_km * rate_per_km) + (time_min * rate_per_min)
    """
    __tablename__ = "pricing_rules"

    id = Column(Integer, primary_key=True, index=True)
    base_fare = Column(Float, nullable=False)
    rate_per_km = Column(Float, nullable=False)
    rate_per_min = Column(Float, nullable=False)
