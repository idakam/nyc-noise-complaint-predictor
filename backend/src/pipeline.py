"""
NYC 311 Noise Complaint Pipeline
- Fetches new data from NYC Open Data
- Retrains model
- Logs predicted vs actual for accuracy tracking
"""

import pandas as pd
import numpy as np
import pickle
import json
import requests
from datetime import datetime, timedelta
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error

# Paths
DATA_DIR = Path("data/processed")
MODEL_DIR = Path("models")
ACCURACY_LOG = DATA_DIR / "accuracy_log.json"
PIPELINE_LOG = DATA_DIR / "pipeline_runs.json"

NYC_311_URL = "https://data.cityofnewyork.us/resource/erm2-nwe9.json"


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_accuracy_log() -> list:
    if ACCURACY_LOG.exists():
        with open(ACCURACY_LOG) as f:
            return json.load(f)
    return []


def save_accuracy_log(log: list):
    with open(ACCURACY_LOG, "w") as f:
        json.dump(log, f, indent=2, default=str)


def load_pipeline_log() -> list:
    if PIPELINE_LOG.exists():
        with open(PIPELINE_LOG) as f:
            return json.load(f)
    return []


def save_pipeline_log(log: list):
    with open(PIPELINE_LOG, "w") as f:
        json.dump(log, f, indent=2, default=str)


def load_models():
    with open(MODEL_DIR / "complaint_volume_model.pkl", "rb") as f:
        model = pickle.load(f)
    with open(MODEL_DIR / "feature_columns.pkl", "rb") as f:
        feature_columns = pickle.load(f)
    return model, feature_columns


def get_season(month: int) -> str:
    return {
        12: "Winter", 1: "Winter", 2: "Winter",
        3: "Spring", 4: "Spring", 5: "Spring",
        6: "Summer", 7: "Summer", 8: "Summer",
        9: "Fall", 10: "Fall", 11: "Fall",
    }[month]


# ── Step 1: Backfill accuracy log from existing data ─────────────────────────

def backfill_accuracy_log():
    """
    Populate accuracy log from existing aggregated data.
    Generates what the model WOULD have predicted vs what actually happened.
    Run once to get 6 months of history on day one.
    """
    print("Backfilling accuracy log from existing data...")

    df = pd.read_parquet(DATA_DIR / "aggregated_data.parquet")
    model, feature_columns = load_models()

    # Use last 6 months of data
    df["Week_Start"] = pd.to_datetime(df["Week_Start"])
    cutoff = df["Week_Start"].max() - timedelta(weeks=26)
    recent = df[df["Week_Start"] >= cutoff].copy()

    log = load_accuracy_log()
    logged_weeks = {entry["week_start"] for entry in log}

    new_entries = []
    for week_start, group in recent.groupby("Week_Start"):
        week_str = str(week_start.date())
        if week_str in logged_weeks:
            continue

        # Generate predictions for each row
        input_data = group[["Borough", "Neighborhood", "Season", "Day_of_Week", "Time_Bucket"]].copy()
        X = pd.get_dummies(input_data, drop_first=False)
        for col in feature_columns:
            if col not in X.columns:
                X[col] = 0
        X = X[feature_columns]

        predicted = model.predict(X)
        actual = group["Weekly_Complaints"].values

        rmse = float(np.sqrt(mean_squared_error(actual, predicted)))
        mae = float(np.mean(np.abs(actual - predicted)))

        new_entries.append({
            "week_start": week_str,
            "rmse": round(rmse, 3),
            "mae": round(mae, 3),
            "mean_actual": round(float(actual.mean()), 2),
            "mean_predicted": round(float(predicted.mean()), 2),
            "n_records": int(len(actual)),
            "source": "backfill",
        })

    log.extend(sorted(new_entries, key=lambda x: x["week_start"]))
    save_accuracy_log(log)
    print(f"  ✓ Added {len(new_entries)} weeks to accuracy log")
    return new_entries


# ── Step 2: Fetch new data from NYC Open Data ─────────────────────────────────

def fetch_new_records(last_run: str) -> pd.DataFrame:
    """Fetch noise complaints since last run date."""
    print(f"Fetching new records since {last_run}...")

    params = {
        "$where": f"created_date > '{last_run}' AND complaint_type like '%Noise%'",
        "$limit": 50000,
        "$order": "created_date DESC",
        "$select": "created_date,borough,descriptor,latitude,longitude,incident_zip",
    }

    response = requests.get(NYC_311_URL, params=params, timeout=30)
    response.raise_for_status()
    records = response.json()

    if not records:
        print("  No new records found")
        return pd.DataFrame()

    df = pd.DataFrame(records)
    print(f"  ✓ Fetched {len(df)} new records")
    return df


def clean_new_records(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and align new records to match existing data schema."""
    if df.empty:
        return df

    df["created_date"] = pd.to_datetime(df["created_date"])
    df["borough"] = df["borough"].str.upper().str.strip()
    df = df[df["borough"].isin(["BRONX", "BROOKLYN", "MANHATTAN", "QUEENS", "STATEN ISLAND"])]

    # Week start (Monday)
    df["Week_Start"] = df["created_date"].dt.to_period("W-SUN").dt.start_time
    df["Day_of_Week"] = df["created_date"].dt.weekday
    df["Month"] = df["created_date"].dt.month
    df["Season"] = df["Month"].map(get_season)
    df["Is_Weekend"] = df["Day_of_Week"].isin([5, 6]).astype(int)

    # Time bucket
    hour = df["created_date"].dt.hour
    df["Time_Bucket"] = pd.cut(
        hour,
        bins=[-1, 5, 11, 16, 20, 23],
        labels=["overnight", "morning", "afternoon", "evening", "night"]
    )

    df = df.rename(columns={"borough": "Borough"})
    return df


# ── Step 3: Retrain model ─────────────────────────────────────────────────────

def retrain_model():
    """Retrain on full updated dataset and save new pkl files."""
    print("Retraining model...")

    df = pd.read_parquet(DATA_DIR / "aggregated_data.parquet")

    feature_cols = ["Borough", "Neighborhood", "Season", "Day_of_Week", "Time_Bucket"]
    target_col = "Weekly_Complaints"

    X = pd.get_dummies(df[feature_cols], drop_first=False)
    y = df[target_col]

    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X, y)

    rmse = float(np.sqrt(mean_squared_error(y, model.predict(X))))
    print(f"  ✓ Model retrained — training RMSE: {rmse:.3f}")

    with open(MODEL_DIR / "complaint_volume_model.pkl", "wb") as f:
        pickle.dump(model, f)
    with open(MODEL_DIR / "feature_columns.pkl", "wb") as f:
        pickle.dump(X.columns.tolist(), f)

    # Save metadata
    metadata = {
        "last_trained": str(datetime.now().date()),
        "n_records": int(len(df)),
        "training_rmse": round(rmse, 3),
        "week_start_min": str(df["Week_Start"].min()),
        "week_start_max": str(df["Week_Start"].max()),
    }
    with open(MODEL_DIR / "model_metadata.pkl", "wb") as f:
        pickle.dump(metadata, f)

    print(f"  ✓ Models saved")
    return rmse, metadata


# ── Step 4: Log accuracy for new period ───────────────────────────────────────

def log_accuracy_for_period(df_new: pd.DataFrame):
    """Compare model predictions vs actuals for newly ingested data."""
    if df_new.empty:
        return

    model, feature_columns = load_models()
    log = load_accuracy_log()
    logged_weeks = {entry["week_start"] for entry in log}

    new_entries = []
    # Group by week
    for week_start, group in df_new.groupby("Week_Start"):
        week_str = str(week_start.date())
        if week_str in logged_weeks:
            continue
        if "Weekly_Complaints" not in group.columns:
            continue

        input_data = group[["Borough", "Neighborhood", "Season", "Day_of_Week", "Time_Bucket"]].copy()
        X = pd.get_dummies(input_data, drop_first=False)
        for col in feature_columns:
            if col not in X.columns:
                X[col] = 0
        X = X[feature_columns]

        predicted = model.predict(X)
        actual = group["Weekly_Complaints"].values

        rmse = float(np.sqrt(mean_squared_error(actual, predicted)))
        mae = float(np.mean(np.abs(actual - predicted)))

        new_entries.append({
            "week_start": week_str,
            "rmse": round(rmse, 3),
            "mae": round(mae, 3),
            "mean_actual": round(float(actual.mean()), 2),
            "mean_predicted": round(float(predicted.mean()), 2),
            "n_records": int(len(actual)),
            "source": "live",
        })

    log.extend(sorted(new_entries, key=lambda x: x["week_start"]))
    save_accuracy_log(log)
    print(f"  ✓ Logged accuracy for {len(new_entries)} new weeks")


# ── Main pipeline ─────────────────────────────────────────────────────────────

def run_pipeline():
    """Full pipeline: fetch → clean → retrain → log accuracy."""
    print(f"\n{'='*50}")
    print(f"Pipeline run: {datetime.now()}")
    print(f"{'='*50}\n")

    pipeline_log = load_pipeline_log()

    # Get last run date
    last_run = "2020-01-01"
    if pipeline_log:
        last_run = pipeline_log[-1]["run_date"]

    try:
        # 1. Fetch + clean new records
        raw = fetch_new_records(last_run)
        cleaned = clean_new_records(raw)

        # 2. Append to existing data if we have new records
        records_added = 0
        if not cleaned.empty:
            existing = pd.read_parquet(DATA_DIR / "aggregated_data.parquet")
            combined = pd.concat([existing, cleaned], ignore_index=True)
            combined = combined.drop_duplicates()
            combined.to_parquet(DATA_DIR / "aggregated_data.parquet", index=False)
            records_added = len(cleaned)
            print(f"  ✓ Appended {records_added} new records")

        # 3. Retrain
        rmse, metadata = retrain_model()

        # 4. Log accuracy
        log_accuracy_for_period(cleaned)

        # 5. Log this run
        pipeline_log.append({
            "run_date": str(datetime.now().date()),
            "records_added": records_added,
            "training_rmse": round(rmse, 3),
            "status": "success",
        })
        save_pipeline_log(pipeline_log)

        print(f"\n✅ Pipeline complete")
        return {"status": "success", "records_added": records_added, "rmse": rmse}

    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
        pipeline_log.append({
            "run_date": str(datetime.now().date()),
            "status": "failed",
            "error": str(e),
        })
        save_pipeline_log(pipeline_log)
        raise


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "backfill":
        backfill_accuracy_log()
    else:
        run_pipeline()