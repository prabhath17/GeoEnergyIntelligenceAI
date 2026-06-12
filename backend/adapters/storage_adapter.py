"""EIA Weekly Natural Gas Storage Adapter — free, no credit card needed."""
import os
import time
import httpx
from datetime import datetime, timezone

HEADERS = {"User-Agent": "GeoEnergyIntelligenceAI/1.0"}
TIMEOUT = 8.0

def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

MOCK_SUMMARY = {
    "latestPeriod": "2026-05-23",
    "storageBCF": 2498,
    "weeklyChangeBCF": 84,
    "trend": "injection",
    "unit": "BCF",
}

async def fetch_storage() -> dict:
    t0 = time.time()
    api_key = os.environ.get("EIA_API_KEY", "")
    if not api_key:
        return {"status": "mock", "source": "Internal Mock", "latencyMs": 0, "lastSync": _now(), "summary": MOCK_SUMMARY, "items": []}

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS) as client:
            url = (
                f"https://api.eia.gov/v2/natural-gas/stor/wkly/data/"
                f"?api_key={api_key}"
                f"&frequency=weekly"
                f"&data[0]=value"
                f"&facets[series][]=NW2_EPG0_SWO_R48_BCF"
                f"&sort[0][column]=period&sort[0][direction]=desc"
                f"&length=4"
            )
            r = await client.get(url)
            rows = r.json().get("response", {}).get("data", [])
            if not rows:
                raise ValueError("no data returned")

            items = [
                {
                    "period": row.get("period"),
                    "value":  row.get("value"),
                    "unit":   "BCF",
                    "series": "US Lower 48 Natural Gas Storage",
                    "source": "EIA Weekly"
                }
                for row in rows[:4]
            ]
            latest = items[0]
            prev   = items[1] if len(items) > 1 else items[0]
            try:
                change = round(float(latest["value"]) - float(prev["value"]), 1)
            except Exception:
                change = 0

            return {
                "status": "live",
                "source": "EIA Weekly Storage",
                "latencyMs": int((time.time() - t0) * 1000),
                "lastSync": _now(),
                "items": items,
                "summary": {
                    "latestPeriod":    latest["period"],
                    "storageBCF":      latest["value"],
                    "weeklyChangeBCF": change,
                    "trend":           "injection" if change > 0 else "withdrawal",
                    "unit":            "BCF",
                }
            }
    except Exception as e:
        return {
            "status": "mock",
            "source": "EIA Mock Fallback",
            "latencyMs": int((time.time() - t0) * 1000),
            "lastSync": _now(),
            "items": [],
            "summary": MOCK_SUMMARY,
            "error": str(e),
        }
