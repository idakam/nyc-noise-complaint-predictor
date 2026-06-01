from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import pickle

from routers import predict, accuracy

# Load models once at startup, share via app.state
def load_models():
    with open("models/complaint_volume_model.pkl", "rb") as f:
        volume_model = pickle.load(f)
    with open("models/feature_columns.pkl", "rb") as f:
        feature_columns = pickle.load(f)
    return volume_model, feature_columns

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.volume_model, app.state.feature_columns = load_models()
    print("Models loaded")
    yield
    print("Shutting down")

app = FastAPI(
    title="NYC 311 Noise Predictor API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your Vercel URL before going live
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api")
app.include_router(accuracy.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok"}