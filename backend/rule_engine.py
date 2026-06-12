"""Rule Engine — deterministic market rules for GeoEnergy Intelligence AI.

Version 1 (Rules + RAG) — explainable, auditable signal rules based on
energy market research and historical playbook patterns.
Each rule produces: signal name, commodities, direction, confidence,
stakeholders, confirmation, invalidation, explanation.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Direction = Literal["bullish", "bearish", "neutral", "volatile"]
Posture = Literal["BUY", "HOLD", "HEDGE", "REDUCE", "MONITOR", "WAIT"]


@dataclass
class RuleSignal:
    signalId: str
    signalName: str
    category: str          # supply_shock | demand_shock | weather | storage | geo | cross_market | macro | policy
    affectedCommodities: list[str]
    direction: Direction
    confidence: int        # 0-100
    impactLevel: str       # High | Moderate | Low
    affectedStakeholders: list[str]
    confirmationSignal: str
    invalidationSignal: str
    explanation: str
    recommendedPosture: Posture
    active: bool = True
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "signalId": self.signalId,
            "signalName": self.signalName,
            "category": self.category,
            "affectedCommodities": self.affectedCommodities,
            "direction": self.direction,
            "confidence": self.confidence,
            "impactLevel": self.impactLevel,
            "affectedStakeholders": self.affectedStakeholders,
            "confirmationSignal": self.confirmationSignal,
            "invalidationSignal": self.invalidationSignal,
            "explanation": self.explanation,
            "recommendedPosture": self.recommendedPosture,
            "active": self.active,
        }


# ── Supply shock rules ─────────────────────────────────────────────────────────

def _rule_opec_cut(news_texts: list[str]) -> RuleSignal | None:
    triggers = ["opec", "production cut", "output cut", "quota cut", "compliance"]
    if any(any(t in n.lower() for t in triggers) for n in news_texts):
        return RuleSignal(
            signalId="OPEC_CUT",
            signalName="OPEC+ Supply Discipline / Cut Signal",
            category="supply_shock",
            affectedCommodities=["WTI", "BRENT", "DIESEL", "GASOLINE", "JET_FUEL"],
            direction="bullish",
            confidence=82,
            impactLevel="High",
            affectedStakeholders=["airlines", "logistics", "fuel-distributors", "refiners", "consumers"],
            confirmationSignal="Brent breaks above bull threshold; inventory draws accelerate; tanker traffic flat",
            invalidationSignal="OPEC+ compliance breakdown; demand miss in China PMI below 50",
            explanation="OPEC+ production cuts reduce global crude supply, tightening the market and pushing prices higher. This flows through to refined products within 2-4 weeks, increasing costs for fuel-intensive sectors.",
            recommendedPosture="HEDGE",
        )
    return None


def _rule_refinery_outage(news_texts: list[str], prices: dict) -> RuleSignal | None:
    triggers = ["refinery", "outage", "shutdown", "fire", "maintenance", "yield"]
    if any(any(t in n.lower() for t in triggers) for n in news_texts):
        crack = prices.get("diesel_crack_spread", 0)
        confidence = 80 if crack > 35 else 72
        return RuleSignal(
            signalId="REFINERY_OUTAGE",
            signalName="Refinery Outage / Capacity Stress",
            category="supply_shock",
            affectedCommodities=["DIESEL", "GASOLINE", "JET_FUEL"],
            direction="bullish",
            confidence=confidence,
            impactLevel="High" if crack > 35 else "Moderate",
            affectedStakeholders=["airlines", "logistics", "fuel-distributors", "consumers"],
            confirmationSignal="Diesel crack spread > $35/bbl; refinery utilization drops below 85%",
            invalidationSignal="Refinery restarts confirmed; crude inventory builds",
            explanation="Refinery outages reduce refined product output independently of crude prices. Diesel and gasoline crack spreads widen, passing costs directly to freight, agriculture, and transport sectors.",
            recommendedPosture="HEDGE",
        )
    return None


def _rule_pipeline_disruption(news_texts: list[str]) -> RuleSignal | None:
    triggers = ["pipeline", "disruption", "rupture", "flow halt", "nord stream", "keystone"]
    if any(any(t in n.lower() for t in triggers) for n in news_texts):
        return RuleSignal(
            signalId="PIPELINE_DISRUPTION",
            signalName="Pipeline Flow Disruption",
            category="supply_shock",
            affectedCommodities=["WTI", "NATGAS", "BRENT"],
            direction="bullish",
            confidence=78,
            impactLevel="High",
            affectedStakeholders=["utilities", "refiners", "fuel-distributors", "consumers"],
            confirmationSignal="Basis differentials widen; regional prices diverge sharply",
            invalidationSignal="Alternative supply routes confirmed; rapid restart announced",
            explanation="Pipeline disruptions cut supply arteries connecting production to markets. Regional price differentials widen and alternative logistics are priced at premium.",
            recommendedPosture="HEDGE",
        )
    return None


def _rule_export_disruption(news_texts: list[str], geo_items: list[dict]) -> RuleSignal | None:
    triggers = ["export ban", "export halt", "sanctions", "embargo", "blockade"]
    geo_critical = any(g.get("riskLevel") in ("Critical", "High") for g in (geo_items or []))
    if geo_critical or any(any(t in n.lower() for t in triggers) for n in news_texts):
        return RuleSignal(
            signalId="EXPORT_DISRUPTION",
            signalName="Export Disruption / Sanctions Regime",
            category="geo",
            affectedCommodities=["WTI", "BRENT", "DIESEL", "WHEAT", "FREIGHT"],
            direction="bullish",
            confidence=85 if geo_critical else 74,
            impactLevel="High",
            affectedStakeholders=["traders", "logistics", "airlines", "consumers", "utilities"],
            confirmationSignal="Critical geo event confirmed; tanker rerouting; shipping insurance premium rises",
            invalidationSignal="Sanctions lifted; alternative supply fully replaces disrupted volumes",
            explanation="Export disruptions from sanctions or conflict remove supply from the global market. The impact propagates through shipping routes, refined product supply chains, and food systems if wheat or fertilizer is affected.",
            recommendedPosture="HEDGE",
        )
    return None


def _rule_chokepoint_risk(geo_items: list[dict]) -> RuleSignal | None:
    chokepoints = ["hormuz", "suez", "red sea", "panama", "bosphorus", "malacca"]
    active = [g for g in (geo_items or []) if any(c in str(g).lower() for c in chokepoints)]
    if active:
        return RuleSignal(
            signalId="CHOKEPOINT_RISK",
            signalName="Maritime Chokepoint Risk Active",
            category="geo",
            affectedCommodities=["BRENT", "WTI", "DIESEL", "FREIGHT", "WHEAT"],
            direction="bullish",
            confidence=83,
            impactLevel="High",
            affectedStakeholders=["traders", "logistics", "airlines", "refiners", "consumers"],
            confirmationSignal="Tanker rerouting confirmed; freight insurance premium rises; shipping delay data",
            invalidationSignal="Military escort restored; threat neutralized; normal traffic resumed",
            explanation=f"Active chokepoint stress detected: {', '.join(str(a.get('region','')) for a in active[:2])}. Tanker rerouting adds 10-25 days transit time and significant freight cost. Crude risk premium of $2-8/bbl historically added during acute events.",
            recommendedPosture="HEDGE",
        )
    return None


# ── Demand shock rules ─────────────────────────────────────────────────────────

def _rule_demand_destruction(prices: dict, news_texts: list[str]) -> RuleSignal | None:
    copper_dir = prices.get("copper_direction", "flat")
    freight_dir = prices.get("freight_direction", "flat")
    crude_dir = prices.get("crude_direction", "flat")
    pmi_weak = any("pmi" in n.lower() and any(w in n.lower() for w in ["weak", "below", "contraction", "50"]) for n in news_texts)
    if (copper_dir == "down" and freight_dir == "down") or (pmi_weak and crude_dir == "down"):
        return RuleSignal(
            signalId="DEMAND_DESTRUCTION",
            signalName="Industrial Demand Destruction Signal",
            category="demand_shock",
            affectedCommodities=["WTI", "COPPER", "FREIGHT", "ALUMINUM"],
            direction="bearish",
            confidence=84,
            impactLevel="High",
            affectedStakeholders=["traders", "holders", "manufacturers", "shipping-companies"],
            confirmationSignal="China PMI below 50; inventory builds accelerate; BDI continues lower",
            invalidationSignal="China stimulus package; manufacturing PMI recovery above 52; demand data surprise",
            explanation="Copper and freight indices are leading indicators of global industrial demand. Their simultaneous weakness signals economic slowdown, reducing crude and industrial commodity demand. The bearish probability is raised for energy and metals.",
            recommendedPosture="REDUCE",
        )
    return None


def _rule_china_slowdown(news_texts: list[str], prices: dict) -> RuleSignal | None:
    triggers = ["china", "pmi", "property", "evergrande", "stimulus", "slowdown"]
    china_news = [n for n in news_texts if "china" in n.lower()]
    bearish_china = [n for n in china_news if any(w in n.lower() for w in ["weak", "slow", "fall", "miss", "below"])]
    if len(bearish_china) >= 1:
        return RuleSignal(
            signalId="CHINA_SLOWDOWN",
            signalName="China Demand Weakness",
            category="demand_shock",
            affectedCommodities=["COPPER", "WTI", "FREIGHT", "ALUMINUM", "LITHIUM"],
            direction="bearish",
            confidence=78,
            impactLevel="High",
            affectedStakeholders=["traders", "manufacturers", "shipping-companies", "ev-battery-chain"],
            confirmationSignal="China manufacturing PMI < 50; import volume data miss; property sector stress continues",
            invalidationSignal="PBOC stimulus announced; construction activity rebounds; trade data beats",
            explanation="China consumes ~15% of global crude and dominant shares of copper, aluminum, and bulk commodities. Demand weakness signals ripple through to all industrial commodity markets within 2-4 weeks.",
            recommendedPosture="REDUCE",
        )
    return None


def _rule_recession_risk(news_texts: list[str]) -> RuleSignal | None:
    triggers = ["recession", "rate hike", "fed tightening", "central bank", "gdp miss", "consumer confidence"]
    if sum(1 for n in news_texts if any(t in n.lower() for t in triggers)) >= 2:
        return RuleSignal(
            signalId="MACRO_RECESSION_RISK",
            signalName="Macro Recession / Tightening Risk",
            category="demand_shock",
            affectedCommodities=["WTI", "COPPER", "FREIGHT", "ALUMINUM", "NATGAS"],
            direction="bearish",
            confidence=72,
            impactLevel="Moderate",
            affectedStakeholders=["traders", "holders", "manufacturers", "consumers"],
            confirmationSignal="Yield curve inversion; equity market decline; consumer credit data weakening",
            invalidationSignal="Soft landing confirmed; GDP beats; consumer spending resilient",
            explanation="Central bank tightening and recession fears reduce energy and industrial demand expectations. Bearish pressure builds across crude, base metals, and freight as growth outlook deteriorates.",
            recommendedPosture="MONITOR",
        )
    return None


# ── Weather / seasonality rules ───────────────────────────────────────────────

def _rule_cold_weather(news_texts: list[str]) -> RuleSignal | None:
    triggers = ["cold", "freeze", "winter", "snow", "arctic", "polar vortex", "below average temperature"]
    if any(any(t in n.lower() for t in triggers) for n in news_texts):
        return RuleSignal(
            signalId="COLD_WEATHER_GAS",
            signalName="Cold Weather — Gas / Heating Demand Spike",
            category="weather",
            affectedCommodities=["NATGAS", "TTF", "HEATING_OIL", "POWER"],
            direction="bullish",
            confidence=80,
            impactLevel="High",
            affectedStakeholders=["utilities", "consumers", "manufacturers", "traders"],
            confirmationSignal="Storage draws accelerate; power demand spikes; LNG cargoes divert to premium markets",
            invalidationSignal="Temperature normalization; weather forecast moderates; storage remains adequate",
            explanation="Cold weather events sharply increase heating demand for natural gas, heating oil, and power. Storage draws accelerate, reducing the buffer against supply disruptions and pushing prompt prices higher.",
            recommendedPosture="HOLD",
        )
    return None


def _rule_hurricane_risk(news_texts: list[str]) -> RuleSignal | None:
    triggers = ["hurricane", "tropical storm", "gulf coast", "platform evacuation", "gulf of mexico"]
    if any(any(t in n.lower() for t in triggers) for n in news_texts):
        return RuleSignal(
            signalId="HURRICANE_GULF_RISK",
            signalName="Gulf Coast Hurricane / Refinery Risk",
            category="weather",
            affectedCommodities=["WTI", "DIESEL", "GASOLINE", "NATGAS"],
            direction="volatile",
            confidence=77,
            impactLevel="High",
            affectedStakeholders=["refiners", "traders", "airlines", "logistics", "consumers"],
            confirmationSignal="Platform evacuations confirmed; refinery shutdowns announced; insurance premiums rise",
            invalidationSignal="Storm track shifts; rapid platform restart; no refinery damage",
            explanation="Gulf Coast hurricanes threaten both crude production platforms and refinery operations. Supply disruptions can cause sharp but temporary price spikes in crude and refined products depending on storm track and intensity.",
            recommendedPosture="HEDGE",
        )
    return None


# ── Inventory / storage rules ─────────────────────────────────────────────────

def _rule_inventory_draw(news_texts: list[str], storage_data: dict) -> RuleSignal | None:
    draw_news = any(any(w in n.lower() for w in ["inventory draw", "eia draw", "drawdown", "stocks fell"]) for n in news_texts)
    draw_data = storage_data.get("weeklyChange", 0)
    if draw_news or draw_data < -3_000_000:  # >3M bbl draw
        return RuleSignal(
            signalId="INVENTORY_DRAW_CRUDE",
            signalName="Crude Inventory Draw — Bullish Signal",
            category="storage",
            affectedCommodities=["WTI", "BRENT", "DIESEL"],
            direction="bullish",
            confidence=79,
            impactLevel="Moderate",
            affectedStakeholders=["traders", "refiners", "holders"],
            confirmationSignal="Multiple consecutive weeks of draws; refinery runs increasing; demand data beats",
            invalidationSignal="Build reported next week; demand data miss; imports surge",
            explanation="EIA crude inventory draws signal demand exceeding supply at current production levels. Sustained draws build the bullish case for price support above the historical mean.",
            recommendedPosture="HOLD",
        )
    return None


def _rule_eu_gas_storage(storage_data: dict) -> RuleSignal | None:
    eu_fill = storage_data.get("euFillRate", None)  # % of capacity
    if eu_fill is None:
        return None
    if eu_fill < 60:
        return RuleSignal(
            signalId="EU_GAS_STORAGE_LOW",
            signalName="EU Gas Storage Critically Low",
            category="storage",
            affectedCommodities=["TTF", "NATGAS", "POWER", "ALUMINUM"],
            direction="bullish",
            confidence=88,
            impactLevel="High",
            affectedStakeholders=["utilities", "manufacturers", "consumers", "aluminum-smelters"],
            confirmationSignal="Winter gas demand exceeds injection pace; LNG cargoes diverting; spot premium widens",
            invalidationSignal="Emergency LNG supplies arrive; demand destruction reduces consumption; mild winter",
            explanation=f"EU gas storage at {eu_fill:.0f}% — critically below the 60% threshold entering winter. Shortage risk is acute with potential €50-100/MWh price spike and industrial demand curtailment.",
            recommendedPosture="HEDGE",
        )
    elif eu_fill > 85:
        return RuleSignal(
            signalId="EU_GAS_STORAGE_HIGH",
            signalName="EU Gas Storage Surplus — Bearish Normalization",
            category="storage",
            affectedCommodities=["TTF", "NATGAS", "POWER"],
            direction="bearish",
            confidence=75,
            impactLevel="Moderate",
            affectedStakeholders=["utilities", "gas-traders", "consumers"],
            confirmationSignal="Storage levels hold above average through October; LNG imports normalize",
            invalidationSignal="Cold snap cuts injection surplus; LNG diversion; pipeline disruption",
            explanation=f"EU gas storage at {eu_fill:.0f}% — comfortable surplus reduces winter price risk premium. Bearish normalization likely unless cold shock or supply disruption intervenes.",
            recommendedPosture="REDUCE",
        )
    return None


# ── Sanctions / geopolitics rules ─────────────────────────────────────────────

def _rule_iran_sanctions(news_texts: list[str]) -> RuleSignal | None:
    triggers = ["iran", "iranian", "nuclear deal", "jcpoa", "tehran"]
    if any(any(t in n.lower() for t in triggers) for n in news_texts):
        return RuleSignal(
            signalId="IRAN_SANCTIONS",
            signalName="Iran Sanctions / Nuclear Deal Risk",
            category="geo",
            affectedCommodities=["WTI", "BRENT"],
            direction="volatile",
            confidence=76,
            impactLevel="High",
            affectedStakeholders=["traders", "refiners", "airlines"],
            confirmationSignal="JCPOA talks collapse; new sanctions confirmed; Iran oil exports restricted",
            invalidationSignal="JCPOA deal signed; Iranian exports normalized; compliance confirmed",
            explanation="Iran sanctions tighten or loosen global crude supply significantly. Iran holds ~3.5M bbl/day of capacity. Sanctions tightening adds a risk premium; a deal removes supply restriction and adds bearish pressure.",
            recommendedPosture="MONITOR",
        )
    return None


def _rule_russia_sanctions(news_texts: list[str]) -> RuleSignal | None:
    triggers = ["russia", "russian", "ukraine", "nord stream", "ural", "ruble"]
    if any(any(t in n.lower() for t in triggers) for n in news_texts):
        return RuleSignal(
            signalId="RUSSIA_SANCTIONS",
            signalName="Russia / Ukraine Energy Sanctions",
            category="geo",
            affectedCommodities=["BRENT", "TTF", "NATGAS", "WHEAT", "FREIGHT"],
            direction="bullish",
            confidence=80,
            impactLevel="High",
            affectedStakeholders=["utilities", "traders", "manufacturers", "agriculture", "consumers"],
            confirmationSignal="EU import ban confirmed; rerouting of crude through India/China visible; freight premium",
            invalidationSignal="Ceasefire agreement; sanctions waiver; alternative supply fully replacing Russian volumes",
            explanation="Russia-Ukraine conflict and related sanctions disrupt global energy supply chains, particularly for EU gas, crude, and wheat. The conflict creates a persistent risk premium across European energy markets.",
            recommendedPosture="HEDGE",
        )
    return None


# ── Cross-market signal rules ─────────────────────────────────────────────────

def _rule_gold_crude_confirm(prices: dict) -> RuleSignal | None:
    gold_dir = prices.get("gold_direction", "flat")
    crude_dir = prices.get("crude_direction", "flat")
    geo_high = prices.get("geo_risk_score", 0) > 6
    if gold_dir == "up" and crude_dir == "up" and geo_high:
        return RuleSignal(
            signalId="GOLD_CRUDE_GEO_CONFIRM",
            signalName="Gold + Crude + Geo-Risk Triple Confirmation",
            category="cross_market",
            affectedCommodities=["WTI", "BRENT", "GOLD"],
            direction="bullish",
            confidence=88,
            impactLevel="High",
            affectedStakeholders=["traders", "airlines", "logistics", "investors"],
            confirmationSignal="Geopolitical event confirmed with physical supply impact; tanker insurance premium rises",
            invalidationSignal="Gold retreats without supply disruption; crude fails to hold above bull threshold",
            explanation="All three risk signals (gold, crude, geo-risk score) confirming simultaneously signals a genuine geopolitical supply risk premium — not just macro fear. This is the strongest combination for a bullish crude posture.",
            recommendedPosture="HEDGE",
        )
    return None


def _rule_gold_crude_diverge(prices: dict) -> RuleSignal | None:
    gold_dir = prices.get("gold_direction", "flat")
    crude_dir = prices.get("crude_direction", "flat")
    gold_pct = prices.get("gold_change_pct", 0)
    if gold_dir == "up" and crude_dir in ("down", "flat") and gold_pct >= 0.5:
        return RuleSignal(
            signalId="GOLD_CRUDE_DIVERGE",
            signalName="Gold Up / Crude Flat — Risk-Off Divergence",
            category="cross_market",
            affectedCommodities=["GOLD", "WTI"],
            direction="neutral",
            confidence=76,
            impactLevel="Moderate",
            affectedStakeholders=["investors", "traders", "portfolio-managers"],
            confirmationSignal="DXY weakening; equity markets declining; recession-risk language increasing",
            invalidationSignal="Crude breaks out on supply catalyst; physical demand confirms; risk-on pivots",
            explanation="Gold bid without crude participation signals macro fear (recession risk, USD stress) rather than physical supply disruption. This divergence typically precedes risk-off corrections in industrial commodities.",
            recommendedPosture="MONITOR",
        )
    return None


def _rule_demand_destruction_triple(prices: dict) -> RuleSignal | None:
    copper_dir = prices.get("copper_direction", "flat")
    bdi_dir = prices.get("freight_direction", "flat")
    crude_dir = prices.get("crude_direction", "flat")
    if copper_dir == "down" and bdi_dir == "down" and crude_dir in ("down", "flat"):
        return RuleSignal(
            signalId="DEMAND_DESTRUCTION_TRIPLE",
            signalName="Copper + BDI + Crude — Demand Destruction Triad",
            category="cross_market",
            affectedCommodities=["WTI", "COPPER", "FREIGHT", "ALUMINUM"],
            direction="bearish",
            confidence=86,
            impactLevel="High",
            affectedStakeholders=["traders", "manufacturers", "shipping-companies", "holders"],
            confirmationSignal="China PMI below 49; global trade volume data miss; inventory builds persist",
            invalidationSignal="Stimulus surprise; commodity demand beat; BDI reversal on shipping crunch",
            explanation="Copper, BDI, and crude all declining simultaneously is the strongest demand destruction signal. Historical analogue: 2008 GFC demand collapse and 2020 COVID shutdown. Bear probability materially raised.",
            recommendedPosture="REDUCE",
        )
    return None


def _rule_diesel_crack_stress(prices: dict) -> RuleSignal | None:
    crack = prices.get("diesel_crack_spread", 0)
    if crack > 35:
        return RuleSignal(
            signalId="DIESEL_CRACK_STRESS",
            signalName="Diesel Crack Spread Elevated — Downstream Tightness",
            category="cross_market",
            affectedCommodities=["DIESEL", "GASOLINE", "JET_FUEL"],
            direction="bullish",
            confidence=83,
            impactLevel="High",
            affectedStakeholders=["logistics", "airlines", "agriculture", "consumers", "refiners"],
            confirmationSignal="Refinery utilization below 88%; crack spread sustained > $35 for 5+ days",
            invalidationSignal="Refinery restarts confirmed; demand destruction capping diesel consumption",
            explanation=f"Diesel crack spread at ${crack:.1f}/bbl — elevated beyond the $35 stress threshold. Downstream tightness is real: trucking, agriculture, and logistics face margin pressure that passes through to consumer prices in 2-4 weeks.",
            recommendedPosture="HEDGE",
        )
    return None


def _rule_ttf_power_stress(prices: dict) -> RuleSignal | None:
    ttf_dir = prices.get("ttf_direction", "flat")
    power_dir = prices.get("power_direction", "flat")
    if ttf_dir == "up" and power_dir == "up":
        return RuleSignal(
            signalId="TTF_POWER_STRESS",
            signalName="TTF + EU Power Cost Stress",
            category="cross_market",
            affectedCommodities=["TTF", "NATGAS", "POWER", "ALUMINUM", "CARBON"],
            direction="bullish",
            confidence=80,
            impactLevel="High",
            affectedStakeholders=["utilities", "manufacturers", "aluminum-smelters", "consumers"],
            confirmationSignal="EU power spot > €120/MWh; smelter curtailment announcements; industrial output warnings",
            invalidationSignal="Storage normalizes; LNG arrivals increase; weather moderates",
            explanation="TTF and EU power prices rising together signals energy cost stress across EU industry. Aluminum smelters face curtailment economics above €100/MWh power. Manufacturing margins compress with a 4-6 week lag.",
            recommendedPosture="HEDGE",
        )
    return None


def _rule_aluminum_power_squeeze(prices: dict) -> RuleSignal | None:
    alum_dir = prices.get("aluminum_direction", "flat")
    power_dir = prices.get("power_direction", "flat")
    if alum_dir == "up" and power_dir == "up":
        return RuleSignal(
            signalId="ALUMINUM_POWER_SQUEEZE",
            signalName="Aluminum + EU Power — Smelter Cost Pressure",
            category="cross_market",
            affectedCommodities=["ALUMINUM", "POWER", "TTF"],
            direction="volatile",
            confidence=75,
            impactLevel="Moderate",
            affectedStakeholders=["manufacturers", "aluminum-smelters", "construction", "utilities"],
            confirmationSignal="European smelter curtailment confirmed; LME aluminum premium widens",
            invalidationSignal="Power prices normalize; new smelter capacity from China offset",
            explanation="Aluminum production is power-intensive — EU smelters become uneconomic above €100/MWh. Curtailments reduce supply, supporting LME price, while manufacturers face dual input cost pressure.",
            recommendedPosture="MONITOR",
        )
    return None


# ── Carbon / policy rules ─────────────────────────────────────────────────────

def _rule_carbon_policy(news_texts: list[str]) -> RuleSignal | None:
    triggers = ["carbon", "ets", "eua", "cap and trade", "emission", "co2 price", "msats"]
    if sum(1 for n in news_texts if any(t in n.lower() for t in triggers)) >= 2:
        return RuleSignal(
            signalId="CARBON_POLICY_SHIFT",
            signalName="Carbon Policy / ETS Regime Shift",
            category="policy",
            affectedCommodities=["CARBON", "COAL", "NATGAS", "POWER", "ALUMINUM"],
            direction="volatile",
            confidence=70,
            impactLevel="Moderate",
            affectedStakeholders=["utilities", "manufacturers", "traders", "consumers"],
            confirmationSignal="EU ETS price breaks above €80/tonne; new MSATS rules; coal plant early retirement",
            invalidationSignal="Policy reversal or delay; ETS reform blocked; industrial lobby exemptions granted",
            explanation="Carbon policy changes reprice the cost of fossil-fuel power generation, triggering fuel switching economics. Aluminum, steel, and power-intensive industries face direct compliance cost changes.",
            recommendedPosture="MONITOR",
        )
    return None


# ── Master rule evaluator ─────────────────────────────────────────────────────

def evaluate_rules(
    news_texts: list[str],
    prices: dict,
    geo_items: list[dict],
    storage_data: dict,
) -> list[dict]:
    """Run all deterministic rules and return a list of active RuleSignal dicts.

    Args:
        news_texts: List of headline/article text strings.
        prices: Dict with direction + value keys for major commodities:
            crude_direction, gold_direction, copper_direction, freight_direction,
            ttf_direction, power_direction, aluminum_direction, diesel_crack_spread,
            geo_risk_score, gold_change_pct.
        geo_items: List of geo-risk items from georisk_adapter.
        storage_data: Dict with storage metrics:
            euFillRate (%), weeklyChange (bbl), aboveFiveYearAverage (bool).

    Returns:
        List of rule signal dicts sorted by confidence descending.
    """
    rule_fns = [
        _rule_opec_cut(news_texts),
        _rule_refinery_outage(news_texts, prices),
        _rule_pipeline_disruption(news_texts),
        _rule_export_disruption(news_texts, geo_items),
        _rule_chokepoint_risk(geo_items),
        _rule_demand_destruction(prices, news_texts),
        _rule_china_slowdown(news_texts, prices),
        _rule_recession_risk(news_texts),
        _rule_cold_weather(news_texts),
        _rule_hurricane_risk(news_texts),
        _rule_inventory_draw(news_texts, storage_data),
        _rule_eu_gas_storage(storage_data),
        _rule_iran_sanctions(news_texts),
        _rule_russia_sanctions(news_texts),
        _rule_gold_crude_confirm(prices),
        _rule_gold_crude_diverge(prices),
        _rule_demand_destruction_triple(prices),
        _rule_diesel_crack_stress(prices),
        _rule_ttf_power_stress(prices),
        _rule_aluminum_power_squeeze(prices),
        _rule_carbon_policy(news_texts),
    ]
    active = [r.to_dict() for r in rule_fns if r is not None]
    active.sort(key=lambda x: x["confidence"], reverse=True)
    return active


def derive_posture_from_rules(rules: list[dict]) -> tuple[str, int, str]:
    """Derive recommended posture, confidence, and market bias from active rules.

    Returns:
        (posture, confidence, bias) where bias is bullish | bearish | neutral | volatile
    """
    if not rules:
        return "MONITOR", 55, "neutral"
    bull_count = sum(1 for r in rules if r["direction"] == "bullish")
    bear_count = sum(1 for r in rules if r["direction"] == "bearish")
    vol_count = sum(1 for r in rules if r["direction"] == "volatile")
    avg_conf = int(sum(r["confidence"] for r in rules) / len(rules))
    top = rules[0]
    if vol_count >= 2 or (bull_count >= 1 and bear_count >= 1):
        return "HEDGE", min(avg_conf + 5, 92), "volatile"
    if bull_count > bear_count + 1:
        if top["direction"] == "bullish" and top["confidence"] >= 80:
            return "HEDGE", avg_conf, "bullish"
        return "HOLD", avg_conf, "bullish"
    if bear_count > bull_count + 1:
        if top["direction"] == "bearish" and top["confidence"] >= 80:
            return "REDUCE", avg_conf, "bearish"
        return "MONITOR", avg_conf, "bearish"
    return "MONITOR", avg_conf, "neutral"
