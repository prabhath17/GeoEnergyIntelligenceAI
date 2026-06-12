"""Future ML model registry with deterministic fallback status."""

MODEL_REGISTRY = {
    "price_direction_lstm": {"type": "LSTM", "status": "not_loaded", "purpose": "near-term price direction and level"},
    "multi_horizon_tft": {"type": "Temporal Fusion Transformer", "status": "not_loaded", "purpose": "P10/P50/P90 multi-horizon forecasts"},
    "volatility_garch": {"type": "GARCH/GJR-GARCH", "status": "not_loaded", "purpose": "volatility bands"},
    "news_finbert": {"type": "FinBERT", "status": "not_loaded", "purpose": "financial news sentiment"},
    "attribution_gbm": {"type": "XGBoost/LightGBM + SHAP", "status": "not_loaded", "purpose": "signal attribution"},
    "historical_rag": {"type": "RAG/vector DB", "status": "fallback_knowledge_base", "purpose": "historical analogues"},
}


def model_status() -> dict:
    return {"activeModel": "model-ready deterministic forecast", "models": MODEL_REGISTRY, "trainedWeightsAvailable": False}
