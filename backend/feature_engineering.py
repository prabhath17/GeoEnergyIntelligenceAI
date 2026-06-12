"""Feature engineering helpers for model-ready deterministic forecasts."""
from __future__ import annotations

import math
from datetime import datetime


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default


def engineer_features(price_item: dict, history: list[dict] | None = None, context: dict | None = None) -> dict:
    price = _safe_float(price_item.get("price"), 0.0)
    pct = _safe_float(price_item.get("changePercent"), 0.0)
    closes = [_safe_float(p.get("price", p.get("value")), None) for p in (history or [])]
    closes = [c for c in closes if c is not None and c > 0]
    if not closes and price > 0:
        closes = [price * (1 - pct / 100), price]
    returns = []
    for prev, curr in zip(closes, closes[1:]):
        if prev:
            returns.append((curr - prev) / prev)
    vol = (sum((r - (sum(returns) / len(returns))) ** 2 for r in returns) / len(returns)) ** 0.5 if returns else abs(pct) / 100
    ma5 = sum(closes[-5:]) / min(5, len(closes)) if closes else price
    ma20 = sum(closes[-20:]) / min(20, len(closes)) if closes else price
    ctx = context or {}
    return {
        "commodityId": price_item.get("id"),
        "logPrice": round(math.log(max(price, 0.0001)), 6),
        "dailyReturn": round(pct / 100, 5),
        "fiveDayReturn": round(((closes[-1] - closes[-5]) / closes[-5]) if len(closes) >= 5 and closes[-5] else pct / 100, 5),
        "twentyDayReturn": round(((closes[-1] - closes[-20]) / closes[-20]) if len(closes) >= 20 and closes[-20] else pct / 100, 5),
        "movingAverage5": round(ma5, 4),
        "movingAverage20": round(ma20, 4),
        "realizedVolatility": round(vol, 5),
        "seasonality": datetime.utcnow().strftime("%b"),
        "geoRiskScore": ctx.get("geoRiskScore", 0),
        "headlineCount": ctx.get("headlineCount", 0),
        "sentimentScore": ctx.get("sentimentScore", 0),
        "spreadFeatures": ctx.get("spreadFeatures", {}),
        "shockType": ctx.get("shockType", "market structure"),
    }


def build_spread_features(price_items: list[dict], cross_items: list[dict]) -> dict:
    pool = {str(p.get("id", "")).upper(): p for p in [*(price_items or []), *(cross_items or [])]}
    def px(key):
        return _safe_float((pool.get(key) or {}).get("price"), None)
    wti, brent, gold, silver, copper = px("WTI"), px("BRENT"), px("GOLD"), px("SILVER"), px("COPPER")
    diesel, gasoline = px("DIESEL"), px("GASOLINE")
    return {
        "brentWtiSpread": round(brent - wti, 3) if brent and wti else None,
        "goldSilverRatio": round(gold / silver, 2) if gold and silver else None,
        "goldCopperRatio": round(gold / copper, 2) if gold and copper else None,
        "dieselCrackProxy": round(diesel - wti / 42, 3) if diesel and wti else None,
        "gasolineCrackProxy": round(gasoline - wti / 42, 3) if gasoline and wti else None,
    }
