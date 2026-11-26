"""Map runtime configuration and temporary Hong Kong place search."""

from __future__ import annotations

import json
import os
import re
from typing import Literal

import requests
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/map")
HISTORICAL_YEARS = ("1963", "1976", "1982")
HK_BOUNDS = (113.83, 22.15, 114.45, 22.58)
PUBLIC_TOKEN = re.compile(r"pk\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")
TILESET_ID = re.compile(r"[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+")


def mapbox_enabled() -> bool:
    return os.getenv("VTN_MAPBOX_ENABLED") == "1"


def public_token(name: str) -> str:
    value = os.getenv(name, "").strip()
    return value if PUBLIC_TOKEN.fullmatch(value) else ""


def historical_sources(include_mapbox: bool) -> dict:
    try:
        sources = json.loads(os.getenv("VTN_MAP_HISTORY", "{}"))
    except ValueError:
        return {}
    if not isinstance(sources, dict):
        return {}
    result = {}
    for year in HISTORICAL_YEARS:
        entry = sources.get(year)
        if not isinstance(entry, dict):
            continue
        bounds = entry.get("bounds")
        if (not isinstance(bounds, list) or len(bounds) != 4
                or any(type(n) not in (int, float) for n in bounds)):
            continue
        west, south, east, north = bounds
        if not (-180 <= west < east <= 180 and -85 <= south < north <= 85):
            continue
        minzoom, maxzoom = entry.get("minzoom", 8), entry.get("maxzoom", 17)
        if (type(minzoom) is not int or type(maxzoom) is not int
                or not 0 <= minzoom <= maxzoom <= 22):
            continue
        tileset = entry.get("tileset", "")
        local = entry.get("local") is True
        layer = {"bounds": bounds, "minzoom": minzoom, "maxzoom": maxzoom, "local": local}
        if include_mapbox and isinstance(tileset, str) and TILESET_ID.fullmatch(tileset):
            layer["tileset"] = tileset
        if local or "tileset" in layer:
            result[year] = layer
    return result


@router.get("/config")
def map_config(response: Response):
    response.headers["Cache-Control"] = "no-store"
    token = public_token("VTN_MAPBOX_PUBLIC_TOKEN") if mapbox_enabled() else ""
    return {
        "mapbox": {"token": token} if token else None,
        "history": historical_sources(bool(token)),
        "geocoding": mapbox_enabled() and bool(public_token("VTN_MAPBOX_GEOCODING_TOKEN")),
    }


class PlaceQuery(BaseModel):
    query: str = Field(min_length=1, max_length=120)
    language: Literal["zh", "en"] = "zh"


@router.post("/geocode")
def geocode(place: PlaceQuery, response: Response):
    response.headers["Cache-Control"] = "no-store"
    token = public_token("VTN_MAPBOX_GEOCODING_TOKEN") if mapbox_enabled() else ""
    if not token:
        raise HTTPException(503, "Place search unavailable")
    query = place.query.strip()
    if not query or ";" in query or len(query.split()) > 20:
        raise HTTPException(422, "Invalid place name")
    try:
        upstream = requests.get(
            "https://api.mapbox.com/search/geocode/v6/forward",
            params={
                "q": query,
                "country": "HK",
                "bbox": ",".join(map(str, HK_BOUNDS)),
                "proximity": "114.1435,22.4965",
                "types": "locality,neighborhood,place",
                "language": place.language,
                "autocomplete": "false",
                "permanent": "false",
                "limit": 5,
                "access_token": token,
            },
            timeout=(2, 4),
            allow_redirects=False,
        )
        if upstream.status_code != 200:
            raise HTTPException(503, "Place search unavailable")
        payload = upstream.json()
    except (requests.RequestException, ValueError):
        raise HTTPException(503, "Place search unavailable") from None

    places = []
    west, south, east, north = HK_BOUNDS
    features = payload.get("features") if isinstance(payload, dict) else None
    if not isinstance(features, list):
        raise HTTPException(503, "Place search unavailable")
    for feature in features[:5]:
        if not isinstance(feature, dict):
            continue
        geometry = feature.get("geometry")
        properties = feature.get("properties")
        if not isinstance(geometry, dict) or not isinstance(properties, dict):
            continue
        coordinates = geometry.get("coordinates")
        if (geometry.get("type") != "Point" or not isinstance(coordinates, list)
                or len(coordinates) != 2):
            continue
        lng, lat = coordinates
        if (type(lng) not in (int, float) or type(lat) not in (int, float)
                or not (west <= lng <= east and south <= lat <= north)):
            continue
        label = properties.get("full_address") or properties.get("name")
        if isinstance(label, str) and label.strip():
            places.append({"label": label[:180], "center": [lng, lat]})
    return {"places": places}
