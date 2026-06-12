"""Stakeholder Impact Engine — deterministic scoring of sector exposures.

Each stakeholder is scored based on weighted commodity exposure formulas.
Interface is model-ready: ML scoring can replace formulas with learned weights.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Posture = Literal["BUY", "HOLD", "HEDGE", "REDUCE", "MONITOR", "WAIT"]


@dataclass
class StakeholderScore:
    stakeholder: str
    exposureScore: int        # 0-100
    costPressure: str         # High | Moderate | Low | Benefit
    demandImpact: str         # Positive | Neutral | Negative
    supplyRisk: str           # High | Moderate | Low
    marginImpact: str         # Severe | Negative | Neutral | Positive
    recommendedPosture: Posture
    explanation: str
    triggerToWatch: str
    primaryCommodities: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "stakeholder": self.stakeholder,
            "exposureScore": self.exposureScore,
            "costPressure": self.costPressure,
            "demandImpact": self.demandImpact,
            "supplyRisk": self.supplyRisk,
            "marginImpact": self.marginImpact,
            "recommendedPosture": self.recommendedPosture,
            "explanation": self.explanation,
            "triggerToWatch": self.triggerToWatch,
            "primaryCommodities": self.primaryCommodities,
        }


def _clamp(val: float, lo: float = 0, hi: float = 100) -> int:
    return int(max(lo, min(hi, val)))


# ── Individual stakeholder scoring formulas ───────────────────────────────────

def score_airlines(crude_change_pct: float, route_disruption_risk: float, geo_risk_score: float) -> StakeholderScore:
    """Airlines exposure: 70% jet fuel (tied to Brent) + 30% route disruption risk."""
    jet_fuel_impact = crude_change_pct * 0.70
    route_risk = route_disruption_risk * 0.30
    raw = 60 + jet_fuel_impact * 2.5 + route_risk * 3 + geo_risk_score * 0.8
    score = _clamp(raw)
    if crude_change_pct > 5 or geo_risk_score > 7:
        posture, margin, cost = "HEDGE", "Severe", "High"
        expl = f"Jet fuel costs directly track Brent. At {crude_change_pct:+.1f}% crude move, a mid-size carrier's annual fuel bill rises ~$150-250M. Route disruptions from geo-risk (score: {geo_risk_score:.1f}) add surcharge pressure."
    elif crude_change_pct > 2:
        posture, margin, cost = "HEDGE", "Negative", "High"
        expl = f"Jet fuel hedging recommended as Brent is up {crude_change_pct:.1f}%. Airlines with unhedged positions face immediate margin compression. Surcharges may not fully offset at current demand levels."
    elif crude_change_pct < -3:
        posture, margin, cost = "HOLD", "Positive", "Low"
        expl = f"Declining crude reduces jet fuel costs — airlines benefit from {abs(crude_change_pct):.1f}% crude decline. Hedged carriers may miss the benefit; unhedged ones see direct margin relief."
    else:
        posture, margin, cost = "MONITOR", "Neutral", "Moderate"
        expl = "Jet fuel costs stable. Monitor crude and geo-risk for hedging trigger points."
    return StakeholderScore(
        stakeholder="Airlines", exposureScore=score,
        costPressure=cost, demandImpact="Neutral", supplyRisk="Moderate" if geo_risk_score > 5 else "Low",
        marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["JET_FUEL", "BRENT"],
        triggerToWatch="Brent > $90/bbl sustained; route closures via Hormuz or Red Sea; fuel surcharge recovery rate",
    )


def score_logistics_trucking(diesel_change_pct: float, freight_stress: float) -> StakeholderScore:
    """Trucking: 75% diesel cost sensitivity + 25% freight volume/stress."""
    raw = 60 + diesel_change_pct * 3 + freight_stress * 2
    score = _clamp(raw)
    if diesel_change_pct > 5 or freight_stress > 7:
        posture, margin, cost = "HEDGE", "Severe", "High"
        expl = f"Diesel up {diesel_change_pct:+.1f}% — freight margins severely compressed. A $0.20/gal diesel move = ~$8,000 annual cost per long-haul truck. Surcharge recovery lags price moves by 2-4 weeks."
    elif diesel_change_pct > 2:
        posture, margin, cost = "MONITOR", "Negative", "High"
        expl = f"Diesel rising {diesel_change_pct:.1f}%. Trucking sector faces direct cost pressure. Watch fuel surcharge trigger levels in contracts."
    elif diesel_change_pct < -3:
        posture, margin, cost = "HOLD", "Positive", "Low"
        expl = f"Diesel decline of {abs(diesel_change_pct):.1f}% benefits trucking margins. Monitoring for floor formation before assuming durable relief."
    else:
        posture, margin, cost = "MONITOR", "Neutral", "Moderate"
        expl = "Diesel stable. Freight stress index suggests demand is holding. Monitor for crack spread expansion."
    return StakeholderScore(
        stakeholder="Logistics / Trucking", exposureScore=score,
        costPressure=cost, demandImpact="Neutral", supplyRisk="Low",
        marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["DIESEL", "FREIGHT"],
        triggerToWatch="Diesel crack spread > $35/bbl; US refinery utilization < 85%; freight volume index",
    )


def score_utilities(natgas_change_pct: float, power_change_pct: float, carbon_change_pct: float, nuclear_capacity: float = 0.75) -> StakeholderScore:
    """Utilities: 60% gas cost + 30% power price + 10% carbon cost."""
    raw = 55 + natgas_change_pct * 1.8 + power_change_pct * 0.9 + carbon_change_pct * 0.3 - nuclear_capacity * 10
    score = _clamp(raw)
    if natgas_change_pct > 8:
        posture, margin, cost = "HEDGE", "Severe", "High"
        expl = f"Gas prices up {natgas_change_pct:.1f}% — direct input cost for gas-for-power generation. Nuclear at {nuclear_capacity*100:.0f}% capacity providing partial buffer. Carbon costs add {carbon_change_pct:+.1f}% headwind."
    elif power_change_pct > 10:
        posture, margin, cost = "HOLD", "Positive", "Moderate"
        expl = f"Power prices up {power_change_pct:.1f}% — utilities with generation capacity benefit on the revenue side. Gas input cost increase partially offset."
    elif natgas_change_pct < -5:
        posture, margin, cost = "HOLD", "Positive", "Low"
        expl = f"Gas prices down {abs(natgas_change_pct):.1f}% — reduces input cost for gas-peakers. Retail tariff adjustments typically lag by one billing cycle."
    else:
        posture, margin, cost = "MONITOR", "Neutral", "Moderate"
        expl = "Energy cost mix stable. Nuclear and renewable capacity providing grid stability buffer."
    return StakeholderScore(
        stakeholder="Utilities", exposureScore=score,
        costPressure=cost, demandImpact="Neutral", supplyRisk="Moderate",
        marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["NATGAS", "POWER", "CARBON"],
        triggerToWatch="EU TTF > €55/MWh; nuclear capacity factor < 65%; carbon price > €80/tonne",
    )


def score_refiners(crude_change_pct: float, crack_spread: float) -> StakeholderScore:
    """Refiners: margin depends on crack spread (refined price - crude cost)."""
    raw = 50 + (crack_spread - 25) * 1.5 - crude_change_pct * 0.5
    score = _clamp(raw)
    if crack_spread > 35:
        posture, margin, cost = "HOLD", "Positive", "High"
        expl = f"Crack spread at ${crack_spread:.1f}/bbl — refinery margins elevated. High crude input cost ({crude_change_pct:+.1f}%) partially offset by strong refined product pricing. Watch utilization rates."
    elif crack_spread < 15:
        posture, margin, cost = "REDUCE", "Severe", "Moderate"
        expl = f"Crack spread at ${crack_spread:.1f}/bbl — refinery margins compressed below sustainable levels. Expect utilization cuts or maintenance pull-forward."
    else:
        posture, margin, cost = "MONITOR", "Neutral", "Moderate"
        expl = f"Crack spread at ${crack_spread:.1f}/bbl — normal margin range. Monitor for supply-side disruption triggering crack spread expansion."
    return StakeholderScore(
        stakeholder="Refiners", exposureScore=score,
        costPressure=cost, demandImpact="Neutral", supplyRisk="Low",
        marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["WTI", "DIESEL", "GASOLINE"],
        triggerToWatch="Crack spread > $35 or < $15; refinery utilization < 85%; PADD inventory builds",
    )


def score_fuel_distributors(diesel_change_pct: float, gasoline_change_pct: float) -> StakeholderScore:
    raw = 60 + diesel_change_pct * 2 + gasoline_change_pct * 1.5
    score = _clamp(raw)
    if diesel_change_pct > 4 or gasoline_change_pct > 4:
        posture, margin, cost = "HEDGE", "Negative", "High"
        expl = f"Diesel +{diesel_change_pct:.1f}%, gasoline +{gasoline_change_pct:.1f}%. Distributors face margin pressure from rising rack prices. Inventory held at current prices becomes a cost anchor."
    elif diesel_change_pct < -3:
        posture, margin, cost = "HOLD", "Positive", "Low"
        expl = f"Diesel declining — margin relief for distributors. Spot purchase economics improving."
    else:
        posture, margin, cost = "MONITOR", "Neutral", "Moderate"
        expl = "Refined product prices stable. Margin compression risk limited near-term."
    return StakeholderScore(
        stakeholder="Fuel Distributors", exposureScore=score,
        costPressure=cost, demandImpact="Neutral", supplyRisk="Low",
        marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["DIESEL", "GASOLINE"],
        triggerToWatch="Crack spread expansion; refinery disruption; regional supply tightness",
    )


def score_manufacturers(power_change_pct: float, copper_change_pct: float, natgas_change_pct: float) -> StakeholderScore:
    raw = 55 + power_change_pct * 1.2 + copper_change_pct * 0.8 + natgas_change_pct * 0.6
    score = _clamp(raw)
    if power_change_pct > 10 or copper_change_pct > 8:
        posture, margin, cost = "HEDGE", "Severe", "High"
        expl = f"Input cost surge: power +{power_change_pct:.1f}%, copper +{copper_change_pct:.1f}%. Manufacturing margins under multi-input pressure. Energy-intensive processes (aluminum, steel, glass) face most acute stress."
    elif power_change_pct > 5:
        posture, margin, cost = "MONITOR", "Negative", "Moderate"
        expl = f"Power costs rising {power_change_pct:.1f}%. Energy-intensive manufacturing faces margin compression — gas ({natgas_change_pct:+.1f}%) is a secondary input cost factor."
    elif copper_change_pct < -5:
        posture, margin, cost = "HOLD", "Positive", "Low"
        expl = f"Copper down {abs(copper_change_pct):.1f}% — reducing input costs for electrical and industrial manufacturers. Power stable."
    else:
        posture, margin, cost = "MONITOR", "Neutral", "Moderate"
        expl = "Manufacturing input costs within normal range. Monitor for energy price breakout."
    return StakeholderScore(
        stakeholder="Manufacturing", exposureScore=score,
        costPressure=cost, demandImpact="Neutral", supplyRisk="Low",
        marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["POWER", "COPPER", "NATGAS"],
        triggerToWatch="EU power > €120/MWh; copper > $10,000/tonne; gas > €50/MWh",
    )


def score_agriculture(diesel_change_pct: float, natgas_change_pct: float, wheat_change_pct: float) -> StakeholderScore:
    raw = 55 + diesel_change_pct * 2.5 + natgas_change_pct * 1.0 + wheat_change_pct * 0.5
    score = _clamp(raw)
    if diesel_change_pct > 5 or natgas_change_pct > 10:
        posture, margin, cost = "HEDGE", "Severe", "High"
        expl = f"Farm input cost surge: diesel +{diesel_change_pct:.1f}% (machinery/irrigation), gas +{natgas_change_pct:.1f}% (fertilizer/ammonia). Grain production costs rising sharply."
    elif diesel_change_pct > 2:
        posture, margin, cost = "MONITOR", "Negative", "High"
        expl = f"Diesel rising {diesel_change_pct:.1f}% — direct impact on farm machinery, harvesting, and irrigation costs. Fertilizer (ammonia/gas) secondary pressure."
    else:
        posture, margin, cost = "HOLD", "Neutral", "Moderate"
        expl = "Agricultural input costs stable. Monitor diesel and fertilizer (gas) for seasonal pressure."
    return StakeholderScore(
        stakeholder="Agriculture / Fertilizer Users", exposureScore=score,
        costPressure=cost, demandImpact="Neutral", supplyRisk="Moderate",
        marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["DIESEL", "NATGAS", "WHEAT"],
        triggerToWatch="Diesel > $3.50/gal; gas > $4/MMBtu (ammonia economics); Black Sea shipping risk",
    )


def score_construction(diesel_change_pct: float, copper_change_pct: float, aluminum_change_pct: float) -> StakeholderScore:
    raw = 50 + diesel_change_pct * 2 + copper_change_pct * 1 + aluminum_change_pct * 0.8
    score = _clamp(raw)
    if copper_change_pct > 8 or diesel_change_pct > 5:
        posture, margin, cost = "HEDGE", "Negative", "High"
        expl = f"Construction input cost pressure: copper +{copper_change_pct:.1f}% (wiring/plumbing), diesel +{diesel_change_pct:.1f}% (equipment/transport), aluminum +{aluminum_change_pct:.1f}% (structural). Project margins at risk."
    else:
        posture, margin, cost = "MONITOR", "Neutral", "Moderate"
        expl = f"Input costs within range. Monitor copper (${copper_change_pct:+.1f}%) and diesel ({diesel_change_pct:+.1f}%) for project cost escalation triggers."
    return StakeholderScore(
        stakeholder="Construction", exposureScore=score,
        costPressure=cost, demandImpact="Moderate" if copper_change_pct < -5 else "Neutral",
        supplyRisk="Low", marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["DIESEL", "COPPER", "ALUMINUM"],
        triggerToWatch="Copper > $10,000/tonne; diesel spot price index; aluminum LME price",
    )


def score_ev_battery(lithium_change_pct: float, copper_change_pct: float) -> StakeholderScore:
    raw = 50 - lithium_change_pct * 0.8 - copper_change_pct * 0.4  # lower lithium = benefit for OEMs
    score = _clamp(raw)
    if lithium_change_pct < -20:
        posture, margin, cost = "HOLD", "Positive", "Low"
        expl = f"Lithium down {abs(lithium_change_pct):.1f}% — battery cell costs declining, improving EV economics for OEMs. 12-18 month lag before consumer price benefit materializes."
    elif lithium_change_pct > 30:
        posture, margin, cost = "REDUCE", "Severe", "High"
        expl = f"Lithium surge {lithium_change_pct:.1f}% — battery production costs rising sharply. EV OEMs face margin compression or price increase pressure."
    else:
        posture, margin, cost = "WAIT", "Neutral", "Moderate"
        expl = "Lithium in neutral zone. EV cost parity trajectory maintained but watch for supply/demand rebalancing signals."
    return StakeholderScore(
        stakeholder="EV / Battery Chain", exposureScore=score,
        costPressure=cost, demandImpact="Positive" if lithium_change_pct < -10 else "Neutral",
        supplyRisk="Moderate", marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["LITHIUM", "COPPER"],
        triggerToWatch="Lithium carbonate floor; China EV sales YoY growth; battery cost per kWh",
    )


def score_shipping_companies(freight_change_pct: float, chokepoint_active: bool, crude_change_pct: float) -> StakeholderScore:
    raw = 55 + freight_change_pct * 1.5 + (20 if chokepoint_active else 0) - crude_change_pct * 0.5
    score = _clamp(raw)
    if chokepoint_active and freight_change_pct > 5:
        posture, margin, cost = "HOLD", "Positive", "Moderate"
        expl = f"Chokepoint active + freight rates up {freight_change_pct:.1f}% — shipping companies benefit from rerouting premium. Insurance and fuel costs partially offset."
    elif freight_change_pct < -10:
        posture, margin, cost = "WAIT", "Negative", "Low"
        expl = f"Freight rates declining {abs(freight_change_pct):.1f}% — indicates demand weakness. Shipping margins compress; oversupply of vessel capacity likely."
    else:
        posture, margin, cost = "MONITOR", "Neutral", "Moderate"
        expl = "Freight rates stable. Monitor BDI trend and vessel utilization for demand signals."
    return StakeholderScore(
        stakeholder="Shipping Companies", exposureScore=score,
        costPressure="Moderate", demandImpact="Positive" if freight_change_pct > 5 else "Neutral",
        supplyRisk="Low", marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["FREIGHT"],
        triggerToWatch="BDI trend reversal; Red Sea security; LNG shipping route diversion; vessel oversupply",
    )


def score_retailers(diesel_change_pct: float, freight_change_pct: float) -> StakeholderScore:
    raw = 45 + diesel_change_pct * 1.5 + freight_change_pct * 1.2
    score = _clamp(raw)
    if diesel_change_pct > 4 and freight_change_pct > 8:
        posture, margin, cost = "MONITOR", "Negative", "High"
        expl = f"Dual freight cost pressure: diesel +{diesel_change_pct:.1f}%, shipping rates +{freight_change_pct:.1f}%. Imported goods cost base rising — margin pressure or consumer price increases in 6-10 weeks."
    else:
        posture, margin, cost = "MONITOR", "Neutral", "Moderate"
        expl = "Freight and logistics costs within manageable range. Retail margin pressure limited."
    return StakeholderScore(
        stakeholder="Retailers", exposureScore=score,
        costPressure=cost, demandImpact="Neutral", supplyRisk="Low",
        marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["DIESEL", "FREIGHT"],
        triggerToWatch="Freight rate index; diesel cost; port congestion data; import cost inflation",
    )


def score_investors(geo_risk_score: float, gold_change_pct: float, crude_change_pct: float) -> StakeholderScore:
    raw = 60 + geo_risk_score * 2 + abs(gold_change_pct) * 1 + abs(crude_change_pct) * 0.5
    score = _clamp(raw)
    if geo_risk_score > 7 and gold_change_pct > 0:
        posture, margin, cost = "HEDGE", "Positive", "Low"
        expl = f"Geo-risk elevated (score: {geo_risk_score:.1f}) with gold safe-haven bid (+{gold_change_pct:.1f}%). Portfolio hedging via gold, energy volatility plays, or defensive positioning warranted."
    elif geo_risk_score < 4 and crude_change_pct < 0:
        posture, margin, cost = "HOLD", "Neutral", "Low"
        expl = "Low geo-risk and declining crude — balanced market. Commodity allocation neutral."
    else:
        posture, margin, cost = "MONITOR", "Neutral", "Low"
        expl = f"Mixed signals (geo-risk: {geo_risk_score:.1f}, gold: {gold_change_pct:+.1f}%). Monitor for regime confirmation before adding commodity exposure."
    return StakeholderScore(
        stakeholder="Investors / Portfolio Managers", exposureScore=score,
        costPressure="Low", demandImpact="Positive" if crude_change_pct > 3 else "Neutral",
        supplyRisk="Low", marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["GOLD", "WTI", "BRENT"],
        triggerToWatch="Gold > $2,500; geo-risk score > 8; energy volatility index spike",
    )


def score_consumers(crude_change_pct: float, natgas_change_pct: float, wheat_change_pct: float, diesel_change_pct: float) -> StakeholderScore:
    raw = 50 + crude_change_pct * 1.2 + natgas_change_pct * 0.7 + wheat_change_pct * 0.4 + diesel_change_pct * 0.8
    score = _clamp(raw)
    if crude_change_pct > 8 or (diesel_change_pct > 5 and wheat_change_pct > 5):
        posture, margin, cost = "MONITOR", "Negative", "High"
        expl = f"Consumer cost pressure building: crude +{crude_change_pct:.1f}% (pump prices in 3-4 weeks), diesel +{diesel_change_pct:.1f}% (freight/grocery 4-6 weeks), wheat +{wheat_change_pct:.1f}% (food inflation 6-8 weeks)."
    elif crude_change_pct < -5:
        posture, margin, cost = "MONITOR", "Positive", "Low"
        expl = f"Consumer relief building: crude down {abs(crude_change_pct):.1f}% will reduce gasoline prices within 3-4 weeks. Grocery and freight costs follow with a 4-6 week lag."
    else:
        posture, margin, cost = "MONITOR", "Neutral", "Moderate"
        expl = "Consumer energy and food costs stable. No immediate pass-through pressure."
    return StakeholderScore(
        stakeholder="Consumers", exposureScore=score,
        costPressure=cost, demandImpact="Neutral", supplyRisk="Low",
        marginImpact=margin, recommendedPosture=posture,
        explanation=expl, primaryCommodities=["GASOLINE", "DIESEL", "POWER", "WHEAT"],
        triggerToWatch="Pump price weekly change; utility bill cycle; grocery CPI component",
    )


# ── Master scoring function ────────────────────────────────────────────────────

def score_all_stakeholders(
    prices: dict,
    geo_risk_score: float = 5.0,
    chokepoint_active: bool = False,
) -> list[dict]:
    """Score all stakeholders and return sorted list by exposure score.

    prices dict keys:
        crude_change_pct, diesel_change_pct, gasoline_change_pct, natgas_change_pct,
        power_change_pct, carbon_change_pct, copper_change_pct, aluminum_change_pct,
        wheat_change_pct, lithium_change_pct, gold_change_pct, freight_change_pct,
        diesel_crack_spread, nuclear_capacity (fraction 0-1)
    """
    def g(key: str, default: float = 0.0) -> float:
        return float(prices.get(key, default))

    results = [
        score_airlines(g("crude_change_pct"), g("freight_change_pct") / 20, geo_risk_score),
        score_logistics_trucking(g("diesel_change_pct"), g("freight_change_pct") / 10),
        score_utilities(g("natgas_change_pct"), g("power_change_pct"), g("carbon_change_pct"), g("nuclear_capacity", 0.75)),
        score_refiners(g("crude_change_pct"), g("diesel_crack_spread", 25)),
        score_fuel_distributors(g("diesel_change_pct"), g("gasoline_change_pct")),
        score_manufacturers(g("power_change_pct"), g("copper_change_pct"), g("natgas_change_pct")),
        score_agriculture(g("diesel_change_pct"), g("natgas_change_pct"), g("wheat_change_pct")),
        score_construction(g("diesel_change_pct"), g("copper_change_pct"), g("aluminum_change_pct")),
        score_ev_battery(g("lithium_change_pct"), g("copper_change_pct")),
        score_shipping_companies(g("freight_change_pct"), chokepoint_active, g("crude_change_pct")),
        score_retailers(g("diesel_change_pct"), g("freight_change_pct")),
        score_investors(geo_risk_score, g("gold_change_pct"), g("crude_change_pct")),
        score_consumers(g("crude_change_pct"), g("natgas_change_pct"), g("wheat_change_pct"), g("diesel_change_pct")),
    ]

    scored = [s.to_dict() for s in results]
    scored.sort(key=lambda x: x["exposureScore"], reverse=True)
    return scored
