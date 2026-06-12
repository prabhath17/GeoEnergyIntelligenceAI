"""FastAPI routes for model-ready prediction outputs."""
from __future__ import annotations

from fastapi import APIRouter

from adapters.price_adapter import fetch_prices
from adapters.news_adapter import fetch_news
from adapters.georisk_adapter import fetch_georisk
from model_registry import model_status
from prediction_engine import forecast_commodity, attribution
from rag_engine import list_analogues

router = APIRouter(prefix="/api/prediction", tags=["prediction"])


async def _context():
    prices_res = await fetch_prices()
    news_res = await fetch_news()
    geo_res = await fetch_georisk(news_res.get("items", []))
    return prices_res, news_res, geo_res


@router.get("/forecast/{commodity}")
async def forecast(commodity: str, horizon: str = "30D"):
    prices_res, news_res, geo_res = await _context()
    return forecast_commodity(
        commodity,
        prices_res.get("items", []),
        prices_res.get("crossMarketSignals", []),
        geo_res.get("items", []),
        news_res.get("items", []),
        horizon=horizon,
    )


@router.get("/snapshot")
async def snapshot():
    prices_res, news_res, geo_res = await _context()
    commodities = ["WTI", "BRENT", "NATGAS", "DIESEL", "GASOLINE", "GOLD", "SILVER", "COPPER", "ALUMINUM", "WHEAT", "URANIUM", "LITHIUM", "COAL", "FREIGHT", "CARBON"]
    forecasts = [
        forecast_commodity(c, prices_res.get("items", []), prices_res.get("crossMarketSignals", []), geo_res.get("items", []), news_res.get("items", []))
        for c in commodities
    ]
    return {"modelStatus": model_status(), "forecasts": forecasts, "count": len(forecasts)}


@router.get("/attribution/{commodity}")
async def forecast_attribution(commodity: str):
    prices_res, news_res, geo_res = await _context()
    fc = forecast_commodity(commodity, prices_res.get("items", []), prices_res.get("crossMarketSignals", []), geo_res.get("items", []), news_res.get("items", []))
    return attribution(commodity, fc)


@router.get("/analogues")
async def analogues():
    return {"items": list_analogues(), "mode": "RAG-ready structured knowledge base"}


@router.get("/accuracy")
async def accuracy():
    return {
        "status": "tracking_pending",
        "modelType": "model-ready deterministic forecast",
        "trainedWeightsAvailable": False,
        "message": "Accuracy tracking endpoint is ready; populate after trained model forecasts and realized outcomes are persisted.",
        "metrics": {"directionalAccuracy": None, "p50MAE": None, "p10P90Coverage": None, "lastBacktest": None},
    }
