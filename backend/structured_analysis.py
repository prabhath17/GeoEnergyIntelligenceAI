"""Structured Analysis Generator — produces full V1 AI Analysis schema output.

This wraps the existing analysis_engine.py output with the complete structured
JSON schema defined in the GeoEnergy Intelligence AI analytical upgrade spec.

Adds:
- Full thesis object (whatChanged, whyItMatters, confirmation, invalidation)
- Structured prediction with base/bull/bear cases and modelMode
- Rich historical analogue object
- Cross-market confirmation signals
- Classified news drivers
- Engine-based stakeholder and consumer impact
- Invalidation signal list
- Source transparency
- No fake ML claims — deterministic_fallback is labeled clearly
"""
from __future__ import annotations

from datetime import datetime, timezone

from rule_engine import evaluate_rules, derive_posture_from_rules
from news_impact_classifier import classify_batch
from stakeholder_impact_engine import score_all_stakeholders
from consumer_impact_engine import build_consumer_impact_summary
from ml_feature_engine import build_full_feature_vector, build_spread_features
from model_inference import predict_direction, get_feature_attribution, get_model_status
from model_metrics import get_model_metadata
from rag_engine import closest_analogue


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _safe_float(val, default: float = 0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _find_price(pool: list[dict], *keys: str) -> dict:
    for key in keys:
        for item in pool:
            iid = str(item.get("id", "")).upper()
            iname = str(item.get("name", "")).upper()
            if key.upper() in iid or key.upper() in iname:
                return item
    return {}


def _pct(item: dict) -> float:
    return _safe_float(item.get("changePercent"))


def _dir(item: dict) -> str:
    p = _pct(item)
    return "up" if p > 0.05 else "down" if p < -0.05 else "flat"


def _build_price_dict(prices: list[dict], cross: list[dict], geo_items: list[dict]) -> dict:
    """Build a flat price + direction dict for rule engine and stakeholder scoring."""
    pool = [*(prices or []), *(cross or [])]
    crude = _find_price(pool, "WTI", "BRENT", "CRUDE")
    brent = _find_price(pool, "BRENT", "BZ=F")
    gold = _find_price(pool, "GOLD", "GC=F", "XAU")
    copper = _find_price(pool, "COPPER", "HG=F")
    freight = _find_price(pool, "FREIGHT", "BDI", "SHIPPING")
    natgas = _find_price(pool, "NATGAS", "NATURAL GAS", "NG=F")
    ttf = _find_price(pool, "TTF", "EU GAS")
    diesel = _find_price(pool, "DIESEL", "HEATING OIL", "HO=F")
    gasoline = _find_price(pool, "GASOLINE", "RBOB")
    power = _find_price(pool, "POWER", "ELECTRICITY")
    aluminum = _find_price(pool, "ALUMINUM", "ALUMINIUM")
    wheat = _find_price(pool, "WHEAT", "ZW=F")
    lithium = _find_price(pool, "LITHIUM", "LIT")
    carbon = _find_price(pool, "CARBON", "EUA", "ETS")

    geo_score = max([_safe_float(g.get("riskScore", 5)) for g in (geo_items or [])] or [5.0])
    chokepoints = ["hormuz", "suez", "red sea", "panama"]
    chokepoint_active = any(any(c in str(g).lower() for c in chokepoints) for g in (geo_items or []))

    # Compute crack spread (simplified)
    diesel_price = _safe_float(diesel.get("price", 0))
    crude_price = _safe_float(crude.get("price", 72))
    diesel_crack = max(0, diesel_price * 42 - crude_price) if diesel_price and crude_price else 25.0

    return {
        "crude_direction": _dir(crude) if crude else "flat",
        "crude_change_pct": _pct(crude),
        "gold_direction": _dir(gold) if gold else "flat",
        "gold_change_pct": _pct(gold),
        "copper_direction": _dir(copper) if copper else "flat",
        "copper_change_pct": _pct(copper),
        "freight_direction": _dir(freight) if freight else "flat",
        "freight_change_pct": _pct(freight),
        "ttf_direction": _dir(ttf) if ttf else _dir(natgas) if natgas else "flat",
        "power_direction": _dir(power) if power else "flat",
        "aluminum_direction": _dir(aluminum) if aluminum else "flat",
        "aluminum_change_pct": _pct(aluminum),
        "diesel_change_pct": _pct(diesel),
        "gasoline_change_pct": _pct(gasoline),
        "natgas_change_pct": _pct(natgas),
        "power_change_pct": _pct(power),
        "carbon_change_pct": _pct(carbon),
        "wheat_change_pct": _pct(wheat),
        "lithium_change_pct": _pct(lithium),
        "diesel_crack_spread": diesel_crack,
        "geo_risk_score": geo_score,
        "chokepoint_active": chokepoint_active,
    }


def _build_thesis_object(
    regime_name: str,
    regime_description: str,
    active_rules: list[dict],
    compound_signals: list[dict],
    news_summary: dict,
    wti_price: float,
    brent_price: float,
    crude_direction: str,
    gold_direction: str,
    geo_score: float,
    critical_geo: list[dict],
) -> dict:
    """Build the structured thesis object."""
    # What changed
    changes = []
    if crude_direction == "up":
        changes.append(f"Crude oil is rising (WTI ${wti_price:.1f}/bbl, Brent ${brent_price:.1f}/bbl)")
    elif crude_direction == "down":
        changes.append(f"Crude oil is weakening (WTI ${wti_price:.1f}/bbl)")
    if gold_direction == "up":
        changes.append("Gold safe-haven bid is active")
    if critical_geo:
        changes.append(f"{len(critical_geo)} critical geopolitical event(s) active")
    if active_rules:
        changes.append(f"Rule engine: {active_rules[0]['signalName']} triggered")
    what_changed = "; ".join(changes) if changes else "Market conditions are in normal equilibrium."

    # Why it matters
    why_matters = (
        f"{regime_name} regime: {regime_description} "
        f"This affects fuel-intensive sectors within 2-4 weeks and consumer prices within 4-8 weeks."
    )

    # Supporting signals
    supporting = []
    for rule in active_rules[:4]:
        supporting.append(f"{rule['signalName']} ({rule['direction']}, conf: {rule['confidence']}%)")
    for signal in compound_signals[:3]:
        supporting.append(signal.get("meaning", ""))

    # Key risks
    key_risks = []
    if active_rules:
        key_risks.append(active_rules[0].get("invalidationSignal", ""))
    key_risks += [
        "OPEC+ compliance breakdown could reverse supply discipline",
        "Demand miss in China PMI could reduce crude price support",
        "Weather normalization could reverse gas/heating demand spike",
    ]
    key_risks = [r for r in key_risks if r][:4]

    # Confirmation signals
    if active_rules:
        confirmation = active_rules[0].get("confirmationSignal", "Follow-through in commodity prices and volume data")
    else:
        confirmation = "Price breaks above/below key thresholds with volume confirmation"

    # Invalidation
    if active_rules:
        invalidation = active_rules[0].get("invalidationSignal", "Data contradiction or supply restoration")
    else:
        invalidation = "Geo-risk de-escalation or demand data surprise reversal"

    return {
        "main": why_matters,
        "whatChanged": what_changed,
        "whyItMatters": why_matters,
        "confirmation": confirmation,
        "invalidation": invalidation,
        "supportingSignals": [s for s in supporting if s],
        "keyRisks": key_risks,
    }


def _build_historical_analogue_object(raw_analogue: dict) -> dict:
    """Enrich the raw analogue dict with full structured fields."""
    return {
        "eventName": raw_analogue.get("eventName", ""),
        "date": raw_analogue.get("date", ""),
        "region": raw_analogue.get("region", "Global"),
        "commoditiesAffected": raw_analogue.get("commodities", []),
        "eventType": raw_analogue.get("tags", [""])[0] if raw_analogue.get("tags") else "",
        "priceMove": raw_analogue.get("priceMove", ""),
        "volatilityResponse": "Elevated intraday volatility with sustained risk premium",
        "similarityReason": f"Market conditions (commodity direction, geo-risk level) closely match this event's setup.",
        "whatHappenedLastTime": raw_analogue.get("outcome", raw_analogue.get("priceMove", "")),
        "keyDifferenceToday": "Current market has different supply cushion and geopolitical context — analogue is directional, not identical.",
        "lesson": raw_analogue.get("keyLesson", ""),
        "stakeholderImpact": raw_analogue.get("stakeholderImpact", ""),
        "confirmingSignals": raw_analogue.get("confirmingSignals", []),
        "reversalSignals": raw_analogue.get("reversalSignals", []),
        "matchScore": raw_analogue.get("matchScore", 0),
        "analogueSummary": raw_analogue.get("analogueSummary", ""),
    }


def _build_cross_market_confirmations(compound_signals: list[dict], active_rules: list[dict], price_dict: dict) -> list[dict]:
    """Build cross-market confirmation list from compound signals and rule engine."""
    confirmations = []

    # From compound signals
    for signal in compound_signals[:5]:
        confirmations.append({
            "signalId": signal.get("id", ""),
            "description": signal.get("meaning", ""),
            "action": signal.get("action", ""),
            "bull": signal.get("probabilityTilt", {}).get("bull", 0),
            "bear": signal.get("probabilityTilt", {}).get("bear", 0),
            "confidence": signal.get("confidence", 70),
            "watch": signal.get("watch", []),
            "source": "cross_market_signal_engine",
        })

    # From rule engine cross-market category
    for rule in [r for r in active_rules if r.get("category") == "cross_market"][:3]:
        confirmations.append({
            "signalId": rule.get("signalId", ""),
            "description": rule.get("explanation", ""),
            "action": f"{rule.get('recommendedPosture')} — {rule.get('affectedCommodities', [])}",
            "confidence": rule.get("confidence", 70),
            "direction": rule.get("direction", "neutral"),
            "source": "rule_engine",
        })

    # Add simple directional cross-market confirmations
    gold_up = price_dict.get("gold_direction") == "up"
    crude_up = price_dict.get("crude_direction") == "up"
    copper_up = price_dict.get("copper_direction") == "up"
    freight_up = price_dict.get("freight_direction") == "up"

    if gold_up and crude_up:
        confirmations.append({
            "signalId": "GOLD_CRUDE_CONFIRM",
            "description": "Gold and crude moving together — geopolitical supply risk confirmed by safe-haven demand.",
            "confidence": 88, "source": "deterministic_cross_market",
        })
    if not copper_up and not freight_up:
        confirmations.append({
            "signalId": "COPPER_BDI_WEAK",
            "description": "Copper and freight both soft — industrial demand weakness confirms bearish pressure on crude.",
            "confidence": 82, "source": "deterministic_cross_market",
        })

    return confirmations[:8]


def _build_source_transparency(prices_data: dict, geo_data: dict, news_data: dict, active_rules: list[dict]) -> list[dict]:
    """Build source transparency list for the analysis."""
    sources = []
    sources.append({
        "name": "Live Commodity Prices",
        "status": prices_data.get("status", "unknown"),
        "type": "market_data",
        "coverage": "WTI, Brent, Natural Gas, Diesel, Gold, Silver, Copper, Wheat, Uranium, Lithium, Freight, Carbon",
        "freshness": "Real-time / 15-min delayed",
    })
    sources.append({
        "name": "Geopolitical Risk Assessment",
        "status": geo_data.get("status", "unknown"),
        "type": "geo_intelligence",
        "coverage": "Global hotspot monitoring, chokepoint risk, sanctions tracking",
        "freshness": "Updated on news triggers",
    })
    sources.append({
        "name": "News / Intelligence Feed",
        "status": news_data.get("status", "unknown"),
        "type": "news_intelligence",
        "coverage": "Energy, commodities, geopolitics, macro",
        "freshness": "Continuous / hourly",
    })
    sources.append({
        "name": "Rule Engine (V1 — Deterministic)",
        "status": "active",
        "type": "analytical_engine",
        "coverage": f"{len(active_rules)} deterministic market rules active",
        "freshness": "Real-time (on analysis request)",
    })
    sources.append({
        "name": "Historical Analogue Database",
        "status": "active",
        "type": "rag_knowledge",
        "coverage": "10+ curated historical market events",
        "freshness": "Static knowledge base (expand with training data)",
    })
    sources.append({
        "name": "ML Prediction Engine (V2)",
        "status": "model_not_trained",
        "type": "ml_inference",
        "coverage": "Directional prediction, volatility, anomaly (placeholder)",
        "freshness": "N/A — no trained model",
        "note": "Phase 2: train XGBoost/LightGBM classifiers to activate",
    })
    return sources


def generate_structured_analysis(
    prices_data: dict,
    geo_data: dict,
    news_data: dict,
    base_analysis: dict,
) -> dict:
    """Generate the full structured AI analysis JSON.

    Args:
        prices_data: From price_adapter.
        geo_data: From georisk_adapter.
        news_data: From news_adapter.
        base_analysis: Output from existing analysis_engine.generate_analysis().

    Returns:
        Full structured analysis matching the V1 AI Analysis schema.
    """
    prices = prices_data.get("items", [])
    cross = prices_data.get("crossMarketSignals", [])
    geo_items = geo_data.get("items", [])
    news_items = news_data.get("items", [])

    pool = [*(prices or []), *(cross or [])]

    # Build price dict for engines
    price_dict = _build_price_dict(prices, cross, geo_items)
    geo_score = price_dict["geo_risk_score"]
    chokepoint_active = price_dict["chokepoint_active"]

    # Prices for display
    crude = _find_price(pool, "WTI", "CRUDE")
    brent = _find_price(pool, "BRENT")
    natgas = _find_price(pool, "NATGAS", "NATURAL GAS")

    wti_price = _safe_float(crude.get("price"), 72.0)
    brent_price = _safe_float(brent.get("price"), 76.0)

    # ── News classification ────────────────────────────────────────────────────
    news_texts = [item.get("headline") or item.get("title") or "" for item in news_items]
    news_classified = classify_batch(news_items)

    # ── Rule engine ────────────────────────────────────────────────────────────
    storage_data = prices_data.get("storage", {})
    active_rules = evaluate_rules(news_texts, price_dict, geo_items, storage_data)
    rule_posture, rule_confidence, market_bias = derive_posture_from_rules(active_rules)

    # ── Feature vector (model-ready) ──────────────────────────────────────────
    price_item_for_features = crude or pool[0] if pool else {}
    feature_vector = build_full_feature_vector(
        commodity_id="WTI",
        price_item=price_item_for_features,
        prices=prices,
        cross=cross,
        geo_items=geo_items,
        news_classified=news_classified,
        storage_data=storage_data,
    )

    # ── Direction prediction ───────────────────────────────────────────────────
    direction_pred = predict_direction(feature_vector, horizon="30D")
    feature_attribution = get_feature_attribution(feature_vector, direction_pred)

    # ── Stakeholder scoring ────────────────────────────────────────────────────
    stakeholder_impacts = score_all_stakeholders(price_dict, geo_score, chokepoint_active)

    # ── Consumer impact ────────────────────────────────────────────────────────
    consumer_impact = build_consumer_impact_summary(price_dict, chokepoint_active)

    # ── Inherit from base analysis ─────────────────────────────────────────────
    regime = base_analysis.get("regime", {})
    regime_name = regime.get("name", "Balanced Market")
    regime_description = regime.get("description", "Mixed signals across market indicators.")
    regime_posture_note = regime.get("posture_note", "MONITOR key levels.")
    regime_id = base_analysis.get("regime", {}).get("id", "balanced")

    compound_signals = base_analysis.get("compoundSignals", [])
    historical_raw = base_analysis.get("historicalAnalogue", {})
    scenarios = base_analysis.get("scenarios", [])
    watchlist_raw = base_analysis.get("watchlist", [])
    holder_guidance = base_analysis.get("holderGuidance", [])

    # ── Analogue ───────────────────────────────────────────────────────────────
    analogue = _build_historical_analogue_object(historical_raw)

    # ── Thesis ────────────────────────────────────────────────────────────────
    critical_geo = [g for g in geo_items if g.get("riskLevel") == "Critical"]
    thesis = _build_thesis_object(
        regime_name, regime_description,
        active_rules, compound_signals,
        news_classified,
        wti_price, brent_price,
        price_dict["crude_direction"],
        price_dict["gold_direction"],
        geo_score, critical_geo,
    )

    # ── Prediction ────────────────────────────────────────────────────────────
    crude_forecast = base_analysis.get("predictionInsight", {})
    scenario_probs = base_analysis.get("executiveBriefing", {}).get("scenarioProbs", {})
    prediction = {
        "horizon": "30D",
        "direction": crude_forecast.get("direction", direction_pred.get("predictedDirection", "flat")),
        "probabilityUp": direction_pred["probabilityUp"],
        "probabilityDown": direction_pred["probabilityDown"],
        "probabilitySideways": direction_pred["probabilitySideways"],
        "baseCase": round(crude_forecast.get("p50BaseForecast", wti_price), 2),
        "bullCase": round(crude_forecast.get("p90BullishForecast", wti_price * 1.08), 2),
        "bearCase": round(crude_forecast.get("p10BearishForecast", wti_price * 0.92), 2),
        "baseCaseProb": scenario_probs.get("base", 45),
        "bullCaseProb": scenario_probs.get("bullish", 30),
        "bearCaseProb": scenario_probs.get("bearish", 25),
        "volatilityRegime": crude_forecast.get("volatilityRegime", "Moderate"),
        "modelMode": "deterministic_fallback",
        "topDrivers": crude_forecast.get("keyDrivers", []),
        "confidence": direction_pred.get("confidence", 62),
    }

    # ── AI Posture ────────────────────────────────────────────────────────────
    # Use rule-derived posture if rules are active, else fall back to base analysis
    ai_posture = rule_posture
    conviction_score = rule_confidence

    # Map conviction score to label
    if conviction_score >= 80:
        conviction_label = "High"
    elif conviction_score >= 65:
        conviction_label = "Moderate"
    else:
        conviction_label = "Low"

    # Risk score: blend geo, news impact, and rule count
    risk_score = min(100, int(
        geo_score * 5
        + len(active_rules) * 4
        + news_classified.get("highImpactCount", 0) * 3
        + (10 if chokepoint_active else 0)
        + (5 if len(critical_geo) > 0 else 0)
    ))

    # ── Cross-market confirmations ────────────────────────────────────────────
    cross_market_confirmations = _build_cross_market_confirmations(
        compound_signals, active_rules, price_dict
    )

    # ── News drivers ──────────────────────────────────────────────────────────
    news_drivers = news_classified.get("topDriverHeadlines", [])[:6]

    # ── Business sector impact ────────────────────────────────────────────────
    sector_matrix = base_analysis.get("sectorMatrix", [])
    business_sector_impact = sector_matrix[:8] if sector_matrix else []

    # ── Watchlist ─────────────────────────────────────────────────────────────
    watchlist = [
        {
            "id": w.get("id", ""),
            "name": w.get("name", ""),
            "trigger": w.get("trigger", ""),
            "why": w.get("why", ""),
            "who": w.get("who", ""),
            "priority": "High" if any(k in w.get("id", "") for k in ["brent", "hormuz", "diesel"]) else "Moderate",
        }
        for w in watchlist_raw
    ]

    # ── Invalidation signals ──────────────────────────────────────────────────
    invalidation_signals = [
        rule.get("invalidationSignal", "")
        for rule in active_rules[:4]
        if rule.get("invalidationSignal")
    ]
    if not invalidation_signals:
        invalidation_signals = [
            "OPEC+ production increase removes supply floor",
            "China demand miss signals broader industrial slowdown",
            "Geo-risk de-escalation collapses risk premium",
            "Weather normalization reverses gas/heating demand spike",
        ]

    # ── Source transparency ────────────────────────────────────────────────────
    source_transparency = _build_source_transparency(prices_data, geo_data, news_data, active_rules)

    # ── Model metadata ────────────────────────────────────────────────────────
    model_meta = get_model_metadata("rules_rag_deterministic_fallback")

    # ── Confidence ────────────────────────────────────────────────────────────
    data_sources_live = sum([
        1 if prices_data.get("status") == "live" else 0,
        1 if geo_data.get("status") == "live" else 0,
        1 if news_data.get("status") == "live" else 0,
    ])
    confidence = min(92, max(50, 62 + data_sources_live * 6 + len(active_rules) * 2 + len(compound_signals) * 3))

    # ── Assemble full schema ───────────────────────────────────────────────────
    return {
        # Identity
        "commodity": "Global Energy Complex",
        "analysisMode": "rules_rag",
        "generatedAt": _now(),

        # Posture
        "aiPosture": ai_posture,
        "conviction": conviction_label,
        "convictionScore": conviction_score,
        "confidence": confidence,
        "riskScore": risk_score,

        # Regime
        "currentRegime": regime_name,
        "regimeDescription": regime_description,
        "regimePostureNote": regime_posture_note,
        "marketBias": market_bias,

        # Core thesis
        "thesis": thesis,

        # Prediction
        "prediction": prediction,

        # Historical analogue
        "historicalAnalogue": analogue,

        # Cross-market confirmations
        "crossMarketConfirmation": cross_market_confirmations,

        # News drivers (classified)
        "newsDrivers": news_drivers,
        "newsClassificationSummary": {
            "count": news_classified.get("count", 0),
            "sentimentScore": news_classified.get("sentimentScore", 0),
            "topEventType": news_classified.get("topEventType", ""),
            "dominantDirection": news_classified.get("dominantDirection", "neutral"),
            "highImpactCount": news_classified.get("highImpactCount", 0),
            "newsVolume": news_classified.get("newsVolume", "Low"),
        },

        # Stakeholder impact (from engine)
        "stakeholderImpact": stakeholder_impacts[:8],

        # Business sector impact
        "businessSectorImpact": business_sector_impact,

        # Consumer impact (full model)
        "consumerImpact": consumer_impact,

        # Watchlist
        "watchlist": watchlist,

        # Invalidation signals
        "invalidationSignals": invalidation_signals,

        # Source transparency
        "sourceTransparency": source_transparency,

        # Rule engine output
        "activeRules": active_rules[:6],
        "ruleCount": len(active_rules),

        # Feature attribution (model-ready)
        "featureAttribution": feature_attribution[:5],

        # Existing fields (backward compat)
        "themeChips": base_analysis.get("themeChips", []),
        "regime": base_analysis.get("regime", {}),
        "keyLevels": base_analysis.get("keyLevels", []),
        "compoundSignals": compound_signals,
        "holderGuidance": holder_guidance,
        "scenarios": scenarios,
        "pressureMix": base_analysis.get("pressureMix", []),
        "statisticalGrounding": base_analysis.get("statisticalGrounding", {}),
        "explainabilityNote": base_analysis.get("explainabilityNote", ""),
        "dataFreshness": base_analysis.get("dataFreshness", {}),
        "analystIdentity": "GEI-Analyst v2 — Rules + RAG",
        "modelMetadata": model_meta,
    }


def generate_executive_briefing(
    prices_data: dict,
    geo_data: dict,
    news_data: dict,
    base_analysis: dict,
) -> dict:
    """Generate the structured Executive AI Intelligence Briefing.

    Synthesizes all commodities and signals into a top-level analytical brief.
    """
    prices = prices_data.get("items", [])
    cross = prices_data.get("crossMarketSignals", [])
    geo_items = geo_data.get("items", [])
    news_items = news_data.get("items", [])
    pool = [*(prices or []), *(cross or [])]

    price_dict = _build_price_dict(prices, cross, geo_items)
    geo_score = price_dict["geo_risk_score"]
    critical_geo = [g for g in geo_items if g.get("riskLevel") == "Critical"]

    # Existing executive briefing data
    eb = base_analysis.get("executiveBriefing", {})
    scenario_probs = eb.get("scenarioProbs", {"base": 45, "bullish": 30, "bearish": 25})
    thesis = base_analysis.get("thesis", "")
    regime = base_analysis.get("regime", {})
    compound_signals = base_analysis.get("compoundSignals", [])
    historical_analogue = base_analysis.get("historicalAnalogue", {})
    stakeholder_impacts = base_analysis.get("stakeholderImpacts", [])
    consumer_impact_raw = base_analysis.get("consumerImpact", [])

    # Classify news
    news_classified = classify_batch(news_items)
    active_rules = evaluate_rules(
        [item.get("headline") or item.get("title") or "" for item in news_items],
        price_dict, geo_items, {}
    )

    # What changed in last 24h
    changes_24h = []
    crude_dir = price_dict["crude_direction"]
    if crude_dir != "flat":
        crude = _find_price(pool, "WTI", "CRUDE")
        changes_24h.append(f"WTI crude {crude_dir} ({_pct(crude):+.1f}%)")
    if price_dict["gold_direction"] == "up":
        gold = _find_price(pool, "GOLD")
        changes_24h.append(f"Gold safe-haven bid active ({_pct(gold):+.1f}%)")
    if critical_geo:
        changes_24h.append(f"{len(critical_geo)} critical geo event(s) escalated")
    if active_rules:
        changes_24h.append(f"Rule engine: {active_rules[0]['signalName']} triggered")
    if news_classified.get("highImpactCount", 0) >= 3:
        changes_24h.append(f"{news_classified['highImpactCount']} high-impact news events classified")

    # Top market risk
    top_risk_candidates = [r["signalName"] for r in active_rules[:2]] + \
                          [s.get("meaning", "") for s in compound_signals[:1]]
    top_market_risk = top_risk_candidates[0] if top_risk_candidates else "Balanced market — no dominant risk signal active"

    # Most affected commodities
    affected_commodities: list[str] = []
    for rule in active_rules[:5]:
        affected_commodities.extend(rule.get("affectedCommodities", []))
    # De-duplicate preserving order
    seen = set()
    unique_commodities = []
    for c in affected_commodities:
        if c not in seen:
            seen.add(c)
            unique_commodities.append(c)
    most_affected_commodities = unique_commodities[:6]

    # Most exposed stakeholders (from rule engine)
    exposed_stakeholders: list[str] = []
    for rule in active_rules[:4]:
        exposed_stakeholders.extend(rule.get("affectedStakeholders", []))
    seen_s = set()
    unique_stakeholders = []
    for s in exposed_stakeholders:
        if s not in seen_s:
            seen_s.add(s)
            unique_stakeholders.append(s)
    most_exposed_stakeholders = unique_stakeholders[:5]

    # Contradictions
    contradictions = []
    crude_dir = price_dict["crude_direction"]
    copper_dir = price_dict["copper_direction"]
    gold_dir = price_dict["gold_direction"]
    if gold_dir == "up" and crude_dir == "down":
        contradictions.append("Gold rising while crude declines — macro fear divergence from physical supply signal")
    if crude_dir == "up" and copper_dir == "down":
        contradictions.append("Crude rising but copper declining — geo-risk premium not confirmed by industrial demand")
    if not contradictions:
        contradictions.append("No major cross-market contradictions detected — signals are internally consistent")

    # Active compound signals summary
    active_compound = [{"id": s.get("id"), "meaning": s.get("meaning"), "action": s.get("action")} for s in compound_signals[:4]]

    # Consumer impact summary
    consumer_summary_items = [
        item.get("category", "") + ": " + item.get("explanation", "")[:80]
        for item in consumer_impact_raw[:3]
        if item.get("severity") in ("High", "Critical")
    ]
    consumer_summary = "; ".join(consumer_summary_items) if consumer_summary_items else "Consumer cost environment stable — no acute pass-through pressure."

    # Stakeholder posture
    stakeholder_posture_dict = {
        s.get("name", s.get("id", "")): {
            "severity": s.get("severity", "Moderate"),
            "posture": s.get("posture", "MONITOR"),
        }
        for s in stakeholder_impacts[:6]
    }

    # Watch next
    watchlist = base_analysis.get("watchlist", [])
    watch_next = [w.get("trigger", "") for w in watchlist[:4] if w.get("trigger")]

    # Thesis invalidation
    invalidation = active_rules[0].get("invalidationSignal", "OPEC+ production increase or significant China demand miss") if active_rules else \
                   "Geo-risk de-escalation or demand data surprise"

    # Confidence
    data_sources_live = sum([
        1 if prices_data.get("status") == "live" else 0,
        1 if geo_data.get("status") == "live" else 0,
        1 if news_data.get("status") == "live" else 0,
    ])
    confidence = min(90, max(52, 60 + data_sources_live * 7 + len(active_rules) * 2 + len(compound_signals) * 3))

    return {
        "globalEnergyRegime": regime.get("name", "Balanced Market"),
        "regimeDescription": regime.get("description", ""),
        "whatChanged24h": changes_24h if changes_24h else ["No significant market-moving events in the last 24 hours"],
        "topMarketRisk": top_market_risk,
        "mostAffectedCommodities": most_affected_commodities,
        "mostExposedStakeholders": most_exposed_stakeholders,

        "baseBullBearScenarios": {
            "base": {"probability": scenario_probs.get("base", 45), "label": "Balanced / Status Quo"},
            "bull": {"probability": scenario_probs.get("bullish", 30), "label": "Supply Tightening Accelerates"},
            "bear": {"probability": scenario_probs.get("bearish", 25), "label": "Demand Deterioration"},
        },

        "crossMarketConfirmations": [
            {"signal": s.get("id"), "meaning": s.get("meaning"), "action": s.get("action")}
            for s in compound_signals[:4]
        ],

        "contradictions": contradictions,

        "historicalAnalogue": {
            "eventName": historical_analogue.get("eventName", ""),
            "date": historical_analogue.get("date", ""),
            "lesson": historical_analogue.get("keyLesson", ""),
            "similarityReason": "Current geo-risk and commodity direction pattern matches this historical setup.",
            "keyDifferenceToday": "Different supply buffer, central bank posture, and demand context.",
        },

        "activeCompoundSignals": active_compound,
        "newsClassification": {
            "count": news_classified.get("count", 0),
            "sentimentScore": news_classified.get("sentimentScore", 0),
            "topEventType": news_classified.get("topEventType", ""),
            "dominantDirection": news_classified.get("dominantDirection", "neutral"),
            "highImpactCount": news_classified.get("highImpactCount", 0),
        },

        "stakeholderPosture": stakeholder_posture_dict,
        "consumerImpactSummary": consumer_summary,

        "watchNext": watch_next,
        "thesisInvalidation": invalidation,

        "confidence": confidence,
        "analysisMode": "rules_rag",
        "modelVersion": "GEI-Analyst-v1.0",
        "generatedAt": _now(),

        "sourceTransparency": [
            {"source": "Live commodity prices", "status": prices_data.get("status", "unknown")},
            {"source": "Geopolitical risk feed", "status": geo_data.get("status", "unknown")},
            {"source": "News intelligence", "status": news_data.get("status", "unknown")},
            {"source": "Rule engine (deterministic V1)", "status": "active", "rules": len(active_rules)},
        ],
    }
