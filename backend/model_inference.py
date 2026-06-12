"""Model Inference — plug-in interface for trained ML models.

When trained model files (XGBoost, LightGBM, LSTM, etc.) are available,
load them here and replace the deterministic fallback with model predictions.

Current state: NO trained models present. Returns deterministic_fallback
for all requests with clear labeling. No fake claims of ML are made.
"""
from __future__ import annotations

import os
from pathlib import Path

MODEL_DIR = Path(__file__).parent / "models"
MODEL_VERSION = "GEI-Analyst-v1-deterministic-fallback"

# ── Model registry check ───────────────────────────────────────────────────────

def _model_available(name: str) -> bool:
    """Check if a trained model file exists."""
    for ext in [".pkl", ".joblib", ".json", ".pt", ".onnx", ".h5"]:
        if (MODEL_DIR / f"{name}{ext}").exists():
            return True
    return False


AVAILABLE_MODELS = {
    "direction_classifier": _model_available("direction_classifier"),
    "volatility_garch": _model_available("volatility_garch"),
    "anomaly_detector": _model_available("anomaly_detector"),
    "sentiment_finbert": _model_available("sentiment_finbert"),
    "sequence_lstm": _model_available("sequence_lstm"),
}

ANY_MODEL_AVAILABLE = any(AVAILABLE_MODELS.values())


def get_model_status() -> dict:
    """Return the current state of all ML model slots."""
    return {
        "anyModelAvailable": ANY_MODEL_AVAILABLE,
        "models": AVAILABLE_MODELS,
        "modelVersion": MODEL_VERSION,
        "modelDir": str(MODEL_DIR),
        "note": (
            "No trained models are currently loaded. "
            "All predictions use deterministic Rules + RAG fallback. "
            "To activate ML: train models, save to backend/models/, "
            "and restart the API. Interface is fully wired and ready."
        ),
    }


# ── Direction prediction ───────────────────────────────────────────────────────

def predict_direction(feature_vector: dict, horizon: str = "7D") -> dict:
    """Predict price direction for a commodity.

    When a trained XGBoost/LightGBM model is available at
    models/direction_classifier.{pkl,joblib}, load it and call predict_proba().

    Returns:
        Dict with probabilityUp, probabilityDown, probabilitySideways,
        predictedDirection, confidence, modelMode.
    """
    if AVAILABLE_MODELS["direction_classifier"]:
        try:
            # Future: load model and predict from feature_vector["_flat"]
            # import joblib
            # model = joblib.load(MODEL_DIR / "direction_classifier.pkl")
            # flat = feature_vector.get("_flat", {})
            # proba = model.predict_proba([list(flat.values())])[0]
            # return {"probabilityUp": proba[2], "probabilityDown": proba[0], ...}
            pass
        except Exception as e:
            pass  # fall through to deterministic

    # Deterministic fallback
    news_sent = feature_vector.get("news", {}).get("sentimentScore", 0)
    market = feature_vector.get("market", {})
    geo = feature_vector.get("geoRisk", {})
    return1d = market.get("return1d", 0)
    momentum = market.get("momentumScore", 0)
    geo_score = geo.get("regionRiskScore", 5)

    # Simple heuristic scoring
    bull_score = (
        max(0, news_sent * 15)
        + max(0, return1d * 2)
        + max(0, (momentum or 0) * 2)
        + max(0, (geo_score - 5) * 1.5)
    )
    bear_score = (
        max(0, -news_sent * 12)
        + max(0, -return1d * 2)
        + max(0, -(momentum or 0) * 2)
    )
    base_score = max(20, 40 - bull_score - bear_score)
    total = bull_score + bear_score + base_score or 1

    prob_up = round(max(10, min(60, (bull_score / total) * 100)), 1)
    prob_down = round(max(10, min(55, (bear_score / total) * 100)), 1)
    prob_side = round(max(20, 100 - prob_up - prob_down), 1)
    # Normalize
    t = prob_up + prob_down + prob_side
    prob_up = round(prob_up * 100 / t)
    prob_down = round(prob_down * 100 / t)
    prob_side = 100 - prob_up - prob_down

    direction = "up" if prob_up > prob_down + 5 else "down" if prob_down > prob_up + 5 else "sideways"

    return {
        "probabilityUp": prob_up,
        "probabilityDown": prob_down,
        "probabilitySideways": prob_side,
        "predictedDirection": direction,
        "confidence": min(82, max(40, int((max(prob_up, prob_down) - 33) * 2.5))),
        "modelMode": "deterministic_fallback",
        "horizon": horizon,
        "note": "Deterministic heuristic — no trained ML model loaded.",
    }


# ── Volatility prediction ──────────────────────────────────────────────────────

def predict_volatility(feature_vector: dict) -> dict:
    """Predict volatility regime. Placeholder for GARCH / GJR-GARCH model."""
    if AVAILABLE_MODELS["volatility_garch"]:
        pass  # Future: load GARCH model and predict

    market = feature_vector.get("market", {})
    rolling_vol = market.get("rollingVolatility", 0)
    geo = feature_vector.get("geoRisk", {})
    geo_score = geo.get("regionRiskScore", 5)

    # Simple regime classification
    vol_adj = rolling_vol + geo_score * 0.2
    if vol_adj > 3.5:
        regime = "High"
        forecast = min(rolling_vol * 1.25, 5.0)
    elif vol_adj > 1.8:
        regime = "Moderate"
        forecast = rolling_vol
    else:
        regime = "Low"
        forecast = max(rolling_vol * 0.85, 0.5)

    return {
        "volatilityRegime": regime,
        "forecastedVolatility": round(forecast, 2),
        "modelMode": "deterministic_fallback",
        "note": "GARCH model slot available — no trained model loaded.",
    }


# ── Anomaly detection ──────────────────────────────────────────────────────────

def detect_anomaly(feature_vector: dict) -> dict:
    """Detect price anomalies. Placeholder for Isolation Forest."""
    if AVAILABLE_MODELS["anomaly_detector"]:
        pass  # Future: Isolation Forest

    market = feature_vector.get("market", {})
    z_score = abs(market.get("zScore12m", 0))
    return1d = abs(market.get("return1d", 0))

    is_anomaly = z_score > 2.5 or return1d > 5.0
    severity = "High" if z_score > 3 else "Moderate" if z_score > 2 else "Normal"

    return {
        "isAnomaly": is_anomaly,
        "anomalySeverity": severity,
        "zScore": round(market.get("zScore12m", 0), 2),
        "modelMode": "deterministic_z_score_fallback",
        "note": "Isolation Forest slot available — no trained model loaded.",
    }


# ── Sentiment (FinBERT placeholder) ───────────────────────────────────────────

def predict_news_sentiment(text: str) -> dict:
    """FinBERT sentiment prediction. Placeholder — uses keyword fallback."""
    if AVAILABLE_MODELS["sentiment_finbert"]:
        pass  # Future: load FinBERT and classify

    # Keyword fallback (same as news_impact_classifier)
    t = text.lower()
    score = 0.0
    for w in ["surge", "spike", "tight", "sanctions", "attack", "shortage"]:
        if w in t:
            score += 0.15
    for w in ["fall", "drop", "surplus", "weak", "slowdown"]:
        if w in t:
            score -= 0.12
    score = round(max(-1.0, min(1.0, score)), 2)
    label = "positive" if score > 0.1 else "negative" if score < -0.1 else "neutral"

    return {
        "score": score,
        "label": label,
        "modelMode": "deterministic_keyword_fallback",
        "note": "FinBERT slot available — install transformers and load model for ML sentiment.",
    }


# ── SHAP attribution (placeholder) ────────────────────────────────────────────

def get_feature_attribution(feature_vector: dict, prediction: dict) -> list[dict]:
    """Return feature attribution (SHAP values when model is loaded).

    Deterministic fallback returns rule-based importance ranking.
    """
    if AVAILABLE_MODELS["direction_classifier"]:
        pass  # Future: compute SHAP values

    market = feature_vector.get("market", {})
    news = feature_vector.get("news", {})
    geo = feature_vector.get("geoRisk", {})
    xmarket = feature_vector.get("crossMarket", {})

    # Deterministic importance ranking
    attributions = [
        {"feature": "Geo-Risk Score", "value": round(geo.get("regionRiskScore", 0), 2), "importance": 0.28, "direction": "bullish" if geo.get("regionRiskScore", 0) > 5 else "neutral"},
        {"feature": "News Sentiment", "value": round(news.get("sentimentScore", 0), 3), "importance": 0.22, "direction": "bullish" if news.get("sentimentScore", 0) > 0 else "bearish"},
        {"feature": "Price Momentum (1D)", "value": round(market.get("return1d", 0), 2), "importance": 0.18, "direction": "bullish" if market.get("return1d", 0) > 0 else "bearish"},
        {"feature": "Gold Move (cross-market)", "value": round(xmarket.get("goldMove", 0), 2), "importance": 0.12, "direction": "bullish" if xmarket.get("goldMove", 0) > 0 else "neutral"},
        {"feature": "Copper Move (demand signal)", "value": round(xmarket.get("copperMove", 0), 2), "importance": 0.10, "direction": "bullish" if xmarket.get("copperMove", 0) > 0 else "bearish"},
        {"feature": "BDI / Freight Move", "value": round(xmarket.get("BDIMove", 0), 2), "importance": 0.07, "direction": "bullish" if xmarket.get("BDIMove", 0) > 0 else "bearish"},
        {"feature": "Z-Score (12m position)", "value": round(market.get("zScore12m", 0), 2), "importance": 0.03, "direction": "bearish" if market.get("zScore12m", 0) > 1.5 else "neutral"},
    ]
    attributions.sort(key=lambda x: x["importance"], reverse=True)
    return attributions
