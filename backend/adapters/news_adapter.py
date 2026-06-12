"""News Adapter — Guardian → NewsAPI → GDELT → mock fallback."""
import os
import re
import time
import asyncio
import httpx
from datetime import datetime, timezone

HEADERS = {"User-Agent": "GeoEnergyIntelligenceAI/1.0"}
TIMEOUT = 8.0


def _sector(text: str) -> str:
    t = (text or "").lower()
    if re.search(r"\b(crude oil|wti|brent|opec|oil prices?|oil supply|oil demand|oil production|barrels?|tanker|petroleum)\b", t):
        return "Crude Oil"
    if re.search(r"natural gas|lng|freeport|gas price|gas supply|gas storage", t):
        return "Natural Gas"
    if re.search(r"diesel|gasoline|refin|crack spread|jet fuel|heating oil", t):
        return "Refined Products"
    if re.search(r"power|electricity|grid|nuclear|generation", t):
        return "Power"
    if re.search(r"solar|wind|renewable|hydro|green energy|lithium|battery", t):
        return "Renewables"
    return "Policy"


def _region(text: str) -> str:
    t = (text or "").lower()
    if re.search(r"hormuz|persian gulf|iran|uae|saudi|gulf", t):
        return "Middle East"
    if re.search(r"russia|ukraine|eastern europe|moscow", t):
        return "Eastern Europe"
    if re.search(r"red sea|suez|houthi|yemen", t):
        return "Middle East / Africa"
    if re.search(r"libya|nigeria|west africa", t):
        return "North Africa"
    if re.search(r"gulf coast|texas|usa|north america", t):
        return "North America"
    if re.search(r"europe|eu |germany|france|uk |britain", t):
        return "Europe"
    return "Global"


def _category(text: str) -> str:
    t = (text or "").lower()
    if re.search(r"sanction|ban|restriction|policy|meeting|opec", t):
        return "Policy"
    if re.search(r"attack|conflict|war|strike|military", t):
        return "Geo Risk"
    if re.search(r"supply chain|shipment|tanker|route|transit|port", t):
        return "Supply Chain"
    return "Market Move"


def _impact(text: str) -> str:
    if re.search(r"critical|breaking|major|surge|plunge|spike|crisis|attack|disruption|emergency", text or "", re.I):
        return "High Impact"
    if re.search(r"minor|slight|marginal|routine|planned", text or "", re.I):
        return "Low Impact"
    return "Medium Impact"


def _sentiment(text: str, category: str) -> str:
    """Bullish/Bearish/Volatile/Neutral classification (playbook prompt 4)."""
    t = (text or "").lower()
    bull = re.search(r"attack|disruption|outage|shutdown|cut(s)? (production|output)|sanction|strike|spike|surge|shortage|drawdown|escalat|blockade|halt", t)
    bear = re.search(r"surplus|glut|oversupply|production increase|output rise|demand (miss|slump|weak)|recession|inventory build|ceasefire|de-escalat|truce|plunge|slump", t)
    if category == "Geo Risk" or (bull and bear):
        return "Volatile"
    if bull:
        return "Bullish"
    if bear:
        return "Bearish"
    return "Neutral"


def _why_it_matters(headline: str, sec: str, cat: str, impact: str, sentiment: str) -> str:
    """Fact → implication, not an echo of the headline."""
    base = {
        "Crude Oil":        "Crude supply-demand balance shifts feed directly into fuel costs for airlines, logistics, and distributors",
        "Natural Gas":      "Gas balance changes flow into power prices, industrial input costs, and household heating bills",
        "Refined Products": "Refining and product-supply shifts hit pump prices and freight margins fastest",
        "Power":            "Grid and generation changes set electricity costs for manufacturing and consumers",
        "Renewables":       "Transition momentum shifts long-term demand expectations for fossil fuels and grid investment",
        "Policy":           "Policy and sanctions decisions can reprice supply expectations faster than physical flows",
    }.get(sec, "Cross-market signal with second-order energy impact")
    lag = {
        "Crude Oil": "3-4 week pump pass-through", "Refined Products": "2-4 week freight pass-through",
        "Natural Gas": "6-8 week bill pass-through", "Power": "6-8 week bill pass-through",
    }.get(sec, "4-8 week transmission lag")
    tone = {"Bullish": "supports the supply-risk premium", "Bearish": "eases price pressure",
            "Volatile": "raises two-sided volatility risk", "Neutral": "keeps positioning unchanged"}[sentiment]
    sev = "Key threshold-level signal" if impact == "High Impact" else "Incremental signal"
    return f"{sev}: {base.lower()} — this {tone} ({lag})."


def _affected_stakeholders(sec: str) -> list:
    return {
        "Crude Oil":        ["Energy Traders", "Airlines", "Fuel Distributors", "Logistics"],
        "Natural Gas":      ["Utilities", "Industrial Users", "LNG Traders", "Households"],
        "Refined Products": ["Logistics / Trucking", "Fuel Retailers", "Agriculture"],
        "Power":            ["Utilities", "Manufacturing", "Aluminum Smelting", "Consumers"],
        "Renewables":       ["EV / Battery Chain", "Power Investors", "Grid Operators"],
        "Policy":           ["Energy Traders", "Investors", "Producers"],
    }.get(sec, ["Energy Traders", "Investors"])


def _freshness(iso: str) -> str:
    try:
        then = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        hours = (datetime.now(timezone.utc) - then).total_seconds() / 3600
        if hours < 6:  return "LIVE"
        if hours < 24: return "TODAY"
        if hours < 72: return "RECENT"
        return "STALE"
    except Exception:
        return "RECENT"


def _dedupe_and_rank(items: list) -> list:
    """Dedupe near-identical headlines, drop stale beyond 72h when fresher exist, newest first."""
    seen, out = set(), []
    for it in sorted(items or [], key=lambda i: str(i.get("timestamp") or ""), reverse=True):
        key = re.sub(r"[^a-z0-9 ]", "", str(it.get("headline", "")).lower()).strip()
        key = " ".join(key.split()[:10])
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it)
    fresh = [i for i in out if i.get("freshness") in ("LIVE", "TODAY", "RECENT")]
    return fresh if len(fresh) >= 5 else out


def _time_ago(iso: str) -> str:
    try:
        then = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        ms = (datetime.now(timezone.utc) - then).total_seconds() * 1000
        m = int(ms / 60000)
        h = int(m / 60)
        if m < 1: return "Just now"
        if m < 60: return f"{m} min{'s' if m != 1 else ''} ago"
        if h < 24: return f"{h} hour{'s' if h != 1 else ''} ago"
        d = int(h / 24)
        return f"{d} day{'s' if d != 1 else ''} ago"
    except Exception:
        return "Recently"


def _market_read_through(sec: str) -> str:
    return {
        "Crude Oil":        "Watch front-month crude spreads and tanker freight for confirmation.",
        "Natural Gas":      "Watch LNG cargo diversions and storage changes.",
        "Refined Products": "Watch diesel and gasoline cracks and refinery utilization.",
        "Power":            "Watch day-ahead power prices and interconnector flows.",
        "Renewables":       "Watch curtailment and grid congestion.",
    }.get(sec, "Watch price reaction and follow-on policy updates.")


def _to_item(item_id: str, headline: str, source: str, ts: str, url: str) -> dict:
    sec = _sector(headline)
    cat = _category(headline)
    reg = _region(headline)
    imp = _impact(headline)
    sent = _sentiment(headline, cat)
    return {
        "id": item_id, "impact": imp, "headline": headline,
        "source": source, "url": url or "", "time": _time_ago(ts), "timestamp": ts,
        "freshness": _freshness(ts),
        "sector": sec, "category": cat, "region": reg,
        "sentimentEffect": sent,
        "whyItMatters": _why_it_matters(headline, sec, cat, imp, sent),
        "context": f"Live energy market signal from {source}.",
        "marketReadThrough": _market_read_through(sec),
        "affectedStakeholders": _affected_stakeholders(sec),
        "relatedRegions": [] if reg == "Global" else [reg],
        "relatedSectors": [] if sec == "Policy" else [sec],
    }


MOCK_ITEMS = [
    {"id": "news-001", "impact": "High Impact", "headline": "Satellite imagery confirms sudden drop in Persian Gulf oil tanker throughput.", "source": "GEI Signal-4", "time": "14 mins ago", "timestamp": datetime.utcnow().isoformat() + "Z", "sector": "Crude Oil", "category": "Supply Chain", "sentimentEffect": "Bullish", "whyItMatters": "May indicate undeclared maintenance or tactical holding by regional producers.", "context": "Could tighten near-term supply expectations.", "relatedRegions": ["Persian Gulf"], "relatedSectors": ["Crude Oil"]},
    {"id": "news-002", "impact": "High Impact", "headline": "OPEC+ production meeting confirmed for July — agenda includes market share strategy.", "source": "Policy Monitor", "time": "20 mins ago", "timestamp": datetime.utcnow().isoformat() + "Z", "sector": "Crude Oil", "category": "Policy", "sentimentEffect": "Volatile", "whyItMatters": "Shift in production strategy signals structural change.", "context": "Market pricing in increased uncertainty.", "relatedRegions": ["Middle East"], "relatedSectors": ["Crude Oil"]},
    {"id": "news-003", "impact": "Medium Impact", "headline": "EU Energy Council concludes with no consensus on additional sanctions.", "source": "Reuters Global", "time": "1 hour ago", "timestamp": datetime.utcnow().isoformat() + "Z", "sector": "Policy", "category": "Geo Risk", "sentimentEffect": "Neutral", "whyItMatters": "Stabilizes near-term Natural Gas supply outlook for Central Europe.", "context": "Next council meeting in 6 weeks.", "relatedRegions": ["Europe"], "relatedSectors": ["Natural Gas"]},
    {"id": "news-004", "impact": "High Impact", "headline": "Gulf Coast refinery maintenance season begins — diesel output projected down 4%.", "source": "Refinery Monitor", "time": "35 mins ago", "timestamp": datetime.utcnow().isoformat() + "Z", "sector": "Refined Products", "category": "Supply Chain", "sentimentEffect": "Bullish", "whyItMatters": "Tighter diesel supply heading into summer.", "context": "Crack spreads likely to widen.", "relatedRegions": ["North America"], "relatedSectors": ["Refined Products"]},
    {"id": "news-005", "impact": "Low Impact", "headline": "Port of Rotterdam reports 2% increase in renewable feedstock arrivals.", "source": "Logistics News", "time": "4 hours ago", "timestamp": datetime.utcnow().isoformat() + "Z", "sector": "Renewables", "category": "Supply Chain", "sentimentEffect": "Neutral", "whyItMatters": "Long-term trend toward bio-diesel integration on track.", "context": "Supports gradual renewable feedstock adoption.", "relatedRegions": ["Europe"], "relatedSectors": ["Renewables"]},
]


async def _try_guardian(api_key: str) -> dict | None:
    q = "oil OR gas OR energy OR OPEC OR crude OR refinery OR pipeline OR sanctions OR Hormuz"
    url = (f"https://content.guardianapis.com/search?q={q}"
           f"&section=business|environment|world&order-by=newest&page-size=20"
           f"&show-fields=headline,trailText,webUrl&api-key={api_key}")
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
        results = r.json().get("response", {}).get("results", [])
        if not isinstance(results, list) or not results:
            return None
        items = [
            _to_item(
                f"guardian-{i}-{int(time.time()*1000)}",
                a.get("fields", {}).get("headline") or a.get("webTitle", ""),
                "The Guardian",
                a.get("webPublicationDate") or datetime.utcnow().isoformat() + "Z",
                a.get("webUrl", ""),
            )
            for i, a in enumerate(results)
            if (a.get("webTitle") or "").strip() and len(a.get("webTitle", "")) > 10
        ][:15]
        if not items:
            return None
        print(f"[News] Source: The Guardian, items: {len(items)}")
        return {"status": "live", "source": "The Guardian", "items": items}
    except Exception:
        return None


async def _try_newsapi(api_key: str) -> dict | None:
    q = "crude oil OR WTI OR Brent OR OPEC OR natural gas OR LNG OR refinery OR energy sanctions OR Hormuz OR Red Sea"
    url = (f"https://newsapi.org/v2/everything?q={q}&apiKey={api_key}"
           "&language=en&sortBy=publishedAt&pageSize=20")
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
        data = r.json()
        if data.get("status") != "ok" or not isinstance(data.get("articles"), list):
            return None
        items = [
            _to_item(
                f"newsapi-{i}-{int(time.time()*1000)}",
                a.get("title", ""),
                (a.get("source") or {}).get("name") or "NewsAPI",
                a.get("publishedAt") or datetime.utcnow().isoformat() + "Z",
                a.get("url", ""),
            )
            for i, a in enumerate(data["articles"])
            if a.get("title") and len(a["title"]) > 10 and "[Removed]" not in a["title"]
        ][:15]
        if not items:
            return None
        print(f"[News] Source: NewsAPI, items: {len(items)}")
        return {"status": "live", "source": "NewsAPI", "items": items}
    except Exception:
        return None


def _gdelt_date_to_iso(s: str) -> str:
    s = str(s or "")
    if len(s) == 14:
        return f"{s[:4]}-{s[4:6]}-{s[6:8]}T{s[8:10]}:{s[10:12]}:{s[12:14]}Z"
    return datetime.utcnow().isoformat() + "Z"


async def _try_gdelt() -> dict | None:
    q = "oil energy crude OPEC gas refinery pipeline sanctions Hormuz"
    url = (f"https://api.gdeltproject.org/api/v2/doc/doc?query={q}"
           "&mode=artlist&maxrecords=20&format=json&timespan=24hours&sourcelang=english")
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
        data = r.json()
        articles = data.get("articles", [])
        if not isinstance(articles, list) or not articles:
            return None
        items = [
            _to_item(
                f"gdelt-{i}-{int(time.time()*1000)}",
                a.get("title") or a.get("url", ""),
                a.get("domain") or "GDELT",
                _gdelt_date_to_iso(a.get("seendate", "")),
                a.get("url", ""),
            )
            for i, a in enumerate(articles)
            if (a.get("title") or a.get("url", "")) and len(a.get("title") or a.get("url", "")) > 10
        ][:12]
        if not items:
            return None
        print(f"[News] Source: GDELT, items: {len(items)}")
        return {"status": "live", "source": "GDELT", "items": items}
    except Exception:
        return None


async def fetch_news() -> dict:
    t0 = time.time()
    guardian_key = os.environ.get("GUARDIAN_API_KEY", "")
    newsapi_key  = os.environ.get("NEWS_API_KEY", "")

    def _final(r: dict) -> dict:
        items = _dedupe_and_rank(r.get("items", []))
        return {**r, "items": items, "latencyMs": int((time.time() - t0) * 1000), "lastSync": datetime.utcnow().isoformat() + "Z"}

    if guardian_key:
        try:
            r = await _try_guardian(guardian_key)
            if r and r.get("items"):
                return _final(r)
        except Exception as e:
            print(f"[News] Guardian failed: {e}")

    if newsapi_key:
        try:
            r = await _try_newsapi(newsapi_key)
            if r and r.get("items"):
                return _final(r)
        except Exception as e:
            print(f"[News] NewsAPI failed: {e}")

    try:
        g = await _try_gdelt()
        if g and g.get("items"):
            return _final(g)
    except Exception as e:
        print(f"[News] GDELT failed: {e}")

    print("[News] All live sources failed — using mock")
    mock_items = [{**m, "freshness": _freshness(m.get("timestamp")), "affectedStakeholders": _affected_stakeholders(m.get("sector", "Policy"))} for m in MOCK_ITEMS]
    return {"status": "mock", "source": "Internal Mock", "items": mock_items, "latencyMs": int((time.time() - t0) * 1000), "lastSync": datetime.utcnow().isoformat() + "Z"}
