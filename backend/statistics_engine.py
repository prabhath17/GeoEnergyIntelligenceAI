"""Statistical state engine for GEI commodity benchmarks."""
from __future__ import annotations

import math
from datetime import datetime, timezone, timedelta
from statistics import mean, pstdev

import httpx

from commodity_statistics_training import (
    get_analogues,
    get_correlations,
    get_instrument_training,
    list_instruments,
    resolve_instrument_id,
)


HEADERS = {"User-Agent": "GeoEnergyIntelligenceAI/1.0"}

YAHOO_SYMBOLS = {
    "WTI": "CL=F",
    "BRENT": "BZ=F",
    "NATGAS": "NG=F",
    "DIESEL": "HO=F",
    "GOLD": "GC=F",
    "SILVER": "SI=F",
    "COPPER": "HG=F",
    "WHEAT": "ZW=F",
    "URANIUM": "URA",
    "LITHIUM": "LIT",
    "COAL": "KOL",
    "CARBON": "ICLN",
    "ALUMINUM": "AA",
    "FREIGHT": "BDRY",
}

FALLBACK_PRICE = {
    "WTI": 78.42, "BRENT": 82.15, "NATGAS": 2.34, "TTF": 10.8, "DIESEL": 2.72,
    "GOLD": 2341.20, "SILVER": 31.20, "COPPER": 4.52, "URANIUM": 86.40,
    "LITHIUM": 10800.0, "WHEAT": 582.40, "CARBON": 64.20, "ALUMINUM": 2285.0,
    "FREIGHT": 1842.0, "EU_POWER": 94.20,
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _pct(current: float, prior: float | None) -> float | None:
    if prior in (None, 0):
        return None
    return round((current - prior) / prior * 100, 2)


def _nearest_prior(points: list[dict], sessions_back: int) -> float | None:
    if len(points) <= sessions_back:
        return points[0]["price"] if points else None
    return points[-1 - sessions_back]["price"]


def _historic_volatility(points: list[dict], window: int = 30) -> float | None:
    values = [float(p["price"]) for p in points if p.get("price") not in (None, 0)]
    values = values[-(window + 1):]
    if len(values) < 3:
        return None
    returns = [math.log(values[i] / values[i - 1]) for i in range(1, len(values)) if values[i - 1] > 0 and values[i] > 0]
    if len(returns) < 2:
        return None
    avg = mean(returns)
    variance = sum((r - avg) ** 2 for r in returns) / len(returns)
    return round(math.sqrt(variance) * math.sqrt(252) * 100, 2)


def _z_score(current: float, points: list[dict], training: dict) -> float:
    values = [float(p["price"]) for p in points[-252:] if p.get("price") is not None]
    if len(values) >= 20:
        mu = mean(values)
        sd = pstdev(values) or max(abs(mu) * 0.05, 0.01)
    else:
        mu = float(training["longRunMean"])
        sd = max((float(training["typicalRangeHigh"]) - float(training["typicalRangeLow"])) / 2, 0.01)
    return round((current - mu) / sd, 2)


def _range_position(current: float, training: dict) -> float:
    low = float(training["typicalRangeLow"])
    high = float(training["typicalRangeHigh"])
    if high == low:
        return 50.0
    return round(max(0, min(100, (current - low) / (high - low) * 100)), 1)


def _classify_regime(cid: str, current: float, change_7d_abs: float | None, z_score: float, training: dict) -> tuple[str, list[dict]]:
    t = training["regimeThresholds"]
    triggers: list[dict] = []

    def add(name: str, active: bool, detail: str):
        triggers.append({"name": name, "active": bool(active), "detail": detail})

    regime = "NORMAL"
    if cid in ("WTI", "BRENT"):
        bull = current >= t.get("bull", 90)
        bear = current <= t.get("bear", 70)
        shock = abs(change_7d_abs or 0) >= t.get("shockWeeklyAbs", 10)
        two_sigma = abs(z_score) > 2 or abs(current - float(training["longRunMean"])) >= t.get("twoSigmaPriceDistanceFrom12mSma", 15)
        add("Bull threshold", bull, f"Above {t.get('bull')} {training['unit']} activates crude bull regime.")
        add("Bear threshold", bear, f"Below {t.get('bear')} {training['unit']} activates demand/supply bear regime.")
        add("Shock threshold", shock, f"Weekly absolute move over {t.get('shockWeeklyAbs')} {training['unit']} is a shock event.")
        add("2-sigma deviation", two_sigma, "Outside normal statistical band versus 12M/long-run anchor.")
        regime = "BULL" if bull else "BEAR" if bear else "SHOCK" if shock or two_sigma else "NORMAL"
    elif cid == "NATGAS":
        if current < t["surplusBelow"]:
            regime = "SURPLUS"
        elif current >= t["shock"]:
            regime = "SHOCK"
        elif current >= t["winterRisk"]:
            regime = "WINTER_RISK"
        elif current >= t["elevated"]:
            regime = "ELEVATED"
        else:
            regime = "NORMAL"
        add("Storage/weather regime", regime in ("WINTER_RISK", "SHOCK"), "Storage, weather and LNG exports define gas risk.")
    elif cid == "TTF":
        if current > t["crisisAbove"]:
            regime = "CRISIS"
        elif current >= t["highLow"]:
            regime = "HIGH"
        elif current >= t["elevatedLow"]:
            regime = "ELEVATED"
        elif current < t["surplusBelow"]:
            regime = "SURPLUS"
        else:
            regime = "NORMAL"
        add("TTF crisis threshold", current > t["crisisAbove"], f"Above {t['crisisAbove']} USD/MMBtu is crisis level.")
    elif cid == "GOLD":
        if current >= t["safeHavenActive"]:
            regime = "SAFE_HAVEN_ACTIVE"
        elif current <= t["geoRiskUnwindBelow"]:
            regime = "GEO_RISK_UNWIND"
        else:
            regime = "NORMAL"
        add("Safe-haven activation", current >= t["safeHavenActive"], f"Above {t['safeHavenActive']} USD/oz activates safe-haven regime.")
    elif cid == "SILVER":
        regime = "BULL" if current >= t["bull"] else "BEAR" if current <= t["bear"] else "NORMAL"
        add("Gold/silver ratio watch", False, "Ratio 60-85 is normal; above 85 alerts silver lag.")
    elif cid == "COPPER":
        regime = "BULL" if current >= t["bull"] else "BEAR" if current <= t["bear"] else "NORMAL"
        add("Industrial slowdown watch", False, "Sustained 60D drop greater than 15% flags industrial slowdown.")
    elif cid == "URANIUM":
        regime = "NUCLEAR_RENAISSANCE" if current >= t["nuclearRenaissance"] else "NORMAL"
        add("Nuclear renaissance threshold", current >= t["nuclearRenaissance"], "Sustained uranium above 90 USD/lb confirms nuclear contracting regime.")
    elif cid == "LITHIUM":
        regime = "FLOOR_WATCH" if current <= t["floorConfirmationBelow"] else "BOOM" if current >= t["boom"] else "NORMAL"
        add("Floor confirmation", current <= t["floorConfirmationBelow"], "Sustained below 10,000 USD/tonne forces mine curtailment watch.")
    elif cid == "WHEAT":
        regime = "BLACK_SEA_RISK_PREMIUM" if current >= t["blackSeaRisk"] else "BEAR" if current <= t["bear"] else "NORMAL"
        add("Black Sea premium", current >= t["blackSeaRisk"], "Above threshold implies supply/freight risk premium.")
    elif cid == "CARBON":
        regime = "POLICY_STRESS" if current >= t["policyStress"] else "WEAK_INDUSTRIAL_DEMAND" if current <= t["weakIndustrialDemand"] else "NORMAL"
        add("Policy asset regime", True, "EU ETS is policy-first; MSR and cap reform dominate.")
    elif cid == "ALUMINUM":
        regime = "BULL" if current >= t["bull"] else "BEAR" if current <= t["bear"] else "NORMAL"
        add("Smelter curtailment watch", False, "EU power >150 EUR/MWh for 3+ days raises aluminum supply risk.")
    elif cid == "FREIGHT":
        regime = "STRESS_LOW" if current < t["stressLowBelow"] else "STRESS_HIGH" if current > t["stressHighAbove"] else "NORMAL"
        add("Freight stress low", current < t["stressLowBelow"], "Below 1,500 signals demand stress-low.")
        add("Freight stress high", current > t["stressHighAbove"], "Above 3,000 signals freight stress-high.")
    elif cid == "EU_POWER":
        regime = "STRESS" if current > t["stressAbove"] else "POST_CRISIS" if current >= t["postCrisisLow"] else "NORMAL"
        add("EU power stress", current > t["stressAbove"], "Above 150 EUR/MWh for 3+ days stresses industry and aluminum.")

    if not triggers:
        add("Typical range", training["typicalRangeLow"] <= current <= training["typicalRangeHigh"], "Current price checked against PDF-trained typical range.")
    return regime, triggers


def _vol_regime(hv: float | None, benchmark: float) -> str:
    if hv is None:
        return "FALLBACK"
    if hv > benchmark * 1.5:
        return "ELEVATED"
    if hv < benchmark * 0.65:
        return "SUBDUED"
    return "NORMAL"


def _select_analogue(cid: str, regime: str, z_score: float) -> dict | None:
    candidates = get_analogues(cid)
    if not candidates:
        return None
    terms = {regime.lower(), "shock" if abs(z_score) > 2 else "normal"}
    best = candidates[0]
    best_score = -1
    for event in candidates:
        tags = " ".join(event.get("regimeTags", [])).lower()
        score = sum(1 for term in terms if term in tags)
        if score > best_score:
            best = event
            best_score = score
    return {
        **best,
        "currentSimilarity": "High" if best_score > 0 or abs(z_score) > 1.5 else "Moderate",
        "keyDifference": "Current state uses deterministic statistical fallback until full historical model weights are trained.",
    }


def build_statistics_snapshot(instrument: str, current_price: float | None = None, points: list[dict] | None = None, source_status: str = "statistical fallback") -> dict:
    cid = resolve_instrument_id(instrument)
    training = get_instrument_training(cid)
    points = list(points or [])
    current = float(current_price if current_price is not None else (points[-1]["price"] if points else FALLBACK_PRICE.get(cid, training["longRunMean"])))
    if not points:
        points = _fallback_points(cid, current)
    if points[-1].get("price") != current:
        points[-1] = {**points[-1], "price": current}

    change_7d = _pct(current, _nearest_prior(points, 7))
    change_30d = _pct(current, _nearest_prior(points, min(30, len(points) - 1)))
    change_90d = _pct(current, _nearest_prior(points, min(90, len(points) - 1)))
    change_1y = _pct(current, _nearest_prior(points, min(252, len(points) - 1)))
    prior_7 = _nearest_prior(points, 7)
    change_7d_abs = round(current - prior_7, 2) if prior_7 is not None else None
    hv30 = _historic_volatility(points, 30)
    z = _z_score(current, points, training)
    regime, triggers = _classify_regime(cid, current, change_7d_abs, z, training)
    vol_regime = _vol_regime(hv30, float(training["annualizedVolatilityBenchmark"]))
    low = float(training["typicalRangeLow"])
    high = float(training["typicalRangeHigh"])
    long_mean = float(training["longRunMean"])
    anomaly = abs(z) > 2
    outside_range = current < low or current > high
    near_ath = abs(current - float(training["allTimeHigh"])) / max(abs(float(training["allTimeHigh"])), 1) <= 0.08
    near_atl = abs(current - float(training["allTimeLow"])) / max(abs(float(training["allTimeLow"])), 1) <= 0.08
    analogue = _select_analogue(cid, regime, z)
    correlations = get_correlations(cid)
    interpretation = _interpret(training, current, regime, z, hv30, vol_regime, outside_range, analogue, correlations)

    return {
        "commodity": cid,
        "displayName": training["displayName"],
        "unit": training["unit"],
        "currentPrice": round(current, 4),
        "change7d": change_7d,
        "change30d": change_30d,
        "change90d": change_90d,
        "change1y": change_1y,
        "historicVolatility30d": hv30,
        "regime": regime,
        "zScore12m": z,
        "rangePosition": _range_position(current, training),
        "deviationFromLongRunMean": round((current - long_mean) / long_mean * 100, 2) if long_mean else None,
        "deviationFromTypicalRange": {
            "status": "above" if current > high else "below" if current < low else "inside",
            "distance": round(current - high, 2) if current > high else round(low - current, 2) if current < low else 0,
        },
        "statisticalAnomaly": anomaly,
        "volatilityRegime": vol_regime,
        "historicalExtreme": "near all-time high" if near_ath else "near all-time low" if near_atl else None,
        "benchmarkStats": {
            "longRunMean": training["longRunMean"],
            "typicalRangeLow": training["typicalRangeLow"],
            "typicalRangeHigh": training["typicalRangeHigh"],
            "allTimeHigh": training["allTimeHigh"],
            "allTimeHighDate": training["allTimeHighDate"],
            "allTimeLow": training["allTimeLow"],
            "allTimeLowDate": training["allTimeLowDate"],
            "annualisedVolBenchmark": training["annualizedVolatilityBenchmark"],
        },
        "regimeThresholds": training["regimeThresholds"],
        "regimeTriggers": triggers,
        "correlations": correlations,
        "leadLagRelationships": training["leadLagRelationships"],
        "relatedCommodities": [c["pair"] for c in correlations[:6]],
        "analogueEvents": [analogue] if analogue else [],
        "statisticalInterpretation": interpretation,
        "consumerPassThroughLag": training["consumerPassThroughLag"],
        "businessImpactNotes": training["businessImpactNotes"],
        "volatilityModelRecommendation": training["volatilityModelRecommendation"],
        "regimeInterpretationRules": training["regimeInterpretationRules"],
        "dataSource": training["primaryDataSource"],
        "liveTickerOrEndpoint": training["liveTickerOrEndpoint"],
        "dataSourceStatus": source_status,
        "modelDisclosure": "PDF-trained statistical benchmark layer with deterministic fallback until trained model weights and full historical warehouse are available.",
        "lastUpdated": _now(),
        "dataPoints": points[-260:],
    }


def _interpret(training: dict, current: float, regime: str, z: float, hv30: float | None, vol_regime: str, outside_range: bool, analogue: dict | None, correlations: list[dict]) -> str:
    state = "extreme" if abs(z) > 2 else "elevated" if current > training["typicalRangeHigh"] else "depressed" if current < training["typicalRangeLow"] else "normal"
    vol = f"30D historical volatility is {hv30:.1f}% versus the {training['annualizedVolatilityBenchmark']:.1f}% benchmark" if hv30 is not None else "30D volatility is using fallback path until enough history is available"
    analogue_text = f"Closest analogue is {analogue['eventName']}: {analogue['lesson']}" if analogue else "No strong historical analogue is available for this instrument."
    corr_text = f"Primary confirmation channel: {correlations[0]['pair']} ({correlations[0]['range']}) - {correlations[0]['condition']}" if correlations else "Correlation context is limited for this instrument."
    range_text = "outside the PDF-trained typical range" if outside_range else "inside the PDF-trained typical range"
    return (
        f"{training['displayName']} is in a {state} statistical state and classified as {regime}; current price is {range_text} with Z-score {z}. "
        f"{vol}, so volatility is {vol_regime.lower()}. {analogue_text}. {corr_text}. "
        f"Watch next: {training['regimeInterpretationRules'][0]}"
    )


def _fallback_points(cid: str, current: float) -> list[dict]:
    training = get_instrument_training(cid)
    span = max((training["typicalRangeHigh"] - training["typicalRangeLow"]) * 0.06, abs(current) * 0.025, 0.5)
    today = datetime.now(timezone.utc)
    points = []
    for i in range(90):
        days_back = 89 - i
        wave = math.sin(i / 5.0) * span + math.cos(i / 11.0) * span * 0.45
        drift = (i / 89 - 1) * span * 0.6
        price = max(0.01, current + wave + drift)
        d = today.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_back)
        points.append({"date": (d).date().isoformat(), "price": round(price, 4)})
    points[-1]["price"] = round(current, 4)
    return points


async def fetch_yahoo_history(instrument: str, range_window: str = "1y") -> tuple[list[dict], str]:
    cid = resolve_instrument_id(instrument)
    sym = YAHOO_SYMBOLS.get(cid)
    if not sym:
        return [], "statistical fallback - no direct public ticker configured"
    yahoo_range = "5y" if str(range_window).lower() == "5y" else "1y"
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range={yahoo_range}"
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url, headers=HEADERS)
        result = (r.json().get("chart", {}).get("result") or [None])[0]
        if not result:
            raise ValueError("Yahoo returned no chart result")
        timestamps = result.get("timestamp", [])
        closes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        points = [
            {"date": datetime.fromtimestamp(ts, timezone.utc).date().isoformat(), "price": round(float(price), 4)}
            for ts, price in zip(timestamps, closes)
            if price is not None
        ]
        if len(points) < 5:
            raise ValueError("Insufficient Yahoo history")
        return points, "live Yahoo Finance history"
    except Exception:
        return [], "statistical fallback - live history unavailable"


async def get_statistics_snapshot(instrument: str, range_window: str = "1y") -> dict:
    cid = resolve_instrument_id(instrument)
    points, status = await fetch_yahoo_history(cid, range_window)
    current = points[-1]["price"] if points else FALLBACK_PRICE.get(cid)
    return build_statistics_snapshot(cid, current, points, status)


async def get_statistics_summary() -> dict:
    items = []
    for item in list_instruments():
        cid = item["commodity"]
        snap = build_statistics_snapshot(cid, FALLBACK_PRICE.get(cid), [], "summary deterministic fallback")
        items.append({
            "commodity": cid,
            "displayName": snap["displayName"],
            "unit": snap["unit"],
            "currentPrice": snap["currentPrice"],
            "regime": snap["regime"],
            "zScore12m": snap["zScore12m"],
            "volatilityRegime": snap["volatilityRegime"],
            "statisticalAnomaly": snap["statisticalAnomaly"],
            "rangePosition": snap["rangePosition"],
            "dataSource": snap["dataSource"],
        })
    strongest_deviation = max(items, key=lambda x: abs(x["zScore12m"]))
    return {
        "status": "ok",
        "mode": "PDF-trained deterministic statistical layer",
        "items": items,
        "strongestDeviation": strongest_deviation,
        "highestVolatilitySignal": max(items, key=lambda x: 1 if x["volatilityRegime"] == "ELEVATED" else 0),
        "lastUpdated": _now(),
    }
