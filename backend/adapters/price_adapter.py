"""Price Adapter — Yahoo Finance → Alpha Vantage → EIA → mock fallback."""
import os
import time
import asyncio
import httpx
from datetime import datetime

HEADERS = {"User-Agent": "GeoEnergyIntelligenceAI/1.0"}
TIMEOUT = 7.0

MOCK_ITEMS = [
    {"id": "WTI",      "name": "WTI Crude",       "price": 78.42,  "unit": "USD/bbl",   "currency": "$", "change": 0.93,  "changePercent": 1.2,  "direction": "up",   "source": "Mock"},
    {"id": "BRENT",    "name": "Brent Crude",      "price": 82.15,  "unit": "USD/bbl",   "currency": "$", "change": 0.65,  "changePercent": 0.8,  "direction": "up",   "source": "Mock"},
    {"id": "NATGAS",   "name": "Natural Gas",      "price": 2.34,   "unit": "USD/MMBtu", "currency": "$", "change": -0.06, "changePercent": -2.4, "direction": "down", "source": "Mock"},
    {"id": "DIESEL",   "name": "Diesel",            "price": 124.50, "unit": "USc/gal",   "currency": "$", "change": 0,     "changePercent": 0.0,  "direction": "flat", "source": "Mock"},
    {"id": "GASOLINE", "name": "Gasoline",          "price": 2.58,   "unit": "USD/gal",   "currency": "$", "change": 0.01,  "changePercent": 0.5,  "direction": "up",   "source": "Mock"},
    {"id": "EU_POWER", "name": "Power Index (EU)",  "price": 94.20,  "unit": "EUR/MWh",   "currency": "€", "change": 2.82,  "changePercent": 3.1,  "direction": "up",   "source": "Mock"},
]

MOCK_CROSS_MARKET = [
    {"id": "GOLD",     "name": "Gold",            "price": 2341.20, "unit": "USD/oz",    "currency": "$", "change": 18.40, "changePercent":  0.8, "direction": "up",   "signalType": "Safe-Haven",         "whyItMatters": "Geopolitical fear / USD stress signal. Rising gold supports energy risk premium.",       "linkedSectors": ["Crude Oil", "Natural Gas"],       "aiConfidence": 82, "source": "Mock"},
    {"id": "SILVER",   "name": "Silver",          "price": 31.20,   "unit": "USD/oz",    "currency": "$", "change":  0.82, "changePercent":  2.7, "direction": "up",   "signalType": "Safe-Haven + Solar",  "whyItMatters": "Safe-haven bid + solar panel demand. Silver rising with gold confirms risk-off mood.",    "linkedSectors": ["Renewables", "Power"],             "aiConfidence": 74, "source": "Mock"},
    {"id": "COPPER",   "name": "Copper",          "price": 4.52,    "unit": "USD/lb",    "currency": "$", "change": -0.02, "changePercent": -0.4, "direction": "down", "signalType": "Industrial Demand",  "whyItMatters": "Global industrial health. Copper weakness signals China / EM demand slowdown.",          "linkedSectors": ["Power", "Renewables"],             "aiConfidence": 71, "source": "Mock"},
    {"id": "WHEAT",    "name": "Wheat",           "price": 582.40,  "unit": "USc/bu",    "currency": "",  "change":  6.80, "changePercent":  1.2, "direction": "up",   "signalType": "Food Inflation",      "whyItMatters": "Black Sea supply risk. Food inflation feeds broad CPI and energy demand pressure.",      "linkedSectors": ["Crude Oil", "Natural Gas"],       "aiConfidence": 68, "source": "Mock"},
    {"id": "URANIUM",  "name": "Uranium",         "price": 86.40,   "unit": "USD/lb",    "currency": "$", "change":  1.80, "changePercent":  2.1, "direction": "up",   "signalType": "Nuclear Security",    "whyItMatters": "Nuclear power renaissance. Energy security re-rating driving long-term demand.",         "linkedSectors": ["Power"],                          "aiConfidence": 77, "source": "Mock"},
    {"id": "LITHIUM",  "name": "Lithium",         "price": 42.80,   "unit": "USD/share", "currency": "$", "change": -0.78, "changePercent": -1.8, "direction": "down", "signalType": "EV Supply Chain",     "whyItMatters": "EV battery demand and clean energy storage. Oversupply currently weighing on price.",    "linkedSectors": ["Renewables", "Power"],             "aiConfidence": 65, "source": "Mock"},
    {"id": "COAL",     "name": "Coal",            "price": 138.40,  "unit": "USD/t",     "currency": "$", "change":  0.80, "changePercent":  0.6, "direction": "up",   "signalType": "Fallback Fuel",       "whyItMatters": "Coal as power fallback when gas is expensive. Rising coal signals power cost pressure.", "linkedSectors": ["Power", "Natural Gas"],            "aiConfidence": 72, "source": "Mock"},
    {"id": "CARBON",   "name": "Carbon (ETS)",    "price": 64.20,   "unit": "EUR/t",     "currency": "€", "change": -0.50, "changePercent": -0.8, "direction": "down", "signalType": "Policy / Carbon",     "whyItMatters": "EU carbon price directs coal/gas switching in power generation. Lower ETS = more coal.", "linkedSectors": ["Power", "Crude Oil"],              "aiConfidence": 70, "source": "Mock"},
    {"id": "ALUMINUM", "name": "Aluminum",        "price": 2285.00, "unit": "USD/t",     "currency": "$", "change":  8.00, "changePercent":  0.4, "direction": "up",   "signalType": "Power-Intensive Mfg", "whyItMatters": "Aluminum smelting is extremely power-intensive. Aluminum prices reflect electricity costs.", "linkedSectors": ["Power", "Renewables"],            "aiConfidence": 67, "source": "Mock"},
    {"id": "FREIGHT",  "name": "Shipping (BDI)",  "price": 1842.00, "unit": "Index",     "currency": "",  "change": -18.0, "changePercent": -1.0, "direction": "down", "signalType": "Freight Stress",      "whyItMatters": "Baltic Dry Index weakness signals bulk demand slowdown. Lower BDI = demand concern.",   "linkedSectors": ["Crude Oil", "Refined Products"],  "aiConfidence": 69, "source": "Mock"},
]

ENERGY_SPECS = [
    {"sym": "CL=F", "id": "WTI",      "name": "WTI Crude",      "unit": "USD/bbl",   "currency": "$"},
    {"sym": "BZ=F", "id": "BRENT",    "name": "Brent Crude",     "unit": "USD/bbl",   "currency": "$"},
    {"sym": "NG=F", "id": "NATGAS",   "name": "Natural Gas",     "unit": "USD/MMBtu", "currency": "$"},
    {"sym": "HO=F", "id": "DIESEL",   "name": "Diesel",           "unit": "USc/gal",   "currency": "$"},
    {"sym": "RB=F", "id": "GASOLINE", "name": "Gasoline",         "unit": "USD/gal",   "currency": "$"},
]

CROSS_MARKET_SPECS = [
    {"sym": "GC=F",  "id": "GOLD",     "name": "Gold",           "unit": "USD/oz",    "currency": "$", "signalType": "Safe-Haven",         "whyItMatters": "Geopolitical fear / USD stress signal."},
    {"sym": "SI=F",  "id": "SILVER",   "name": "Silver",         "unit": "USD/oz",    "currency": "$", "signalType": "Safe-Haven + Solar",  "whyItMatters": "Safe-haven bid + solar panel demand signal."},
    {"sym": "HG=F",  "id": "COPPER",   "name": "Copper",         "unit": "USD/lb",    "currency": "$", "signalType": "Industrial Demand",   "whyItMatters": "Global industrial and China demand signal."},
    {"sym": "ZW=F",  "id": "WHEAT",    "name": "Wheat",          "unit": "USc/bu",    "currency": "",  "signalType": "Food Inflation",      "whyItMatters": "Black Sea / Russia supply risk."},
    {"sym": "URA",   "id": "URANIUM",  "name": "Uranium",        "unit": "USD/share", "currency": "$", "signalType": "Nuclear Security",    "whyItMatters": "Nuclear power renaissance. Long-term energy security."},
    {"sym": "LIT",   "id": "LITHIUM",  "name": "Lithium",        "unit": "USD/share", "currency": "$", "signalType": "EV Supply Chain",     "whyItMatters": "EV battery demand and clean energy storage signal."},
    {"sym": "KOL",   "id": "COAL",     "name": "Coal",           "unit": "USD/t",     "currency": "$", "signalType": "Fallback Fuel",       "whyItMatters": "Power fallback fuel when gas is expensive."},
    {"sym": "ICLN",  "id": "CARBON",   "name": "Carbon (ETS)",   "unit": "Index",     "currency": "$", "signalType": "Policy / Carbon",     "whyItMatters": "EU carbon price directs coal/gas power switching."},
    {"sym": "AA",    "id": "ALUMINUM", "name": "Aluminum",       "unit": "USD/t",     "currency": "$", "signalType": "Power-Intensive Mfg", "whyItMatters": "Aluminum smelting reflects electricity cost."},
    {"sym": "BDRY",  "id": "FREIGHT",  "name": "Shipping (BDI)", "unit": "Index",     "currency": "",  "signalType": "Freight Stress",      "whyItMatters": "Baltic Dry Index as global bulk demand proxy."},
]


def _direction(change: float) -> str:
    if change > 0.001: return "up"
    if change < -0.001: return "down"
    return "flat"


async def _fetch_yahoo_symbol(client: httpx.AsyncClient, sp: dict) -> dict | None:
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sp['sym']}?interval=1d&range=2d"
        r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
        data = r.json()
        meta = (data.get("chart", {}).get("result") or [{}])[0].get("meta", {})
        price = meta.get("regularMarketPrice")
        if not price:
            return None
        prev = meta.get("chartPreviousClose") or meta.get("previousClose") or price
        change = price - prev
        change_pct = (change / prev * 100) if prev else 0
        result = {
            "id": sp["id"], "name": sp["name"], "price": round(price, 2),
            "unit": sp["unit"], "currency": sp["currency"],
            "change": round(change, 3), "changePercent": round(change_pct, 1),
            "direction": _direction(change), "source": "Yahoo Finance",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        if "signalType" in sp:
            result["signalType"] = sp["signalType"]
            result["whyItMatters"] = sp["whyItMatters"]
        return result
    except Exception:
        return None


async def _try_yahoo_finance() -> dict | None:
    async with httpx.AsyncClient() as client:
        energy_tasks = [_fetch_yahoo_symbol(client, sp) for sp in ENERGY_SPECS]
        cross_tasks  = [_fetch_yahoo_symbol(client, sp) for sp in CROSS_MARKET_SPECS]
        energy_results, cross_results = await asyncio.gather(
            asyncio.gather(*energy_tasks),
            asyncio.gather(*cross_tasks),
        )
    valid_energy = [r for r in energy_results if r]
    if len(valid_energy) < 3:
        return None
    eu_power = {**next(m for m in MOCK_ITEMS if m["id"] == "EU_POWER"), "source": "Mock Fallback"}
    valid_cross = [r for r in cross_results if r]
    # Merge live cross-market with mock fallback for missing symbols
    cross_signals = []
    for mock_item in MOCK_CROSS_MARKET:
        live = next((v for v in valid_cross if v["id"] == mock_item["id"]), None)
        if live:
            # Preserve signalType, whyItMatters, linkedSectors, aiConfidence from mock
            cross_signals.append({
                **mock_item,
                "price": live["price"],
                "change": live["change"],
                "changePercent": live["changePercent"],
                "direction": live["direction"],
                "source": "Yahoo Finance",
                "timestamp": live.get("timestamp"),
            })
        else:
            cross_signals.append(mock_item)
    return {
        "status": "live",
        "source": "Yahoo Finance",
        "items": [*valid_energy, eu_power],
        "crossMarketSignals": cross_signals,
    }


async def _try_alpha_vantage(api_key: str) -> dict | None:
    specs = [
        {"fn": "WTI",         "id": "WTI",    "unit": "USD/bbl",   "currency": "$"},
        {"fn": "BRENT",       "id": "BRENT",  "unit": "USD/bbl",   "currency": "$"},
        {"fn": "NATURAL_GAS", "id": "NATGAS", "unit": "USD/MMBtu", "currency": "$"},
    ]
    async def fetch_one(sp):
        try:
            url = f"https://www.alphavantage.co/query?function={sp['fn']}&interval=daily&apikey={api_key}"
            async with httpx.AsyncClient() as client:
                r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
            data = r.json()
            if data.get("Information") or data.get("Note") or not isinstance(data.get("data"), list) or not data["data"]:
                return None
            latest, *rest = data["data"]
            prev = rest[0] if rest else latest
            price = float(latest["value"])
            prev_price = float(prev["value"])
            if price != price:
                return None
            change = price - prev_price
            change_pct = (change / prev_price * 100) if prev_price else 0
            base = next(m for m in MOCK_ITEMS if m["id"] == sp["id"])
            return {**base, "price": price, "change": round(change, 3),
                    "changePercent": round(change_pct, 1), "direction": _direction(change),
                    "source": "Alpha Vantage", "timestamp": datetime.utcnow().isoformat() + "Z"}
        except Exception:
            return None

    results = await asyncio.gather(*[fetch_one(sp) for sp in specs])
    valid = [r for r in results if r]
    if not valid:
        return None
    items = [next((v for v in valid if v["id"] == m["id"]), {**m, "source": "Partial Mock"}) for m in MOCK_ITEMS]
    return {"status": "live", "source": "Alpha Vantage", "items": items}


async def _try_eia(api_key: str) -> dict | None:
    try:
        url = (f"https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key={api_key}"
               "&frequency=daily&data[0]=value&facets[series][]=RWTC"
               "&sort[0][column]=period&sort[0][direction]=desc&length=2")
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
        rows = r.json().get("response", {}).get("data", [])
        if not rows:
            return None
        price = float(rows[0]["value"])
        prev  = float(rows[1]["value"]) if len(rows) > 1 else price
        change = price - prev
        items = [
            {**m, "price": price, "source": "EIA",
             "change": round(change, 3),
             "changePercent": round(change / prev * 100, 1) if prev else 0,
             "direction": _direction(change),
             "timestamp": datetime.utcnow().isoformat() + "Z"}
            if m["id"] == "WTI" else {**m, "source": "Partial Mock"}
            for m in MOCK_ITEMS
        ]
        return {"status": "live", "source": "EIA", "items": items}
    except Exception:
        return None


async def fetch_prices() -> dict:
    t0 = time.time()
    eia_key = os.environ.get("EIA_API_KEY", "")
    av_key  = os.environ.get("ALPHA_VANTAGE_API_KEY", "")

    try:
        yf = await _try_yahoo_finance()
        if yf:
            print(f"[Price] Source: Yahoo Finance, items: {len(yf.get('items', []))}, cross: {len(yf.get('crossMarketSignals', []))}")
            return {**yf, "latencyMs": int((time.time() - t0) * 1000), "lastSync": datetime.utcnow().isoformat() + "Z"}
    except Exception as e:
        print(f"[Price] Yahoo Finance failed: {e}")

    if av_key:
        try:
            av = await _try_alpha_vantage(av_key)
            if av:
                print(f"[Price] Source: Alpha Vantage")
                return {**av, "crossMarketSignals": MOCK_CROSS_MARKET, "latencyMs": int((time.time() - t0) * 1000), "lastSync": datetime.utcnow().isoformat() + "Z"}
        except Exception as e:
            print(f"[Price] Alpha Vantage failed: {e}")

    if eia_key:
        try:
            eia = await _try_eia(eia_key)
            if eia:
                print(f"[Price] Source: EIA")
                return {**eia, "crossMarketSignals": MOCK_CROSS_MARKET, "latencyMs": int((time.time() - t0) * 1000), "lastSync": datetime.utcnow().isoformat() + "Z"}
        except Exception as e:
            print(f"[Price] EIA failed: {e}")

    print("[Price] All live sources failed — using mock")
    return {
        "status": "mock",
        "source": "Internal Mock",
        "items": MOCK_ITEMS,
        "crossMarketSignals": MOCK_CROSS_MARKET,
        "latencyMs": int((time.time() - t0) * 1000),
        "lastSync": datetime.utcnow().isoformat() + "Z",
    }
