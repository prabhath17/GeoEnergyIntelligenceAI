"""Model Metrics — evaluation and monitoring for Rules + RAG and ML + RAG analysts.

Defines metric schemas, tracking endpoints, and evaluation criteria.
Actual computed metrics are populated when models are trained and run in production.
"""
from __future__ import annotations

from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ── Rules + RAG evaluation schema ─────────────────────────────────────────────

RULES_RAG_METRICS_SCHEMA = {
    "rulePrecision": None,          # % of triggered rules that proved correct
    "eventCoverage": None,          # % of market events captured by at least one rule
    "retrievalRelevance": None,     # RAG retrieval precision@5
    "answerCompleteness": None,     # % of required schema fields populated
    "hallucinationRate": None,      # % of outputs containing factual errors (human eval)
    "sourceCoverage": None,         # % of outputs citing at least one source
    "ruleActivationRate": None,     # avg rules triggered per analysis
    "modelMode": "rules_rag",
}

# ── ML + RAG evaluation schema ────────────────────────────────────────────────

ML_RAG_METRICS_SCHEMA = {
    # Classification metrics
    "directionalAccuracy": None,    # % correct directional predictions
    "rocAUC": None,                 # area under ROC curve (multi-class OvR)
    "f1Score": None,                # weighted F1
    "brierScore": None,             # probability calibration

    # Regression metrics (when predicting price level)
    "mae": None,                    # mean absolute error
    "rmse": None,                   # root mean squared error
    "mape": None,                   # mean absolute percentage error

    # Backtest metrics
    "sharpeRatio": None,            # strategy Sharpe from directional signals
    "maxDrawdown": None,            # max peak-to-trough in backtest
    "informationRatio": None,       # alpha vs buy-hold benchmark
    "hitRate": None,                # % of trades profitable
    "avgWinLossRatio": None,        # avg win / avg loss

    # Calibration and drift
    "calibrationError": None,       # ECE (expected calibration error)
    "featureDrift": None,           # distribution shift in features vs training
    "lastBacktest": None,
    "modelMode": "ml_rag",
}


# ── Metric tracking functions ─────────────────────────────────────────────────

def get_rules_metrics() -> dict:
    """Return current Rules + RAG metric state."""
    return {
        **RULES_RAG_METRICS_SCHEMA,
        "status": "tracking_pending",
        "description": "Rules + RAG analyst metrics. Populate after collecting ground truth outcomes.",
        "populatedAt": None,
        "trackingStartDate": None,
        "minSamplesForEval": 50,
        "readyForEval": False,
    }


def get_ml_metrics() -> dict:
    """Return current ML + RAG metric state."""
    return {
        **ML_RAG_METRICS_SCHEMA,
        "status": "pending_model_training",
        "description": "ML directional classifier metrics. Computed after training and backtesting.",
        "trainedModel": False,
        "lastEvalDate": None,
        "backtestPeriods": [
            {"id": "2022_russia_ukraine", "start": "2022-02-01", "end": "2022-12-31", "result": None},
            {"id": "2023_red_sea", "start": "2023-10-01", "end": "2024-06-30", "result": None},
            {"id": "2020_covid", "start": "2020-01-01", "end": "2020-12-31", "result": None},
        ],
        "readyForEval": False,
    }


def get_model_metadata(model_mode: str = "deterministic_fallback") -> dict:
    """Return standardized model metadata to include in every analysis output."""
    return {
        "modelVersion": "GEI-Analyst-v1.0",
        "modelMode": model_mode,
        "generatedAt": _now(),
        "dataFreshness": "live",
        "confidence": None,  # set by analysis engine
        "limitations": [
            "No trained ML models loaded — all predictions are deterministic rules + RAG.",
            "Historical analogues are manually curated (10 events) — expand with training data.",
            "News classification uses keyword rules only — FinBERT sentiment is not yet active.",
            "Feature vectors are model-ready but not yet consumed by trained classifiers.",
        ],
        "futureCapabilities": [
            "XGBoost / LightGBM directional prediction per commodity (7D / 30D / 90D)",
            "GARCH / GJR-GARCH volatility regime forecasting",
            "Isolation Forest anomaly detection",
            "FinBERT financial news sentiment classification",
            "LSTM / Temporal Fusion Transformer sequence forecasting",
            "SHAP feature attribution for explainability",
        ],
    }


def compute_directional_accuracy(predictions: list[dict], outcomes: list[dict]) -> dict:
    """Compute directional accuracy from prediction vs realized outcome pairs.

    Args:
        predictions: List of {commodity, date, predictedDirection, confidence}.
        outcomes: List of {commodity, date, realizedDirection, realizedReturn}.

    Returns:
        Accuracy metrics dict.
    """
    if not predictions or not outcomes:
        return {"status": "insufficient_data", "n": 0}

    outcome_map = {(o["commodity"], o["date"]): o for o in outcomes}
    correct = 0
    total = 0
    calibration_errors = []

    for pred in predictions:
        key = (pred.get("commodity"), pred.get("date"))
        outcome = outcome_map.get(key)
        if not outcome:
            continue
        total += 1
        if pred.get("predictedDirection") == outcome.get("realizedDirection"):
            correct += 1
        conf = pred.get("confidence", 50) / 100
        realized_correct = pred.get("predictedDirection") == outcome.get("realizedDirection")
        calibration_errors.append(abs(conf - (1.0 if realized_correct else 0.0)))

    accuracy = correct / total if total > 0 else None
    ece = sum(calibration_errors) / len(calibration_errors) if calibration_errors else None

    return {
        "n": total,
        "correct": correct,
        "directionalAccuracy": round(accuracy, 4) if accuracy is not None else None,
        "ece": round(ece, 4) if ece is not None else None,
        "computedAt": _now(),
        "status": "computed" if total >= 10 else "insufficient_data",
    }


def get_all_metrics() -> dict:
    """Return all metric states for the metrics API endpoint."""
    return {
        "rulesRag": get_rules_metrics(),
        "mlRag": get_ml_metrics(),
        "meta": get_model_metadata(),
        "generatedAt": _now(),
        "note": (
            "Metrics are tracking-ready. No predictions have been evaluated yet. "
            "Run the system in production for 4-6 weeks to accumulate enough samples for evaluation."
        ),
    }
