import time
from fastapi import APIRouter, Query, HTTPException
import httpx

router = APIRouter(prefix="/geocode", tags=["geocode"])

# { lowercased_query -> (unix_timestamp, results_list) }
_cache: dict[str, tuple[float, list]] = {}
_CACHE_TTL = 300  # 5 minutes


@router.get("/search")
async def geocode_search(q: str = Query(..., min_length=2, description="Address to search")):
    """Forward-geocode an address via Nominatim, biased to Rwanda.

    Returns a list of {name, lat, lng} objects (up to 6).
    Results are cached for 5 minutes to avoid hammering the free API.
    """
    key = q.strip().lower()

    if key in _cache:
        ts, cached = _cache[key]
        if time.time() - ts < _CACHE_TTL:
            return cached

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": q,
                    "format": "json",
                    "limit": 6,
                    "countrycodes": "rw",
                    "addressdetails": "0",
                },
                headers={
                    "User-Agent": "TaxiBookingApp/1.0 contact:support@taxiplatform.rw",
                    "Accept-Language": "en",
                },
                timeout=6.0,
            )
            resp.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Geocoding service timed out")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Geocoding service error: {exc}")

    raw = resp.json()
    results = [
        {
            "name": item["display_name"],
            "lat": float(item["lat"]),
            "lng": float(item["lon"]),
        }
        for item in raw
    ]

    _cache[key] = (time.time(), results)
    return results
