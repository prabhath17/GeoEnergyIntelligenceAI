"""Statistical benchmark metadata for GEI-Analyst v2.

Values are structured placeholders where a live historical warehouse is not yet
connected. They are intentionally explicit so future training jobs can replace
them without changing the analysis contract.
"""
from __future__ import annotations

from copy import deepcopy

from commodity_statistics_training import get_instrument_training, resolve_instrument_id
from statistics_engine import build_statistics_snapshot


BENCHMARKS = {
    "WTI": {
        "name": "WTI crude", "unit": "USD/bbl", "historicalMean": 72.0, "normalRange": [55.0, 90.0],
        "volatilityRange": [1.2, 3.5], "shockThresholds": {"low": 45.0, "high": 100.0},
        "bullThreshold": 90.0, "bearThreshold": 65.0, "passThroughLag": "3-6 weeks",
        "relatedCommodities": ["BRENT", "DIESEL", "GASOLINE", "GOLD", "DXY", "FREIGHT"],
        "regimeBehavior": "Supply shocks reprice quickly; demand shocks usually confirm through copper and freight first.",
    },
    "BRENT": {
        "name": "Brent crude", "unit": "USD/bbl", "historicalMean": 76.0, "normalRange": [60.0, 95.0],
        "volatilityRange": [1.1, 3.2], "shockThresholds": {"low": 50.0, "high": 105.0},
        "bullThreshold": 90.0, "bearThreshold": 75.0, "passThroughLag": "3-6 weeks",
        "relatedCommodities": ["WTI", "DIESEL", "GASOLINE", "GOLD", "FREIGHT"],
        "regimeBehavior": "More sensitive than WTI to seaborne logistics, Middle East risk, and Atlantic Basin supply stress.",
    },
    "NATGAS": {
        "name": "Henry Hub natural gas", "unit": "USD/MMBtu", "historicalMean": 3.2, "normalRange": [2.0, 4.5],
        "volatilityRange": [2.0, 6.0], "shockThresholds": {"low": 1.7, "high": 6.0},
        "bullThreshold": 3.5, "bearThreshold": 2.2, "passThroughLag": "6-8 weeks",
        "relatedCommodities": ["TTF", "COAL", "POWER", "WHEAT"],
        "regimeBehavior": "Weather, storage, LNG exports, and power-burn determine prompt volatility.",
    },
    "TTF": {
        "name": "EU TTF gas", "unit": "EUR/MWh", "historicalMean": 38.0, "normalRange": [20.0, 55.0],
        "volatilityRange": [3.0, 9.0], "shockThresholds": {"low": 15.0, "high": 85.0},
        "bullThreshold": 55.0, "bearThreshold": 25.0, "passThroughLag": "4-10 weeks",
        "relatedCommodities": ["NATGAS", "COAL", "CARBON", "ALUMINUM"],
        "regimeBehavior": "Storage deviations and LNG availability dominate; power and aluminum react through electricity costs.",
    },
    "DIESEL": {
        "name": "diesel / heating oil", "unit": "USD/gal or USc/gal", "historicalMean": 2.65, "normalRange": [2.1, 3.4],
        "volatilityRange": [1.4, 4.0], "shockThresholds": {"low": 1.8, "high": 4.2},
        "bullThreshold": 3.25, "bearThreshold": 2.2, "passThroughLag": "2-6 weeks",
        "relatedCommodities": ["WTI", "BRENT", "GASOLINE", "FREIGHT", "WHEAT"],
        "regimeBehavior": "Crack-spread stress passes rapidly into trucking, agriculture, and construction costs.",
    },
    "GASOLINE": {
        "name": "gasoline", "unit": "USD/gal", "historicalMean": 2.7, "normalRange": [2.0, 3.5],
        "volatilityRange": [1.2, 3.8], "shockThresholds": {"low": 1.8, "high": 4.1},
        "bullThreshold": 3.25, "bearThreshold": 2.25, "passThroughLag": "2-5 weeks",
        "relatedCommodities": ["WTI", "BRENT", "DIESEL"],
        "regimeBehavior": "Seasonality and refinery outages can dominate crude for several weeks.",
    },
    "GOLD": {
        "name": "gold", "unit": "USD/oz", "historicalMean": 1850.0, "normalRange": [1650.0, 2450.0],
        "volatilityRange": [0.7, 2.2], "shockThresholds": {"low": 1500.0, "high": 2600.0},
        "bullThreshold": 2400.0, "bearThreshold": 1800.0, "passThroughLag": "signal only",
        "relatedCommodities": ["SILVER", "WTI", "DXY", "COPPER"],
        "regimeBehavior": "Safe-haven bid confirms geo-risk or macro fear; divergence from crude flags risk-off demand concern.",
    },
    "SILVER": {
        "name": "silver", "unit": "USD/oz", "historicalMean": 24.0, "normalRange": [18.0, 32.0],
        "volatilityRange": [1.2, 3.5], "shockThresholds": {"low": 16.0, "high": 36.0},
        "bullThreshold": 31.0, "bearThreshold": 20.0, "passThroughLag": "signal only",
        "relatedCommodities": ["GOLD", "COPPER", "RENEWABLES"],
        "regimeBehavior": "Tracks gold in risk-off regimes but has industrial beta through solar demand.",
    },
    "COPPER": {
        "name": "copper", "unit": "USD/lb", "historicalMean": 4.0, "normalRange": [3.3, 4.8],
        "volatilityRange": [1.0, 3.0], "shockThresholds": {"low": 3.0, "high": 5.2},
        "bullThreshold": 4.7, "bearThreshold": 3.5, "passThroughLag": "2-5 trading days for sentiment, 2-5 weeks for costs",
        "relatedCommodities": ["ALUMINUM", "WTI", "BDI", "GOLD"],
        "regimeBehavior": "Industrial demand bellwether; can lead crude by 2-5 trading days when China/global demand changes.",
    },
    "ALUMINUM": {
        "name": "aluminum", "unit": "USD/t", "historicalMean": 2350.0, "normalRange": [2000.0, 2850.0],
        "volatilityRange": [1.0, 3.0], "shockThresholds": {"low": 1850.0, "high": 3200.0},
        "bullThreshold": 2800.0, "bearThreshold": 2050.0, "passThroughLag": "4-10 weeks",
        "relatedCommodities": ["COPPER", "POWER", "TTF", "CARBON"],
        "regimeBehavior": "More power-cost sensitive than copper because smelting is electricity intensive.",
    },
    "WHEAT": {
        "name": "wheat", "unit": "USc/bu", "historicalMean": 620.0, "normalRange": [500.0, 800.0],
        "volatilityRange": [1.2, 4.0], "shockThresholds": {"low": 430.0, "high": 950.0},
        "bullThreshold": 780.0, "bearThreshold": 520.0, "passThroughLag": "4-12 weeks",
        "relatedCommodities": ["DIESEL", "NATGAS", "FREIGHT"],
        "regimeBehavior": "Energy affects wheat through fertilizer, diesel, freight, and Black Sea logistics.",
    },
    "URANIUM": {
        "name": "uranium", "unit": "USD/lb or uranium ETF proxy", "historicalMean": 62.0, "normalRange": [45.0, 95.0],
        "volatilityRange": [1.0, 3.0], "shockThresholds": {"low": 38.0, "high": 110.0},
        "bullThreshold": 90.0, "bearThreshold": 55.0, "passThroughLag": "long-cycle contract market",
        "relatedCommodities": ["POWER", "CARBON", "NATGAS"],
        "regimeBehavior": "Policy and long-term nuclear contracting dominate spot volatility.",
    },
    "LITHIUM": {
        "name": "lithium", "unit": "carbonate proxy / ETF", "historicalMean": 45.0, "normalRange": [25.0, 70.0],
        "volatilityRange": [2.0, 6.0], "shockThresholds": {"low": 18.0, "high": 85.0},
        "bullThreshold": 65.0, "bearThreshold": 30.0, "passThroughLag": "12-18 months to EV prices",
        "relatedCommodities": ["COPPER", "SILVER", "RENEWABLES"],
        "regimeBehavior": "Oversupply cycles can persist until mine curtailments or EV sales reaccelerate.",
    },
    "COAL": {
        "name": "coal", "unit": "USD/t", "historicalMean": 120.0, "normalRange": [80.0, 170.0],
        "volatilityRange": [1.5, 4.5], "shockThresholds": {"low": 65.0, "high": 220.0},
        "bullThreshold": 165.0, "bearThreshold": 90.0, "passThroughLag": "4-10 weeks",
        "relatedCommodities": ["NATGAS", "TTF", "CARBON", "POWER"],
        "regimeBehavior": "Gas-to-coal switching and policy constraints define power-sector substitution.",
    },
    "FREIGHT": {
        "name": "Baltic Dry Index / freight", "unit": "Index", "historicalMean": 1800.0, "normalRange": [1200.0, 3000.0],
        "volatilityRange": [2.0, 7.0], "shockThresholds": {"low": 900.0, "high": 3500.0},
        "bullThreshold": 3000.0, "bearThreshold": 1500.0, "passThroughLag": "1-3 weeks to trade signal, 6-12 weeks to consumer goods",
        "relatedCommodities": ["WTI", "COPPER", "WHEAT", "COAL"],
        "regimeBehavior": "BDI weakness can lead crude demand softness by 1-3 weeks; chokepoint stress can lift costs without confirming demand.",
    },
    "DXY": {
        "name": "DXY / USD proxy", "unit": "Index", "historicalMean": 102.0, "normalRange": [95.0, 108.0],
        "volatilityRange": [0.3, 1.2], "shockThresholds": {"low": 92.0, "high": 112.0},
        "bullThreshold": 108.0, "bearThreshold": 96.0, "passThroughLag": "immediate financial conditions",
        "relatedCommodities": ["WTI", "GOLD", "COPPER"],
        "regimeBehavior": "Stronger USD is usually a headwind for dollar-priced commodities.",
    },
    "CARBON": {
        "name": "carbon / EU ETS", "unit": "EUR/t", "historicalMean": 70.0, "normalRange": [55.0, 95.0],
        "volatilityRange": [1.5, 4.5], "shockThresholds": {"low": 45.0, "high": 110.0},
        "bullThreshold": 90.0, "bearThreshold": 55.0, "passThroughLag": "4-12 weeks through power and industry",
        "relatedCommodities": ["COAL", "TTF", "POWER", "ALUMINUM"],
        "regimeBehavior": "Policy asset; higher carbon tightens coal economics and supports gas/renewables switching.",
    },
}


ALIASES = {
    "CRUDE-OIL": "WTI", "CRUDE": "WTI", "OIL": "WTI", "CL=F": "WTI",
    "NATURAL-GAS": "NATGAS", "GAS": "NATGAS", "NG=F": "NATGAS", "HENRY HUB": "NATGAS",
    "REFINED-PRODUCTS": "DIESEL", "HEATING-OIL": "DIESEL", "HO=F": "DIESEL",
    "RB=F": "GASOLINE", "GOLD": "GOLD", "GC=F": "GOLD", "SILVER": "SILVER",
    "COPPER": "COPPER", "HG=F": "COPPER", "WHEAT": "WHEAT", "URANIUM": "URANIUM",
    "LITHIUM": "LITHIUM", "COAL": "COAL", "ALUMINUM": "ALUMINUM", "ALUMINIUM": "ALUMINUM",
    "FREIGHT": "FREIGHT", "BDI": "FREIGHT", "CARBON": "CARBON", "ETS": "CARBON",
}


def resolve_commodity_id(value: str | None) -> str:
    return resolve_instrument_id(value)


def get_benchmark(commodity: str | None) -> dict:
    cid = resolve_commodity_id(commodity)
    training = get_instrument_training(cid)
    return {
        "name": training["displayName"],
        "unit": training["unit"],
        "historicalMean": training["longRunMean"],
        "normalRange": [training["typicalRangeLow"], training["typicalRangeHigh"]],
        "volatilityRange": [training["annualizedVolatilityBenchmark"] * 0.65, training["annualizedVolatilityBenchmark"] * 1.5],
        "shockThresholds": {
            "low": training["typicalRangeLow"],
            "high": training["typicalRangeHigh"],
        },
        "bullThreshold": training["regimeThresholds"].get("bull") or training["regimeThresholds"].get("safeHavenActive") or training["typicalRangeHigh"],
        "bearThreshold": training["regimeThresholds"].get("bear") or training["regimeThresholds"].get("geoRiskUnwindBelow") or training["typicalRangeLow"],
        "passThroughLag": training["consumerPassThroughLag"],
        "relatedCommodities": [c["pair"] for c in training.get("correlationPairs", [])[:6]],
        "regimeBehavior": " ".join(training.get("regimeInterpretationRules", [])[:2]),
        "primaryDataSource": training.get("primaryDataSource"),
        "liveTickerOrEndpoint": training.get("liveTickerOrEndpoint"),
    }


def classify_price(commodity: str | None, price: float | int | None, change_percent: float | int | None = 0) -> dict:
    cid = resolve_commodity_id(commodity)
    try:
        px = float(price)
    except Exception:
        px = float(get_benchmark(cid)["historicalMean"])
    try:
        chg = float(change_percent or 0)
    except Exception:
        chg = 0.0
    snapshot = build_statistics_snapshot(cid, px, None, "classification deterministic fallback")
    bm = get_benchmark(cid)
    sigma = snapshot["zScore12m"]
    regime = snapshot["regime"]
    vol = snapshot["volatilityRegime"].title()
    return {
        "commodity": cid,
        "benchmark": bm,
        "price": px,
        "sigma": sigma,
        "regime": regime,
        "volatilityRegime": vol,
        "passThroughLag": bm["passThroughLag"],
        "normalRange": bm["normalRange"],
        "thresholds": {
            "bull": bm["bullThreshold"],
            "bear": bm["bearThreshold"],
            "shockHigh": bm["shockThresholds"]["high"],
            "shockLow": bm["shockThresholds"]["low"],
        },
        "zScore12m": snapshot["zScore12m"],
        "rangePosition": snapshot["rangePosition"],
        "statisticalAnomaly": snapshot["statisticalAnomaly"],
        "deviationFromLongRunMean": snapshot["deviationFromLongRunMean"],
        "deviationFromTypicalRange": snapshot["deviationFromTypicalRange"],
        "correlationContext": snapshot["correlations"][:4],
        "historicalAnalogue": (snapshot["analogueEvents"] or [None])[0],
        "statisticalInterpretation": snapshot["statisticalInterpretation"],
        "modelDisclosure": snapshot["modelDisclosure"],
    }
