"""Commodity Profiles — structured knowledge base for each tracked commodity.

Each profile contains:
- Market identity and unit
- Normal price range and key thresholds
- Who affects / is affected by this commodity
- Historical behavior in different regimes
- Key stakeholders
- Consumer pass-through description
- RAG metadata for retrieval

These profiles are the static knowledge layer (V1 Rules + RAG).
"""
from __future__ import annotations

COMMODITY_PROFILES: dict[str, dict] = {
    "WTI": {
        "id": "WTI",
        "name": "WTI Crude Oil",
        "aliases": ["crude oil", "cl=f", "west texas intermediate"],
        "unit": "USD/bbl",
        "sector": "energy",
        "normalRange": {"low": 55.0, "high": 90.0},
        "historicalMean": 72.0,
        "bullThreshold": 90.0,
        "bearThreshold": 65.0,
        "shockThresholds": {"critical_high": 110.0, "critical_low": 40.0},
        "volatilityProfile": "High intraday sensitivity to geo-news; sustained moves driven by supply/demand fundamentals.",
        "leadLagRelations": {
            "leading": ["DIESEL", "GASOLINE", "JET_FUEL"],
            "lagged_by": ["COPPER", "FREIGHT"],
            "correlated": ["BRENT", "GOLD"],
            "inverse": ["DXY"],
        },
        "regimeBehavior": {
            "supply_shock": "Rapid spike of $5-25/bbl; reversal depends on supply restoration speed.",
            "demand_shock": "Gradual decline with 2-4 week confirmation via copper and freight.",
            "geo_risk": "Immediate $2-8/bbl risk premium; fades if no physical supply impact.",
            "tech_transition": "Long-term structural demand headwind; short-term price not affected.",
        },
        "keyStakeholders": ["Energy Traders", "Airlines", "Logistics / Trucking", "Refiners", "Fuel Distributors", "Consumers"],
        "consumerPassThrough": "Gasoline (3-4 weeks), airfare (2-3 weeks), groceries via freight (4-6 weeks)",
        "watchSignals": ["Brent/WTI spread", "US refinery utilization", "OPEC+ compliance", "Hormuz tanker flow"],
        "sources": ["EIA Weekly Report", "OPEC MOMR", "IEA Oil Market Report", "Platts crude assessments"],
        "ragTags": ["crude oil", "energy", "supply shock", "OPEC", "refinery", "geo-risk"],
    },

    "BRENT": {
        "id": "BRENT",
        "name": "Brent Crude Oil",
        "aliases": ["brent", "ice brent", "bz=f"],
        "unit": "USD/bbl",
        "sector": "energy",
        "normalRange": {"low": 60.0, "high": 95.0},
        "historicalMean": 76.0,
        "bullThreshold": 90.0,
        "bearThreshold": 75.0,
        "shockThresholds": {"critical_high": 115.0, "critical_low": 45.0},
        "volatilityProfile": "More sensitive than WTI to seaborne logistics and Middle East events.",
        "leadLagRelations": {
            "leading": ["DIESEL", "JET_FUEL", "FREIGHT"],
            "lagged_by": ["WTI"],
            "correlated": ["GOLD", "SILVER"],
            "inverse": ["DXY"],
        },
        "regimeBehavior": {
            "supply_shock": "Brent typically leads WTI on Middle East events due to seaborne exposure.",
            "demand_shock": "Follows WTI lower; European and Asian demand signals more directly priced.",
            "geo_risk": "Highest sensitivity to Strait of Hormuz and Red Sea disruption events.",
        },
        "keyStakeholders": ["Energy Traders", "European Refiners", "Airlines", "Logistics", "Consumers (EU)"],
        "consumerPassThrough": "EU gasoline (3-5 weeks), heating oil (4-6 weeks), airfare (2-4 weeks)",
        "watchSignals": ["Brent/WTI spread", "North Sea crude production", "Tanker rerouting signals", "OPEC basket price"],
        "sources": ["ICE Futures", "Platts", "Argus Media", "EIA"],
        "ragTags": ["brent", "crude", "europe", "middle east", "seaborne", "geo-risk"],
    },

    "NATGAS": {
        "id": "NATGAS",
        "name": "Natural Gas (Henry Hub)",
        "aliases": ["natural gas", "henry hub", "ng=f", "gas"],
        "unit": "USD/MMBtu",
        "sector": "energy",
        "normalRange": {"low": 2.0, "high": 4.5},
        "historicalMean": 3.2,
        "bullThreshold": 3.5,
        "bearThreshold": 2.2,
        "shockThresholds": {"critical_high": 7.0, "critical_low": 1.5},
        "volatilityProfile": "Highly seasonal; weather-driven spikes often sharp but temporary.",
        "leadLagRelations": {
            "leading": ["POWER", "FERTILIZER"],
            "lagged_by": ["WEATHER", "STORAGE"],
            "correlated": ["TTF", "COAL"],
            "inverse": [],
        },
        "regimeBehavior": {
            "cold_weather": "Immediate spike on cold-snap forecasts; reverses when weather normalizes.",
            "storage_event": "EIA storage misses drive 3-8% same-session moves.",
            "supply_shock": "LNG export terminal outages can flood domestic market (bearish) or create shortage.",
        },
        "keyStakeholders": ["Utilities", "Industrial Manufacturers", "LNG Traders", "Consumers", "Agriculture (fertilizer)"],
        "consumerPassThrough": "Home heating bills (6-8 weeks), electricity (1-2 billing cycles), food via fertilizer (8-16 weeks)",
        "watchSignals": ["EIA weekly storage report", "LNG feedgas demand", "Weather 14-day forecast", "Coal-gas switching economics"],
        "sources": ["EIA", "NOAA weather forecasts", "S&P Global gas reports", "LNG shipping data"],
        "ragTags": ["natural gas", "henry hub", "storage", "weather", "heating", "LNG"],
    },

    "TTF": {
        "id": "TTF",
        "name": "EU TTF Natural Gas",
        "aliases": ["ttf", "eu gas", "european gas", "dutch gas"],
        "unit": "EUR/MWh",
        "sector": "energy",
        "normalRange": {"low": 20.0, "high": 55.0},
        "historicalMean": 38.0,
        "bullThreshold": 55.0,
        "bearThreshold": 25.0,
        "shockThresholds": {"critical_high": 100.0, "critical_low": 15.0},
        "volatilityProfile": "Extreme event volatility (2022 crisis peak >€300/MWh); storage fill rate is the key variable.",
        "leadLagRelations": {
            "leading": ["EU POWER", "ALUMINUM", "FERTILIZER_EU"],
            "lagged_by": ["LNG_IMPORTS", "STORAGE"],
            "correlated": ["NATGAS", "CARBON"],
            "inverse": [],
        },
        "regimeBehavior": {
            "storage_low": "Panic premium: TTF can spike 30-50% on sub-60% storage entering winter.",
            "storage_high": "Normalization: surplus storage caps upside risk and reduces hedge urgency.",
            "supply_shock": "Nord Stream-type events can cause catastrophic price dislocations.",
        },
        "keyStakeholders": ["EU Utilities", "Industrial Manufacturers", "Aluminum Smelters", "Households", "LNG Importers"],
        "consumerPassThrough": "EU household heating (4-8 weeks), electricity bills (2-4 weeks), industrial goods (8-16 weeks)",
        "watchSignals": ["EU gas storage % fill (Gas Infrastructure Europe)", "LNG terminal utilization", "Russian flow proxy"],
        "sources": ["ICE Endex", "Gas Infrastructure Europe (GIE AGSI+)", "Bloomberg gas", "ENTSO-G"],
        "ragTags": ["TTF", "EU gas", "europe", "storage", "LNG", "winter risk"],
    },

    "DIESEL": {
        "id": "DIESEL",
        "name": "Diesel / Heating Oil",
        "aliases": ["diesel", "heating oil", "ho=f", "distillate", "gasoil"],
        "unit": "USD/gal",
        "sector": "energy",
        "normalRange": {"low": 2.1, "high": 3.4},
        "historicalMean": 2.65,
        "bullThreshold": 3.25,
        "bearThreshold": 2.2,
        "shockThresholds": {"critical_high": 4.5, "critical_low": 1.8},
        "volatilityProfile": "Crack spread dynamics cause diesel to diverge from crude — refinery utilization is key.",
        "leadLagRelations": {
            "leading": ["FREIGHT_COST", "AGRICULTURE_COST"],
            "lagged_by": ["WTI", "BRENT"],
            "correlated": ["GASOLINE"],
            "inverse": [],
        },
        "regimeBehavior": {
            "refinery_outage": "Crack spread widens immediately; retail diesel follows within 1-2 weeks.",
            "demand_shock": "Diesel demand leads crude in industrial downturns — freight decline signals first.",
        },
        "keyStakeholders": ["Logistics / Trucking", "Agriculture", "Construction", "Airlines (indirect)", "Consumers (grocery)"],
        "consumerPassThrough": "Trucking surcharges (2-4 weeks), grocery prices (4-6 weeks), construction costs (4-8 weeks)",
        "watchSignals": ["US diesel crack spread > $35/bbl", "Refinery utilization < 85%", "PADD 1/2/3 distillate stocks"],
        "sources": ["EIA Petroleum Status Report", "Platts diesel assessments", "US DOE retail price weekly"],
        "ragTags": ["diesel", "heating oil", "trucking", "freight", "crack spread", "refinery"],
    },

    "GOLD": {
        "id": "GOLD",
        "name": "Gold",
        "aliases": ["gold", "xau", "gc=f", "bullion"],
        "unit": "USD/oz",
        "sector": "cross-market",
        "normalRange": {"low": 1650.0, "high": 2450.0},
        "historicalMean": 1850.0,
        "bullThreshold": 2400.0,
        "bearThreshold": 1800.0,
        "shockThresholds": {"critical_high": 3000.0, "critical_low": 1400.0},
        "volatilityProfile": "Safe-haven spikes on geo-risk are fast and partially reversible. Central bank buying provides structural floor.",
        "leadLagRelations": {
            "leading": ["Silver (safe-haven)", "Crude risk premium"],
            "lagged_by": ["Geo-risk score", "Fed rate decisions"],
            "correlated": ["SILVER"],
            "inverse": ["DXY", "Real yields"],
        },
        "regimeBehavior": {
            "geo_risk": "Gold + crude rising together = real supply risk (vs. gold alone = macro fear).",
            "risk_off": "Gold rises, crude flat/down = recession fear, not supply shock.",
            "rate_cut_cycle": "Historically gold surges 15-30% in first 6 months of Fed easing cycle.",
        },
        "keyStakeholders": ["Investors", "Central Banks", "Gold Miners", "Jewelry Manufacturers", "Portfolio Risk Desks"],
        "consumerPassThrough": "Indirect: gold rise signals inflation/geo risk → crude follows → gasoline eventually.",
        "watchSignals": ["Gold/crude correlation", "DXY direction", "Real 10Y yield", "ETF holdings (GLD)"],
        "sources": ["LBMA Gold Fix", "CME Group GC futures", "World Gold Council"],
        "ragTags": ["gold", "safe haven", "risk off", "geo-risk", "central bank", "inflation hedge"],
    },

    "COPPER": {
        "id": "COPPER",
        "name": "Copper",
        "aliases": ["copper", "hg=f", "lme copper", "dr copper"],
        "unit": "USD/tonne",
        "sector": "cross-market",
        "normalRange": {"low": 7000.0, "high": 10000.0},
        "historicalMean": 8500.0,
        "bullThreshold": 10000.0,
        "bearThreshold": 7500.0,
        "shockThresholds": {"critical_high": 12000.0, "critical_low": 5500.0},
        "volatilityProfile": "Copper is the 'PhD of economics' — leads global industrial cycle by 2-5 weeks.",
        "leadLagRelations": {
            "leading": ["WTI demand", "FREIGHT", "ALUMINUM"],
            "lagged_by": ["China PMI", "US manufacturing PMI"],
            "correlated": ["ALUMINUM", "SILVER"],
            "inverse": ["DXY", "GOLD (risk-off divergence)"],
        },
        "regimeBehavior": {
            "demand_shock": "Copper falls before crude and freight in demand-destruction regimes.",
            "china_reopening": "Copper surges on China stimulus signals — watch for freight and crude confirmation.",
            "supply_disruption": "Chilean/Peruvian mine strikes can cause acute spikes without demand signal.",
        },
        "keyStakeholders": ["Manufacturing", "Construction", "EV / Battery Chain", "Utilities (wiring)", "Commodity Traders"],
        "consumerPassThrough": "Vehicles and electronics (6-18 months), construction (6-12 months), EV costs (12-24 months)",
        "watchSignals": ["China manufacturing PMI", "LME copper/aluminum spread", "Chilean mine production", "BDI direction"],
        "sources": ["LME", "CME Group", "Chile production data", "ICSG"],
        "ragTags": ["copper", "industrial", "china", "manufacturing", "EV", "demand indicator"],
    },

    "WHEAT": {
        "id": "WHEAT",
        "name": "Wheat",
        "aliases": ["wheat", "grain", "cbot wheat", "black sea grain"],
        "unit": "USD/bushel",
        "sector": "cross-market",
        "normalRange": {"low": 5.0, "high": 9.0},
        "historicalMean": 6.5,
        "bullThreshold": 8.5,
        "bearThreshold": 5.5,
        "shockThresholds": {"critical_high": 13.0, "critical_low": 4.0},
        "volatilityProfile": "Black Sea supply risk, weather shocks, and freight costs dominate. Ukraine conflict is structural driver.",
        "leadLagRelations": {
            "leading": ["Food CPI (6-10 weeks)", "Fertilizer demand"],
            "lagged_by": ["Diesel", "Freight (Black Sea)"],
            "correlated": ["CORN", "SOYBEANS"],
            "inverse": [],
        },
        "regimeBehavior": {
            "supply_shock": "Black Sea disruption events (2022 Russia-Ukraine) caused 40-60% price spikes.",
            "demand_shock": "Global wheat demand is inelastic — price does not fall as much as crude in downturns.",
        },
        "keyStakeholders": ["Agriculture / Farmers", "Food Processors", "Consumers", "Retailers", "Freight / Shipping"],
        "consumerPassThrough": "Bread and staples (6-10 weeks), restaurant prices (8-14 weeks)",
        "watchSignals": ["Ukraine export data", "Black Sea shipping route", "USDA WASDE report", "Weather in key growing regions"],
        "sources": ["USDA WASDE", "FAO Cereal Price Index", "CBOT wheat futures", "IGC reports"],
        "ragTags": ["wheat", "food", "black sea", "ukraine", "grain", "food inflation"],
    },

    "URANIUM": {
        "id": "URANIUM",
        "name": "Uranium (U3O8)",
        "aliases": ["uranium", "u3o8", "nuclear fuel", "uu=f"],
        "unit": "USD/lb U3O8",
        "sector": "cross-market",
        "normalRange": {"low": 50.0, "high": 100.0},
        "historicalMean": 65.0,
        "bullThreshold": 90.0,
        "bearThreshold": 50.0,
        "shockThresholds": {"critical_high": 130.0, "critical_low": 30.0},
        "volatilityProfile": "Low daily liquidity — price moves can be extreme. Nuclear policy announcements are key catalysts.",
        "leadLagRelations": {
            "leading": ["Nuclear power output"],
            "lagged_by": ["Energy policy decisions", "Reactor construction pipeline"],
            "correlated": ["Nuclear ETFs (URA, NLR)"],
            "inverse": ["Natural gas (competing baseload)"],
        },
        "regimeBehavior": {
            "nuclear_renaissance": "Structural bull — each new reactor announcement adds 40+ years of demand.",
            "accident": "Fukushima-type events can cause 30-50% corrections in weeks.",
            "supply_disruption": "Kazakhstan (~45% of supply) disruption = acute global supply squeeze.",
        },
        "keyStakeholders": ["Nuclear Utilities", "Uranium Miners", "Government Stockpilers", "Power Investors", "AI/Data Centers"],
        "consumerPassThrough": "Electricity prices (long-term stability benefit), nuclear-heavy grid consumers benefit from price stability",
        "watchSignals": ["New reactor announcements", "Cameco / Kazatomprom production", "SMR contract pipeline", "Data center nuclear PPAs"],
        "sources": ["UxC uranium spot price", "World Nuclear Association", "NEI reports", "Cameco earnings"],
        "ragTags": ["uranium", "nuclear", "energy policy", "SMR", "supply deficit", "renaissance"],
    },

    "LITHIUM": {
        "id": "LITHIUM",
        "name": "Lithium Carbonate",
        "aliases": ["lithium", "lithium carbonate", "li", "ev battery"],
        "unit": "USD/tonne",
        "sector": "cross-market",
        "normalRange": {"low": 10000.0, "high": 50000.0},
        "historicalMean": 25000.0,
        "bullThreshold": 40000.0,
        "bearThreshold": 15000.0,
        "shockThresholds": {"critical_high": 80000.0, "critical_low": 8000.0},
        "volatilityProfile": "Highly cyclical — 2022 boom and 2023 bust cycle demonstrated extreme over/undershoot.",
        "leadLagRelations": {
            "leading": ["EV purchase price (12-18 months)", "Battery cell cost per kWh"],
            "lagged_by": ["EV adoption rate", "Mine supply expansion"],
            "correlated": ["COPPER (EV demand)", "COBALT"],
            "inverse": ["Sodium-ion battery adoption"],
        },
        "regimeBehavior": {
            "oversupply": "Mine expansion outpaces demand → price collapse as seen 2023-2024.",
            "demand_acceleration": "EV adoption surge can squeeze supply within 12-18 months.",
            "curtailment": "Mine shutdowns/deferrals are the floor signal — watch break-even costs.",
        },
        "keyStakeholders": ["Lithium Miners", "Battery Manufacturers", "EV OEMs", "EV Buyers", "Investors"],
        "consumerPassThrough": "EV purchase price (12-18 months), consumer electronics battery cost (6-12 months)",
        "watchSignals": ["China EV sales data", "Major mine curtailment announcements", "Battery cost per kWh trend", "Lithium floor price"],
        "sources": ["Fastmarkets lithium price", "Benchmark Mineral Intelligence", "CATL / Albemarle reports"],
        "ragTags": ["lithium", "EV", "battery", "electric vehicle", "energy transition", "oversupply"],
    },

    "FREIGHT": {
        "id": "FREIGHT",
        "name": "Freight / Baltic Dry Index",
        "aliases": ["freight", "bdi", "shipping", "bulk", "tanker"],
        "unit": "Index points / USD per day",
        "sector": "cross-market",
        "normalRange": {"low": 1200.0, "high": 3000.0},
        "historicalMean": 1800.0,
        "bullThreshold": 3000.0,
        "bearThreshold": 1200.0,
        "shockThresholds": {"critical_high": 5000.0, "critical_low": 500.0},
        "volatilityProfile": "BDI is a pure supply/demand signal for bulk shipping — no financial instrument overlay.",
        "leadLagRelations": {
            "leading": ["WTI demand expectations (1-3 weeks)", "Consumer goods inflation (6-12 weeks)"],
            "lagged_by": ["China trade flows", "Commodity demand cycle"],
            "correlated": ["COPPER", "WHEAT (bulk demand)"],
            "inverse": ["Vessel oversupply"],
        },
        "regimeBehavior": {
            "demand_shock": "BDI declines before crude and copper in demand destruction — leading indicator.",
            "chokepoint_stress": "Container freight spikes on Red Sea/Suez disruption — BDI may not fully confirm.",
            "china_surge": "BDI surge on Chinese commodity import demand — crude and copper usually confirm.",
        },
        "keyStakeholders": ["Shipping Companies", "Commodity Importers", "Consumers", "Retailers", "Food Importers"],
        "consumerPassThrough": "Consumer goods (6-12 weeks), food imports (4-8 weeks), electronics (8-16 weeks)",
        "watchSignals": ["BDI weekly change", "Red Sea traffic data", "Port congestion index", "LNG shipping rate"],
        "sources": ["Baltic Exchange", "Drewry World Container Index", "Clarksons Research", "Freightos"],
        "ragTags": ["freight", "shipping", "BDI", "red sea", "logistics", "trade flow"],
    },

    "CARBON": {
        "id": "CARBON",
        "name": "Carbon / EU ETS (EUA)",
        "aliases": ["carbon", "ets", "eua", "co2", "emission credit"],
        "unit": "EUR/tonne CO2",
        "sector": "cross-market",
        "normalRange": {"low": 45.0, "high": 90.0},
        "historicalMean": 65.0,
        "bullThreshold": 85.0,
        "bearThreshold": 50.0,
        "shockThresholds": {"critical_high": 120.0, "critical_low": 25.0},
        "volatilityProfile": "Policy-driven asset — cap tightening announcements cause step-change repricing.",
        "leadLagRelations": {
            "leading": ["Coal-to-gas switching economics", "Renewable investment signal"],
            "lagged_by": ["EU industrial demand", "Power price"],
            "correlated": ["NATGAS (gas-for-power demand)", "EU POWER"],
            "inverse": ["Coal demand"],
        },
        "regimeBehavior": {
            "policy_tightening": "Cap reduction announcement drives 15-30% price step-up.",
            "industrial_weakness": "Low industrial output = fewer permits needed = price pressure.",
            "coal_switching": "Carbon > €60 makes coal-to-gas fuel switch economic in most EU markets.",
        },
        "keyStakeholders": ["Utilities", "Industrial Manufacturers", "Carbon Traders", "Carbon Offset Providers"],
        "consumerPassThrough": "Electricity bills (4-8 weeks), industrial goods (8-16 weeks)",
        "watchSignals": ["EU ETS reform news", "EU industrial production", "Coal-gas switching spread", "MSR mechanism"],
        "sources": ["ICE ECX EUA futures", "EU ETS Registry data", "ICIS Carbon", "Refinitiv Carbon"],
        "ragTags": ["carbon", "ETS", "EUA", "emission", "EU policy", "energy transition"],
    },
}


def get_profile(commodity_id: str) -> dict:
    """Return commodity profile by ID. Returns a generic fallback if not found."""
    cid = str(commodity_id or "").upper()
    if cid in COMMODITY_PROFILES:
        return COMMODITY_PROFILES[cid]
    # Try alias lookup
    for pid, profile in COMMODITY_PROFILES.items():
        if cid.lower() in [a.lower() for a in profile.get("aliases", [])]:
            return profile
    return {
        "id": cid,
        "name": cid,
        "unit": "USD",
        "sector": "unknown",
        "normalRange": {"low": 0, "high": 0},
        "historicalMean": 0,
        "ragTags": [],
        "keyStakeholders": [],
        "watchSignals": [],
        "sources": [],
    }


def list_profiles() -> list[dict]:
    """Return all commodity profiles."""
    return list(COMMODITY_PROFILES.values())


def get_rag_tags(commodity_id: str) -> list[str]:
    """Return RAG retrieval tags for a commodity."""
    return get_profile(commodity_id).get("ragTags", [])
