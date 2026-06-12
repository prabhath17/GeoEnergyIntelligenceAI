"""RAG-ready historical analogue selector."""
from __future__ import annotations


HISTORICAL_EVENTS = [
    {"date": "2019-09-14", "eventName": "Abqaiq Saudi Aramco drone attack", "commodities": ["WTI", "BRENT", "GOLD"], "geoRiskLevel": "Critical", "priceMove": "Brent jumped about 15% intraday before supply restoration reduced the premium.", "outcome": "Fast physical repair caused much of the spike to reverse.", "keyLesson": "Immediate crude spike risk is high, but reversal risk rises if supply restoration is credible.", "stakeholderImpact": "Airlines, refiners, logistics, and fuel buyers faced urgent hedge pressure.", "tags": ["geo-risk", "supply shock", "Middle East", "crude up", "gold up"]},
    {"date": "2020-03-09", "eventName": "2020 OPEC+ price war", "commodities": ["WTI", "BRENT"], "geoRiskLevel": "Medium", "priceMove": "Crude sold off sharply as supply discipline broke.", "outcome": "Policy reversal and demand recovery were needed to stabilize balances.", "keyLesson": "OPEC+ discipline is a regime switch for crude downside risk.", "stakeholderImpact": "Producers and holders suffered; airlines and consumers got delayed fuel relief.", "tags": ["policy", "supply surge", "crude down"]},
    {"date": "2020-04-20", "eventName": "WTI negative price event", "commodities": ["WTI", "FREIGHT"], "geoRiskLevel": "Low", "priceMove": "Front-month WTI settled below zero as storage constraints overwhelmed demand.", "outcome": "Curve mechanics and storage scarcity dominated spot fundamentals.", "keyLesson": "Storage and expiry mechanics can invalidate normal price anchors.", "stakeholderImpact": "Holders and producers faced forced liquidation risk.", "tags": ["storage", "demand shock", "oversupply", "crude down"]},
    {"date": "2022-02-24", "eventName": "Russia-Ukraine energy sanctions", "commodities": ["BRENT", "NATGAS", "TTF", "WHEAT", "GOLD"], "geoRiskLevel": "Critical", "priceMove": "Oil, gas, wheat, and gold repriced higher on sanctions and supply-route risk.", "outcome": "Europe rebalanced through LNG, storage policy, and demand destruction.", "keyLesson": "Sanctions convert local conflict into global energy and food inflation.", "stakeholderImpact": "Utilities, manufacturers, agriculture, consumers, and traders faced broad cost pressure.", "tags": ["geo-risk", "sanctions", "supply shock", "wheat up", "gas up"]},
    {"date": "2022-08-26", "eventName": "EU gas storage / Nord Stream crisis", "commodities": ["TTF", "NATGAS", "POWER", "ALUMINUM"], "geoRiskLevel": "Critical", "priceMove": "EU gas and power prices spiked, curtailing industrial demand.", "outcome": "Storage mandates and LNG imports reduced winter tail risk.", "keyLesson": "Storage adequacy can cap panic even when pipeline risk remains.", "stakeholderImpact": "Utilities, households, and power-intensive manufacturers were most exposed.", "tags": ["storage", "gas up", "power", "policy"]},
    {"date": "2021-01-01", "eventName": "2021-2022 OPEC+ discipline restoration", "commodities": ["WTI", "BRENT"], "geoRiskLevel": "Medium", "priceMove": "Crude recovered as coordinated cuts drained surplus inventories.", "outcome": "Discipline rebuilt a bullish floor until demand and inflation concerns intervened.", "keyLesson": "Coordinated supply discipline supports base-case bullish probability.", "stakeholderImpact": "Producers benefited while consumers saw delayed pump-price pressure.", "tags": ["policy", "supply discipline", "crude up"]},
    {"date": "2022-12-01", "eventName": "2022-2023 China reopening", "commodities": ["COPPER", "WTI", "FREIGHT"], "geoRiskLevel": "Low", "priceMove": "Copper and crude priced a demand recovery before realized demand fully arrived.", "outcome": "The signal faded when property and manufacturing data disappointed.", "keyLesson": "Copper and BDI must confirm reopening demand for crude rallies to hold.", "stakeholderImpact": "Industrial metals, crude holders, and shipping desks were most sensitive.", "tags": ["demand", "China", "copper up", "freight up"]},
    {"date": "2023-10-07", "eventName": "Hamas/Israel conflict", "commodities": ["GOLD", "BRENT", "WTI"], "geoRiskLevel": "High", "priceMove": "Gold rose on risk-off demand while crude risk premium depended on escalation risk.", "outcome": "Crude upside stayed contained without direct supply interruption.", "keyLesson": "Gold can confirm fear without confirming physical crude supply loss.", "stakeholderImpact": "Investors hedged; fuel buyers watched escalation pathways.", "tags": ["geo-risk", "risk-off", "gold up", "crude flat"]},
    {"date": "2023-12-15", "eventName": "Red Sea / Houthi attacks", "commodities": ["FREIGHT", "BRENT", "DIESEL", "WHEAT"], "geoRiskLevel": "High", "priceMove": "Container and shipping costs rose before crude fully repriced.", "outcome": "Rerouting raised logistics costs without proving stronger commodity demand.", "keyLesson": "Freight stress plus chokepoint risk can be a logistics-cost shock, not a demand bull signal.", "stakeholderImpact": "Logistics, importers, retailers, and consumers faced delayed pass-through.", "tags": ["logistics", "Red Sea", "freight up", "crude flat"]},
    {"date": "2022-11-01", "eventName": "2022-2023 lithium price crash", "commodities": ["LITHIUM", "COPPER"], "geoRiskLevel": "Low", "priceMove": "Lithium collapsed as supply expansion outran EV demand growth.", "outcome": "Battery costs eased with a long pass-through lag while miners cut investment.", "keyLesson": "Oversupply regimes require curtailments or demand acceleration before a durable floor.", "stakeholderImpact": "Miners lost margin; battery makers and EV OEMs gained input-cost relief.", "tags": ["oversupply", "tech transition", "lithium down"]},
]


def closest_analogue(commodity: str, direction: str, geo_risk_score: float = 0, event_type: str = "", sentiment: float = 0, volatility: str = "Moderate", region: str = "") -> dict:
    cid = str(commodity or "").upper()
    terms = {cid, str(direction or "").lower(), str(event_type or "").lower(), str(region or "").lower(), str(volatility or "").lower()}
    best = None
    best_score = -1
    for event in HISTORICAL_EVENTS:
        score = 0
        if cid in event["commodities"]:
            score += 5
        tags = [t.lower() for t in event["tags"]]
        score += sum(2 for t in tags if any(term and term in t for term in terms))
        if geo_risk_score >= 7 and event["geoRiskLevel"] in ("High", "Critical"):
            score += 3
        if sentiment > 0.25 and any("up" in t for t in tags):
            score += 1
        if sentiment < -0.25 and any("down" in t for t in tags):
            score += 1
        if score > best_score:
            best_score = score
            best = event
    result = dict(best or HISTORICAL_EVENTS[0])
    result["matchScore"] = best_score
    result["analogueSummary"] = f"Closest analogue: {result['eventName']} ({result['date']}) - {result['keyLesson']}"
    return result


def list_analogues() -> list[dict]:
    return [dict(e) for e in HISTORICAL_EVENTS]
