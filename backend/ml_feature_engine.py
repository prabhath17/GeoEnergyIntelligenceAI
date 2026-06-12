"""ML Feature Engine — model-ready feature vector construction for V2 (ML + RAG).

Builds standardized feature vectors for:
- XGBoost / LightGBM directional prediction
- GARCH volatility modeling
- Isolation Forest anomaly detection
- LSTM / TFT sequence forecasting (future)

No trained models are loaded here. This module prepares features only.
Model inference is handled by model_inference.py when models are available.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _safe(val, default: float = 0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


# ── Market features ────────────────────────────────────────────────────────────

def build_market_features(price_item: dict) -> dict:
    """Extract market-level features from a live price item."""
    price = _safe(price_item.get("price"))
    change_pct = _safe(price_item.get("changePercent"))
    return {
        "currentPrice": price,
        "return1d": change_pct,
        "return7d": _safe(price_item.get("change7d")),
        "return30d": _safe(price_item.get("change30d")),
        "return90d": _safe(price_item.get("change90d")),
        "rollingVolatility": _safe(price_item.get("volatility")),
        "movingAverageDistance": _safe(price_item.get("ma20Distance")),
        "zScore12m": _safe(price_item.get("zScore")),
        "percentilePosition": _safe(price_item.get("percentile")),
        "drawdown": _safe(price_item.get("drawdown")),
        "momentumScore": _safe(price_item.get("momentum")),
    }


# ── Spread features ────────────────────────────────────────────────────────────

def build_spread_features(prices: list[dict], cross: list[dict]) -> dict:
    """Compute cross-commodity spread features."""
    pool = {**{p.get("id", "").upper(): p for p in prices or []},
            **{p.get("id", "").upper(): p for p in cross or []}}

    def price(key: str) -> float:
        for k in [key, key.replace("_", ""), key.split("_")[0]]:
            item = pool.get(k.upper())
            if item:
                return _safe(item.get("price"))
        return 0.0

    brent = price("BRENT") or price("WTI")
    wti = price("WTI")
    diesel = price("DIESEL")
    gold = price("GOLD")
    silver = price("SILVER")
    nat_gas = price("NATGAS") or price("NATURAL GAS")
    copper = price("COPPER")
    wheat = price("WHEAT")
    bdi = price("FREIGHT") or price("BDI")
    power = price("POWER")
    carbon = price("CARBON")

    diesel_crack = (diesel * 42 - brent) if diesel and brent else 0  # $/bbl equivalent
    gasoline_crack = 0  # placeholder for RBOB - Brent
    gold_silver_ratio = (gold / silver) if silver > 0 else 0
    gold_oil_ratio = (gold / brent) if brent > 0 else 0
    gas_power_spread = (power - nat_gas * 3.412) if power and nat_gas else 0  # rough EUR/MWh spread

    return {
        "brentWtiSpread": round(brent - wti, 3) if brent and wti else 0,
        "dieselCrackSpread": round(diesel_crack, 2),
        "gasolineCrackSpread": gasoline_crack,
        "goldSilverRatio": round(gold_silver_ratio, 2),
        "goldOilRatio": round(gold_oil_ratio, 3),
        "gasPowerSpread": round(gas_power_spread, 2),
        "copperBDICorrelation": 0.0,  # computed externally when historical data available
        "futuresCurveProxy": 0.0,     # placeholder for futures term structure
    }


# ── News / sentiment features ──────────────────────────────────────────────────

def build_news_features(news_classified: dict, commodity_id: str) -> dict:
    """Build news/sentiment features from classifier output."""
    classified = news_classified.get("classified", [])
    commodity_items = [c for c in classified if commodity_id.upper() in [x.upper() for x in c.get("commodity", [])]]
    global_items = classified

    def avg_sentiment(items: list[dict]) -> float:
        if not items:
            return 0.0
        return round(sum(i.get("sentiment", 0) for i in items) / len(items), 3)

    return {
        "sentimentScore": avg_sentiment(commodity_items) if commodity_items else avg_sentiment(global_items),
        "commoditySpecificSentiment": avg_sentiment(commodity_items),
        "globalSentiment": avg_sentiment(global_items),
        "newsVolume": news_classified.get("count", 0),
        "impactScore": news_classified.get("avgRelevance", 0),
        "eventType": news_classified.get("topEventType", "market_structure"),
        "commodityTag": commodity_id,
        "geoRiskTag": any(c.get("geoRiskTag", False) for c in classified),
        "sourceCredibilityAvg": round(sum(c.get("sourceCredibility", 0.65) for c in classified) / max(1, len(classified)), 2),
        "recencyDecay": 1.0,
        "severity": news_classified.get("dominantDirection", "neutral"),
        "highImpactCount": news_classified.get("highImpactCount", 0),
    }


# ── Geo-risk features ──────────────────────────────────────────────────────────

def build_geo_features(geo_items: list[dict]) -> dict:
    """Build geo-risk feature vector from geo-risk items."""
    if not geo_items:
        return {
            "regionRiskScore": 0.0, "criticalEventCount": 0, "chokepointAffected": False,
            "shippingRouteRisk": 0.0, "sanctionRisk": False, "conflictRisk": False,
            "affectedCommodities": [],
        }

    chokepoints = ["hormuz", "suez", "red sea", "panama", "bosphorus", "malacca"]
    critical_events = [g for g in geo_items if g.get("riskLevel") in ("Critical", "High")]
    chokepoint_items = [g for g in geo_items if any(c in str(g).lower() for c in chokepoints)]
    sanction_items = [g for g in geo_items if any(s in str(g).lower() for s in ["sanction", "embargo", "restrict"])]
    conflict_items = [g for g in geo_items if any(c in str(g).lower() for c in ["war", "conflict", "missile", "attack"])]

    avg_risk = sum(_safe(g.get("riskScore", 5)) for g in geo_items) / len(geo_items)
    commodities_mentioned: set[str] = set()
    for g in geo_items:
        for c in g.get("affectedCommodities", []):
            commodities_mentioned.add(str(c).upper())

    return {
        "regionRiskScore": round(avg_risk, 2),
        "criticalEventCount": len(critical_events),
        "chokepointAffected": len(chokepoint_items) > 0,
        "shippingRouteRisk": min(10.0, len(chokepoint_items) * 2.5 + len(conflict_items) * 1.5),
        "sanctionRisk": len(sanction_items) > 0,
        "conflictRisk": len(conflict_items) > 0,
        "affectedCommodities": sorted(commodities_mentioned)[:8],
    }


# ── Cross-market features ──────────────────────────────────────────────────────

def build_cross_market_features(prices: list[dict], cross: list[dict]) -> dict:
    """Build cross-commodity signal features."""
    pool = [*(prices or []), *(cross or [])]

    def pct(key: str) -> float:
        all_items = [*(prices or []), *(cross or [])]
        for item in all_items:
            iid = str(item.get("id", "")).upper()
            if key.upper() in iid:
                return _safe(item.get("changePercent"))
        return 0.0

    return {
        "goldMove": pct("GOLD"),
        "copperMove": pct("COPPER"),
        "silverMove": pct("SILVER"),
        "wheatMove": pct("WHEAT"),
        "BDIMove": pct("FREIGHT") or pct("BDI"),
        "DXYMove": pct("DXY"),
        "naturalGasMove": pct("NATGAS") or pct("NATURAL GAS"),
        "powerMove": pct("POWER"),
        "aluminumMove": pct("ALUMINUM") or pct("ALUMINIUM"),
        "carbonMove": pct("CARBON") or pct("EUA"),
    }


# ── Fundamental features ───────────────────────────────────────────────────────

def build_fundamental_features(storage_data: dict, misc: dict) -> dict:
    """Build fundamental/macro feature vector."""
    return {
        "inventoryChange": _safe(storage_data.get("weeklyChange")),
        "storageLevel": _safe(storage_data.get("euFillRate")),
        "aboveFiveYearAverage": bool(storage_data.get("aboveFiveYearAverage", False)),
        "refineryUtilization": _safe(misc.get("refineryUtilization", 0.88)),
        "LNGExports": _safe(misc.get("lngExports", 0)),
        "weatherDeviation": _safe(misc.get("weatherDeviation", 0)),
        "powerDemand": _safe(misc.get("powerDemand", 0)),
        "nuclearCapacity": _safe(misc.get("nuclearCapacity", 0.75)),
        "carbonPrice": _safe(misc.get("carbonPrice", 0)),
    }


# ── Full feature vector ────────────────────────────────────────────────────────

def build_full_feature_vector(
    commodity_id: str,
    price_item: dict,
    prices: list[dict],
    cross: list[dict],
    geo_items: list[dict],
    news_classified: dict,
    storage_data: Optional[dict] = None,
    misc: Optional[dict] = None,
) -> dict:
    """Build model-ready feature vector for a single commodity.

    This is the primary interface for the ML prediction engine.
    When trained models exist, they consume this dict directly.
    """
    market = build_market_features(price_item)
    spreads = build_spread_features(prices, cross)
    news = build_news_features(news_classified, commodity_id)
    geo = build_geo_features(geo_items)
    xmarket = build_cross_market_features(prices, cross)
    fundamental = build_fundamental_features(storage_data or {}, misc or {})

    return {
        "commodityId": commodity_id,
        "generatedAt": _now(),
        "featureVersion": "GEI-features-v1.0",
        "market": market,
        "spreads": spreads,
        "news": news,
        "geoRisk": geo,
        "crossMarket": xmarket,
        "fundamental": fundamental,

        # Flattened keys for direct ML model consumption
        # (XGBoost/LightGBM expect flat dict or array)
        "_flat": {
            **{f"market_{k}": v for k, v in market.items()},
            **{f"spread_{k}": v for k, v in spreads.items()},
            **{f"news_{k}": v for k, v in news.items() if isinstance(v, (int, float, bool))},
            **{f"geo_{k}": v for k, v in geo.items() if isinstance(v, (int, float, bool))},
            **{f"xmkt_{k}": v for k, v in xmarket.items()},
            **{f"fund_{k}": v for k, v in fundamental.items() if isinstance(v, (int, float, bool))},
        },
    }
