"""News Impact Classifier — maps headlines/articles into structured commodity impact records.

Version 1: Deterministic keyword rules + scoring.
Version 2 ready: Interface prepared for FinBERT / ML classifier drop-in.
"""
from __future__ import annotations

from datetime import datetime, timezone

# ── Keyword taxonomy ──────────────────────────────────────────────────────────

_SUPPLY_SHOCK = [
    "opec", "opec+", "production cut", "output cut", "quota", "refinery outage",
    "pipeline disruption", "pipeline halt", "chokepoint", "export ban", "embargo",
    "sanctions", "attack", "drone strike", "platform evacuation", "supply disruption",
    "capacity cut", "mine closure", "output restriction",
]
_DEMAND_SHOCK = [
    "pmi", "recession", "gdp miss", "demand destruction", "china slowdown",
    "weak demand", "inventory build", "stockpile surge", "consumption decline",
    "demand miss", "economic contraction", "manufacturing decline",
]
_GEO_RISK = [
    "war", "conflict", "missile", "houthi", "red sea", "hormuz", "suez",
    "russia", "ukraine", "iran", "israel", "sanctions", "military", "escalation",
    "terrorist", "rebel", "coup", "venezuela",
]
_STORAGE_EVENT = [
    "eia report", "inventory draw", "inventory build", "storage surplus",
    "storage deficit", "gas storage", "eu storage", "stockpile", "crude stocks",
    "five-year average", "strategic reserve",
]
_REFINERY_OUTAGE = [
    "refinery", "refinery outage", "refinery fire", "cracker", "shutdown",
    "maintenance", "turnaround", "refinery utilization", "crack spread",
    "distillation", "coker", "fcc unit",
]
_SHIPPING = [
    "shipping", "freight", "bdi", "container", "tanker", "bulk carrier",
    "port congestion", "canal", "route", "maritime", "charter rate",
    "houthi", "red sea", "piracy", "vessel",
]
_WEATHER = [
    "hurricane", "tropical storm", "cold snap", "freeze", "polar vortex",
    "heat wave", "drought", "flooding", "winter storm", "severe weather",
    "weather", "temperature", "forecast",
]
_MACRO_USD = [
    "federal reserve", "fed rate", "interest rate", "dollar", "dxy",
    "usd strength", "currency", "inflation", "cpi", "fomc",
    "rate hike", "rate cut", "central bank", "ecb", "boe",
]
_POLICY = [
    "policy", "regulation", "legislation", "tariff", "subsidy",
    "green deal", "ira", "energy transition", "mandate", "quota policy",
    "antitrust", "tax", "government", "parliament", "executive order",
]
_ENERGY_TRANSITION = [
    "ev", "electric vehicle", "solar", "wind", "renewable", "battery",
    "lithium", "energy storage", "green hydrogen", "decarbonization",
    "net zero", "carbon neutral", "offshore wind", "pv",
]
_NUCLEAR = [
    "nuclear", "uranium", "reactor", "smr", "enrichment", "fuel rod",
    "plant restart", "fukushima", "nrc", "safety review", "capacity factor",
]
_CARBON = [
    "carbon price", "ets", "eua", "emission", "carbon tax", "cap and trade",
    "carbon credit", "co2", "scope 3", "msats", "carbon offset",
]

# Commodity keyword maps — each set maps tags to commodities
_COMMODITY_KEYWORDS = {
    "WTI":      ["wti", "west texas", "crude oil", "cl=f", "oil price"],
    "BRENT":    ["brent", "ice brent", "bz=f", "north sea"],
    "NATGAS":   ["natural gas", "henry hub", "ng=f", "lng", "gas price"],
    "TTF":      ["ttf", "eu gas", "european gas", "dutch gas"],
    "DIESEL":   ["diesel", "heating oil", "distillate", "gasoil", "ho=f"],
    "GASOLINE": ["gasoline", "rbob", "pump price", "retail fuel"],
    "JET_FUEL": ["jet fuel", "aviation fuel", "kerosene", "airline fuel"],
    "GOLD":     ["gold", "xau", "bullion", "spot gold", "gc=f"],
    "SILVER":   ["silver", "xag", "si=f"],
    "COPPER":   ["copper", "hg=f", "lme copper"],
    "ALUMINUM": ["aluminum", "aluminium", "lme aluminium", "smelter"],
    "WHEAT":    ["wheat", "grain", "black sea grain", "cbot wheat"],
    "URANIUM":  ["uranium", "u3o8", "nuclear fuel", "enriched uranium"],
    "LITHIUM":  ["lithium", "lithium carbonate", "spodumene", "li-ion"],
    "COAL":     ["coal", "thermal coal", "coking coal", "seaborne coal"],
    "FREIGHT":  ["freight", "bdi", "shipping", "bulk", "container", "tanker"],
    "CARBON":   ["carbon", "ets", "eua", "co2", "emission credit"],
    "POWER":    ["electricity", "grid", "power price", "mwh", "eu power"],
}

# Impact level scoring thresholds
_HIGH_IMPACT_WORDS = [
    "critical", "emergency", "halt", "collapse", "surge", "spike", "war",
    "attack", "crisis", "record", "historic", "unprecedented", "shutdown",
]
_MODERATE_IMPACT_WORDS = [
    "increase", "decrease", "rise", "fall", "concern", "warning", "risk",
    "pressure", "stress", "tighten", "loosen", "uncertainty",
]

# Time lag estimates by event type (weeks to consumer/market impact)
_TIME_LAG = {
    "supply_shock": "1-4 weeks",
    "demand_shock": "2-6 weeks",
    "geo_risk": "0-2 weeks",
    "storage_event": "1-3 weeks",
    "refinery_outage": "1-3 weeks",
    "shipping": "2-8 weeks",
    "weather": "0-2 weeks",
    "macro_usd": "2-6 weeks",
    "policy": "4-12 weeks",
    "energy_transition": "12-52 weeks",
    "nuclear_policy": "12-52 weeks",
    "carbon_policy": "4-16 weeks",
    "inventory_report": "0-1 weeks",
    "ev_battery_demand": "12-24 weeks",
}

# Duration estimates
_DURATION = {
    "supply_shock": "weeks to months",
    "demand_shock": "months",
    "geo_risk": "days to months",
    "storage_event": "days to weeks",
    "refinery_outage": "days to weeks",
    "shipping": "weeks",
    "weather": "days to weeks",
    "macro_usd": "months",
    "policy": "months to years",
    "energy_transition": "years",
    "nuclear_policy": "years",
    "carbon_policy": "months to years",
    "inventory_report": "days",
    "ev_battery_demand": "quarters",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _tag_event_types(text: str) -> list[str]:
    t = text.lower()
    tags = []
    if any(k in t for k in _SUPPLY_SHOCK):
        tags.append("supply_shock")
    if any(k in t for k in _DEMAND_SHOCK):
        tags.append("demand_shock")
    if any(k in t for k in _GEO_RISK):
        tags.append("geo_risk")
    if any(k in t for k in _STORAGE_EVENT):
        tags.append("storage_event")
    if any(k in t for k in _REFINERY_OUTAGE):
        tags.append("refinery_outage")
    if any(k in t for k in _SHIPPING):
        tags.append("shipping")
    if any(k in t for k in _WEATHER):
        tags.append("weather")
    if any(k in t for k in _MACRO_USD):
        tags.append("macro_usd")
    if any(k in t for k in _POLICY):
        tags.append("policy")
    if any(k in t for k in _ENERGY_TRANSITION):
        tags.append("energy_transition")
    if any(k in t for k in _NUCLEAR):
        tags.append("nuclear_policy")
    if any(k in t for k in _CARBON):
        tags.append("carbon_policy")
    if not tags:
        tags.append("market_structure")
    return tags


def _identify_commodities(text: str) -> list[str]:
    t = text.lower()
    found = [cid for cid, keywords in _COMMODITY_KEYWORDS.items() if any(k in t for k in keywords)]
    return found or ["WTI"]  # default crude if no specific commodity found


def _score_sentiment(text: str) -> float:
    t = text.lower()
    score = 0.0
    bullish_words = ["surge", "spike", "jump", "rise", "increase", "cut", "tight", "shortage", "disruption", "attack", "sanction"]
    bearish_words = ["fall", "drop", "decline", "surplus", "weak", "slowdown", "glut", "oversupply", "miss", "concern"]
    for w in bullish_words:
        if w in t:
            score += 0.15
    for w in bearish_words:
        if w in t:
            score -= 0.12
    return round(max(-1.0, min(1.0, score)), 2)


def _score_impact_level(text: str, event_types: list[str]) -> tuple[str, float]:
    t = text.lower()
    high_words = sum(1 for w in _HIGH_IMPACT_WORDS if w in t)
    mod_words = sum(1 for w in _MODERATE_IMPACT_WORDS if w in t)
    geo_weight = 1.5 if "geo_risk" in event_types else 1.0
    score = (high_words * 2 + mod_words) * geo_weight
    if score >= 4:
        return "High", min(0.9, 0.5 + score * 0.05)
    elif score >= 2:
        return "Moderate", min(0.75, 0.35 + score * 0.05)
    return "Low", 0.25


def _derive_direction(event_types: list[str], sentiment: float) -> str:
    if "supply_shock" in event_types and sentiment > 0:
        return "bullish"
    if "demand_shock" in event_types and sentiment < 0:
        return "bearish"
    if "geo_risk" in event_types and sentiment > 0:
        return "bullish"
    if "storage_event" in event_types:
        return "bullish" if sentiment > 0 else "bearish"
    if "macro_usd" in event_types and sentiment < 0:
        return "bearish"
    if sentiment > 0.2:
        return "bullish"
    if sentiment < -0.2:
        return "bearish"
    return "neutral"


def _affected_sectors(event_types: list[str], commodities: list[str]) -> list[str]:
    sectors = set()
    if "WTI" in commodities or "BRENT" in commodities:
        sectors.update(["Energy Traders", "Airlines", "Logistics / Trucking", "Fuel Distributors"])
    if "DIESEL" in commodities:
        sectors.update(["Logistics / Trucking", "Agriculture", "Construction"])
    if "NATGAS" in commodities or "TTF" in commodities:
        sectors.update(["Utilities", "Manufacturing", "Consumers"])
    if "ALUMINUM" in commodities:
        sectors.update(["Manufacturing", "Construction", "Aluminum Smelters"])
    if "WHEAT" in commodities:
        sectors.update(["Agriculture", "Food Processing", "Consumers"])
    if "FREIGHT" in commodities or "shipping" in event_types:
        sectors.update(["Logistics", "Retailers", "Consumers", "Importers"])
    if "LITHIUM" in commodities or "energy_transition" in event_types:
        sectors.update(["EV / Battery Chain", "Automotive"])
    if "CARBON" in commodities or "carbon_policy" in event_types:
        sectors.update(["Utilities", "Manufacturing", "Energy Producers"])
    return sorted(sectors)[:6]  # cap at 6


def _affected_consumers(commodities: list[str], event_types: list[str]) -> list[str]:
    consumers = set()
    if "GASOLINE" in commodities or "WTI" in commodities or "BRENT" in commodities:
        consumers.add("Motorists / Pump price")
    if "DIESEL" in commodities or "FREIGHT" in commodities or "shipping" in event_types:
        consumers.add("Grocery shoppers (freight pass-through)")
    if "NATGAS" in commodities or "TTF" in commodities:
        consumers.add("Home heating users")
    if "POWER" in commodities:
        consumers.add("Electricity bill payers")
    if "WHEAT" in commodities:
        consumers.add("Food / bread price sensitivity")
    if "JET_FUEL" in commodities:
        consumers.add("Air travellers (surcharges)")
    return sorted(consumers)


def _why_it_matters(event_types: list[str], commodities: list[str], direction: str, impact: str) -> str:
    primary = event_types[0] if event_types else "market_structure"
    commodity_label = commodities[0] if commodities else "energy"
    maps = {
        "supply_shock": f"Supply disruption removes {commodity_label} from the market, tightening balances and pushing prices {direction}. Fuel-intensive sectors feel this within 1-4 weeks.",
        "demand_shock": f"Demand weakness reduces {commodity_label} consumption expectations, pressuring prices lower. Industrial and discretionary sectors are most exposed.",
        "geo_risk": f"Geopolitical event creates a risk premium in {commodity_label} — supply route security concerns and potential volume disruption drive price volatility.",
        "storage_event": f"Storage data shifts the supply/demand balance signal for {commodity_label} — market reprices based on weeks of supply cushion.",
        "refinery_outage": f"Refinery capacity reduction tightens refined product supply — diesel and gasoline prices typically respond within 1-3 weeks.",
        "shipping": f"Shipping disruption raises freight costs and creates potential commodity supply delays, feeding into consumer goods pricing.",
        "weather": f"Weather event affects {commodity_label} demand (heating/cooling) or supply (production disruption) — impact is typically fast but duration-limited.",
        "macro_usd": f"Macro/USD shift affects all USD-denominated commodities — dollar strength reduces import demand; rate changes alter investment flows.",
        "policy": f"Policy change creates a long-term demand or supply signal for {commodity_label} — regulatory certainty shifts investment and production decisions.",
        "energy_transition": f"Energy transition news reshapes long-term demand forecasts for fossil fuels and critical minerals — structural rather than cyclical signal.",
        "nuclear_policy": f"Nuclear policy news affects both uranium demand and power mix expectations — long-duration structural signal.",
        "carbon_policy": f"Carbon pricing change adjusts the economics of fossil fuel vs renewable generation — power, industry, and transport costs are directly affected.",
        "market_structure": f"Market structure news affects {commodity_label} pricing dynamics — watch for follow-through in next session.",
    }
    return maps.get(primary, f"This news affects {commodity_label} market balance in a {direction} direction.")


def classify_article(
    text: str,
    source: str = "unknown",
    source_credibility: float = 0.7,
    article_date: str = "",
    url: str = "",
) -> dict:
    """Classify a single news headline or article into a structured impact record.

    Returns a dict with the full classification schema suitable for use in
    RAG knowledge base and AI Analysis output.
    """
    event_types = _tag_event_types(text)
    commodities = _identify_commodities(text)
    sentiment = _score_sentiment(text)
    impact_level, relevance = _score_impact_level(text, event_types)
    direction = _derive_direction(event_types, sentiment)
    primary_type = event_types[0]

    # Recency decay (0-1, 1 = very fresh)
    recency_decay = 1.0  # default; caller can pass age in days and decay here

    # Confirmation / invalidation signals based on event type
    confirmation_map = {
        "supply_shock": "Price breaks above resistance; additional disruption reports; inventory draws follow",
        "demand_shock": "PMI data confirms; inventory builds; freight index declines further",
        "geo_risk": "Military activity escalates; tanker rerouting confirmed; insurance premiums rise",
        "storage_event": "Follow-through in next weekly report; physical market tightness reported",
        "refinery_outage": "Refinery utilization drops in official data; crack spread widens further",
        "shipping": "Freight rate data confirms; port congestion reports; insurance cost rises",
        "weather": "Weather model consensus; satellite imagery; physical volume reports",
        "macro_usd": "DXY confirmation; Fed statement; GDP/CPI follow-through",
        "policy": "Official gazette publication; implementation timeline announced",
        "energy_transition": "Production data; EV sales volume; installation pipeline reports",
    }
    invalidation_map = {
        "supply_shock": "Supply restored; alternative sources confirmed; prices retreat",
        "demand_shock": "Demand beat; stimulus announced; PMI recovery",
        "geo_risk": "Ceasefire; military de-escalation; supply route reopened",
        "storage_event": "Next report reverses; demand data changes balance",
        "refinery_outage": "Refinery restart confirmed; utilization recovers",
        "shipping": "Route reopens; insurance normalizes; freight rates retreat",
        "weather": "Weather event dissipates; forecast moderates",
        "macro_usd": "Fed reversal; inflation softens; growth beats",
        "policy": "Policy delayed or reversed; exemptions granted",
        "energy_transition": "Adoption slows; policy reversal; technology setback",
    }

    return {
        # RAG metadata fields
        "source": source,
        "date": article_date or _now(),
        "commodity": commodities,
        "region": "",  # caller can inject
        "eventType": primary_type,
        "eventTypes": event_types,
        "topic": event_types,
        "severity": impact_level,
        "affectedSectors": _affected_sectors(event_types, commodities),
        "affectedConsumers": _affected_consumers(commodities, event_types),
        "text": text[:500],  # truncate for storage
        "url": url,
        "freshness": 1.0,  # caller should update with age decay

        # Classification output fields
        "direction": direction,
        "impactLevel": impact_level,
        "sentiment": sentiment,
        "timeLag": _TIME_LAG.get(primary_type, "1-4 weeks"),
        "duration": _DURATION.get(primary_type, "days to weeks"),
        "confirmingSignals": confirmation_map.get(primary_type, "Price and volume follow-through"),
        "invalidatingSignals": invalidation_map.get(primary_type, "Event reversal or data contradiction"),
        "relevanceScore": round(relevance * source_credibility, 2),
        "whyItMatters": _why_it_matters(event_types, commodities, direction, impact_level),
        "sourceCredibility": source_credibility,
        "recencyDecay": recency_decay,

        # Model-ready fields
        "sentimentScore": sentiment,
        "newsVolume": "unknown",  # aggregate level set by classify_batch
        "geoRiskTag": "geo_risk" in event_types,
        "commodityTag": commodities[0] if commodities else "UNKNOWN",
    }


def classify_batch(
    articles: list[dict],
    commodity_filter: str | None = None,
) -> dict:
    """Classify a batch of news articles and return aggregate intelligence.

    Args:
        articles: List of dicts with keys: headline/title, source, impact, url, date.
        commodity_filter: Optional commodity ID to filter for (e.g. 'WTI').

    Returns:
        Aggregate classification with top drivers and summary stats.
    """
    classified = []
    for item in articles:
        text = item.get("headline") or item.get("title") or ""
        if not text:
            continue
        source = item.get("source", "unknown")
        cred = 0.85 if source in ("Reuters", "Bloomberg", "FT", "WSJ", "Platts", "S&P Global") else 0.65
        result = classify_article(
            text=text,
            source=source,
            source_credibility=cred,
            article_date=item.get("publishedAt", ""),
            url=item.get("url", ""),
        )
        if commodity_filter:
            if commodity_filter.upper() not in [c.upper() for c in result["commodity"]]:
                result["relevanceScore"] *= 0.3  # reduce but keep for context
        classified.append(result)

    # Aggregate
    n = len(classified)
    if n == 0:
        return {
            "count": 0, "sentimentScore": 0.0, "avgRelevance": 0.0,
            "topEventType": "market_structure", "newsVolume": "Low",
            "highImpactCount": 0, "classified": [],
            "topDriverHeadlines": [], "dominantDirection": "neutral",
        }

    avg_sentiment = round(sum(c["sentiment"] for c in classified) / n, 2)
    avg_relevance = round(sum(c["relevanceScore"] for c in classified) / n, 2)
    event_counts: dict[str, int] = {}
    for c in classified:
        for et in c["eventTypes"]:
            event_counts[et] = event_counts.get(et, 0) + 1
    top_event = max(event_counts, key=event_counts.get) if event_counts else "market_structure"
    high_impact = [c for c in classified if c["impactLevel"] == "High"]

    # Top drivers = highest relevance + sentiment
    top_drivers = sorted(classified, key=lambda x: x["relevanceScore"] + abs(x["sentiment"]), reverse=True)[:5]

    # Dominant direction
    bull = sum(1 for c in classified if c["direction"] == "bullish")
    bear = sum(1 for c in classified if c["direction"] == "bearish")
    dom_dir = "bullish" if bull > bear + 1 else "bearish" if bear > bull + 1 else "neutral"

    return {
        "count": n,
        "sentimentScore": avg_sentiment,
        "avgRelevance": avg_relevance,
        "topEventType": top_event,
        "newsVolume": "High" if n >= 8 else "Moderate" if n >= 3 else "Low",
        "highImpactCount": len(high_impact),
        "eventDistribution": event_counts,
        "dominantDirection": dom_dir,
        "topDriverHeadlines": [
            {
                "text": d["text"][:120],
                "eventType": d["eventType"],
                "direction": d["direction"],
                "impactLevel": d["impactLevel"],
                "relevanceScore": d["relevanceScore"],
                "whyItMatters": d["whyItMatters"],
            }
            for d in top_drivers
        ],
        "classified": classified,
        "modelMode": "deterministic_keyword_rules",
        "mlReadyFields": True,
        "note": "ML classifier (FinBERT) can replace this engine — interface is identical.",
    }
