from fastapi import APIRouter, HTTPException
import json
import pickle
from pathlib import Path

router = APIRouter()

DATA_DIR = Path("data/processed")
MODEL_DIR = Path("models")

# Load type distribution lookup once at module level
_type_distribution = None

def get_type_distribution():
    global _type_distribution
    if _type_distribution is None:
        path = DATA_DIR / "type_distribution.json"
        if not path.exists():
            return {}
        with open(path) as f:
            _type_distribution = json.load(f)
    return _type_distribution


@router.get("/predict/type")
def predict_type(borough: str, season: str, time_bucket: str):
    """Return complaint type distribution for a borough/season/time combination."""
    distribution = get_type_distribution()
    key = f"{borough.upper()}|{season}|{time_bucket}"
    result = distribution.get(key)

    if not result:
        raise HTTPException(status_code=404, detail=f"No distribution data for: {key}")

    return {
        "borough": borough,
        "season": season,
        "time_bucket": time_bucket,
        "distribution": result,
    }



@router.get("/accuracy")
def get_accuracy():
    """Return full accuracy log for the frontend chart."""
    log_path = DATA_DIR / "accuracy_log.json"
    if not log_path.exists():
        raise HTTPException(status_code=404, detail="No accuracy data yet. Run the backfill first.")

    with open(log_path) as f:
        log = json.load(f)

    if not log:
        raise HTTPException(status_code=404, detail="Accuracy log is empty.")

    # Summary stats
    rmse_values = [e["rmse"] for e in log]
    mae_values = [e["mae"] for e in log]

    # Recent trend — last 4 weeks vs previous 4
    recent = rmse_values[-4:] if len(rmse_values) >= 4 else rmse_values
    previous = rmse_values[-8:-4] if len(rmse_values) >= 8 else rmse_values
    trend = "improving" if sum(recent) / len(recent) < sum(previous) / len(previous) else "degrading"

    return {
        "entries": log,
        "summary": {
            "total_weeks": len(log),
            "avg_rmse": round(sum(rmse_values) / len(rmse_values), 3),
            "avg_mae": round(sum(mae_values) / len(mae_values), 3),
            "best_rmse": round(min(rmse_values), 3),
            "worst_rmse": round(max(rmse_values), 3),
            "recent_trend": trend,
            "latest_week": log[-1]["week_start"],
        }
    }


@router.get("/pipeline/status")
def get_pipeline_status():
    """Return pipeline run history and model metadata."""
    pipeline_log_path = DATA_DIR / "pipeline_runs.json"
    metadata_path = MODEL_DIR / "model_metadata.pkl"

    pipeline_runs = []
    if pipeline_log_path.exists():
        with open(pipeline_log_path) as f:
            pipeline_runs = json.load(f)

    metadata = {}
    if metadata_path.exists():
        with open(metadata_path, "rb") as f:
            metadata = pickle.load(f)

    return {
        "model_metadata": metadata,
        "recent_runs": pipeline_runs[-10:],
        "total_runs": len(pipeline_runs),
        "last_run": pipeline_runs[-1] if pipeline_runs else None,
    }