"""Geo-Risk Adapter — derives risk scores from headlines, GDELT, or mock fallback (18 items)."""
import time
import asyncio
import httpx
from datetime import datetime

HEADERS = {"User-Agent": "GeoEnergyIntelligenceAI/1.0"}
TIMEOUT = 8.0

TEMPLATES = [
    {
        "id": "geo-001", "countryOrArea": "Strait of Hormuz", "region": "Middle East",
        "coordinates": [26.5, 56.5], "eventType": "Shipping Chokepoint",
        "affectedSectors": ["Crude Oil", "Refined Products", "Natural Gas"],
        "keywords": ["hormuz", "persian gulf", "iran", "tanker", "strait"],
        "baseScore": 9.2, "baseLevel": "Critical",
        "marketImpact": "Supply constraints could support Brent, diesel, and LNG-linked prices. +$5-8 volatility projected.",
        "whyItMatters": "Critical chokepoint for ~20% of global oil trade. Any closure triggers immediate global supply shock.",
        "priceImpactHint": "+$5-8/bbl on disruption",
        "source": "GEI Signal / Satellite Telemetry",
    },
    {
        "id": "geo-002", "countryOrArea": "Ukraine / Russia Transit", "region": "Eastern Europe",
        "coordinates": [50.0, 30.5], "eventType": "Transit Risk",
        "affectedSectors": ["Natural Gas", "Power"],
        "keywords": ["russia", "ukraine", "gas transit", "pipeline", "moscow"],
        "baseScore": 8.5, "baseLevel": "High",
        "marketImpact": "Gas transit uncertainty may increase European power price volatility.",
        "whyItMatters": "Remaining transit routes through Ukraine carry residual EU gas supply. Any disruption raises winter storage risk.",
        "priceImpactHint": "+€8-15/MWh gas spike risk",
        "source": "Reuters Global / GeoRisk Monitor",
    },
    {
        "id": "geo-003", "countryOrArea": "Red Sea Transit", "region": "Middle East / Africa",
        "coordinates": [20.0, 38.5], "eventType": "Maritime Insurance Risk",
        "affectedSectors": ["Refined Products", "Crude Oil"],
        "keywords": ["red sea", "suez", "houthi", "yemen", "shipping"],
        "baseScore": 7.9, "baseLevel": "High",
        "marketImpact": "Insurance premiums raising shipping costs. Rerouting via Cape of Good Hope adding 14 days per voyage.",
        "whyItMatters": "Suez/Red Sea route handles ~12% of global trade. Disruption raises diesel and gasoline delivery costs.",
        "priceImpactHint": "+$0.8-1.4/bbl freight premium",
        "source": "Lloyd's Intelligence / GeoRisk Monitor",
    },
    {
        "id": "geo-004", "countryOrArea": "Libya", "region": "North Africa",
        "coordinates": [27.0, 17.0], "eventType": "Production Disruption",
        "affectedSectors": ["Crude Oil"],
        "keywords": ["libya", "sharara", "noc", "libyan", "force majeure"],
        "baseScore": 7.4, "baseLevel": "High",
        "marketImpact": "Libyan field shutdowns reducing OPEC+ effective output and supporting Brent premium.",
        "whyItMatters": "Libya exports 1.1M bpd on good days. Force majeures removing 300-400K bpd currently support Brent.",
        "priceImpactHint": "+$2-4/bbl Brent support",
        "source": "GEI Signal-4",
    },
    {
        "id": "geo-005", "countryOrArea": "Gulf of Mexico / Gulf Coast", "region": "North America",
        "coordinates": [26.0, -91.0], "eventType": "Refinery Outage",
        "affectedSectors": ["Refined Products", "Crude Oil"],
        "keywords": ["gulf coast", "texas", "refinery", "hurricane", "maintenance"],
        "baseScore": 6.1, "baseLevel": "Moderate",
        "marketImpact": "Seasonal refinery maintenance reducing diesel and gasoline output. Crack spreads widening.",
        "whyItMatters": "Gulf Coast refineries process ~50% of US crude. Maintenance season tightens diesel supply heading into summer.",
        "priceImpactHint": "Crack spread +3-6 USc/gal",
        "source": "Refinery Monitor",
    },
    {
        "id": "geo-006", "countryOrArea": "West Africa Offshore", "region": "West Africa",
        "coordinates": [4.0, 3.0], "eventType": "Production Volatility",
        "affectedSectors": ["Crude Oil", "Natural Gas"],
        "keywords": ["nigeria", "angola", "west africa", "pipeline theft", "bonny light"],
        "baseScore": 6.8, "baseLevel": "Moderate",
        "marketImpact": "Nigeria and Angola output remains below OPEC+ quota. Pipeline and terminal instability ongoing.",
        "whyItMatters": "West Africa is key Atlantic Basin swing supplier. Output gaps widen light-sweet crude premiums vs Brent.",
        "priceImpactHint": "+$1-2/bbl light sweet premium",
        "source": "GEI Signal-3 / West Africa Monitor",
    },
    {
        "id": "geo-007", "countryOrArea": "Eastern Mediterranean", "region": "Mediterranean",
        "coordinates": [34.0, 32.0], "eventType": "Geopolitical Tension",
        "affectedSectors": ["Natural Gas", "Crude Oil"],
        "keywords": ["eastern mediterranean", "cyprus", "israel", "egypt", "east med"],
        "baseScore": 5.9, "baseLevel": "Moderate",
        "marketImpact": "East Med gas field disputes adding uncertainty to European gas pipeline supply alternatives.",
        "whyItMatters": "East Med gas seen as EU alternative to Russian supply. Disputes slow development timeline.",
        "priceImpactHint": "Delays EU gas diversification plans",
        "source": "GEI Signal / Regional Monitor",
    },
    {
        "id": "geo-008", "countryOrArea": "Suez Canal", "region": "Egypt / Middle East",
        "coordinates": [30.5, 32.3], "eventType": "Shipping Chokepoint",
        "affectedSectors": ["Crude Oil", "Refined Products", "Natural Gas"],
        "keywords": ["suez", "canal", "egypt", "transit fee", "vessel"],
        "baseScore": 7.1, "baseLevel": "High",
        "marketImpact": "Increased vessel wait times and insurance surcharges affecting European crude import costs.",
        "whyItMatters": "~10% of global trade passes through Suez. LNG and crude tankers rerouting around Africa adds 2 weeks transit.",
        "priceImpactHint": "+$0.5-1.0/bbl transport cost",
        "source": "Suez Authority / GeoRisk Monitor",
    },
    {
        "id": "geo-009", "countryOrArea": "North Sea", "region": "Northern Europe",
        "coordinates": [57.0, 3.0], "eventType": "Maintenance Season",
        "affectedSectors": ["Crude Oil"],
        "keywords": ["north sea", "forties", "brent platform", "maintenance", "norwegian"],
        "baseScore": 4.2, "baseLevel": "Low",
        "marketImpact": "Seasonal maintenance at Forties and Brent platform reducing North Sea Dated output temporarily.",
        "whyItMatters": "North Sea maintenance is routine but reduces physical Brent benchmark supply, supporting forward pricing.",
        "priceImpactHint": "Minor seasonal Brent support",
        "source": "North Sea Monitor",
    },
    {
        "id": "geo-010", "countryOrArea": "Black Sea", "region": "Eastern Europe / Russia",
        "coordinates": [43.0, 34.0], "eventType": "Export Route Risk",
        "affectedSectors": ["Crude Oil", "Natural Gas"],
        "keywords": ["black sea", "novorossiysk", "urals", "sanctions", "tanker shadow"],
        "baseScore": 7.6, "baseLevel": "High",
        "marketImpact": "Russian Urals crude export restrictions and sanctions compliance reducing Black Sea tanker capacity.",
        "whyItMatters": "Black Sea route handles Kazakh, Russian, and Azeri crude. Sanctions monitoring creates buyer uncertainty.",
        "priceImpactHint": "Urals discount widening vs Brent",
        "source": "Sanctions Monitor / Lloyd's Intelligence",
    },
    {
        "id": "geo-011", "countryOrArea": "Nigeria Pipeline Risk", "region": "West Africa",
        "coordinates": [5.5, 6.5], "eventType": "Infrastructure Sabotage",
        "affectedSectors": ["Crude Oil", "Natural Gas"],
        "keywords": ["nigeria", "niger delta", "sabotage", "nnpc", "bonny light"],
        "baseScore": 7.3, "baseLevel": "High",
        "marketImpact": "Ongoing Niger Delta pipeline attacks and oil theft reducing Bonny Light export volumes.",
        "whyItMatters": "Nigeria OPEC+ quota is 1.5M bpd but actual output ~1.1-1.2M bpd due to theft and sabotage. Persistent gap.",
        "priceImpactHint": "Ongoing ~200-300K bpd gap",
        "source": "NNPC Intelligence / GEI Signal-4",
    },
    {
        "id": "geo-012", "countryOrArea": "Venezuela Export Risk", "region": "South America",
        "coordinates": [8.0, -66.0], "eventType": "Sanctions / Export Restriction",
        "affectedSectors": ["Crude Oil"],
        "keywords": ["venezuela", "maduro", "pdvsa", "sanctions waiver", "heavy crude"],
        "baseScore": 7.0, "baseLevel": "High",
        "marketImpact": "US sanctions waivers under review. Any reversal could cut Venezuelan crude exports to US Gulf refineries.",
        "whyItMatters": "Venezuelan heavy crude is critical input for some US Gulf refineries. Sanction reinstatement = feedstock shortage.",
        "priceImpactHint": "Heavy crude differential risk",
        "source": "US Treasury Monitor / GEI Signal",
    },
    {
        "id": "geo-013", "countryOrArea": "Caspian Transit", "region": "Central Asia",
        "coordinates": [42.0, 54.0], "eventType": "Transit Route Risk",
        "affectedSectors": ["Crude Oil"],
        "keywords": ["caspian", "kazakh", "cpc", "tengiz", "baku"],
        "baseScore": 5.5, "baseLevel": "Moderate",
        "marketImpact": "Caspian Pipeline Consortium capacity constraints limiting Kazakh crude export volumes.",
        "whyItMatters": "Kazakhstan exports 1.6M bpd via CPC through Russia. Any sanctions spillover or mechanical issue disrupts flow.",
        "priceImpactHint": "CPC volumes down ~100K bpd",
        "source": "CPC Monitor / Central Asia Intelligence",
    },
    {
        "id": "geo-014", "countryOrArea": "South China Sea", "region": "Asia Pacific",
        "coordinates": [15.0, 114.0], "eventType": "Territorial Dispute",
        "affectedSectors": ["Crude Oil", "Natural Gas"],
        "keywords": ["south china sea", "spratly", "taiwan", "lng", "china naval"],
        "baseScore": 6.2, "baseLevel": "Moderate",
        "marketImpact": "Disputed energy exploration rights in South China Sea creating uncertainty for regional LNG development.",
        "whyItMatters": "Estimated 11B barrels oil and 190T cubic feet gas under disputed waters. Escalation risk real.",
        "priceImpactHint": "LNG development delays",
        "source": "Asia Pacific Intelligence / Satellite Monitor",
    },
    {
        "id": "geo-015", "countryOrArea": "Panama Canal", "region": "Central America",
        "coordinates": [9.0, -79.5], "eventType": "Drought / Capacity Restriction",
        "affectedSectors": ["Crude Oil", "Natural Gas", "Refined Products"],
        "keywords": ["panama canal", "drought", "draft restriction", "lng carrier", "panama"],
        "baseScore": 5.8, "baseLevel": "Moderate",
        "marketImpact": "Low water levels restricting LNG and crude tanker drafts. Vessels rerouting via Cape Horn.",
        "whyItMatters": "Panama handles US LNG and crude flows to Asia. Restrictions add $2-3/MMBtu to US LNG delivered to Japan.",
        "priceImpactHint": "+$2-3/MMBtu Asia LNG delivered",
        "source": "Panama Canal Authority Monitor",
    },
    {
        "id": "geo-016", "countryOrArea": "European Gas Storage Risk", "region": "Northern Europe",
        "coordinates": [52.0, 9.0], "eventType": "Storage Injection Risk",
        "affectedSectors": ["Natural Gas", "Power"],
        "keywords": ["eu storage", "injection", "gas storage", "agsi", "europe gas"],
        "baseScore": 5.2, "baseLevel": "Moderate",
        "marketImpact": "EU storage at 74% (above 5-yr avg) but injection pace slowing as summer demand rises.",
        "whyItMatters": "EU targets 90% storage by Nov 1. Any slowdown now risks winter shortage and gas-for-power price spike.",
        "priceImpactHint": "Injection deficit = winter gas risk",
        "source": "AGSI Storage Monitor / GEI Signal",
    },
    {
        "id": "geo-017", "countryOrArea": "US Gulf Refinery Outage Risk", "region": "North America",
        "coordinates": [29.7, -95.0], "eventType": "Refinery Maintenance",
        "affectedSectors": ["Refined Products"],
        "keywords": ["gulf coast refinery", "turnaround", "maintenance schedule", "crackers"],
        "baseScore": 4.8, "baseLevel": "Moderate",
        "marketImpact": "Multiple Gulf Coast refineries in planned turnaround through Q2. Gasoline and diesel output reduced.",
        "whyItMatters": "US Gulf processes 50% of domestic crude. Coordinated maintenance creates temporary tightness in transport fuels.",
        "priceImpactHint": "Crack spreads +3-6 USc/gal",
        "source": "Refinery Turnaround Monitor",
    },
    {
        "id": "geo-018", "countryOrArea": "Middle East Sanctions Risk", "region": "Middle East",
        "coordinates": [32.0, 53.0], "eventType": "Sanctions Enforcement",
        "affectedSectors": ["Crude Oil", "Natural Gas"],
        "keywords": ["iran", "sanctions", "ofac", "shadow fleet", "enforcement"],
        "baseScore": 8.1, "baseLevel": "High",
        "marketImpact": "Iranian oil sanctions enforcement creating shadow fleet and price differential complexity.",
        "whyItMatters": "Iranian crude production near 3.4M bpd. Stricter enforcement could remove 500K-1M bpd from global supply.",
        "priceImpactHint": "+$3-6/bbl on enforcement tightening",
        "source": "US OFAC Monitor / GEI Signal",
    },
]

_DELAYS = [14, 60, 240, 120, 360, 480, 720, 180, 900, 300, 420, 540, 660, 780, 840, 1020, 1080, 150]

MOCK_ITEMS = []
for i, t in enumerate(TEMPLATES):
    delay = _DELAYS[i] if i < len(_DELAYS) else 600
    MOCK_ITEMS.append({
        **t,
        "riskScore": t["baseScore"],
        "riskLevel": t["baseLevel"],
        "isActive": True,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


def _score_to_level(score: float) -> str:
    if score >= 9:   return "Critical"
    if score >= 7.5: return "High"
    if score >= 5:   return "Moderate"
    return "Low"


def derive_from_headlines(headlines: list) -> dict | None:
    if not headlines:
        return None
    corpus = " ".join(
        f"{h.get('headline', '')} {h.get('title', '')} {h.get('whyItMatters', '')} {h.get('context', '')}"
        for h in headlines
    ).lower()
    items = []
    for tmpl in TEMPLATES:
        hits = sum(1 for kw in tmpl["keywords"] if kw in corpus)
        headline_boost = 0.2 if any(
            (h.get("region") and (tmpl["region"] in h["region"] or h["region"] in tmpl["region"])) or
            any(tmpl["countryOrArea"] in r or tmpl["region"] in r for r in (h.get("relatedRegions") or []))
            for h in headlines
        ) else 0
        adj = 0.6 if hits >= 3 else 0.2 if hits >= 1 else -0.1
        score = min(10.0, max(1.0, round(tmpl["baseScore"] + adj + headline_boost, 1)))
        level = _score_to_level(score)
        items.append({
            **tmpl,
            "riskScore": score,
            "riskLevel": level,
            "source": "Live headlines-derived",
            "isActive": True,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        })
    return {"status": "live", "source": "Live headlines-derived", "items": items}


async def _try_gdelt_derived() -> dict | None:
    q = "oil tanker attack shipping disruption refinery sanctions pipeline conflict energy"
    url = (
        f"https://api.gdeltproject.org/api/v2/doc/doc?query={q}"
        "&mode=artlist&maxrecords=25&format=json&timespan=2days&sourcelang=english"
    )
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers=HEADERS, timeout=TIMEOUT)
        articles = r.json().get("articles", [])
        if not isinstance(articles, list) or not articles:
            return None
        corpus = " ".join(a.get("title", "") for a in articles).lower()
        items = []
        for tmpl in TEMPLATES:
            hits = sum(1 for kw in tmpl["keywords"] if kw in corpus)
            adj = 0.4 if hits >= 3 else 0.1 if hits >= 1 else -0.2
            score = min(10.0, max(1.0, round(tmpl["baseScore"] + adj, 1)))
            items.append({
                **tmpl,
                "riskScore": score,
                "riskLevel": _score_to_level(score),
                "source": "GDELT-derived",
                "isActive": True,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            })
        return {"status": "live", "source": "GDELT-derived", "items": items}
    except Exception:
        return None


async def fetch_georisk(headlines: list | None = None) -> dict:
    t0 = time.time()
    print(f"[GeoRisk] fetch_georisk called, headlines: {len(headlines or [])}")

    derived = derive_from_headlines(headlines or [])
    if derived:
        print(f"[GeoRisk] Source: Live headlines-derived, items: {len(derived['items'])}")
        return {
            **derived,
            "latencyMs": int((time.time() - t0) * 1000),
            "lastSync": datetime.utcnow().isoformat() + "Z",
        }

    try:
        r = await _try_gdelt_derived()
        if r:
            print(f"[GeoRisk] Source: GDELT-derived, items: {len(r['items'])}")
            return {**r, "latencyMs": int((time.time() - t0) * 1000), "lastSync": datetime.utcnow().isoformat() + "Z"}
    except Exception as e:
        print(f"[GeoRisk] GDELT failed: {e}")

    print(f"[GeoRisk] Source: Internal Mock, items: {len(MOCK_ITEMS)}")
    return {
        "status": "mock",
        "source": "Internal Mock",
        "items": MOCK_ITEMS,
        "latencyMs": int((time.time() - t0) * 1000),
        "lastSync": datetime.utcnow().isoformat() + "Z",
    }
