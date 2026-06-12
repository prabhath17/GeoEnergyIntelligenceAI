"""PDF-trained commodity statistics dataset for GeoEnergy Intelligence AI.

This module is the structured training layer used by the statistics API,
prediction fallbacks, AI analysis, and executive briefing. Values are explicit
benchmark statistics and regime rules so they can be replaced by a historical
warehouse or model training output without changing API contracts.
"""
from __future__ import annotations

from copy import deepcopy


DATA_SOURCE_MAP = {
    "WTI": {"primaryDataSource": "EIA / FRED", "liveTickerOrEndpoint": "FRED WTISPLC, Yahoo CL=F"},
    "BRENT": {"primaryDataSource": "IMF / FRED / ICE", "liveTickerOrEndpoint": "FRED POILBREUSDQ, Yahoo BZ=F"},
    "NATGAS": {"primaryDataSource": "EIA", "liveTickerOrEndpoint": "EIA RNGWHHD / MHHNGSP, Yahoo NG=F"},
    "TTF": {"primaryDataSource": "IMF / FRED / ICE Endex", "liveTickerOrEndpoint": "IMF/FRED monthly EU TTF proxy"},
    "DIESEL": {"primaryDataSource": "EIA / CME", "liveTickerOrEndpoint": "Yahoo HO=F, EIA diesel retail"},
    "GOLD": {"primaryDataSource": "LBMA / FRED", "liveTickerOrEndpoint": "LBMA gold, Yahoo GC=F"},
    "SILVER": {"primaryDataSource": "LBMA / Yahoo", "liveTickerOrEndpoint": "LBMA silver, Yahoo SI=F"},
    "COPPER": {"primaryDataSource": "World Bank / FRED / CME", "liveTickerOrEndpoint": "FRED PCOPPUSDM, Yahoo HG=F"},
    "URANIUM": {"primaryDataSource": "IMF / UxC / YCharts", "liveTickerOrEndpoint": "U3O8 spot proxy, URA ETF fallback"},
    "LITHIUM": {"primaryDataSource": "Trading Economics / USGS", "liveTickerOrEndpoint": "Lithium carbonate spot, LIT ETF fallback"},
    "WHEAT": {"primaryDataSource": "USDA ERS / FRED / CBOT", "liveTickerOrEndpoint": "CBOT wheat, Yahoo ZW=F"},
    "CARBON": {"primaryDataSource": "ICE / Refinitiv / ESMA", "liveTickerOrEndpoint": "EUA futures / EU ETS proxy"},
    "ALUMINUM": {"primaryDataSource": "LME / World Bank", "liveTickerOrEndpoint": "LME aluminum, World Bank PALUMUSDM"},
    "FREIGHT": {"primaryDataSource": "Baltic Exchange", "liveTickerOrEndpoint": "Baltic Dry Index, BDRY ETF fallback"},
    "EU_POWER": {"primaryDataSource": "ENTSO-E / Ember", "liveTickerOrEndpoint": "EU day-ahead power index proxy"},
}


CORRELATION_LIBRARY = {
    "WTI": [
        {"pair": "BRENT", "coefficient": 0.98, "range": "+0.98", "relationship": "near-perfect crude benchmark linkage", "leadLag": "same day", "condition": "Spread is the signal; widening flags logistics or quality stress.", "breakdown": "Breaks only during local storage, pipeline, or export bottlenecks."},
        {"pair": "NATGAS", "coefficient": 0.43, "range": "+0.35 to +0.50", "relationship": "oil leads gas through drilling, LNG and power substitution", "leadLag": "oil leads by 2-4 weeks", "condition": "Stronger when LNG export demand links US gas to global energy.", "breakdown": "Breaks when storage/weather dominates Henry Hub."},
        {"pair": "GOLD", "coefficient": 0.67, "range": "+0.65 to +0.70 in risk-off", "relationship": "shared geopolitical risk premium", "leadLag": "gold can lead oil short-term", "condition": "Gold up plus crude up confirms fear-driven supply premium.", "breakdown": "Breaks during risk-on rallies or USD strength."},
        {"pair": "COPPER", "coefficient": 0.37, "range": "+0.29 to +0.45", "relationship": "industrial demand read-through", "leadLag": "copper leads oil by about 25 trading days", "condition": "Copper and BDI together confirm China/global demand.", "breakdown": "Breaks during China-specific slowdown or OPEC supply shock."},
        {"pair": "WHEAT", "coefficient": 0.24, "range": "+0.18 to +0.30", "relationship": "fuel, fertilizer, freight and food inflation linkage", "leadLag": "oil leads wheat by 4-6 weeks", "condition": "Diesel and fertilizer costs transmit into food costs.", "breakdown": "Weather or Black Sea shocks can dominate wheat."},
        {"pair": "FREIGHT", "coefficient": 0.52, "range": "+0.45 to +0.60", "relationship": "trade demand and tanker/bunker cost linkage", "leadLag": "BDI can lead crude demand softness by 1-3 weeks", "condition": "Bulk demand confirms industrial energy use.", "breakdown": "Red Sea disruption can lift freight without confirming demand."},
    ],
    "BRENT": [
        {"pair": "WTI", "coefficient": 0.98, "range": "+0.98", "relationship": "near-perfect crude benchmark linkage", "leadLag": "same day", "condition": "Spread is the signal.", "breakdown": "Regional bottlenecks widen spread."},
        {"pair": "DIESEL", "coefficient": 0.78, "range": "+0.70 to +0.85", "relationship": "crude feedstock and crack-spread linkage", "leadLag": "crude leads product retail by 2-6 weeks", "condition": "Refinery stress amplifies product moves.", "breakdown": "Refinery outages can make diesel rise even if crude is flat."},
    ],
    "NATGAS": [
        {"pair": "TTF", "coefficient": 0.56, "range": "+0.45 to +0.65", "relationship": "LNG arbitrage linkage", "leadLag": "regional shocks transmit over days to weeks", "condition": "Strong when LNG export capacity is unconstrained.", "breakdown": "Domestic storage/weather can dominate Henry Hub."},
        {"pair": "COAL", "coefficient": 0.62, "range": "+0.55 to +0.70", "relationship": "power substitution", "leadLag": "same season", "condition": "Gas spikes pull coal into power mix.", "breakdown": "Carbon policy can block coal switching."},
        {"pair": "EU_POWER", "coefficient": 0.78, "range": "+0.75 to +0.85 for TTF/EU power", "relationship": "gas sets marginal power price", "leadLag": "gas leads power immediately", "condition": "High during low renewables or nuclear outages.", "breakdown": "Strong wind/nuclear availability weakens linkage."},
    ],
    "TTF": [
        {"pair": "CARBON", "coefficient": 0.62, "range": "+0.55 to +0.70", "relationship": "fuel switching and policy linkage", "leadLag": "same week", "condition": "Gas and carbon jointly drive coal/gas economics.", "breakdown": "Policy reform can dominate carbon."},
        {"pair": "EU_POWER", "coefficient": 0.82, "range": "+0.75 to +0.85", "relationship": "marginal power price linkage", "leadLag": "gas leads power immediately", "condition": "Strong in tight supply or low renewables.", "breakdown": "Nuclear and wind availability reduce pass-through."},
    ],
    "GOLD": [
        {"pair": "SILVER", "coefficient": 0.72, "range": "+0.72", "relationship": "precious metals safe-haven linkage", "leadLag": "gold leads silver", "condition": "Safe-haven regimes lift both.", "breakdown": "Breaks during solar boom or industrial crash."},
        {"pair": "DXY", "coefficient": -0.75, "range": "-0.70 to -0.80", "relationship": "inverse USD real-rate pressure", "leadLag": "USD leads intraday to weekly", "condition": "Strong dollar is a headwind for gold.", "breakdown": "Extreme geopolitical fear can overpower USD."},
        {"pair": "WTI", "coefficient": 0.67, "range": "+0.65 to +0.70 in risk-off", "relationship": "geo-risk confirmation", "leadLag": "gold leads oil short-term", "condition": "Gold up plus crude up confirms risk premium.", "breakdown": "Risk-on rallies or USD strength can decouple."},
    ],
    "SILVER": [
        {"pair": "GOLD", "coefficient": 0.72, "range": "+0.72", "relationship": "safe-haven anchor", "leadLag": "gold leads silver", "condition": "Gold/silver ratio 60-85 is normal; >85 alerts silver lag.", "breakdown": "Solar demand can make silver outperform gold."},
    ],
    "COPPER": [
        {"pair": "CHINA_PMI", "coefficient": 0.75, "range": "+0.70 to +0.80", "relationship": "China industrial demand", "leadLag": "PMI leads copper by 1-2 months", "condition": "PMI above 50 supports copper demand.", "breakdown": "Supply disruptions can override demand signal."},
        {"pair": "WTI", "coefficient": 0.37, "range": "+0.29 to +0.45", "relationship": "industrial demand leads crude", "leadLag": "copper leads oil by 25 trading days", "condition": "Sustained copper drop >15% in 60 days signals slowdown.", "breakdown": "OPEC/geo supply shocks can decouple crude."},
        {"pair": "ALUMINUM", "coefficient": 0.68, "range": "+0.60 to +0.75", "relationship": "industrial metals complex", "leadLag": "same cycle", "condition": "Copper is demand-led; aluminum adds power-cost beta.", "breakdown": "Power shock can make aluminum diverge."},
    ],
    "ALUMINUM": [
        {"pair": "EU_POWER", "coefficient": 0.68, "range": "+0.60 to +0.75", "relationship": "smelter power-cost sensitivity", "leadLag": "power leads aluminum by 2-4 weeks", "condition": "EU power >150 EUR/MWh for 3+ days raises curtailment risk.", "breakdown": "China supply policy can dominate."},
        {"pair": "COPPER", "coefficient": 0.68, "range": "+0.60 to +0.75", "relationship": "industrial metals complex", "leadLag": "same cycle", "condition": "Confirms broad manufacturing demand.", "breakdown": "Power costs drive aluminum-specific divergence."},
    ],
    "LITHIUM": [
        {"pair": "COPPER", "coefficient": 0.55, "range": "+0.55", "relationship": "EV and electrification demand linkage", "leadLag": "lithium cycle is slower", "condition": "Both strengthen when EV and grid demand recover.", "breakdown": "Lithium oversupply can persist despite copper strength."},
    ],
    "FREIGHT": [
        {"pair": "WTI", "coefficient": 0.52, "range": "+0.45 to +0.60", "relationship": "trade and tanker demand", "leadLag": "BDI leads crude demand softness by 1-3 weeks", "condition": "BDI down plus copper down confirms demand destruction.", "breakdown": "TTF/BDI divergence during Red Sea disruption signals logistics shock, not demand strength."},
        {"pair": "COPPER", "coefficient": 0.58, "range": "+0.50 to +0.65", "relationship": "China/global industrial demand", "leadLag": "same to slight BDI lead", "condition": "BDI plus copper together indicate industrial demand.", "breakdown": "Route disruption can distort freight signal."},
    ],
    "EU_POWER": [
        {"pair": "TTF", "coefficient": 0.82, "range": "+0.75 to +0.85", "relationship": "gas marginal power price", "leadLag": "gas leads power immediately", "condition": "Strong during tight gas or low renewables.", "breakdown": "Nuclear/wind output reduces gas pass-through."},
        {"pair": "ALUMINUM", "coefficient": 0.68, "range": "+0.60 to +0.75", "relationship": "smelting cost channel", "leadLag": "power leads aluminum by 2-4 weeks", "condition": "Power stress above 150 EUR/MWh raises curtailment risk.", "breakdown": "Aluminum inventory cycles can soften response."},
    ],
}


HISTORICAL_REGIME_EVENTS = [
    {"eventName": "GFC oil bubble 2008", "date": "2008-07-03", "commodities": ["WTI", "BRENT"], "priceMove": "WTI and Brent surged to roughly $145/bbl before collapsing into the financial crisis.", "statisticalSignificance": "All-time-high extreme; multi-sigma upside followed by demand shock.", "recoveryTime": "More than 3 years for sustained recovery.", "lesson": "Parabolic oil rallies can reverse violently when credit and demand break.", "regimeTags": ["oil bubble", "demand shock", "volatility spike"]},
    {"eventName": "Arab Spring Brent spike", "date": "2011-04-29", "commodities": ["BRENT", "WTI", "GOLD"], "priceMove": "Brent risk premium rose above $120/bbl as MENA supply risk repriced.", "statisticalSignificance": "Sustained above bull regime threshold.", "recoveryTime": "Several quarters; premium faded with supply adaptation.", "lesson": "Regional instability creates durable Brent premium when spare capacity is questioned.", "regimeTags": ["geo-risk", "supply premium", "Brent"]},
    {"eventName": "OPEC production war 2014-2016", "date": "2014-11-27", "commodities": ["WTI", "BRENT"], "priceMove": "Oil fell from above $100 to below $30/bbl as OPEC defended market share.", "statisticalSignificance": "Downside anomaly and bear regime.", "recoveryTime": "About 2 years after coordinated cuts.", "lesson": "Policy discipline is the regime switch for crude downside risk.", "regimeTags": ["policy", "supply surge", "bear regime"]},
    {"eventName": "COVID demand shock 2020", "date": "2020-04-20", "commodities": ["WTI", "BRENT", "FREIGHT"], "priceMove": "Front-month WTI settled below zero as storage and demand collapsed.", "statisticalSignificance": "All-time-low extreme; non-normal storage/expiry shock.", "recoveryTime": "Roughly 12-18 months as demand and OPEC policy normalized.", "lesson": "Storage constraints can invalidate historical price anchors.", "regimeTags": ["demand shock", "storage", "oversupply"]},
    {"eventName": "Russia-Ukraine gas crisis 2022", "date": "2022-08-26", "commodities": ["TTF", "EU_POWER", "CARBON", "ALUMINUM", "WHEAT"], "priceMove": "EU gas and power prices moved into crisis levels, forcing industrial curtailment.", "statisticalSignificance": "Extreme volatility and crisis regime.", "recoveryTime": "6-12 months as LNG and storage policy rebuilt buffers.", "lesson": "Storage and LNG access determine whether gas shock becomes power and metals shock.", "regimeTags": ["gas crisis", "power stress", "sanctions"]},
    {"eventName": "Uranium speculative bubble 2006-2007", "date": "2007-06-01", "commodities": ["URANIUM"], "priceMove": "U3O8 rose above $130/lb before speculative demand unwound.", "statisticalSignificance": "All-time-high speculative extreme.", "recoveryTime": "Multi-year decline after peak.", "lesson": "Uranium spot can overshoot thin-market fundamentals.", "regimeTags": ["uranium", "speculative bubble", "nuclear"]},
    {"eventName": "Fukushima nuclear shock 2011", "date": "2011-03-11", "commodities": ["URANIUM", "LNG", "NATGAS", "EU_POWER"], "priceMove": "Uranium fell as nuclear policy reversed; LNG and gas demand rose as replacement fuel.", "statisticalSignificance": "Policy-driven regime break.", "recoveryTime": "More than a decade for nuclear renaissance narrative to recover.", "lesson": "Policy risk dominates uranium after safety shocks.", "regimeTags": ["policy shock", "nuclear", "gas substitution"]},
    {"eventName": "Lithium EV boom 2022", "date": "2022-11-01", "commodities": ["LITHIUM", "COPPER", "SILVER"], "priceMove": "Lithium carbonate surged on battery demand and supply bottlenecks.", "statisticalSignificance": "Upside commodity supercycle anomaly.", "recoveryTime": "Reversed in 2023 as supply outran demand.", "lesson": "Battery metals can overshoot when demand extrapolation outruns contract supply.", "regimeTags": ["EV boom", "tech transition", "battery"]},
    {"eventName": "Lithium crash 2023", "date": "2023-12-01", "commodities": ["LITHIUM"], "priceMove": "Lithium prices collapsed as supply expansion exceeded EV demand growth.", "statisticalSignificance": "Downside oversupply regime.", "recoveryTime": "Unresolved until curtailments and EV growth rebalance.", "lesson": "Floor confirmation requires sustained prices below cost and producer cuts.", "regimeTags": ["oversupply", "battery", "floor watch"]},
    {"eventName": "Ukraine wheat shock 2022", "date": "2022-03-07", "commodities": ["WHEAT", "DIESEL", "NATGAS", "FREIGHT"], "priceMove": "Wheat surged on Black Sea export disruption and fertilizer/fuel stress.", "statisticalSignificance": "Upside food inflation shock.", "recoveryTime": "Several months with corridor agreements and substitution.", "lesson": "Energy and freight amplify grain shocks through fertilizer and logistics.", "regimeTags": ["wheat", "Black Sea", "food inflation"]},
    {"eventName": "BDI supercycle peak 2008", "date": "2008-05-20", "commodities": ["FREIGHT", "IRON_ORE", "COAL", "WTI"], "priceMove": "BDI exceeded 11,000 during the commodity trade supercycle before collapsing.", "statisticalSignificance": "All-time freight extreme.", "recoveryTime": "Multi-year normalization.", "lesson": "Freight can signal supercycle demand, but collapses quickly when credit breaks.", "regimeTags": ["freight", "supercycle", "demand"]},
    {"eventName": "Red Sea disruption 2023-present", "date": "2023-12-15", "commodities": ["FREIGHT", "BRENT", "DIESEL", "WHEAT"], "priceMove": "Container freight and insurance rose before crude fully repriced.", "statisticalSignificance": "Route-disruption divergence rather than broad demand boom.", "recoveryTime": "Ongoing; normalizes only with security restoration.", "lesson": "Freight stress with weak BDI is a logistics cost shock, not a demand confirmation.", "regimeTags": ["Red Sea", "freight-geo split", "logistics"]},
]


TRAINING_DATA = {
    "WTI": {
        "displayName": "WTI Crude Oil", "aliases": ["wti", "crude", "crude-oil", "oil", "CL=F"], "unit": "USD/bbl",
        "longRunMean": 62.71, "typicalRangeLow": 44.44, "typicalRangeHigh": 80.98,
        "allTimeHigh": 145.31, "allTimeHighDate": "2008-07-03", "allTimeLow": -36.98, "allTimeLowDate": "2020-04-20",
        "annualizedVolatilityBenchmark": 47.0,
        "regimeThresholds": {"bull": 90, "bear": 70, "shockWeeklyAbs": 10, "twoSigmaPriceDistanceFrom12mSma": 15, "nearExtremePct": 8},
        "volatilityModelRecommendation": "GARCH/GJR-GARCH for shock-aware bands; 30D HV for dashboard state.",
        "consumerPassThroughLag": "3-6 weeks to gasoline/diesel; 4-8 weeks to freight-linked goods",
        "businessImpactNotes": "Airlines, logistics, refiners, fuel distributors, agriculture and consumers are most exposed.",
        "regimeInterpretationRules": ["Bull regime when Brent/WTI is sustained above $90/bbl.", "Bear regime when below $70/bbl.", "Weekly change over $10/bbl is a shock event.", "Gold up with crude up confirms geopolitical supply premium."],
        "keyHistoricalEvents": ["GFC oil bubble 2008", "OPEC production war 2014-2016", "COVID demand shock 2020", "Arab Spring Brent spike"],
    },
    "BRENT": {
        "displayName": "Brent Crude Oil", "aliases": ["brent", "brent crude", "BZ=F"], "unit": "USD/bbl",
        "longRunMean": 67.2, "typicalRangeLow": 50.0, "typicalRangeHigh": 88.0,
        "allTimeHigh": 147.5, "allTimeHighDate": "2008-07-11", "allTimeLow": 9.12, "allTimeLowDate": "1998-12-10",
        "annualizedVolatilityBenchmark": 44.0,
        "regimeThresholds": {"bull": 90, "bear": 70, "shockWeeklyAbs": 10, "twoSigmaPriceDistanceFrom12mSma": 15, "spreadStressVsWti": 5},
        "volatilityModelRecommendation": "GARCH with jump-event overlay for geopolitical supply shocks.",
        "consumerPassThroughLag": "3-6 weeks through refined products and aviation fuel",
        "businessImpactNotes": "Global seaborne crude benchmark; airlines and import-dependent refiners are highly exposed.",
        "regimeInterpretationRules": ["Above $90/bbl activates fuel-cost bull regime.", "Below $70/bbl points to demand softness unless supply surge explains move.", "Brent-WTI spread above $5 flags Atlantic Basin logistics stress."],
        "keyHistoricalEvents": ["Arab Spring Brent spike", "Russia-Ukraine gas crisis 2022", "Red Sea disruption 2023-present"],
    },
    "NATGAS": {
        "displayName": "Henry Hub Natural Gas", "aliases": ["natural-gas", "natgas", "henry hub", "NG=F"], "unit": "USD/MMBtu",
        "longRunMean": 3.35, "typicalRangeLow": 2.0, "typicalRangeHigh": 4.5,
        "allTimeHigh": 15.38, "allTimeHighDate": "2005-12-13", "allTimeLow": 1.05, "allTimeLowDate": "1992-01-24",
        "annualizedVolatilityBenchmark": 72.0,
        "regimeThresholds": {"surplusBelow": 2.0, "normalLow": 2.0, "normalHigh": 3.5, "elevated": 4.5, "winterRisk": 6.0, "shock": 8.0, "storageSurplusPct": 8},
        "volatilityModelRecommendation": "GJR-GARCH with weather/storage exogenous features.",
        "consumerPassThroughLag": "6-8 weeks through utility bills; seasonal for heating",
        "businessImpactNotes": "Utilities, fertilizers, chemicals, LNG exporters and households are exposed.",
        "regimeInterpretationRules": ["Surplus below $2 unless LNG exports or weather tighten balances.", "Winter-risk above $6.", "Storage above 5-year average plus rising price flags temporary weather/export shock."],
        "keyHistoricalEvents": ["Fukushima nuclear shock 2011", "Russia-Ukraine gas crisis 2022"],
    },
    "TTF": {
        "displayName": "EU TTF Natural Gas", "aliases": ["ttf", "eu gas", "dutch ttf", "lng", "jkm"], "unit": "USD/MMBtu",
        "longRunMean": 9.5, "typicalRangeLow": 4.0, "typicalRangeHigh": 20.0,
        "allTimeHigh": 98.0, "allTimeHighDate": "2022-08-26", "allTimeLow": 1.2, "allTimeLowDate": "2020-05-01",
        "annualizedVolatilityBenchmark": 95.0,
        "regimeThresholds": {"surplusBelow": 4, "normalLow": 4, "normalHigh": 10, "elevatedLow": 10, "elevatedHigh": 20, "highLow": 20, "highHigh": 40, "crisisAbove": 40},
        "volatilityModelRecommendation": "Regime-switching volatility model with storage and LNG import features.",
        "consumerPassThroughLag": "4-10 weeks through power tariffs and industrial contracts",
        "businessImpactNotes": "Utilities, power-intensive manufacturers, fertilizers and households are exposed.",
        "regimeInterpretationRules": ["Crisis above $40/MMBtu.", "High $20-40, elevated $10-20, normal $4-10, surplus below $4.", "TTF strongly transmits to EU power and carbon economics."],
        "keyHistoricalEvents": ["Russia-Ukraine gas crisis 2022"],
    },
    "DIESEL": {
        "displayName": "Diesel / Refined Products", "aliases": ["diesel", "gasoline", "jet fuel", "heating oil", "refined-products", "HO=F", "RB=F"], "unit": "USD/gal",
        "longRunMean": 2.75, "typicalRangeLow": 1.9, "typicalRangeHigh": 3.6,
        "allTimeHigh": 5.81, "allTimeHighDate": "2022-06-20", "allTimeLow": 0.76, "allTimeLowDate": "1999-02-22",
        "annualizedVolatilityBenchmark": 50.0,
        "regimeThresholds": {"bull": 3.5, "bear": 2.0, "crackSpreadStress": 35, "shockWeeklyPct": 8},
        "volatilityModelRecommendation": "Crack-spread model with crude feedstock and refinery utilization features.",
        "consumerPassThroughLag": "2-6 weeks to freight, grocery logistics, agriculture and construction",
        "businessImpactNotes": "Trucking, logistics, agriculture, airlines and fuel distributors are directly exposed.",
        "regimeInterpretationRules": ["Diesel crack above $35/bbl signals refinery margin stress.", "Rising diesel with flat crude indicates product shortage, not pure crude bull."],
        "keyHistoricalEvents": ["Ukraine wheat shock 2022", "Red Sea disruption 2023-present"],
    },
    "GOLD": {
        "displayName": "Gold / XAU", "aliases": ["gold", "xau", "GC=F"], "unit": "USD/oz",
        "longRunMean": 1420.0, "typicalRangeLow": 1100.0, "typicalRangeHigh": 2500.0,
        "allTimeHigh": 2450.0, "allTimeHighDate": "2024-05-20", "allTimeLow": 252.8, "allTimeLowDate": "1999-08-25",
        "annualizedVolatilityBenchmark": 16.0,
        "regimeThresholds": {"safeHavenActive": 2500, "geoRiskUnwindBelow": 2100, "goldOilRatioHigh": 30, "goldOilRatioLow": 15},
        "volatilityModelRecommendation": "EWMA/GARCH with USD real-rate and geo-risk factors.",
        "consumerPassThroughLag": "Signal only; indirect inflation and confidence channel",
        "businessImpactNotes": "Investors, miners, central banks and energy traders use gold as risk confirmation.",
        "regimeInterpretationRules": ["Above $2,500/oz activates safe-haven regime.", "Below $2,100/oz indicates geo-risk unwind.", "Gold up while crude flat/down means macro fear rather than supply shock."],
        "keyHistoricalEvents": ["Arab Spring Brent spike", "Russia-Ukraine gas crisis 2022"],
    },
    "SILVER": {
        "displayName": "Silver / XAG", "aliases": ["silver", "xag", "SI=F"], "unit": "USD/oz",
        "longRunMean": 22.0, "typicalRangeLow": 16.0, "typicalRangeHigh": 35.0,
        "allTimeHigh": 48.7, "allTimeHighDate": "2011-04-28", "allTimeLow": 3.55, "allTimeLowDate": "1993-02-18",
        "annualizedVolatilityBenchmark": 32.0,
        "regimeThresholds": {"bull": 35, "bear": 18, "goldSilverRatioNormalLow": 60, "goldSilverRatioNormalHigh": 85, "ratioAlertAbove": 85},
        "volatilityModelRecommendation": "GARCH with gold ratio and industrial demand factors.",
        "consumerPassThroughLag": "Signal only; solar and electronics cost channel longer cycle",
        "businessImpactNotes": "Solar, electronics and precious metals investors are exposed.",
        "regimeInterpretationRules": ["Gold-silver ratio typical range is 60-85; above 85 flags silver lag or stress.", "Solar boom can break gold/silver correlation."],
        "keyHistoricalEvents": ["Lithium EV boom 2022"],
    },
    "COPPER": {
        "displayName": "Copper / HG", "aliases": ["copper", "hg", "HG=F"], "unit": "USD/lb",
        "longRunMean": 3.15, "typicalRangeLow": 2.5, "typicalRangeHigh": 4.75,
        "allTimeHigh": 5.20, "allTimeHighDate": "2024-05-20", "allTimeLow": 0.60, "allTimeLowDate": "2001-11-15",
        "annualizedVolatilityBenchmark": 28.0,
        "regimeThresholds": {"bull": 4.75, "bear": 3.0, "slowdownDrop60dPct": -15, "chinaPmiExpansion": 50},
        "volatilityModelRecommendation": "XGBoost/LightGBM with China PMI, USD and inventory features plus 60D rolling correlation.",
        "consumerPassThroughLag": "4-12 weeks through construction, electronics and grid equipment",
        "businessImpactNotes": "Manufacturers, construction, grid, EV and industrial metals investors are exposed.",
        "regimeInterpretationRules": ["Copper leads oil by about 25 trading days.", "Sustained drop greater than 15% in 60 days signals industrial slowdown.", "PMI below 50 weakens demand interpretation."],
        "keyHistoricalEvents": ["GFC oil bubble 2008", "Lithium EV boom 2022"],
    },
    "URANIUM": {
        "displayName": "Uranium / U3O8", "aliases": ["uranium", "u3o8", "nuclear", "URA"], "unit": "USD/lb",
        "longRunMean": 45.0, "typicalRangeLow": 30.0, "typicalRangeHigh": 90.0,
        "allTimeHigh": 136.0, "allTimeHighDate": "2007-06-01", "allTimeLow": 7.1, "allTimeLowDate": "2000-12-01",
        "annualizedVolatilityBenchmark": 38.0,
        "regimeThresholds": {"nuclearRenaissance": 90, "bear": 45, "speculativeExtreme": 120},
        "volatilityModelRecommendation": "Thin-market regime model with policy and contracting event features.",
        "consumerPassThroughLag": "Long-cycle contract market; indirect power stability over years",
        "businessImpactNotes": "Utilities, nuclear developers, miners and power investors are exposed.",
        "regimeInterpretationRules": ["Sustained above $90/lb confirms nuclear renaissance threshold.", "Policy and supply concentration drive volatility more than spot demand."],
        "keyHistoricalEvents": ["Uranium speculative bubble 2006-2007", "Fukushima nuclear shock 2011"],
    },
    "LITHIUM": {
        "displayName": "Lithium Carbonate", "aliases": ["lithium", "lithium carbonate", "LIT"], "unit": "USD/tonne",
        "longRunMean": 26000.0, "typicalRangeLow": 10000.0, "typicalRangeHigh": 70000.0,
        "allTimeHigh": 84500.0, "allTimeHighDate": "2022-11-01", "allTimeLow": 5000.0, "allTimeLowDate": "2020-06-01",
        "annualizedVolatilityBenchmark": 80.0,
        "regimeThresholds": {"floorConfirmationBelow": 10000, "bull": 40000, "boom": 70000, "evDemandRecoveryYoY": 30},
        "volatilityModelRecommendation": "Cycle model with EV sales, inventory and mine curtailment features.",
        "consumerPassThroughLag": "12-18 months to EV battery and vehicle prices",
        "businessImpactNotes": "Battery makers, EV OEMs, miners and consumers are exposed with long pass-through.",
        "regimeInterpretationRules": ["Below $10,000/tonne sustained confirms floor-watch regime.", "EV demand recovery and mine curtailment are the reversal signals."],
        "keyHistoricalEvents": ["Lithium EV boom 2022", "Lithium crash 2023"],
    },
    "WHEAT": {
        "displayName": "Wheat / CBOT", "aliases": ["wheat", "grain", "ZW=F"], "unit": "USc/bu",
        "longRunMean": 590.0, "typicalRangeLow": 450.0, "typicalRangeHigh": 850.0,
        "allTimeHigh": 1363.0, "allTimeHighDate": "2022-03-07", "allTimeLow": 233.0, "allTimeLowDate": "1999-07-01",
        "annualizedVolatilityBenchmark": 33.0,
        "regimeThresholds": {"blackSeaRisk": 850, "bear": 450, "shockWeeklyPct": 8},
        "volatilityModelRecommendation": "Weather/geopolitical event model with diesel, gas and freight features.",
        "consumerPassThroughLag": "4-16 weeks to food inflation; faster when freight/diesel also rise",
        "businessImpactNotes": "Agriculture, food producers, retailers and consumers are exposed.",
        "regimeInterpretationRules": ["Black Sea disruption creates supply premium.", "Oil leads wheat by 4-6 weeks through diesel/fertilizer/freight linkage."],
        "keyHistoricalEvents": ["Ukraine wheat shock 2022"],
    },
    "CARBON": {
        "displayName": "EU Carbon / EUA", "aliases": ["carbon", "eu ets", "eua", "ETS"], "unit": "EUR/t",
        "longRunMean": 58.0, "typicalRangeLow": 45.0, "typicalRangeHigh": 100.0,
        "allTimeHigh": 105.0, "allTimeHighDate": "2023-02-21", "allTimeLow": 2.7, "allTimeLowDate": "2013-04-17",
        "annualizedVolatilityBenchmark": 42.0,
        "regimeThresholds": {"policyStress": 100, "weakIndustrialDemand": 55, "coalGasSwitching": 75},
        "volatilityModelRecommendation": "Policy-event model with TTF, coal, power demand and MSR reform features.",
        "consumerPassThroughLag": "1-2 quarters through power bills and industrial pass-through",
        "businessImpactNotes": "Utilities, power generators, manufacturers, airlines and heavy industry are exposed.",
        "regimeInterpretationRules": ["Policy asset first; cap reform and MSR dominate.", "Gas/power linkage drives fuel-switching economics."],
        "keyHistoricalEvents": ["Russia-Ukraine gas crisis 2022"],
    },
    "ALUMINUM": {
        "displayName": "Aluminum / LME", "aliases": ["aluminum", "aluminium", "LME aluminum", "AA"], "unit": "USD/t",
        "longRunMean": 2200.0, "typicalRangeLow": 1700.0, "typicalRangeHigh": 3000.0,
        "allTimeHigh": 3850.0, "allTimeHighDate": "2022-03-07", "allTimeLow": 1040.0, "allTimeLowDate": "2009-02-24",
        "annualizedVolatilityBenchmark": 30.0,
        "regimeThresholds": {"bull": 3000, "bear": 1800, "smelterCurtailmentPowerEurMwh": 150, "powerStressDays": 3},
        "volatilityModelRecommendation": "Power-cost adjusted metals model with China demand and inventory features.",
        "consumerPassThroughLag": "4-10 weeks through packaging, construction and manufacturing",
        "businessImpactNotes": "Power-intensive smelters, manufacturers, construction and packaging are exposed.",
        "regimeInterpretationRules": ["EU power above 150 EUR/MWh for 3+ days raises smelter curtailment risk.", "Power leads aluminum by 2-4 weeks."],
        "keyHistoricalEvents": ["Russia-Ukraine gas crisis 2022"],
    },
    "FREIGHT": {
        "displayName": "Baltic Dry Index / Freight", "aliases": ["freight", "shipping", "bdi", "BDRY"], "unit": "Index",
        "longRunMean": 2200.0, "typicalRangeLow": 1500.0, "typicalRangeHigh": 3000.0,
        "allTimeHigh": 11793.0, "allTimeHighDate": "2008-05-20", "allTimeLow": 290.0, "allTimeLowDate": "2016-02-10",
        "annualizedVolatilityBenchmark": 95.0,
        "regimeThresholds": {"stressLowBelow": 1500, "stressHighAbove": 3000, "supercycleAbove": 8000},
        "volatilityModelRecommendation": "Regime-switching freight model with China imports, route disruptions and bunker fuel.",
        "consumerPassThroughLag": "1-3 weeks as trade signal; 6-12 weeks to consumer goods",
        "businessImpactNotes": "Shipping, importers, commodity traders, retailers and consumers are exposed.",
        "regimeInterpretationRules": ["BDI below 1,500 signals demand stress-low.", "Above 3,000 signals freight stress-high.", "BDI down with container stress up flags logistics cost shock, not demand strength."],
        "keyHistoricalEvents": ["BDI supercycle peak 2008", "Red Sea disruption 2023-present"],
    },
    "EU_POWER": {
        "displayName": "EU Power / Electricity", "aliases": ["power", "electricity", "eu power", "EU_POWER"], "unit": "EUR/MWh",
        "longRunMean": 65.0, "typicalRangeLow": 30.0, "typicalRangeHigh": 120.0,
        "allTimeHigh": 700.0, "allTimeHighDate": "2022-08-26", "allTimeLow": -20.0, "allTimeLowDate": "2020-04-13",
        "annualizedVolatilityBenchmark": 85.0,
        "regimeThresholds": {"normalLow": 30, "normalHigh": 60, "postCrisisLow": 60, "postCrisisHigh": 120, "stressAbove": 150, "stressDays": 3},
        "volatilityModelRecommendation": "Stack model using gas, carbon, nuclear availability, renewables and demand.",
        "consumerPassThroughLag": "1-3 billing cycles; faster for unhedged industrial tariffs",
        "businessImpactNotes": "Utilities, households, aluminum, manufacturers and data centers are exposed.",
        "regimeInterpretationRules": ["Normal range 30-60 EUR/MWh.", "Post-crisis range 60-120.", "Stress above 150 for 3+ days.", "Gas, carbon and uranium/nuclear availability drive regime."],
        "keyHistoricalEvents": ["Russia-Ukraine gas crisis 2022", "Fukushima nuclear shock 2011"],
    },
}


ALIASES = {}
for _cid, _item in TRAINING_DATA.items():
    ALIASES[_cid.upper()] = _cid
    for _alias in _item["aliases"]:
        ALIASES[str(_alias).strip().upper().replace("_", "-")] = _cid


def resolve_instrument_id(value: str | None) -> str:
    key = str(value or "WTI").strip().upper().replace("_", "-")
    return ALIASES.get(key, key if key in TRAINING_DATA else "WTI")


def get_instrument_training(value: str | None) -> dict:
    cid = resolve_instrument_id(value)
    item = deepcopy(TRAINING_DATA[cid])
    item["commodity"] = cid
    item.update(DATA_SOURCE_MAP.get(cid, {}))
    item["correlationPairs"] = deepcopy(CORRELATION_LIBRARY.get(cid, []))
    item["leadLagRelationships"] = [
        {
            "pair": pair["pair"],
            "leadLag": pair["leadLag"],
            "relationship": pair["relationship"],
            "condition": pair["condition"],
        }
        for pair in item["correlationPairs"]
    ]
    events = []
    for name in item.get("keyHistoricalEvents", []):
        match = next((e for e in HISTORICAL_REGIME_EVENTS if e["eventName"] == name), None)
        if match:
            events.append(deepcopy(match))
    item["keyHistoricalEvents"] = events
    return item


def list_instruments() -> list[dict]:
    return [
        {
            "commodity": cid,
            "displayName": data["displayName"],
            "unit": data["unit"],
            "aliases": data["aliases"],
            **DATA_SOURCE_MAP.get(cid, {}),
        }
        for cid, data in TRAINING_DATA.items()
    ]


def get_correlations(value: str | None) -> list[dict]:
    return deepcopy(CORRELATION_LIBRARY.get(resolve_instrument_id(value), []))


def get_analogues(value: str | None) -> list[dict]:
    cid = resolve_instrument_id(value)
    return [deepcopy(e) for e in HISTORICAL_REGIME_EVENTS if cid in e.get("commodities", [])]


def list_analogues() -> list[dict]:
    return deepcopy(HISTORICAL_REGIME_EVENTS)
