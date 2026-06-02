"""
Run this to pull fresh 311 data and retrain the model.
Usage: python scripts/update_data.py
"""

import subprocess
import sys
from pathlib import Path
from datetime import datetime

def run_notebook(path):
    print(f"\n{'='*50}")
    print(f"Running {path}...")
    print(f"{'='*50}")
    result = subprocess.run([
        "jupyter", "nbconvert",
        "--to", "notebook",
        "--execute",
        "--inplace",
        "--ExecutePreprocessor.timeout=3600",
        path
    ], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"FAILED: {path}")
        print(result.stderr)
        sys.exit(1)
    
    print(f"✓ Done: {path}")

if __name__ == "__main__":
    start = datetime.now()
    print(f"Pipeline started at {start.strftime('%Y-%m-%d %H:%M')}")

    run_notebook("notebooks/00_ingest.ipynb")
    run_notebook("notebooks/02_feature_engineering.ipynb")
    run_notebook("notebooks/03_model_training.ipynb")

    elapsed = (datetime.now() - start).seconds // 60
    print(f"\n✓ Pipeline complete in {elapsed} minutes")
    print(f"  Notebook 01 skipped — parquet maintained by 00_ingest")