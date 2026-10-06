# Import every model here so that Base knows about all tables.
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.subscription import Subscription, SubscriptionPlan
from app.models.booking import Booking, BookingStatus
from app.models.rating import Rating
from app.models.pricing import PricingRule

__all__ = [
    "User",
    "UserRole",
    "Vehicle",
    "Subscription",
    "SubscriptionPlan",
    "Booking",
    "BookingStatus",
    "Rating",
    "PricingRule",
]
