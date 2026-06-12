"""Cross-market relationship and compound signal rules."""
from __future__ import annotations


CROSS_MARKET_RELATIONSHIPS = {
    "WTI": {"affects": ["DIESEL", "GASOLINE", "WHEAT", "FREIGHT"], "affectedBy": ["BRENT", "COPPER", "GOLD", "DXY"], "leadLag": "Copper and BDI can lead crude demand shifts by 2-15 trading days.", "confirming": ["Brent moving with WTI", "gold up during geo risk", "inventory draws"], "contradicting": ["copper down", "BDI down", "USD/DXY spike"]},
    "BRENT": {"affects": ["JET FUEL", "DIESEL", "GASOLINE"], "affectedBy": ["WTI", "GOLD", "FREIGHT"], "leadLag": "Seaborne route stress can move Brent before WTI.", "confirming": ["WTI follows", "freight/tanker rates rise"], "contradicting": ["BDI falls while crude rises"]},
    "COPPER": {"affects": ["WTI demand expectations", "ALUMINUM", "FREIGHT"], "affectedBy": ["China PMI", "construction", "USD"], "leadLag": "Copper can lead crude by 2-5 trading days as an industrial demand signal.", "confirming": ["BDI up", "aluminum up"], "contradicting": ["gold up with crude flat/down"]},
    "GOLD": {"affects": ["safe-haven read-through", "silver"], "affectedBy": ["geo-risk", "real rates", "DXY"], "leadLag": "Gold often reprices before physical energy disruption is confirmed.", "confirming": ["crude up during supply risk", "silver up"], "contradicting": ["crude flat/down suggests risk-off not supply shock"]},
    "FREIGHT": {"affects": ["WTI demand", "WHEAT delivered costs", "consumer goods inflation"], "affectedBy": ["China trade", "Red Sea/chokepoints", "fuel costs"], "leadLag": "BDI/freight can lead crude demand softness by 1-3 weeks.", "confirming": ["copper same direction", "tanker rates"], "contradicting": ["shipping stress up while BDI flat/down = logistics shock"]},
    "NATGAS": {"affects": ["POWER", "FERTILIZER", "WHEAT", "COAL"], "affectedBy": ["storage", "weather", "LNG exports"], "leadLag": "Storage/weather shocks pass through to utility bills in 6-8 weeks.", "confirming": ["coal up", "power up"], "contradicting": ["storage surplus with price spike = temporary shock risk"]},
    "ALUMINUM": {"affects": ["manufacturing costs"], "affectedBy": ["power costs", "copper", "carbon"], "leadLag": "Power cost shocks affect aluminum faster than copper.", "confirming": ["power/gas up"], "contradicting": ["copper down"]},
    "WHEAT": {"affects": ["food inflation"], "affectedBy": ["diesel", "fertilizer/gas", "Black Sea freight"], "leadLag": "Energy and freight pass into food costs over 4-12 weeks.", "confirming": ["diesel up", "freight up"], "contradicting": ["diesel and freight down"]},
}


def _item(pool: list[dict], key: str) -> dict:
    key = key.upper()
    return next((p for p in pool if key in str(p.get("id", "")).upper() or key in str(p.get("name", "")).upper()), {})


def _direction(pool: list[dict], key: str) -> str:
    return (_item(pool, key).get("direction") or "flat").lower()


def _pct(pool: list[dict], key: str) -> float:
    try:
        return float(_item(pool, key).get("changePercent") or 0)
    except Exception:
        return 0.0


def evaluate_compound_signals(prices: list[dict], cross: list[dict], geo_items: list[dict], news_summary: dict, storage: dict | None = None) -> list[dict]:
    pool = [*(prices or []), *(cross or [])]
    crude_dir = _direction(pool, "WTI") or _direction(pool, "BRENT")
    gold_dir = _direction(pool, "GOLD")
    copper_dir = _direction(pool, "COPPER")
    freight_dir = _direction(pool, "FREIGHT")
    critical_geo = any(g.get("riskLevel") == "Critical" for g in (geo_items or []))
    active_chokepoint = any(any(k in str(g).lower() for k in ("red sea", "hormuz", "suez", "panama")) for g in (geo_items or []))
    rules = []

    def add(rule_id, meaning, action, bull=0, bear=0, confidence=70, watch=None):
        rules.append({
            "id": rule_id, "meaning": meaning, "action": action,
            "probabilityTilt": {"bull": bull, "bear": bear},
            "confidence": confidence, "watch": watch or [],
        })

    if critical_geo and crude_dir == "up" and gold_dir == "up":
        add("GEO-SUPPLY-CONFIRMATION", "Real geopolitical supply premium: crude and gold are confirming the same risk.", "Increase bull probability; hedge airlines, logistics, refiners, and fuel buyers.", bull=12, confidence=86, watch=["Brent above bull threshold", "tanker flow disruption", "gold holds safe-haven bid"])
    if copper_dir == "down" and freight_dir == "down" and crude_dir in ("down", "flat"):
        add("DEMAND-DESTRUCTION-SIGNAL", "Industrial demand weakness: copper and BDI/freight are both soft while crude lacks upside.", "Increase bear probability; crude holders reduce or monitor.", bear=12, confidence=84, watch=["China PMI", "BDI below bear threshold", "crude inventory builds"])
    if gold_dir == "up" and crude_dir in ("down", "flat") and _pct(pool, "GOLD") >= 0.4:
        add("RISK-OFF-DIVERGENCE", "Macro fear or recession-risk flight: gold is bid but crude is not confirming a supply shock.", "Gold hold/buy/monitor; crude wait/monitor until physical disruption is confirmed.", bear=7, confidence=78, watch=["DXY", "equity risk", "crude breakout failure"])
    if freight_dir in ("down", "flat") and active_chokepoint:
        add("FREIGHT-GEO-SPLIT", "Logistics cost shock rather than pure demand strength: chokepoint risk is active while BDI is not confirming demand.", "Hedge logistics/import costs; keep industrial demand view neutral.", bull=3, confidence=75, watch=["Red Sea insurance costs", "container spot rates", "BDI confirmation"])
    storage = storage or {}
    if storage.get("aboveFiveYearAverage") and _direction(pool, "NATGAS") == "up":
        add("STORAGE-PRICE-DIVERGENCE", "Gas storage is comfortable but price is rising, implying weather/export disruption rather than structural shortage.", "Flag temporary spike and watch reversal risk.", bull=3, bear=4, confidence=72, watch=["EIA weekly storage", "LNG feedgas", "weather forecast"])
    if (news_summary or {}).get("sentimentScore", 0) >= 0.45 and abs(_pct(pool, "WTI")) < 0.3:
        add("NEWS-PRICE-LAG", "News sentiment is ahead of price; headlines may not yet be fully repriced.", "Create early watchlist alert and require price confirmation.", bull=5, confidence=70, watch=["next settlement", "headline follow-through", "options skew"])
    return rules


def get_relationship(commodity: str) -> dict:
    key = str(commodity or "").upper()
    return CROSS_MARKET_RELATIONSHIPS.get(key, CROSS_MARKET_RELATIONSHIPS.get("WTI"))
