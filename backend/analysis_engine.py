"""Analysis engine — synthesizes live adapter data into structured AI intelligence report."""
from datetime import datetime, timezone

from feature_engineering import build_spread_features
from prediction_engine import forecast_commodity
from rag_engine import closest_analogue
from sentiment_engine import summarize_news
from signal_rules import evaluate_compound_signals, get_relationship
from statistical_benchmarks import classify_price, get_benchmark


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ── Static definitions ────────────────────────────────────────────────────────

STAKEHOLDER_DEF = [
    {"id": "traders",   "name": "Energy Traders",       "base": 88, "linked": ["crude-oil", "natural-gas"],  "note": "High volatility opportunity across crude, gas, and cross-market spreads."},
    {"id": "fuel-dist", "name": "Fuel Distributors",    "base": 82, "linked": ["refined-products"],          "note": "Diesel and gasoline margin pressure from crude and refinery disruptions."},
    {"id": "logistics", "name": "Logistics / Trucking", "base": 79, "linked": ["refined-products"],          "note": "Diesel cost sensitivity; freight index weakness signals demand slowdown."},
    {"id": "airlines",  "name": "Airlines",             "base": 76, "linked": ["crude-oil"],                 "note": "Jet fuel closely tracks Brent; geopolitical premium adds route cost risk."},
    {"id": "utilities", "name": "Utilities",            "base": 68, "linked": ["natural-gas", "power"],      "note": "Gas-for-power demand and nuclear availability drive grid cost."},
    {"id": "investors", "name": "Investors",            "base": 72, "linked": [],                            "note": "Safe-haven flows and commodity volatility create cross-asset opportunity."},
    {"id": "mfg",       "name": "Manufacturing",        "base": 64, "linked": ["power"],                    "note": "Power, copper, aluminum, and natural gas input cost pressure."},
    {"id": "agri",      "name": "Agriculture",          "base": 57, "linked": ["refined-products"],          "note": "Diesel, natural gas, and wheat signal fertilizer and fuel cost pressure."},
    {"id": "consumers", "name": "Consumers",            "base": 54, "linked": [],                            "note": "Gasoline, power bills, and grocery inflation pass-through building."},
    {"id": "ev",        "name": "EV / Battery",         "base": 48, "linked": ["renewables"],                "note": "Lithium oversupply weighs; copper and silver costs are secondary risks."},
]

HOLDER_DEF = [
    {"id": "crude",      "name": "Crude Oil Holders",    "commodity": "WTI / Brent",       "posture_up": "HOLD",   "posture_down": "REDUCE",  "conviction_base": "High",    "why": "Supply tightness and geo-risk premium building from key hotspots.",                        "invalidator": "OPEC+ production increase or significant demand miss",                            "watch": "Hormuz tanker flow + Libya output reports"},
    {"id": "gas",        "name": "Nat. Gas Holders",     "commodity": "Henry Hub / TTF",   "posture_up": "HOLD",   "posture_down": "REDUCE",  "conviction_base": "Moderate","why": "EU storage surplus and mild weather reducing near-term demand pressure.",                    "invalidator": "Cold snap, LNG export disruption, or storage injection stall",                    "watch": "EU gas storage fill rate + LNG export volumes"},
    {"id": "refined",    "name": "Refined Holders",      "commodity": "Diesel / Gasoline", "posture_up": "HOLD",   "posture_down": "MONITOR", "conviction_base": "Moderate","why": "Crack spread elevated post-Gulf Coast refinery maintenance cycle.",                         "invalidator": "Refinery restarts and demand destruction signal combining",                        "watch": "Diesel crack spread vs $35/bbl threshold"},
    {"id": "power",      "name": "Power Holders",        "commodity": "Grid / EUA",        "posture_up": "HEDGE",  "posture_down": "MONITOR", "conviction_base": "Low",     "why": "Grid stable from French nuclear and renewables — limited upside but downside risk builds.", "invalidator": "Gas price spike, nuclear outage, or extreme summer demand surge",                  "watch": "Nuclear capacity % + gas-for-power demand signal"},
    {"id": "renewables", "name": "Renewables Holders",   "commodity": "Solar / Wind",      "posture_up": "BUY",    "posture_down": "HOLD",    "conviction_base": "High",    "why": "Policy tailwinds and record solar output support long-term structural growth.",             "invalidator": "Policy reversal, subsidy cuts, or grid congestion limiting output",                "watch": "Grid curtailment events + new capacity pipeline announcements"},
    {"id": "uranium",    "name": "Uranium Holders",      "commodity": "U3O8",              "posture_up": "HOLD",   "posture_down": "MONITOR", "conviction_base": "High",    "why": "Nuclear renaissance policy driving long-term demand re-rating globally.",                   "invalidator": "Plant cancellations, regulatory reversal, or major accident",                      "watch": "New plant announcements + enrichment supply pipeline"},
    {"id": "gold",       "name": "Gold Holders",         "commodity": "XAU / USD",         "posture_up": "HOLD",   "posture_down": "MONITOR", "conviction_base": "Moderate","why": "Geo-fear and USD stress supporting safe-haven bid alongside energy risk premium.",           "invalidator": "Geo-risk de-escalation or significant USD rally on rate expectations",             "watch": "Middle East / Russia escalation + Fed forward guidance"},
    {"id": "silver",     "name": "Silver Holders",       "commodity": "XAG / USD",         "posture_up": "HOLD",   "posture_down": "MONITOR", "conviction_base": "Moderate","why": "Safe-haven bid combined with solar industrial demand supporting price.",                     "invalidator": "Solar demand crash or gold breakdown breaking correlation",                         "watch": "Solar panel demand + gold/silver ratio above 85"},
    {"id": "copper",     "name": "Copper Holders",       "commodity": "HG Futures",        "posture_up": "HOLD",   "posture_down": "REDUCE",  "conviction_base": "Moderate","why": "China and EM demand weakness weighing on industrial metals complex.",                        "invalidator": "China stimulus package or manufacturing PMI recovery above 52",                    "watch": "Chinese manufacturing PMI + construction activity"},
    {"id": "freight",    "name": "Freight Holders",      "commodity": "BDI / FFA",         "posture_up": "HOLD",   "posture_down": "WAIT",    "conviction_base": "Low",     "why": "BDI weakness signals bulk demand slowdown — defensive wait posture.",                       "invalidator": "Commodity demand surge or acute bulk shipping supply crunch",                      "watch": "Dry bulk + LNG shipping routes + port congestion data"},
    {"id": "aluminum",   "name": "Aluminum Holders",     "commodity": "LME Aluminum",      "posture_up": "HOLD",   "posture_down": "MONITOR", "conviction_base": "Moderate","why": "Power-cost sensitivity keeps aluminum exposed to grid stress and European energy volatility.", "invalidator": "Power prices normalize while China demand weakens",                                "watch": "EU power price + smelter curtailment reports"},
    {"id": "carbon",     "name": "Carbon / EU ETS Holders", "commodity": "EUA Futures",    "posture_up": "MONITOR","posture_down": "WAIT",    "conviction_base": "Low",     "why": "Weak industrial demand is pressuring EU ETS, but policy risk can reprice compliance costs quickly.", "invalidator": "German industrial demand rebound or tighter EU policy guidance",             "watch": "EU ETS price vs coal-to-gas switching economics"},
]

SECTOR_MATRIX_DEF = [
    {"sector": "Logistics / Trucking", "commodities": "Diesel · Freight",           "base_impact": "High",     "costPressure": "High",     "supplyRisk": "Moderate", "demandRisk": "Low",      "posture": "HEDGE",   "watch": "Diesel crack spread > $35/bbl"},
    {"sector": "Airlines",             "commodities": "Jet Fuel · Crude Oil",        "base_impact": "High",     "costPressure": "High",     "supplyRisk": "Moderate", "demandRisk": "Moderate", "posture": "HEDGE",   "watch": "Brent > $90 sustained / route geo-risk"},
    {"sector": "Utilities",            "commodities": "Nat. Gas · Coal · Uranium",   "base_impact": "Moderate", "costPressure": "Moderate", "supplyRisk": "High",     "demandRisk": "Low",      "posture": "MONITOR", "watch": "Gas storage injection pace + nuclear %"},
    {"sector": "Manufacturing",        "commodities": "Power · Copper · Aluminum",   "base_impact": "Moderate", "costPressure": "High",     "supplyRisk": "Low",      "demandRisk": "Moderate", "posture": "MONITOR", "watch": "Copper demand signal + ETS carbon price"},
    {"sector": "Agriculture",          "commodities": "Diesel · Nat. Gas · Wheat",   "base_impact": "Moderate", "costPressure": "High",     "supplyRisk": "Moderate", "demandRisk": "Low",      "posture": "HOLD",    "watch": "Wheat / fertilizer spread + diesel"},
    {"sector": "Construction",         "commodities": "Diesel · Copper · Aluminum",  "base_impact": "Moderate", "costPressure": "High",     "supplyRisk": "Low",      "demandRisk": "High",     "posture": "HOLD",    "watch": "Copper spot + diesel cost index"},
    {"sector": "Fuel Retailers",       "commodities": "Gasoline · Diesel",           "base_impact": "High",     "costPressure": "High",     "supplyRisk": "Low",      "demandRisk": "Moderate", "posture": "HOLD",    "watch": "Retail margin vs crack spread"},
    {"sector": "EV / Battery Chain",   "commodities": "Lithium · Copper · Silver",   "base_impact": "Low",      "costPressure": "Low",      "supplyRisk": "Moderate", "demandRisk": "High",     "posture": "WAIT",    "watch": "Lithium floor + EV policy update"},
    {"sector": "Consumers",            "commodities": "Gasoline · Power · Wheat",    "base_impact": "Moderate", "costPressure": "High",     "supplyRisk": "Low",      "demandRisk": "Low",      "posture": "MONITOR", "watch": "Pump price + utility bill + CPI lag"},
    {"sector": "Commodity Traders",    "commodities": "Crude · Gas · Gold · Copper", "base_impact": "High",     "costPressure": "Low",      "supplyRisk": "High",     "demandRisk": "High",     "posture": "HEDGE",   "watch": "WTI/Brent spread + Hormuz + safe-haven"},
]

CONSUMER_DEF = [
    {"id": "gasoline", "category": "Gasoline / Pump Price",    "commodity": "Crude + Refined", "base_dir": "up",   "base_severity": "High",     "base_explanation": "Crude oil geopolitical premium flowing through to pump prices. Expect 5-8 cents/gallon increase within 3-4 weeks.", "lag": "3-4 weeks"},
    {"id": "power",    "category": "Electricity Bills",         "commodity": "Nat. Gas + Grid", "base_dir": "flat", "base_severity": "Moderate", "base_explanation": "Grid stable from nuclear and renewables. Gas-for-power demand limited. Bills expected flat to slightly higher.", "lag": "6-8 weeks"},
    {"id": "grocery",  "category": "Grocery / Freight Costs",  "commodity": "Diesel + Wheat",  "base_dir": "up",   "base_severity": "Moderate", "base_explanation": "Diesel keeps freight costs elevated. Black Sea wheat risk adds food inflation pressure. Grocery basket up ~2-3%.", "lag": "4-6 weeks"},
    {"id": "travel",   "category": "Travel / Airline Tickets",  "commodity": "Jet Fuel",        "base_dir": "up",   "base_severity": "High",     "base_explanation": "Jet fuel tied to Brent. Geopolitical route risk adding surcharges. Expect 8-15% ticket price increase on affected routes.", "lag": "2-3 weeks"},
    {"id": "home",     "category": "Home Heating / Cooling",    "commodity": "Nat. Gas + Power","base_dir": "flat", "base_severity": "Low",      "base_explanation": "Mild weather and EU storage surplus keeping home energy costs stable. Winter risk builds if injection pace slows.", "lag": "Seasonal"},
]

PRESSURE_MIX_DEF = [
    {"label": "Geo Risk",         "base_weight": 28, "color": "#ff6b6b", "description": "Active hotspot count and severity"},
    {"label": "Price Action",     "base_weight": 24, "color": "#fabc45", "description": "Commodity price direction and momentum"},
    {"label": "Headlines",        "base_weight": 18, "color": "#58a6ff", "description": "AI-classified news impact density"},
    {"label": "Cross-Market",     "base_weight": 15, "color": "#c79df7", "description": "Safe-haven and industrial demand signals"},
    {"label": "Historical Trend", "base_weight": 10, "color": "#a8d8a8", "description": "Statistical pattern vs current deviation"},
    {"label": "Sector Risk",      "base_weight":  5, "color": "#8690a0", "description": "Sector score divergence and sentiment"},
]

WATCHLIST_DEF = [
    {"id": "hormuz",  "name": "Strait of Hormuz Tanker Flow",  "trigger": "Tanker incidents or 15%+ traffic reduction",    "why": "20% of global crude passes through this chokepoint. Any disruption = $15-25/bbl spike potential.",     "who": "Energy Traders · Airlines · Logistics"},
    {"id": "brent",   "name": "Brent Crude Key Level",         "trigger": "Sustained move above $90/bbl or below $75/bbl", "why": "Defines bullish/bearish regime for all fuel-linked business costs and consumer pump prices.",         "who": "Airlines · Fuel Distributors · Consumers"},
    {"id": "diesel",  "name": "Diesel Crack Spread",           "trigger": "Crack spread breaks above $35/bbl",             "why": "Indicates refinery margin stress — passes directly to freight, agriculture, and logistics costs.",  "who": "Logistics · Agriculture · Manufacturing"},
    {"id": "eu-gas",  "name": "EU Gas Storage Fill Rate",      "trigger": "Below 60% fill rate entering September",        "why": "Storage deficit entering winter = price spike risk for EU industry, power, and household heating.",  "who": "Utilities · Manufacturing · Consumers"},
    {"id": "gulf",    "name": "Gulf Coast Refinery Yields",    "trigger": "US refinery utilization drops below 85%",       "why": "Lower yields tighten refined product supply — diesel and gasoline shortage risk builds quickly.",    "who": "Logistics · Airlines · Fuel Distributors"},
    {"id": "uranium", "name": "Uranium Momentum Continuation", "trigger": "Price holds above $90/lb for 2 consecutive weeks", "why": "Confirms nuclear renaissance demand — reshapes long-term power generation mix globally.",          "who": "Utilities · Power Investors · Governments"},
    {"id": "power",   "name": "EU Power Grid Volatility",      "trigger": "EU spot power > €150/MWh for 3+ days",          "why": "Extreme power prices stress manufacturing margins and aluminum smelting profitability sharply.",      "who": "Manufacturing · Aluminum · Utilities"},
    {"id": "freight", "name": "Freight / Shipping Stress",     "trigger": "BDI drops below 1500 or spikes above 3000",    "why": "Extreme BDI signals global demand shock or acute supply crunch in bulk commodity shipping.",          "who": "Traders · Logistics · Consumers"},
]

# ── Regime library (playbook §8.2 — regime recognition shortcut) ─────────────
REGIME_DEF = {
    "supply-shock": {
        "name": "Supply Shock",
        "color": "#ff8f8f",
        "description": "Critical geo event with crude bid and safe-haven confirmation — supply-side regime. Fuel costs escalate for businesses.",
        "posture_note": "HEDGE traders and airlines; bull probability raised.",
    },
    "demand-shock": {
        "name": "Demand Shock",
        "color": "#7dbfff",
        "description": "Copper, crude, and freight all soft — industrial demand weakness regime. Bearish energy bias.",
        "posture_note": "REDUCE crude and gas exposure; bear probability raised.",
    },
    "risk-off": {
        "name": "Risk-Off Flight",
        "color": "#fac84a",
        "description": "Gold bid while crude softens — defensive flight regime. Recession fear building; mixed energy.",
        "posture_note": "Favor gold; hold crude; watch equity and USD confirmation.",
    },
    "policy-pivot": {
        "name": "Policy Pivot",
        "color": "#c79df7",
        "description": "Policy/OPEC+ headlines dominate the tape — supply policy is the swing factor for crude direction.",
        "posture_note": "HEDGE around announcements; scenario probabilities widen.",
    },
    "tech-transition": {
        "name": "Tech Transition",
        "color": "#6edb9a",
        "description": "Renewables/EV signals lead while fossil signals idle — structural transition regime. Long-term fossil headwind.",
        "posture_note": "WAIT lithium, HOLD renewables, long-term REDUCE coal/gas.",
    },
    "balanced": {
        "name": "Balanced Market",
        "color": "#9aa3b0",
        "description": "No dominant shock pattern — supply, demand, and risk signals in near-equilibrium. Threshold breaks define the next regime.",
        "posture_note": "MONITOR key levels; avoid chasing sub-threshold noise.",
    },
}


def _detect_regime(crude_dir, gas_dir, gold_up, copper_dir, freight_dir, critical_geo, news_items):
    """Map current conditions to a known regime (playbook quick-reference card)."""
    policy_news = [n for n in (news_items or []) if "Policy" in str(n.get("category", "")) and "High" in str(n.get("impact", ""))]
    triggers = []
    if critical_geo and crude_dir == "up" and gold_up:
        triggers = [f"{len(critical_geo)} critical geo event(s)", "crude bid", "gold safe-haven confirm"]
        return "supply-shock", triggers
    if copper_dir == "down" and crude_dir == "down" and freight_dir == "down":
        triggers = ["copper down", "crude down", "BDI/freight down"]
        return "demand-shock", triggers
    if gold_up and crude_dir == "down":
        triggers = ["gold sharply bid", "crude softening"]
        return "risk-off", triggers
    if len(policy_news) >= 2:
        triggers = [f"{len(policy_news)} high-impact policy headlines (OPEC+/sanctions)"]
        return "policy-pivot", triggers
    if crude_dir == "flat" and gas_dir == "flat" and not critical_geo:
        triggers = ["fossil signals idle", "no critical geo events"]
        return "tech-transition" if copper_dir == "up" else "balanced", triggers
    triggers = ["mixed directional signals", "no dominant shock pattern"]
    return "balanced", triggers


SCENARIO_DEF = [
    {
        "id": "base", "type": "Base Case",
        "base_prob": 55, "color": "#58a6ff",
        "conditions": "Current geo-risk contained, OPEC+ holds agreed output, EU gas injection pace continues",
        "price_range": "Brent $78-85, Gas $2.0-2.5/MMBtu",
        "benefits": ["Crude Oil Holders", "Refiners", "Energy Traders"],
        "suffers":  ["Airlines", "Logistics", "Consumers (mild pressure)"],
        "note": "Status quo with moderate, manageable energy cost pressure. No major supply disruption.",
    },
    {
        "id": "bullish", "type": "Bullish Risk Case",
        "base_prob": 25, "color": "#fabc45",
        "conditions": "Hormuz incident, Libya shutdown expansion, or OPEC+ surprise production cut",
        "price_range": "Brent $92-105, Gas $3.0+/MMBtu",
        "benefits": ["Crude Producers", "Energy Traders", "Gold/Silver Holders"],
        "suffers":  ["Airlines", "Logistics", "Consumers", "Manufacturing"],
        "note": "Shock-driven supply tightening. Energy inflation accelerates broadly through the economy.",
    },
    {
        "id": "bearish", "type": "Bearish Risk Case",
        "base_prob": 20, "color": "#ff6b6b",
        "conditions": "China demand miss, US recession signals, or OPEC+ unexpected production surge",
        "price_range": "Brent $62-70, Gas $1.6-2.0/MMBtu",
        "benefits": ["Airlines", "Logistics", "Consumers", "Manufacturing"],
        "suffers":  ["Crude Producers", "Energy Traders", "EM Exporters"],
        "note": "Demand-driven correction. Deflationary for energy-intensive businesses, painful for producers.",
    },
]


def generate_analysis(prices_data: dict, geo_data: dict, news_data: dict) -> dict:
    """Synthesize live adapter data into structured AI intelligence report."""
    prices     = prices_data.get("items",              [])
    cross      = prices_data.get("crossMarketSignals", [])
    geo_items  = geo_data.get("items",                 [])
    news_items = news_data.get("items",                [])

    wti       = next((p for p in prices if p.get("id") == "WTI"),    {})
    brent     = next((p for p in prices if p.get("id") == "BRENT"),  {})
    natgas    = next((p for p in prices if p.get("id") == "NATGAS"), {})

    wti_price   = float(wti.get("price",   78.4))
    brent_price = float(brent.get("price", 82.1))
    gas_price   = float(natgas.get("price", 2.3))

    crude_dir = wti.get("direction",   "up")
    gas_dir   = natgas.get("direction","down")

    gold_cross    = next((c for c in cross if c.get("id") == "GOLD"),    {})
    copper_cross  = next((c for c in cross if c.get("id") == "COPPER"),  {})
    freight_cross = next((c for c in cross if c.get("id") == "FREIGHT"), {})

    gold_up      = gold_cross.get("direction")    == "up"
    copper_dir   = copper_cross.get("direction",  "flat")
    freight_dir  = freight_cross.get("direction", "down")

    critical_geo = [g for g in geo_items if g.get("riskLevel") == "Critical"]
    high_geo     = [g for g in geo_items if g.get("riskLevel") == "High"]
    high_news    = [n for n in news_items if "High" in n.get("impact", "")]
    supply_news  = [n for n in news_items if "Supply" in n.get("category", "")]

    # GEI-Analyst v2: statistical grounding, compound signals, forecast, and RAG analogue.
    news_summary = summarize_news(news_items, "WTI")
    spread_features = build_spread_features(prices, cross)
    wti_benchmark = classify_price("WTI", wti_price, wti.get("changePercent", 0))
    brent_benchmark = classify_price("BRENT", brent_price, brent.get("changePercent", 0))
    gas_benchmark = classify_price("NATGAS", gas_price, natgas.get("changePercent", 0))
    compound_signals = evaluate_compound_signals(prices, cross, geo_items, news_summary)
    active_region = (critical_geo or high_geo or [{}])[0].get("countryOrArea", "")
    historical_analogue = closest_analogue(
        "WTI",
        crude_dir,
        max([float(g.get("riskScore") or 0) for g in geo_items] or [0]),
        news_summary.get("topEventType", ""),
        news_summary.get("sentimentScore", 0),
        wti_benchmark.get("volatilityRegime", "Moderate"),
        active_region,
    )
    crude_forecast = forecast_commodity("WTI", prices, cross, geo_items, news_items)

    data_sources = int(prices_data.get("status") == "live") + int(geo_data.get("status") == "live") + int(news_data.get("status") == "live")
    conf = min(96, 78 + data_sources * 4 + min(6, len(critical_geo) * 2) + (3 if gold_up else 0))

    # ── Threshold-based key levels (playbook: thresholds, not trends) ─────────
    brent_wti_spread = round(brent_price - wti_price, 2)
    key_levels = [
        {"id": "brent-90",   "label": "Brent vs $90 bull line",     "value": f"${brent_price:.1f}", "state": "BREACHED" if brent_price > 90 else "BELOW",  "note": "Above $90 = bullish fuel-cost regime for airlines/logistics."},
        {"id": "brent-75",   "label": "Brent vs $75 bear line",     "value": f"${brent_price:.1f}", "state": "BREACHED" if brent_price < 75 else "ABOVE",  "note": "Below $75 = demand-weakness regime; relief for fuel buyers."},
        {"id": "bw-spread",  "label": "Brent–WTI spread",           "value": f"${brent_wti_spread:.2f}", "state": "WIDE" if brent_wti_spread > 5 else "NORMAL", "note": "Spread > $5 signals Atlantic-basin logistics or quality stress."},
        {"id": "gas-350",    "label": "Henry Hub vs $3.50 regime",  "value": f"${gas_price:.2f}",  "state": "BREACHED" if gas_price > 3.5 else "BELOW",   "note": "Above $3.50/MMBtu shifts power-generation and industrial economics."},
    ]

    # ── Regime recognition (playbook §8.2) ────────────────────────────────────
    regime_id, regime_triggers = _detect_regime(crude_dir, gas_dir, gold_up, copper_dir, freight_dir, critical_geo, news_items)
    regime_def = REGIME_DEF[regime_id]
    regime = {
        "id": regime_id,
        "name": regime_def["name"],
        "color": regime_def["color"],
        "description": regime_def["description"],
        "postureNote": regime_def["posture_note"],
        "triggers": regime_triggers,
    }

    chips = [f"Regime: {regime_def['name']}"]
    if crude_dir == "up":      chips.append("Crude Bullish")
    elif crude_dir == "down":  chips.append("Crude Bearish")
    if gas_dir == "down":      chips.append("Gas Bearish")
    elif gas_dir == "up":      chips.append("Gas Bullish")
    if critical_geo:           chips.append("Geo-Risk Elevated")
    if len(high_news) >= 3:    chips.append("High Impact Active")
    if gold_up:                chips.append("Safe-Haven Active")
    if copper_dir == "down":   chips.append("Industrial Demand Weak")
    if freight_dir == "down":  chips.append("Freight Stress")
    if supply_news:            chips.append("Supply Chain Stress")
    chips = chips[:7] if len(chips) > 1 else [f"Regime: {regime_def['name']}", "Market Tension", "Supply Risk", "Safe-Haven Watch", "Consumer Pressure", "Cross-Market Signal"]

    # ── Thesis: fact → cause → implication (playbook §1.1, §4 step 7) ─────────
    t_parts = []
    if crude_dir == "up":
        cause = (f"{critical_geo[0].get('countryOrArea', 'chokepoint')} disruption risk and OPEC+ output discipline"
                 if critical_geo else "supply constraints and embedded geopolitical risk premium")
        t_parts.append(f"WTI ${wti_price:.1f}/bbl and Brent ${brent_price:.1f}/bbl are bid — driven by {cause}")
    elif crude_dir == "down":
        t_parts.append(f"WTI ${wti_price:.1f}/bbl is offered (Brent ${brent_price:.1f}) — demand softness and inventory builds outweigh geo-risk premium")
    else:
        t_parts.append(f"WTI ${wti_price:.1f}/bbl is range-bound (Brent ${brent_price:.1f}) — supply and demand forces in near-balance")
    if critical_geo:
        t_parts.append(f"{len(critical_geo)} critical geo event{'s' if len(critical_geo) > 1 else ''} active including {critical_geo[0].get('countryOrArea', 'Middle East')}, keeping supply-disruption tail risk elevated")
    elif high_geo:
        t_parts.append(f"{len(high_geo)} high-severity risk zone{'s' if len(high_geo) > 1 else ''} tracked — shipping and transit-insurance costs are the early warning channel")
    if gold_up:
        t_parts.append("gold's safe-haven bid confirms the risk premium is fear-driven, not just supply data")
    elif copper_dir == "down":
        t_parts.append("copper weakness flags industrial-demand softness — the demand-side bear case stays valid")
    impl = (f"fuel-intensive businesses face cost escalation with a 3-4 week pass-through lag"
            if crude_dir == "up" else "fuel buyers get relief while producers face margin compression, with a 2-4 week lag")
    t_parts.append(f"implication: {impl}; consumers see pump and freight effects over 4-8 weeks")
    thesis = ". ".join(t_parts)
    thesis = thesis[0].upper() + thesis[1:] + "."

    env = (
        f"Regime read: {regime_def['name']} — {regime_def['description']} "
        f"{len(critical_geo) + len(high_geo)} active geopolitical risk zones tracked; Brent–WTI spread ${brent_wti_spread:.2f} ({'wide — logistics/quality stress' if brent_wti_spread > 5 else 'normal range'}). "
        f"Cross-market: gold {'bullish — safe-haven active' if gold_up else 'neutral'}, "
        f"copper {'weak — demand concern' if copper_dir == 'down' else 'stable'}, "
        f"freight {'declining — bulk demand slowdown' if freight_dir == 'down' else 'stable'}. "
        f"Data freshness: {data_sources}/3 live sources. Confidence: {conf}%."
    )

    def _posture(sh_id, score, gold_up, critical_geo):
        if sh_id == "traders":   return "HEDGE" if critical_geo else "HOLD"
        if sh_id == "investors": return "BUY"   if gold_up else "HOLD"
        if sh_id == "ev":        return "WAIT"
        if sh_id == "consumers": return "MONITOR"
        if score >= 80:          return "HEDGE"
        if score >= 65:          return "HOLD"
        return "MONITOR"

    stakeholders = []
    for sh in STAKEHOLDER_DEF:
        score = sh["base"]
        if "crude-oil"        in sh["linked"] and crude_dir == "up":   score = min(97, score + 5)
        if "crude-oil"        in sh["linked"] and crude_dir == "down": score = max(25, score - 5)
        if "natural-gas"      in sh["linked"] and gas_dir == "down":   score = max(25, score - 4)
        if sh["id"] == "investors" and gold_up:                        score = min(97, score + 6)
        if len(critical_geo) >= 2: score = min(97, score + 3)
        if len(high_news)    >= 4: score = min(97, score + 2)
        score    = min(97, round(score))
        severity = "Critical" if score >= 75 else "High" if score >= 60 else "Moderate" if score >= 45 else "Low"
        driver   = sh["note"]
        if sh["id"] == "traders"   and crude_dir == "up":  driver = f"WTI ${wti_price:.1f}. {len(critical_geo)} critical geo events. High spread opportunities."
        elif sh["id"] == "airlines":                        driver = f"Brent ${brent_price:.1f}. Each $10/bbl move = ~1-2% fuel cost change."
        elif sh["id"] == "logistics" and freight_dir == "down": driver = "BDI declining signals bulk demand slowdown while diesel costs remain elevated."
        elif sh["id"] == "investors" and gold_up:           driver = "Gold elevated on geo-fear — cross-asset safe-haven and energy risk-premium opportunity."
        stakeholders.append({"id": sh["id"], "name": sh["name"], "score": score, "severity": severity, "note": driver, "posture": _posture(sh["id"], score, gold_up, critical_geo)})

    holder_guidance = []
    for h in HOLDER_DEF:
        if h["id"] == "crude":
            pos  = h["posture_up"] if crude_dir == "up" else h["posture_down"]
            conv = "High"
        elif h["id"] == "gas":
            pos  = h["posture_down"] if gas_dir  == "down" else h["posture_up"]
            conv = h["conviction_base"]
        elif h["id"] == "gold":
            pos  = h["posture_up"] if gold_up else h["posture_down"]
            conv = "High" if gold_up else "Moderate"
        elif h["id"] == "copper":
            pos  = h["posture_down"] if copper_dir == "down" else h["posture_up"]
            conv = h["conviction_base"]
        else:
            pos  = h["posture_up"]
            conv = h["conviction_base"]
        holder_guidance.append({"id": h["id"], "name": h["name"], "commodity": h["commodity"], "posture": pos, "conviction": conv, "why": h["why"], "invalidator": h["invalidator"], "watch": h["watch"]})

    sector_matrix = []
    for row in SECTOR_MATRIX_DEF:
        impact = row["base_impact"]
        if row["sector"] == "Airlines"          and brent_price > 88: impact = "Critical"
        if row["sector"] == "Commodity Traders" and critical_geo:     impact = "Critical"
        sector_matrix.append({"sector": row["sector"], "commodities": row["commodities"], "impact": impact, "costPressure": row["costPressure"], "supplyRisk": row["supplyRisk"], "demandRisk": row["demandRisk"], "posture": row["posture"], "watch": row["watch"]})

    consumer_impact = []
    for c in CONSUMER_DEF:
        direction   = c["base_dir"]
        severity    = c["base_severity"]
        explanation = c["base_explanation"]
        if c["id"] == "gasoline":
            direction = crude_dir
            if crude_dir == "up":
                severity    = "High"
                explanation = f"Crude ${wti_price:.1f}/bbl (Brent ${brent_price:.1f}). Geopolitical premium flowing to pump prices — expect 5-8 cents/gal increase within 3-4 weeks."
            elif crude_dir == "down":
                severity    = "Low"
                explanation = f"Crude softening (WTI ${wti_price:.1f}). Pump price relief expected within 2-3 weeks."
        elif c["id"] == "power" and gas_dir == "up":
            severity    = "High"
            direction   = "up"
            explanation = "Gas-for-power demand rising — electricity bill increases expected in 6-8 weeks. Renewables only partially offsetting."
        elif c["id"] == "travel" and brent_price > 88:
            severity    = "Critical"
            explanation = f"Brent ${brent_price:.1f}. Jet fuel surcharges rising — expect 10-18% ticket price increase on geo-risk affected routes."
        consumer_impact.append({"id": c["id"], "category": c["category"], "commodity": c["commodity"], "direction": direction, "severity": severity, "explanation": explanation, "lag": c["lag"]})

    geo_w   = min(40, 20 + len(critical_geo) * 4 + len(high_geo) * 2)
    price_w = 24 if crude_dir != "flat" else 18
    news_w  = min(25, 10 + len(high_news) * 2)
    cross_w = min(20, 10 + (5 if gold_up else 0) + (3 if copper_dir != "flat" else 0))
    hist_w  = 10
    sec_w   = max(3, 100 - geo_w - price_w - news_w - cross_w - hist_w)
    total   = geo_w + price_w + news_w + cross_w + hist_w + sec_w
    raw_w   = {"Geo Risk": geo_w, "Price Action": price_w, "Headlines": news_w, "Cross-Market": cross_w, "Historical Trend": hist_w, "Sector Risk": sec_w}
    pressure_mix = [{"label": d["label"], "weight": round(raw_w[d["label"]] * 100 / total), "color": d["color"], "description": d["description"]} for d in PRESSURE_MIX_DEF]

    watchlist = [{**w, "trigger": f"Sustained move above $90/bbl (current: ${brent_price:.1f}) or below $75/bbl" if w["id"] == "brent" else w["trigger"]} for w in WATCHLIST_DEF]

    signal_bull = sum(s.get("probabilityTilt", {}).get("bull", 0) for s in compound_signals)
    signal_bear = sum(s.get("probabilityTilt", {}).get("bear", 0) for s in compound_signals)
    regime_bull = {"supply-shock": 10, "policy-pivot": 5}.get(regime_id, 0)
    regime_bear = {"demand-shock": 10, "risk-off": 5, "policy-pivot": 5}.get(regime_id, 0)
    bull_p = min(55, SCENARIO_DEF[1]["base_prob"] + len(critical_geo) * 5 + (5 if gold_up else 0) + regime_bull + signal_bull)
    bear_p = max(10, min(45, SCENARIO_DEF[2]["base_prob"] - len(critical_geo) * 3 + (5 if copper_dir == "down" else 0) + regime_bear + signal_bear))
    base_p = max(30, 100 - bull_p - bear_p)
    probs  = [base_p, bull_p, bear_p]
    scenarios = [{"id": sc["id"], "type": sc["type"], "prob": probs[i], "color": sc["color"], "conditions": sc["conditions"], "price_range": sc["price_range"], "benefits": sc["benefits"], "suffers": sc["suffers"], "note": sc["note"]} for i, sc in enumerate(SCENARIO_DEF)]

    data_inputs = []
    if prices_data.get("status") == "live": data_inputs.append(f"live commodity prices (WTI ${wti_price:.1f}, Brent ${brent_price:.1f})")
    else:                                   data_inputs.append("cached price data")
    if geo_data.get("status")    == "live": data_inputs.append(f"live geo-risk signals ({len(critical_geo)} critical, {len(high_geo)} high)")
    else:                                   data_inputs.append("derived geo-risk data")
    if news_data.get("status")   == "live": data_inputs.append(f"live news ({len(high_news)} high-impact)")
    else:                                   data_inputs.append("recent news signals")
    data_inputs += ["cross-market confirmation (gold, copper, freight)", "sector sentiment scoring"]
    explainability = (
        f"This analysis is derived from {', '.join(data_inputs[:-1])}, and {data_inputs[-1]}. "
        f"Confidence of {conf}% reflects {data_sources}/3 live data sources active. "
        f"Conditions pattern-matched to the '{regime_def['name']}' regime ({', '.join(regime_triggers)}). "
        f"Statistical grounding: WTI is {wti_benchmark['regime']} with sigma {wti_benchmark['sigma']}; Brent is {brent_benchmark['regime']}; gas is {gas_benchmark['regime']}. "
        f"Compound signals active: {', '.join(s['id'] for s in compound_signals) if compound_signals else 'none above threshold'}. "
        f"Historical analogue: {historical_analogue['eventName']} ({historical_analogue['date']}). "
        f"Geo-risk weighting ({geo_w}% of signal mix) is elevated due to {len(critical_geo)} critical events. "
        f"Market thesis direction is determined by WTI price action (${wti_price:.1f}/bbl, {crude_dir}) with Brent–WTI spread ${brent_wti_spread:.2f}. "
        f"Stakeholder scores are adjusted per each sector's sensitivity to live commodity direction. "
        f"All conclusions are rule-based signal fusion — not generative AI inference."
    )

    executive_briefing = {
        "analysisConfidence": conf,
        "thesis": thesis,
        "regime": regime,
        "themeChips": chips,
        "scenarioProbs": {"base": probs[0], "bullish": probs[1], "bearish": probs[2]},
        "forecast": crude_forecast,
        "statisticalBenchmarks": {
            "WTI": {k: v for k, v in wti_benchmark.items() if k != "benchmark"},
            "BRENT": {k: v for k, v in brent_benchmark.items() if k != "benchmark"},
            "NATGAS": {k: v for k, v in gas_benchmark.items() if k != "benchmark"},
        },
        "compoundSignals": compound_signals,
        "historicalAnalogue": historical_analogue,
        "analystPattern": {
            "whatChanged": t_parts[0],
            "whyItMatters": f"{regime_def['name']} regime changes hedge posture and pass-through risk for fuel buyers, producers, and consumers.",
            "activeSignal": regime_def["name"],
            "probableDirection": crude_forecast.get("direction"),
            "baseBullBear": crude_forecast.get("scenarioProbabilities"),
            "affectedStakeholders": [s["name"] for s in stakeholders[:5]],
            "watch": [w["trigger"] for w in watchlist[:4]],
            "invalidation": HOLDER_DEF[0]["invalidator"],
            "analogue": historical_analogue["analogueSummary"],
            "confidenceCaveat": f"{conf}% confidence; caveat: live data coverage is {data_sources}/3 and forecast is deterministic fallback.",
        },
        "generatedAt": _now(),
    }

    return {
        "thesis": thesis,
        "confidence": conf,
        "themeChips": chips,
        "regime": regime,
        "keyLevels": key_levels,
        "executiveBriefing": executive_briefing,
        "environmentExplanation": env,
        "analystIdentity": "GEI-Analyst v2",
        "predictionInsight": crude_forecast,
        "statisticalGrounding": {
            "benchmarks": {
                "WTI": wti_benchmark,
                "BRENT": brent_benchmark,
                "NATGAS": gas_benchmark,
                "GOLD": classify_price("GOLD", gold_cross.get("price"), gold_cross.get("changePercent", 0)) if gold_cross else {"benchmark": get_benchmark("GOLD")},
                "COPPER": classify_price("COPPER", copper_cross.get("price"), copper_cross.get("changePercent", 0)) if copper_cross else {"benchmark": get_benchmark("COPPER")},
                "FREIGHT": classify_price("FREIGHT", freight_cross.get("price"), freight_cross.get("changePercent", 0)) if freight_cross else {"benchmark": get_benchmark("FREIGHT")},
            },
            "spreadFeatures": spread_features,
            "newsSentiment": news_summary,
        },
        "crossCommodityIntelligence": {
            "crude": get_relationship("WTI"),
            "gold": get_relationship("GOLD"),
            "copper": get_relationship("COPPER"),
            "freight": get_relationship("FREIGHT"),
            "naturalGas": get_relationship("NATGAS"),
        },
        "compoundSignals": compound_signals,
        "historicalAnalogue": historical_analogue,
        "stakeholderImpacts": stakeholders,
        "holderGuidance": holder_guidance,
        "sectorMatrix": sector_matrix,
        "consumerImpact": consumer_impact,
        "pressureMix": pressure_mix,
        "watchlist": watchlist,
        "scenarios": scenarios,
        "explainabilityNote": explainability,
        "generatedAt": _now(),
        "dataFreshness": {
            "prices":  prices_data.get("status", "unknown"),
            "geoRisk": geo_data.get("status",    "unknown"),
            "news":    news_data.get("status",   "unknown"),
        },
    }
