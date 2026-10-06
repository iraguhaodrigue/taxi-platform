import math
import os
import logging

import httpx

logger = logging.getLogger(__name__)

OPENROUTESERVICE_API_KEY = os.getenv("OPENROUTESERVICE_API_KEY", "")
ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car"


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance in kilometres between two GPS points."""
    radius = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def estimate_time_min(distance_km: float, avg_speed_kmh: float = 25) -> float:
    """Rough travel time. 25 km/h is a safe city average for Kigali traffic."""
    if distance_km <= 0:
        return 0
    return (distance_km / avg_speed_kmh) * 60


def get_road_distance_and_time(
    lat1: float, lng1: float, lat2: float, lng2: float
) -> tuple[float, float]:
    """Return (distance_km, time_min) using OpenRouteService road routing.

    Falls back to haversine + city-speed estimate if the API key is absent
    or the call fails, so the app never breaks.
    """
    if not OPENROUTESERVICE_API_KEY:
        distance = haversine_km(lat1, lng1, lat2, lng2)
        return distance, estimate_time_min(distance)

    try:
        resp = httpx.post(
            ORS_URL,
            headers={
                "Authorization": OPENROUTESERVICE_API_KEY,
                "Content-Type": "application/json",
            },
            json={"coordinates": [[lng1, lat1], [lng2, lat2]]},
            timeout=5.0,
        )
        resp.raise_for_status()
        summary = resp.json()["routes"][0]["summary"]
        distance_km = summary["distance"] / 1000.0
        time_min = summary["duration"] / 60.0
        return distance_km, time_min
    except Exception as exc:
        logger.warning("OpenRouteService call failed (%s); falling back to haversine.", exc)
        distance = haversine_km(lat1, lng1, lat2, lng2)
        return distance, estimate_time_min(distance)


def estimate_fare(distance_km: float, time_min: float,
                  base_fare: float, rate_per_km: float, rate_per_min: float) -> float:
    """fare = base + (distance * per_km) + (time * per_min)"""
    fare = base_fare + (distance_km * rate_per_km) + (time_min * rate_per_min)
    return round(fare, 0)
