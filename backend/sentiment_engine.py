"""Deterministic news sentiment and event classification interfaces."""
from __future__ import annotations


SUPPLY_WORDS = ("supply", "outage", "sanction", "attack", "pipeline", "opec", "cut", "strike", "refinery", "chokepoint")
DEMAND_WORDS = ("demand", "pmi", "china", "recession", "slowdown", "inventory", "stockbuild")
GEO_WORDS = ("war", "missile", "houthi", "red sea", "hormuz", "russia", "ukraine", "iran", "israel", "sanction")
POLICY_WORDS = ("policy", "tariff", "quota", "regulation", "subsidy", "tax", "ets")
WEATHER_WORDS = ("weather", "storm", "hurricane", "heat", "cold", "winter")
LOGISTICS_WORDS = ("freight", "shipping", "port", "container", "tanker", "route")


def classify_headline(text: str) -> dict:
    t = str(text or "").lower()
    tags = []
    if any(w in t for w in SUPPLY_WORDS): tags.append("supply shock")
    if any(w in t for w in DEMAND_WORDS): tags.append("demand shock")
    if any(w in t for w in GEO_WORDS): tags.append("geo-risk")
    if any(w in t for w in POLICY_WORDS): tags.append("policy")
    if any(w in t for w in WEATHER_WORDS): tags.append("weather")
    if any(w in t for w in LOGISTICS_WORDS): tags.append("logistics")
    if not tags: tags.append("market structure")
    score = 0.0
    if any(w in t for w in ("surge", "spike", "tight", "risk", "attack", "sanction", "shortage")):
        score += 0.45
    if any(w in t for w in ("fall", "drop", "surplus", "weak", "slowdown", "glut")):
        score -= 0.35
    return {"sentimentScore": round(max(-1.0, min(1.0, score)), 2), "eventTypes": tags, "primaryEventType": tags[0]}


def summarize_news(headlines: list[dict], commodity: str | None = None) -> dict:
    items = headlines or []
    classified = []
    for item in items:
        text = item.get("headline") or item.get("title") or ""
        c = classify_headline(text)
        classified.append({**c, "headline": text, "source": item.get("source"), "impact": item.get("impact")})
    score = round(sum(i["sentimentScore"] for i in classified) / len(classified), 2) if classified else 0.0
    event_counts = {}
    for c in classified:
        for tag in c["eventTypes"]:
            event_counts[tag] = event_counts.get(tag, 0) + 1
    top_event = max(event_counts, key=event_counts.get) if event_counts else "market structure"
    return {
        "commodity": commodity,
        "headlineCount": len(items),
        "sentimentScore": score,
        "newsVolume": "High" if len(items) >= 8 else "Moderate" if len(items) >= 3 else "Low",
        "topEventType": top_event,
        "classifiedHeadlines": classified[:8],
    }
