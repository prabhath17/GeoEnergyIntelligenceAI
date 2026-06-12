"""Consumer Impact Engine — commodity-to-consumer pass-through model.

Maps commodity price moves to household-level impact categories.
Each commodity has defined direct/indirect impact, pass-through lag,
affected consumer categories, inflation pressure, and explanation.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class CommodityPassThrough:
    commodity: str
    commodityId: str
    directImpact: str           # description of direct consumer impact
    indirectImpact: str         # description of indirect/downstream impact
    passThroughLag: str         # how long until consumer feels it
    affectedConsumerCategories: list[str]
    inflationPressure: str      # High | Moderate | Low | Deflationary
    householdImpactScore: float # 0-100
    explanation: str
    watchItem: str
    direction: str = "neutral"  # bullish = bad for consumers, bearish = good

    def to_dict(self) -> dict:
        return {
            "commodity": self.commodity,
            "commodityId": self.commodityId,
            "directImpact": self.directImpact,
            "indirectImpact": self.indirectImpact,
            "passThroughLag": self.passThroughLag,
            "affectedConsumerCategories": self.affectedConsumerCategories,
            "inflationPressure": self.inflationPressure,
            "householdImpactScore": round(self.householdImpactScore, 1),
            "explanation": self.explanation,
            "watchItem": self.watchItem,
            "direction": self.direction,
        }


# ── Per-commodity pass-through models ────────────────────────────────────────

def crude_passthrough(price_change_pct: float) -> CommodityPassThrough:
    """Crude oil feeds gasoline, diesel, airfare, freight, and indirectly groceries."""
    score = min(100, abs(price_change_pct) * 3 + 40)
    inflation = "High" if abs(price_change_pct) > 8 else "Moderate" if abs(price_change_pct) > 3 else "Low"
    direction = "up" if price_change_pct > 0 else "down"
    if price_change_pct > 5:
        direct = f"Gasoline pump prices likely to rise 8-15 cents/gal within 3-4 weeks of a {price_change_pct:.1f}% crude move."
        indirect = "Freight costs rise → grocery and retail prices follow within 4-6 weeks. Airlines face higher jet fuel costs and may add surcharges."
        expl = f"A {price_change_pct:.1f}% crude increase ripples through to virtually all consumer price categories. Gasoline leads (3-4 weeks), groceries follow (4-6 weeks), manufactured goods last (8-12 weeks)."
    elif price_change_pct < -5:
        direct = f"Gasoline prices likely to fall 6-12 cents/gal within 3-4 weeks as crude drops {abs(price_change_pct):.1f}%."
        indirect = "Relief in freight costs and imported goods prices follows with a 4-6 week lag. Consumer disposable income improves."
        expl = f"Crude down {abs(price_change_pct):.1f}% provides broad consumer relief — gasoline first, then grocery and travel prices ease with a multi-week lag."
    else:
        direct = "Pump prices stable. No significant consumer impact from crude alone near-term."
        indirect = "Secondary costs (freight, airfare) within normal variation range."
        expl = "Crude within normal range — consumer pass-through pressure is limited."
    return CommodityPassThrough(
        commodity="Crude Oil", commodityId="WTI/BRENT",
        directImpact=direct, indirectImpact=indirect,
        passThroughLag="3-6 weeks (gasoline); 4-8 weeks (grocery/freight)",
        affectedConsumerCategories=["Gasoline / Pump price", "Airfare", "Grocery delivery", "Retail goods (freight embedded)", "Heating oil"],
        inflationPressure=inflation, householdImpactScore=score,
        explanation=expl, direction=direction,
        watchItem="Weekly US gasoline price average; EIA weekly retail price report",
    )


def natgas_passthrough(price_change_pct: float) -> CommodityPassThrough:
    """Natural gas affects home heating, electricity bills, fertilizer, and food."""
    score = min(100, abs(price_change_pct) * 2 + 35)
    inflation = "High" if abs(price_change_pct) > 15 else "Moderate" if abs(price_change_pct) > 5 else "Low"
    direction = "up" if price_change_pct > 0 else "down"
    if price_change_pct > 8:
        direct = f"Home heating bills likely 10-20% higher this season with gas up {price_change_pct:.1f}%."
        indirect = "Electricity bills rise in gas-heavy grids. Fertilizer (ammonia) costs up → food prices in 2-3 months."
        expl = f"Natural gas surge of {price_change_pct:.1f}% flows into home heating (6-8 week lag), electricity bills (1-2 billing cycles), and food costs via fertilizer and processing energy."
    elif price_change_pct < -8:
        direct = f"Heating bills likely 8-15% lower with gas down {abs(price_change_pct):.1f}%."
        indirect = "Power bills ease in gas-heavy grids. Fertilizer input cost relief helps farm margins."
        expl = f"Gas down {abs(price_change_pct):.1f}% is a broad consumer benefit — heating, power, and food costs all ease with sequential lags."
    else:
        direct = "Heating and power costs within normal seasonal range."
        indirect = "Fertilizer and food production costs stable."
        expl = "Natural gas within normal band — household energy cost pressure limited."
    return CommodityPassThrough(
        commodity="Natural Gas", commodityId="NATGAS",
        directImpact=direct, indirectImpact=indirect,
        passThroughLag="6-8 weeks (bills); 8-16 weeks (food via fertilizer)",
        affectedConsumerCategories=["Home heating / gas bills", "Electricity bills (gas grid)", "Grocery prices (fertilizer chain)", "Restaurant / food service costs"],
        inflationPressure=inflation, householdImpactScore=score,
        explanation=expl, direction=direction,
        watchItem="Monthly utility bill + Henry Hub / TTF price; ammonia spot price",
    )


def power_passthrough(price_change_pct: float) -> CommodityPassThrough:
    score = min(100, abs(price_change_pct) * 1.5 + 30)
    direction = "up" if price_change_pct > 0 else "down"
    if price_change_pct > 10:
        direct = f"Utility bills likely 8-15% higher within 1-2 billing cycles with power up {price_change_pct:.1f}%."
        indirect = "Manufacturing and retail costs rise → goods inflation with 8-12 week lag."
        expl = f"Power price surge {price_change_pct:.1f}% passes through to all electricity consumers. Industrial users adjust production economics immediately; household bills adjust at contract renewal."
        inflation = "High"
    elif price_change_pct < -8:
        direct = f"Electricity bills easing as power prices decline {abs(price_change_pct):.1f}%."
        indirect = "Industrial input costs ease, providing some margin relief that may flow to consumer goods prices."
        expl = f"Lower power prices benefit households and industry. Tariff adjustments typically lag spot by 1-2 billing cycles."
        inflation = "Low"
    else:
        direct = "Utility bills stable within normal variation."
        indirect = "Industrial electricity costs within budget assumptions."
        expl = "Power prices within normal range — household impact limited."
        inflation = "Low"
    return CommodityPassThrough(
        commodity="Power / Electricity", commodityId="POWER",
        directImpact=direct, indirectImpact=indirect,
        passThroughLag="1-2 billing cycles (household); immediate (industrial contracts)",
        affectedConsumerCategories=["Electricity bills", "Household appliance running costs", "EV charging costs", "Manufacturing-embedded consumer goods"],
        inflationPressure=inflation, householdImpactScore=score,
        explanation=expl, direction=direction,
        watchItem="EU spot power price; grid tariff review cycle; renewable curtailment data",
    )


def diesel_passthrough(price_change_pct: float) -> CommodityPassThrough:
    score = min(100, abs(price_change_pct) * 2.5 + 35)
    direction = "up" if price_change_pct > 0 else "down"
    inflation = "High" if price_change_pct > 5 else "Moderate" if price_change_pct > 2 else "Low"
    if price_change_pct > 5:
        direct = f"Trucking surcharges rising — grocery and delivery costs up within 2-4 weeks as diesel climbs {price_change_pct:.1f}%."
        indirect = "All delivered goods face embedded freight cost inflation. Construction and agricultural produce costs rise."
        expl = f"Diesel +{price_change_pct:.1f}% is a broad inflation driver. Virtually all delivered goods carry a diesel cost component — grocery delivery, parcel, construction materials all reflect higher costs within 2-6 weeks."
    elif price_change_pct < -4:
        direct = f"Freight surcharges declining — grocery and retail delivery costs ease as diesel falls {abs(price_change_pct):.1f}%."
        indirect = "Consumer goods inflation pressure eases with a 2-4 week lag in freight pricing."
        expl = f"Diesel down {abs(price_change_pct):.1f}% provides relief across freight-embedded consumer costs. Grocery, retail, and construction benefit sequentially."
    else:
        direct = "Freight and delivery costs stable. Diesel within normal consumer-price range."
        indirect = "No significant grocery or retail cost inflation pressure from diesel alone."
        expl = "Diesel stable — consumer goods freight cost impact is limited."
    return CommodityPassThrough(
        commodity="Diesel", commodityId="DIESEL",
        directImpact=direct, indirectImpact=indirect,
        passThroughLag="2-4 weeks (trucking surcharges); 4-6 weeks (grocery/retail)",
        affectedConsumerCategories=["Grocery delivery costs", "Online retail delivery", "Construction materials", "Farm produce transport", "Parcel / last-mile delivery"],
        inflationPressure=inflation, householdImpactScore=score,
        explanation=expl, direction=direction,
        watchItem="Diesel retail price weekly; EIA diesel survey; freight cost index (Drewry, FreightWaves)",
    )


def wheat_passthrough(price_change_pct: float) -> CommodityPassThrough:
    score = min(100, abs(price_change_pct) * 1.2 + 25)
    direction = "up" if price_change_pct > 0 else "down"
    inflation = "Moderate" if abs(price_change_pct) > 10 else "Low"
    if price_change_pct > 10:
        direct = f"Wheat up {price_change_pct:.1f}% — bread, pasta, flour prices likely 5-10% higher within 6-8 weeks."
        indirect = "Feed cost pressure adds to livestock/poultry prices. Restaurant menu prices adjust with 8-12 week lag."
        expl = f"Wheat surge of {price_change_pct:.1f}% translates to food inflation across bread, pasta, and feed-linked proteins. Bakers and food manufacturers absorb some cost before passing through."
    elif price_change_pct < -10:
        direct = f"Wheat down {abs(price_change_pct):.1f}% — grocery staple prices (bread, flour, pasta) likely ease within 6-8 weeks."
        indirect = "Feed cost relief benefits livestock margins → eventual protein price normalization."
        expl = f"Wheat decline provides food inflation relief, though retailers often pass through cost increases faster than decreases. Watch for lag of 6-10 weeks."
    else:
        direct = "Bread and staple grain prices stable."
        indirect = "Livestock feed costs within normal range."
        expl = "Wheat within normal trading range — food cost impact is limited."
    return CommodityPassThrough(
        commodity="Wheat", commodityId="WHEAT",
        directImpact=direct, indirectImpact=indirect,
        passThroughLag="6-10 weeks (supermarket shelf); 10-14 weeks (restaurant menus)",
        affectedConsumerCategories=["Bread / bakery products", "Pasta and flour", "Breakfast cereals", "Livestock / poultry products (feed cost)", "Restaurant meals"],
        inflationPressure=inflation, householdImpactScore=score,
        explanation=expl, direction=direction,
        watchItem="FAO Food Price Index; wheat-flour spread; global shipping route data (Black Sea)",
    )


def aluminum_copper_passthrough(aluminum_change_pct: float, copper_change_pct: float) -> CommodityPassThrough:
    score = min(100, (abs(aluminum_change_pct) + abs(copper_change_pct)) * 0.8 + 20)
    direction = "up" if aluminum_change_pct > 5 or copper_change_pct > 5 else "down" if aluminum_change_pct < -5 else "neutral"
    inflation = "Moderate" if max(abs(aluminum_change_pct), abs(copper_change_pct)) > 10 else "Low"
    expl = (
        f"Aluminum ({aluminum_change_pct:+.1f}%) and copper ({copper_change_pct:+.1f}%) cost changes flow into vehicles, construction, electronics, and EVs. "
        "Consumer durables are most affected; automotive and construction show lags of 6-18 months in contract pricing."
    )
    return CommodityPassThrough(
        commodity="Aluminum / Copper", commodityId="ALUMINUM/COPPER",
        directImpact=f"Vehicles and electronics embedded cost: aluminum {aluminum_change_pct:+.1f}%, copper {copper_change_pct:+.1f}%.",
        indirectImpact="Construction costs and manufactured goods prices adjust over 6-18 month lag.",
        passThroughLag="6-18 months (vehicles/construction); 3-6 months (electronics)",
        affectedConsumerCategories=["Vehicle purchase price", "Electronics / appliances", "Construction costs (housing)", "EV battery and components"],
        inflationPressure=inflation, householdImpactScore=score,
        explanation=expl, direction=direction,
        watchItem="LME copper and aluminum vs auto industry contract renewals; construction cost index",
    )


def freight_passthrough(freight_change_pct: float, chokepoint_active: bool = False) -> CommodityPassThrough:
    chokepoint_add = 15 if chokepoint_active else 0
    score = min(100, abs(freight_change_pct) * 1.5 + 30 + chokepoint_add)
    direction = "up" if freight_change_pct > 0 else "down"
    inflation = "High" if freight_change_pct > 20 or chokepoint_active else "Moderate" if freight_change_pct > 8 else "Low"
    chokepoint_note = " Active maritime chokepoint routing adds further delay risk." if chokepoint_active else ""
    expl = (
        f"Freight rates {freight_change_pct:+.1f}% — all traded goods carry a shipping cost component.{chokepoint_note} "
        "Consumer electronics, clothing, furniture, and food imports all face cost changes with a 6-12 week lag."
    )
    return CommodityPassThrough(
        commodity="Freight / Shipping", commodityId="FREIGHT",
        directImpact=f"Shipping cost for imported goods up/down {freight_change_pct:+.1f}%. Electronics, clothing, furniture directly exposed.",
        indirectImpact="Supply chain delays and higher landed costs feed retail inflation with 6-12 week lag.",
        passThroughLag="6-12 weeks (retail goods); 4-8 weeks (food imports)",
        affectedConsumerCategories=["Electronics and appliances", "Clothing and textiles", "Furniture", "Food imports", "Online retail goods"],
        inflationPressure=inflation, householdImpactScore=score,
        explanation=expl, direction=direction,
        watchItem="Drewry World Container Index; Baltic Dry Index; port congestion data; shipping insurance rates",
    )


def carbon_passthrough(carbon_change_pct: float) -> CommodityPassThrough:
    score = min(100, abs(carbon_change_pct) * 0.8 + 20)
    direction = "up" if carbon_change_pct > 0 else "down"
    inflation = "Moderate" if carbon_change_pct > 15 else "Low"
    expl = (
        f"Carbon/EUA price {carbon_change_pct:+.1f}% raises power generation costs for fossil-fuel plants, "
        "feeding into electricity bills and industrial production costs. Consumer impact is indirect through "
        "higher utility bills and manufactured goods prices."
    )
    return CommodityPassThrough(
        commodity="Carbon / EU ETS", commodityId="CARBON",
        directImpact=f"Electricity bills rise as fossil-fuel power generation costs increase with carbon at {carbon_change_pct:+.1f}%.",
        indirectImpact="Industrial production costs rise → consumer goods and construction costs follow with 8-16 week lag.",
        passThroughLag="4-8 weeks (electricity tariffs); 8-16 weeks (industrial goods)",
        affectedConsumerCategories=["Electricity bills", "Manufactured goods (embedded energy cost)", "Heating (gas-electric hybrid systems)"],
        inflationPressure=inflation, householdImpactScore=score,
        explanation=expl, direction=direction,
        watchItem="EU ETS spot price; coal-to-gas switching economics; industrial output data",
    )


def lithium_passthrough(lithium_change_pct: float) -> CommodityPassThrough:
    score = min(100, abs(lithium_change_pct) * 0.6 + 15)
    direction = "up" if lithium_change_pct > 0 else "down"
    expl = (
        f"Lithium {lithium_change_pct:+.1f}% affects EV battery costs with a 12-18 month lag to consumer pricing. "
        "Falling lithium improves EV affordability; rising lithium pressures OEM margins and may slow EV price cuts."
    )
    return CommodityPassThrough(
        commodity="Lithium", commodityId="LITHIUM",
        directImpact=f"EV battery pack cost signal: lithium {lithium_change_pct:+.1f}%. Cost impact reaches OEMs in 6-12 months.",
        indirectImpact="EV purchase price affordability improves (lower) or worsens (higher) with 12-18 month total lag.",
        passThroughLag="12-18 months (EV purchase price); 6-12 months (OEM margin)",
        affectedConsumerCategories=["EV buyers", "Consumer electronics battery (phones, laptops)", "Electric bikes and scooters"],
        inflationPressure="Low", householdImpactScore=score,
        explanation=expl, direction=direction,
        watchItem="Battery cell cost per kWh; EV MSRP trend; lithium carbonate spot price floor",
    )


# ── Master consumer impact function ──────────────────────────────────────────

def build_consumer_impact_summary(prices: dict, chokepoint_active: bool = False) -> dict:
    """Build full consumer impact model for all major commodities.

    Args:
        prices: Dict with {commodity}_change_pct keys plus diesel_crack_spread.
        chokepoint_active: Whether a maritime chokepoint is currently active.

    Returns:
        Dict with per-commodity impacts and aggregate summary.
    """
    def g(key: str, default: float = 0.0) -> float:
        return float(prices.get(key, default))

    impacts = [
        crude_passthrough(g("crude_change_pct")),
        natgas_passthrough(g("natgas_change_pct")),
        power_passthrough(g("power_change_pct")),
        diesel_passthrough(g("diesel_change_pct")),
        wheat_passthrough(g("wheat_change_pct")),
        aluminum_copper_passthrough(g("aluminum_change_pct"), g("copper_change_pct")),
        freight_passthrough(g("freight_change_pct"), chokepoint_active),
        carbon_passthrough(g("carbon_change_pct")),
        lithium_passthrough(g("lithium_change_pct")),
    ]

    impact_dicts = [i.to_dict() for i in impacts]
    impact_dicts.sort(key=lambda x: x["householdImpactScore"], reverse=True)

    # Aggregate household pressure
    high_count = sum(1 for i in impact_dicts if i["inflationPressure"] == "High")
    mod_count = sum(1 for i in impact_dicts if i["inflationPressure"] == "Moderate")
    avg_score = sum(i["householdImpactScore"] for i in impact_dicts) / len(impact_dicts)

    if high_count >= 2 or avg_score > 65:
        overall = "High inflation pressure — multiple commodities passing through to household costs."
        overall_level = "High"
    elif high_count >= 1 or mod_count >= 3 or avg_score > 45:
        overall = "Moderate cost pressure — select commodity categories affecting household budgets."
        overall_level = "Moderate"
    else:
        overall = "Consumer cost environment is stable — no acute commodity pass-through risk."
        overall_level = "Low"

    # Determine most impacted consumer categories across all commodities
    all_categories: list[str] = []
    for i in impact_dicts:
        all_categories.extend(i["affectedConsumerCategories"])
    from collections import Counter
    top_categories = [cat for cat, _ in Counter(all_categories).most_common(5)]

    return {
        "overallPressure": overall_level,
        "overallSummary": overall,
        "avgHouseholdImpactScore": round(avg_score, 1),
        "highImpactCommodityCount": high_count,
        "mostAffectedCategories": top_categories,
        "commodityBreakdown": impact_dicts,
        "chokePointActive": chokepoint_active,
        "modelMode": "deterministic_passthrough",
        "note": "Pass-through lags are estimates based on historical patterns. ML scoring can refine weights.",
    }
