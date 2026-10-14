import logging

import httpx
from fastapi import APIRouter

from app.config import settings
from app.core.fare_logic import haversine_km, estimate_time_min

logger = logging.getLogger(__name__)

router = APIRouter(tags=["directions"])

# GeoJSON variant returns the line as [lng, lat] coordinate pairs directly.
ORS_GEOJSON_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"

# Tiny in-memory cache keyed by rounded coordinates (~11 m at 4 decimals).
_cache: dict[tuple, dict] = {}
_CACHE_MAX = 500


def _straight_line(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> dict:
    """Fallback: a two-point line so the map always has something to draw."""
    distance = haversine_km(from_lat, from_lng, to_lat, to_lng)
    return {
        "distance_km": round(distance, 2),
        "duration_min": round(estimate_time_min(distance), 1),
        "points": [[from_lat, from_lng], [to_lat, to_lng]],
    }


def _remember(key: tuple, result: dict) -> None:
    if len(_cache) >= _CACHE_MAX:
        _cache.clear()
    _cache[key] = result


@router.get("/directions")
def directions(from_lat: float, from_lng: float, to_lat: float, to_lng: float):
    """Driving route between two points, for drawing a line on the map.

    Returns {distance_km, duration_min, points:[[lat,lng], ...]}.
    Falls back to a straight two-point line if the ORS key is empty or the
    call fails, so the apps never break. Results are cached in memory by
    rounded coordinates to avoid repeat calls.
    """
    key = (round(from_lat, 4), round(from_lng, 4), round(to_lat, 4), round(to_lng, 4))
    if key in _cache:
        return _cache[key]

    if not settings.OPENROUTESERVICE_API_KEY:
        result = _straight_line(from_lat, from_lng, to_lat, to_lng)
        _remember(key, result)
        return result

    try:
        resp = httpx.post(
            ORS_GEOJSON_URL,
            headers={
                "Authorization": settings.OPENROUTESERVICE_API_KEY,
                "Content-Type": "application/json",
            },
            json={"coordinates": [[from_lng, from_lat], [to_lng, to_lat]]},
            timeout=6.0,
        )
        resp.raise_for_status()
        feature = resp.json()["features"][0]
        coords = feature["geometry"]["coordinates"]  # [[lng, lat], ...]
        summary = feature["properties"]["summary"]
        result = {
            "distance_km": round(summary["distance"] / 1000.0, 2),
            "duration_min": round(summary["duration"] / 60.0, 1),
            "points": [[lat, lng] for lng, lat in coords],
        }
    except Exception as exc:
        logger.warning("ORS directions failed (%s); straight-line fallback.", exc)
        result = _straight_line(from_lat, from_lng, to_lat, to_lng)

    _remember(key, result)
    return result
