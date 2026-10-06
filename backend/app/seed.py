"""Fill the database with starting data for testing.

Run it once after setup:   python -m app.seed
It creates:
  - one pricing rule
  - one admin, one driver, one passenger
  - one listed taxi near Kigali city centre
Login phone / password for all three is shown at the end.
"""
from datetime import datetime, timedelta

from app.database import Base, engine, SessionLocal
from app import models  # noqa: F401
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.subscription import Subscription, SubscriptionPlan, PLAN_DETAILS
from app.models.pricing import PricingRule
from app.core.security import hash_password
from app.config import settings

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def seed():
    if db.query(PricingRule).first() is None:
        db.add(PricingRule(
            base_fare=settings.BASE_FARE,
            rate_per_km=settings.RATE_PER_KM,
            rate_per_min=settings.RATE_PER_MIN,
        ))

    if db.query(User).filter(User.phone == "0780000001").first() is None:
        admin = User(full_name="Admin", phone="0780000001",
                     hashed_password=hash_password("admin123"), role=UserRole.admin)
        driver = User(full_name="John Driver", phone="0780000002",
                      hashed_password=hash_password("driver123"), role=UserRole.driver)
        passenger = User(full_name="Alice Passenger", phone="0780000003",
                         hashed_password=hash_password("pass123"), role=UserRole.passenger)
        db.add_all([admin, driver, passenger])
        db.commit()
        db.refresh(driver)

        # A taxi near Kigali city centre, already listed and available.
        taxi = Vehicle(
            owner_id=driver.id,
            plate_number="RAD 123 A",
            driver_name="John Driver",
            driver_phone="0780000002",
            lat=-1.9441, lng=30.0619,
            is_available=True, is_listed=True,
        )
        db.add(taxi)
        db.commit()
        db.refresh(taxi)

        details = PLAN_DETAILS[SubscriptionPlan.monthly]
        db.add(Subscription(
            vehicle_id=taxi.id, plan=SubscriptionPlan.monthly,
            price=details["price"],
            end_date=datetime.utcnow() + timedelta(days=details["days"]),
            is_active=1,
        ))

    db.commit()
    print("Seed done.")
    print("Admin     -> phone 0780000001 / password admin123")
    print("Driver    -> phone 0780000002 / password driver123")
    print("Passenger -> phone 0780000003 / password pass123")


if __name__ == "__main__":
    seed()
    db.close()
