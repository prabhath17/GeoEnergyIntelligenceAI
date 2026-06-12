"""Training Data Builder — assembles historical records for ML model training.

This module is Phase 2 ready. It defines:
- The training record schema
- Interfaces for building labeled datasets
- Backtesting period definitions
- Data validation checks

No training happens here — this is a data pipeline scaffold.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ── Training record schema ─────────────────────────────────────────────────────

TRAINING_RECORD_SCHEMA = {
    "commodity": str,           # Commodity ID (e.g. "WTI")
    "date": str,                # ISO date of observation
    "features": dict,           # Full feature vector from ml_feature_engine
    "label_7d": int,            # 1=up, 0=sideways, -1=down (7-day realized)
    "label_30d": int,           # 30-day realized direction
    "label_90d": int,           # 90-day realized direction
    "realized_return_7d": float,
    "realized_return_30d": float,
    "realized_return_90d": float,
    "realized_volatility": float,
    "volatility_regime": str,   # "High" | "Moderate" | "Low"
    "source": str,              # data source tag
    "split": str,               # "train" | "val" | "test"
}


def build_training_record(
    commodity: str,
    date: str,
    features: dict,
    realized_return_7d: Optional[float] = None,
    realized_return_30d: Optional[float] = None,
    realized_return_90d: Optional[float] = None,
) -> dict:
    """Build a single training record from feature vector + realized outcome.

    Args:
        commodity: Commodity ID.
        date: Observation date (ISO format).
        features: Feature vector from build_full_feature_vector().
        realized_return_*d: Realized price change % over horizon (labeled later).

    Returns:
        Training record dict conforming to TRAINING_RECORD_SCHEMA.
    """
    def label(ret: Optional[float]) -> Optional[int]:
        if ret is None:
            return None
        return 1 if ret > 1.0 else -1 if ret < -1.0 else 0

    return {
        "commodity": commodity,
        "date": date,
        "features": features,
        "label_7d": label(realized_return_7d),
        "label_30d": label(realized_return_30d),
        "label_90d": label(realized_return_90d),
        "realized_return_7d": realized_return_7d,
        "realized_return_30d": realized_return_30d,
        "realized_return_90d": realized_return_90d,
        "realized_volatility": None,  # computed from price series
        "volatility_regime": None,    # classified post-build
        "source": "gei_historical",
        "split": "unassigned",
        "createdAt": _now(),
    }


# ── Backtesting period definitions ────────────────────────────────────────────

BACKTEST_PERIODS = [
    {"id": "2008_gfc", "name": "2008 Global Financial Crisis", "start": "2008-07-01", "end": "2009-06-30", "type": "demand_shock", "commodities": ["WTI", "BRENT", "COPPER", "FREIGHT"]},
    {"id": "2011_arab_spring", "name": "2011 Arab Spring", "start": "2011-01-01", "end": "2011-12-31", "type": "geo_supply_shock", "commodities": ["WTI", "BRENT", "GOLD"]},
    {"id": "2014_opec_war", "name": "2014-2016 OPEC Production War", "start": "2014-06-01", "end": "2016-03-31", "type": "supply_surge", "commodities": ["WTI", "BRENT"]},
    {"id": "2019_abqaiq", "name": "2019 Abqaiq Attack", "start": "2019-09-01", "end": "2019-12-31", "type": "geo_supply_shock", "commodities": ["WTI", "BRENT", "GOLD"]},
    {"id": "2020_covid", "name": "2020 COVID Oil Collapse", "start": "2020-01-01", "end": "2020-12-31", "type": "demand_shock", "commodities": ["WTI", "BRENT", "COPPER", "FREIGHT"]},
    {"id": "2022_russia_ukraine", "name": "2022 Russia-Ukraine Energy Crisis", "start": "2022-02-01", "end": "2022-12-31", "type": "supply_shock_multi", "commodities": ["BRENT", "TTF", "WHEAT", "GOLD", "ALUMINUM"]},
    {"id": "2022_eu_gas", "name": "2022 EU Gas / TTF Crisis", "start": "2022-06-01", "end": "2022-12-31", "type": "storage_crisis", "commodities": ["TTF", "POWER", "ALUMINUM"]},
    {"id": "2022_lithium_boom", "name": "2022 Lithium Boom", "start": "2022-01-01", "end": "2022-12-31", "type": "supply_shortage", "commodities": ["LITHIUM", "COPPER"]},
    {"id": "2023_lithium_crash", "name": "2023 Lithium Crash", "start": "2023-01-01", "end": "2024-06-30", "type": "oversupply", "commodities": ["LITHIUM"]},
    {"id": "2023_red_sea", "name": "2023-2024 Red Sea Houthi Disruption", "start": "2023-10-01", "end": "2024-06-30", "type": "shipping_disruption", "commodities": ["FREIGHT", "DIESEL", "WHEAT"]},
]


def get_backtest_periods(commodity: Optional[str] = None) -> list[dict]:
    """Return backtest periods, optionally filtered by commodity."""
    if commodity:
        cid = commodity.upper()
        return [p for p in BACKTEST_PERIODS if cid in p["commodities"]]
    return BACKTEST_PERIODS


# ── Dataset split logic ────────────────────────────────────────────────────────

def assign_split(date: str, train_cutoff: str = "2022-01-01", val_cutoff: str = "2023-06-01") -> str:
    """Assign train/val/test split based on date."""
    try:
        d = datetime.fromisoformat(date.replace("Z", "+00:00"))
        t = datetime.fromisoformat(train_cutoff + "T00:00:00+00:00")
        v = datetime.fromisoformat(val_cutoff + "T00:00:00+00:00")
        if d < t:
            return "train"
        if d < v:
            return "val"
        return "test"
    except Exception:
        return "train"


# ── Data validation ────────────────────────────────────────────────────────────

def validate_record(record: dict) -> tuple[bool, list[str]]:
    """Validate a training record for completeness."""
    errors = []
    required = ["commodity", "date", "features"]
    for field in required:
        if not record.get(field):
            errors.append(f"Missing required field: {field}")
    if record.get("features") and "_flat" not in record["features"]:
        errors.append("Feature vector missing '_flat' key for ML consumption")
    return len(errors) == 0, errors


# ── Training pipeline scaffold ────────────────────────────────────────────────

def describe_training_pipeline() -> dict:
    """Describe the training pipeline that should be implemented in Phase 2."""
    return {
        "status": "scaffold_ready",
        "phases": {
            "phase1_data_collection": {
                "description": "Collect historical price data for all commodities via EIA, Bloomberg, Quandl",
                "target_years": "2010-2026",
                "commodities": ["WTI", "BRENT", "NATGAS", "TTF", "DIESEL", "GOLD", "SILVER", "COPPER", "WHEAT", "URANIUM", "LITHIUM", "FREIGHT", "CARBON"],
                "status": "pending",
            },
            "phase2_feature_building": {
                "description": "Run build_full_feature_vector() for each day × commodity",
                "module": "ml_feature_engine.build_full_feature_vector",
                "status": "module_ready",
            },
            "phase3_labeling": {
                "description": "Compute realized returns for 7D / 30D / 90D horizons",
                "labels": ["direction_7d", "direction_30d", "direction_90d", "volatility_regime"],
                "status": "schema_defined",
            },
            "phase4_training": {
                "description": "Train XGBoost / LightGBM directional classifiers per commodity",
                "models": ["XGBoostClassifier", "LightGBMClassifier", "RandomForestClassifier"],
                "backtest_periods": [p["id"] for p in BACKTEST_PERIODS],
                "status": "pending",
            },
            "phase5_evaluation": {
                "description": "Evaluate model performance using model_metrics.py",
                "metrics": ["accuracy", "roc_auc", "f1", "brier_score", "directional_accuracy"],
                "status": "module_ready",
            },
            "phase6_deployment": {
                "description": "Save model files to backend/models/ and restart API",
                "format": ["joblib (.pkl)", "ONNX (.onnx)", "JSON (.json)"],
                "status": "interface_ready",
            },
        },
        "estimatedTrainingTime": "2-4 hours for full historical dataset",
        "requiredLibraries": ["xgboost", "lightgbm", "scikit-learn", "shap", "pandas", "numpy"],
    }
