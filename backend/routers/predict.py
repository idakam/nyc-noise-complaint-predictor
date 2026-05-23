from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from datetime import datetime
import pandas as pd

from src.prediction_utils import (
    load_clean_data,
    get_season,
    predict_from_date,
    predict_volume,
    generate_weekly_pattern,
    get_risk_level,
)

router = APIRouter()

# Load neighborhood data once at module level
df = load_clean_data()


# ── Request models ────────────────────────────────────────────────────────────

class DatePredictionRequest(BaseModel):
    borough: str
    neighborhood: str
    date: str        # ISO format: "2025-08-15"
    time_bucket: str # morning | afternoon | evening | night | overnight

class WeeklyPatternRequest(BaseModel):
    borough: str
    neighborhood: str
    date: str        # any date in the target week

class HotspotRequest(BaseModel):
    borough: str
    date: str
    time_bucket: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/boroughs")
def get_boroughs():
    """Return all boroughs and their neighborhoods."""
    boroughs = (
        df[df["Borough"] != "UNKNOWN"]
        .groupby("Borough")["Neighborhood"]
        .apply(lambda x: sorted(x.dropna().unique().tolist()))
        .to_dict()
    )
    return {"boroughs": boroughs}


@router.post("/predict/date")
def predict_date(body: DatePredictionRequest, request: Request):
    """Single prediction for a specific date, neighborhood, and time."""
    try:
        target_date = datetime.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    volume = predict_from_date(
        body.borough,
        body.neighborhood,
        target_date,
        body.time_bucket,
        request.app.state.volume_model,
        request.app.state.feature_columns,
    )

    risk = get_risk_level(volume)
    lower = max(0, volume - 2.88)
    upper = volume + 2.88

    return {
        "borough": body.borough,
        "neighborhood": body.neighborhood,
        "date": body.date,
        "day": target_date.strftime("%A"),
        "season": get_season(target_date),
        "time_bucket": body.time_bucket,
        "predicted_volume": round(volume, 1),
        "lower_bound": round(lower, 1),
        "upper_bound": round(upper, 1),
        "risk_level": risk,
    }


@router.post("/predict/weekly")
def predict_weekly(body: WeeklyPatternRequest, request: Request):
    """Full weekly pattern (7 days x 5 time buckets) for a neighborhood."""
    try:
        target_date = datetime.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    season = get_season(target_date)

    result_df = generate_weekly_pattern(
        body.borough,
        body.neighborhood,
        season,
        request.app.state.volume_model,
        request.app.state.feature_columns,
    )

    # Shape into {day: {time: volume}} for easy frontend consumption
    pattern = {}
    for _, row in result_df.iterrows():
        day = row["Day"]
        if day not in pattern:
            pattern[day] = {}
        pattern[day][row["Time"]] = round(row["Volume"], 1)

    peak = result_df.sort_values("Volume", ascending=False).head(5)
    peak_times = [
        {
            "day": r["Day"],
            "time": r["Time"],
            "volume": round(r["Volume"], 1),
        }
        for _, r in peak.iterrows()
    ]

    return {
        "borough": body.borough,
        "neighborhood": body.neighborhood,
        "season": season,
        "week_total": round(result_df["Volume"].sum(), 1),
        "pattern": pattern,
        "peak_times": peak_times,
    }


@router.post("/predict/hotspot")
def predict_hotspot(body: HotspotRequest, request: Request):
    """All neighborhoods in a borough with predicted volumes + coordinates."""
    try:
        target_date = datetime.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    season = get_season(target_date)
    day_of_week = target_date.weekday()

    borough_df = df[df["Borough"] == body.borough.upper()].copy()
    neighborhoods = borough_df["Neighborhood"].dropna().unique()

    results = []
    for neighborhood in neighborhoods:
        volume = predict_volume(
            body.borough.upper(),
            neighborhood,
            season,
            day_of_week,
            body.time_bucket,
            request.app.state.volume_model,
            request.app.state.feature_columns,
        )

        coords = (
            borough_df[borough_df["Neighborhood"] == neighborhood][["Latitude", "Longitude"]]
            .dropna()
        )
        if coords.empty:
            continue

        results.append({
            "neighborhood": neighborhood,
            "lat": round(coords["Latitude"].mean(), 6),
            "lon": round(coords["Longitude"].mean(), 6),
            "volume": round(volume, 1),
            "risk_level": get_risk_level(volume),
        })

    if not results:
        raise HTTPException(status_code=404, detail=f"No data found for borough: {body.borough}")

    max_volume = max(r["volume"] for r in results)
    results.sort(key=lambda x: x["volume"], reverse=True)

    return {
        "borough": body.borough,
        "date": body.date,
        "day": target_date.strftime("%A"),
        "season": season,
        "time_bucket": body.time_bucket,
        "max_volume": round(max_volume, 1),
        "neighborhoods": results,
    }