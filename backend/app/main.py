from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401  (imports all models so tables are created)
from app.routers import (
    auth, vehicles, subscriptions, search, fare, bookings, ratings, tracking, admin, geocode,
)

# Create all tables on startup (fine for development).
# For production, use a migration tool like Alembic.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Taxi Booking & Listing Platform API")

# Allow the mobile app and admin website to call this API.
# Tighten these origins before going live.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(subscriptions.router)
app.include_router(search.router)
app.include_router(fare.router)
app.include_router(bookings.router)
app.include_router(ratings.router)
app.include_router(tracking.router)
app.include_router(admin.router)
app.include_router(geocode.router)


@app.get("/")
def home():
    return {"message": "Taxi platform API is running. See /docs for all endpoints."}
