"""Prediction engine interface with model-ready deterministic fallback."""
from __future__ import annotations

from datetime import datetime, timezone

from statistical_benchmarks import classify_price, resolve_commodity_id
from feature_engineering import engineer_features
from rag_engine import closest_analogue
from sentiment_engine import summarize_news
from signal_rules import evaluate_compound_signals


MODEL_VERSION = "GEI-Analyst-v2-statistical-fallback-2026-06"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _find_price(commodity: str, prices: list[dict], cross: list[dict]) -> dict:
    cid = resolve_commodity_id(commodity)
    pool = [*(prices or []), *(cross or [])]
    aliases = {
        "WTI": ("WTI", "CRUDE", "CL=F"), "BRENT": ("BRENT", "BZ=F"), "NATGAS": ("NATGAS", "NATURAL GAS", "NG=F"),
        "DIESEL": ("DIESEL", "HEATING"), "GASOLINE": ("GASOLINE",), "GOLD": ("GOLD", "GC=F"), "SILVER": ("SILVER",),
        "COPPER": ("COPPER",), "ALUMINUM": ("ALUMINUM", "ALUMINIUM"), "WHEAT": ("WHEAT",), "URANIUM": ("URANIUM",),
        "LITHIUM": ("LITHIUM",), "COAL": ("COAL",), "FREIGHT": ("FREIGHT", "BDI", "SHIPPING"), "CARBON": ("CARBON", "ETS"),
        "DXY": ("DXY", "USD"),
    }.get(cid, (cid,))
    for alias in aliases:
        hit = next((p for p in pool if alias in str(p.get("id", "")).upper() or alias in str(p.get("name", "")).upper()), None)
        if hit:
            return hit
    bm = classify_price(cid, None)["benchmark"]
    return {"id": cid, "name": bm["name"], "price": bm["historicalMean"], "unit": bm["unit"], "changePercent": 0, "direction": "flat", "source": "benchmark fallback"}


def forecast_commodity(commodity: str, prices: list[dict] | None = None, cross: list[dict] | None = None, geo_items: list[dict] | None = None, news_items: list[dict] | None = None, horizon: str = "30D", storage: dict | None = None) -> dict:
    price_item = _find_price(commodity, prices or [], cross or [])
    cid = resolve_commodity_id(price_item.get("id") or commodity)
    price = float(price_item.get("price") or classify_price(cid, None)["benchmark"]["historicalMean"])
    change = float(price_item.get("changePercent") or 0)
    news = summarize_news(news_items or [], cid)
    geo_score = max([float(g.get("riskScore") or 0) for g in (geo_items or [])] or [0])
    rules = evaluate_compound_signals(prices or [], cross or [], geo_items or [], news, storage)
    bench = classify_price(cid, price, change)
    features = engineer_features(price_item, context={"geoRiskScore": geo_score, "headlineCount": news["headlineCount"], "sentimentScore": news["sentimentScore"], "shockType": news["topEventType"]})
    bull_tilt = sum(r["probabilityTilt"]["bull"] for r in rules)
    bear_tilt = sum(r["probabilityTilt"]["bear"] for r in rules)
    momentum_tilt = max(-10, min(10, change * 2))
    bull = max(10, min(55, 28 + bull_tilt + max(0, momentum_tilt) + max(0, news["sentimentScore"] * 10)))
    bear = max(10, min(55, 22 + bear_tilt + max(0, -momentum_tilt) + max(0, -news["sentimentScore"] * 10)))
    base = max(25, 100 - bull - bear)
    total = base + bull + bear
    probs = {"base": round(base * 100 / total), "bull": round(bull * 100 / total), "bear": round(bear * 100 / total)}
    probs["base"] += 100 - sum(probs.values())
    sigma = abs(bench["sigma"])
    band = max(0.025, min(0.18, 0.035 + sigma * 0.025 + abs(change) / 220))
    directional_bias = (probs["bull"] - probs["bear"]) / 100
    p50 = price * (1 + directional_bias * band)
    p10 = price * (1 - band * (1.2 + probs["bear"] / 100))
    p90 = price * (1 + band * (1.2 + probs["bull"] / 100))
    direction = "up" if p50 > price * 1.005 else "down" if p50 < price * 0.995 else "flat"
    top_rule = rules[0]["id"] if rules else bench["regime"]
    confidence = max(45, min(88, 62 + len(rules) * 4 + (6 if price_item.get("source") != "benchmark fallback" else -6) - int(sigma * 2)))
    analogue = closest_analogue(cid, direction, geo_score, news["topEventType"], news["sentimentScore"], bench["volatilityRegime"])
    return {
        "commodityId": cid,
        "commodityName": bench["benchmark"]["name"],
        "currentPrice": round(price, 4),
        "unit": price_item.get("unit") or bench["benchmark"]["unit"],
        "forecastHorizon": horizon,
        "p10BearishForecast": round(p10, 4),
        "p50BaseForecast": round(p50, 4),
        "p90BullishForecast": round(p90, 4),
        "direction": direction,
        "confidence": confidence,
        "volatilityRegime": bench["volatilityRegime"],
        "sigma": bench["sigma"],
        "keyDrivers": [r["id"] for r in rules[:4]] or [bench["regime"], news["topEventType"]],
        "topDriver": top_rule,
        "scenarioProbabilities": probs,
        "benchmarkRegime": bench["regime"],
        "historicalAnalogue": analogue,
        "featureSnapshot": features,
        "modelVersion": MODEL_VERSION,
        "modelType": "model-ready deterministic forecast",
        "modelDisclosure": "Statistical fallback until trained model weights are available.",
        "generatedAt": _now(),
    }


def attribution(commodity: str, forecast: dict) -> dict:
    drivers = forecast.get("keyDrivers", [])
    weights = []
    remaining = 100
    for i, d in enumerate(drivers[:5]):
        w = max(8, 36 - i * 7)
        remaining -= w
        weights.append({"driver": d, "weight": w, "effect": "bullish" if "GEO" in d or "bull" in d.lower() else "bearish" if "DEMAND" in d else "mixed"})
    if remaining > 0:
        weights.append({"driver": "statistical benchmark regime", "weight": remaining, "effect": "normalizing"})
    return {"commodityId": forecast.get("commodityId") or resolve_commodity_id(commodity), "topDriver": forecast.get("topDriver"), "driverWeights": weights, "method": "deterministic SHAP-ready attribution fallback"}
