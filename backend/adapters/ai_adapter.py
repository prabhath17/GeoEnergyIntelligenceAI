"""AI Analysis Adapter — Gemini → Groq → Claude → OpenAI → deterministic mock."""
import os
import re
import json
import time
import asyncio
import httpx
from datetime import datetime
from analysis_engine import generate_analysis as _gen_full_briefing

TIMEOUT = 30.0


def build_prompt(prices, headlines, geo_risk_items, cross_market_signals) -> str:
    def fmt_p(p):
        sign = "+" if (p.get("changePercent") or 0) >= 0 else ""
        return f"{p.get('name')}: {p.get('currency','$')}{(p.get('price') or 0):.2f} ({sign}{(p.get('changePercent') or 0):.1f}%)"

    def fmt_s(s):
        sign = "+" if (s.get("changePercent") or 0) >= 0 else ""
        return f"{s.get('name')}: {s.get('currency','')}{(s.get('price') or 0):.2f} ({sign}{(s.get('changePercent') or 0):.1f}%) — {s.get('signalType','')}"

    price_line = ", ".join(fmt_p(p) for p in (prices or []))
    hl_lines   = "\n".join(f"{i+1}. [{h.get('impact','')}] {h.get('headline') or h.get('title','')} ({h.get('source','')})" for i, h in enumerate((headlines or [])[:12]))
    risk_line  = "; ".join(f"{r.get('countryOrArea')}: {r.get('riskLevel')} {r.get('riskScore')} — {r.get('eventType')}" for r in (geo_risk_items or []))
    cross_line = ", ".join(fmt_s(s) for s in (cross_market_signals or []))
    now = datetime.utcnow().isoformat() + "Z"

    return f"""You are GEI-Analyst v2, an energy market intelligence AI.

You must reason using current market data, statistical benchmarks, cross-market relationships, geo-risk events, prediction ranges, historical analogues, sentiment/news context, and stakeholder impact.

Every analysis must include:
1. Thesis
2. Scenario probabilities
3. Price/prediction insight
4. Signal attribution
5. Stakeholder impact
6. Business impact
7. Consumer impact
8. Watchlist
9. Confidence/caveat
10. Invalidation trigger

Use probabilistic language such as Base case 45%, Bull case 35%, Bear case 20%, hedge if P90 crosses a threshold, and risk is elevated but not confirmed.
Avoid vague phrases unless followed by a specific mechanism and stakeholder consequence.
Use Fact -> Cause -> Implication: what happened, why it matters structurally, who is affected, and what action or monitoring posture follows.

Analyze this live market data and return a concise JSON intelligence report.

ENERGY PRICES: {price_line or 'unavailable'}
CROSS-MARKET SIGNALS: {cross_line or 'none'}
GEO-RISK: {risk_line or 'none active'}
LIVE HEADLINES ({len(headlines or [])} items):
{hl_lines or 'none available'}

COMMODITY IMPACT RULES:
- Crude Oil up → gasoline/diesel/jet fuel costs rise, inflation pressure, shipping costs up
- Natural Gas up → power prices rise, LNG costs up, industrial/heating costs rise
- Diesel up → freight/logistics costs up, farming costs up, broad inflation
- Gold rising → geopolitical fear elevated, safe-haven demand, watch energy risk premium
- Copper falling → industrial demand concerns, China slowdown risk, watch power/renewables capex
- Wheat rising → food inflation + Black Sea supply risk, broader cost-push inflation
- Uranium rising → nuclear power investment signal, long-term energy security play
- Lithium falling → EV oversupply signal, clean energy supply chain stress

Return ONLY valid JSON (no markdown, no explanation):
{{
  "marketPulse": {{
    "marketDirection": "Stable-Bullish",
    "globalRiskLevel": "Elevated",
    "mostAffectedSector": "Refined Products",
    "keyRegion": "Strait of Hormuz",
    "biggestEvent": "one key event from headlines",
    "systemStatus": "Nominal"
  }},
  "sectorScores": [
    {{"id":"crude-oil","sector":"Crude Oil","sentiment":"Bullish","confidence":84,"changeVsYesterday":"+1.4%","riskLevel":"High","reason":"One sentence from actual data.","watchItem":"key watch item","affectedRegions":["region1"],"topRiskFactors":["f1","f2","f3"],"sparklineData":[72,68,74,79,81,80,83,84]}},
    {{"id":"natural-gas","sector":"Natural Gas","sentiment":"Bearish","confidence":62,"changeVsYesterday":"-3.1%","riskLevel":"Moderate","reason":"One sentence.","watchItem":"key item","affectedRegions":[],"topRiskFactors":["f1","f2","f3"],"sparklineData":[70,66,64,61,63,60,62,62]}},
    {{"id":"refined-products","sector":"Refined Products","sentiment":"Volatile","confidence":78,"changeVsYesterday":"+0.2%","riskLevel":"High","reason":"One sentence.","watchItem":"key item","affectedRegions":[],"topRiskFactors":["f1","f2","f3"],"sparklineData":[60,65,70,74,72,76,77,78]}},
    {{"id":"power","sector":"Power","sentiment":"Steady","confidence":91,"changeVsYesterday":"+0.8%","riskLevel":"Low","reason":"One sentence.","watchItem":"key item","affectedRegions":[],"topRiskFactors":["f1","f2","f3"],"sparklineData":[88,89,90,91,90,91,91,91]}},
    {{"id":"renewables","sector":"Renewables","sentiment":"Expanding","confidence":95,"changeVsYesterday":"+2.4%","riskLevel":"Low","reason":"One sentence.","watchItem":"key item","affectedRegions":[],"topRiskFactors":["f1","f2","f3"],"sparklineData":[88,90,91,92,93,94,95,95]}}
  ],
  "executiveBriefing": {{
    "whatChanged":"Specific change from today's data in one sentence.",
    "whyItMatters":"Market impact: which sector, which price, what risk.",
    "activeSignal":"Active regime or compound signal.",
    "probableDirection":"up/down/flat with probability caveat.",
    "scenarioProbabilities":{{"base":45,"bullish":35,"bearish":20}},
    "predictionInsight":"P10/P50/P90-style forecast read; disclose if deterministic fallback.",
    "signalAttribution":["driver 1 with mechanism","driver 2 with mechanism"],
    "stakeholderImpact":"Who is affected and what posture follows.",
    "businessImpact":"Specific business cost/margin implication.",
    "consumerImpact":"Specific consumer pass-through lag and cost channel.",
    "historicalAnalogue":"Closest historical analogue and lesson.",
    "confidenceCaveat":"Confidence level plus caveat.",
    "invalidationTrigger":"Specific trigger that would invalidate thesis.",
    "whatToWatchNext":["specific watch item 1","specific watch item 2","specific watch item 3","specific watch item 4"],
    "strategyBrief":["actionable insight 1","actionable insight 2","actionable insight 3"]
  }},
  "crossMarketSignalSummary": {{
    "gold":"one sentence on what gold price means for energy markets today",
    "copper":"one sentence on copper demand signal",
    "wheat":"one sentence on wheat / food-energy link",
    "uranium":"one sentence on nuclear / energy security signal",
    "lithium":"one sentence on EV / clean energy supply chain signal",
    "overallCrossMarketRead":"one sentence combining all cross-market signals into an energy market view"
  }},
  "intelligenceFeed": [
    {{"id":"intel-1","impact":"High Impact","headline":"Real headline from the data.","source":"Source Name","time":"X mins ago","timestamp":"{now}","sector":"Crude Oil","category":"Policy","sentimentEffect":"Bullish","whyItMatters":"Why this matters for energy markets.","context":"Additional context.","relatedRegions":["region1"],"relatedSectors":["Crude Oil","Refined Products"]}}
  ]
}}

Generate sectorScores for ALL 5 sectors. Generate 4-6 intelligenceFeed items from actual headlines. Base ALL analysis on the actual data, not generic text."""


def _extract_json(text: str) -> dict:
    m = re.search(r'\{[\s\S]*\}', text)
    if not m:
        raise ValueError("no-json-block")
    return json.loads(m.group(0))


async def _try_claude(api_key: str, prices, headlines, geo_risk_items, cross_market_signals) -> dict:
    payload = {
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 3000,
        "messages": [{"role": "user", "content": build_prompt(prices, headlines, geo_risk_items, cross_market_signals)}],
    }
    async with httpx.AsyncClient() as client:
        r = await client.post("https://api.anthropic.com/v1/messages", json=payload, headers={
            "x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"
        }, timeout=TIMEOUT)
    if r.status_code != 200:
        raise ValueError(f"Claude {r.status_code}: {r.text}")
    text = r.json().get("content", [{}])[0].get("text", "")
    return _extract_json(text)


async def _try_gemini(api_key: str, prices, headlines, geo_risk_items, cross_market_signals) -> dict:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": build_prompt(prices, headlines, geo_risk_items, cross_market_signals)}]}],
        "generationConfig": {"responseMimeType": "application/json", "maxOutputTokens": 3000},
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(url, json=payload, timeout=TIMEOUT)
    if r.status_code != 200:
        raise ValueError(f"Gemini {r.status_code}: {r.text}")
    text = r.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
    return _extract_json(text)


async def _try_groq(api_key: str, prices, headlines, geo_risk_items, cross_market_signals) -> dict:
    payload = {
        "model": "llama3-8b-8192",
        "max_tokens": 3000,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": "You are an energy market intelligence analyst. Return only valid JSON."},
            {"role": "user", "content": build_prompt(prices, headlines, geo_risk_items, cross_market_signals)},
        ],
    }
    async with httpx.AsyncClient() as client:
        r = await client.post("https://api.groq.com/openai/v1/chat/completions", json=payload,
                              headers={"Authorization": f"Bearer {api_key}"}, timeout=TIMEOUT)
    if r.status_code != 200:
        raise ValueError(f"Groq {r.status_code}: {r.text}")
    return json.loads(r.json()["choices"][0]["message"]["content"])


async def _try_openai(api_key: str, prices, headlines, geo_risk_items, cross_market_signals) -> dict:
    payload = {
        "model": "gpt-4o-mini",
        "max_tokens": 3000,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": "You are an energy market intelligence analyst. Return only valid JSON."},
            {"role": "user", "content": build_prompt(prices, headlines, geo_risk_items, cross_market_signals)},
        ],
    }
    async with httpx.AsyncClient() as client:
        r = await client.post("https://api.openai.com/v1/chat/completions", json=payload,
                              headers={"Authorization": f"Bearer {api_key}"}, timeout=TIMEOUT)
    if r.status_code != 200:
        raise ValueError(f"OpenAI {r.status_code}: {r.text}")
    return json.loads(r.json()["choices"][0]["message"]["content"])


def _deterministic_analysis(prices, headlines, geo_risk_items, cross_market_signals) -> dict:
    pm = {p["id"]: p for p in (prices or [])}
    wti_up    = pm.get("WTI",    {}).get("direction") == "up"
    gas_down  = pm.get("NATGAS", {}).get("direction") == "down"
    has_critical = any(r.get("riskLevel") == "Critical" for r in (geo_risk_items or []))

    def sector_hits(name):
        return sum(1 for h in (headlines or []) if h.get("sector") == name or name in (h.get("relatedSectors") or []))

    def change(id_):
        return float((pm.get(id_) or {}).get("changePercent") or 0)

    def confidence(base, id_, hits):
        return max(45, min(98, round(base + abs(change(id_)) * 4 + hits * 3)))

    def risk_for(sector):
        return next((r for r in (geo_risk_items or []) if sector in (r.get("affectedSectors") or [])), None)

    def risk_level_for(sector):
        r = risk_for(sector)
        return r.get("riskLevel", "Low") if r else "Low"

    def factors_for(sector):
        risk = risk_for(sector)
        related = [(h.get("headline") or h.get("title", "")) for h in (headlines or []) if h.get("sector") == sector or sector in (h.get("relatedSectors") or [])][:2]
        factors = ([risk.get("eventType")] if risk else []) + related
        factors = [f for f in factors if f]
        return factors[:3] or ["Live price movement", "Headline density", "Cross-sector risk"]

    gold_up    = next((s for s in (cross_market_signals or []) if s.get("id") == "GOLD"), {}).get("direction") == "up"
    copper_down = next((s for s in (cross_market_signals or []) if s.get("id") == "COPPER"), {}).get("direction") == "down"

    cross_summary = {
        "gold":     "Gold rising signals elevated geopolitical risk, supporting crude risk premium." if gold_up else "Gold steady — no immediate safe-haven demand spike.",
        "copper":   "Copper weakness flags global industrial demand concerns and potential China slowdown." if copper_down else "Copper stable — industrial demand not signaling major stress.",
        "wheat":    "Wheat tracking Black Sea geopolitical developments. Watch food-energy inflation linkage.",
        "uranium":  "Uranium strength signals continued nuclear power investment and energy security re-rating.",
        "lithium":  "Lithium tracking EV battery demand and clean energy storage supply chain conditions.",
        "overallCrossMarketRead": "Cross-market signals lean risk-elevated: rising gold and soft copper point to geopolitical stress outweighing demand recovery." if gold_up else "Cross-market signals are mixed: stable gold and copper suggest contained risk for now.",
    }

    def regions_for(sector):
        return [r.get("region") for r in (geo_risk_items or []) if sector in (r.get("affectedSectors") or []) and r.get("region")]

    def sparkline(base_conf, id_, hits, base_vals):
        c = confidence(base_conf, id_, hits)
        return base_vals + [c]

    wti_conf  = confidence(70, "WTI",    sector_hits("Crude Oil"))
    gas_conf  = confidence(62, "NATGAS", sector_hits("Natural Gas"))
    rp_conf   = confidence(64, "DIESEL", sector_hits("Refined Products"))
    pow_conf  = max(55, min(92, 60 + sector_hits("Power") * 5))
    ren_conf  = max(55, min(95, 62 + sector_hits("Renewables") * 6))

    return {
        "crossMarketSignalSummary": cross_summary,
        "marketPulse": {
            "marketDirection": "Stable-Bullish" if wti_up else "Stable",
            "globalRiskLevel": "Elevated" if has_critical else "Moderate",
            "mostAffectedSector": max(["Crude Oil","Natural Gas","Refined Products","Power","Renewables"], key=sector_hits),
            "keyRegion": (geo_risk_items or [{"countryOrArea": "Strait of Hormuz"}])[0].get("countryOrArea", "Strait of Hormuz"),
            "biggestEvent": (headlines or [{"headline": "OPEC+ Meeting"}])[0].get("headline") or "OPEC+ Meeting",
            "systemStatus": "Nominal",
        },
        "sectorScores": [
            {"id":"crude-oil","sector":"Crude Oil","sentiment":"Bullish" if wti_up else ("Bearish" if change("WTI")<0 else "Neutral"),"confidence":wti_conf,"changeVsYesterday":f"{'+'if change('WTI')>=0 else ''}{change('WTI'):.1f}%","riskLevel":risk_level_for("Crude Oil"),"reason":"Live crude score blends WTI/Brent moves with current oil-linked headlines and active chokepoint risk.","watchItem":(risk_for("Crude Oil") or {}).get("countryOrArea","WTI / Brent spread"),"affectedRegions":regions_for("Crude Oil"),"topRiskFactors":factors_for("Crude Oil"),"sparklineData":[64,66,68,70,72,74,76,wti_conf]},
            {"id":"natural-gas","sector":"Natural Gas","sentiment":"Bearish" if gas_down else ("Bullish" if change("NATGAS")>0 else "Neutral"),"confidence":gas_conf,"changeVsYesterday":f"{'+'if change('NATGAS')>=0 else ''}{change('NATGAS'):.1f}%","riskLevel":risk_level_for("Natural Gas"),"reason":"Live gas score follows NYMEX gas movement plus LNG, pipeline, storage, and power-burn signals in the headline stream.","watchItem":(risk_for("Natural Gas") or {}).get("countryOrArea","LNG / storage updates"),"affectedRegions":regions_for("Natural Gas"),"topRiskFactors":factors_for("Natural Gas"),"sparklineData":[58,60,61,63,64,66,67,gas_conf]},
            {"id":"refined-products","sector":"Refined Products","sentiment":"Bullish" if (change("DIESEL")>0 or change("GASOLINE")>0) else "Volatile","confidence":rp_conf,"changeVsYesterday":f"{'+'if change('DIESEL')>=0 else ''}{change('DIESEL'):.1f}%","riskLevel":risk_level_for("Refined Products"),"reason":"Live refined-products score blends diesel and gasoline futures with refinery, shipping, and crude feedstock risk.","watchItem":(risk_for("Refined Products") or {}).get("countryOrArea","Diesel crack spread"),"affectedRegions":regions_for("Refined Products"),"topRiskFactors":factors_for("Refined Products"),"sparklineData":[60,61,63,65,67,69,70,rp_conf]},
            {"id":"power","sector":"Power","sentiment":"Steady" if sector_hits("Power") else "Neutral","confidence":pow_conf,"changeVsYesterday":f"+{sector_hits('Power')/10:.1f}%","riskLevel":risk_level_for("Power"),"reason":"Live power score is derived from current grid, nuclear, weather, gas, and policy headlines plus regional transit risks.","watchItem":(risk_for("Power") or {}).get("countryOrArea","Grid and nuclear updates"),"affectedRegions":regions_for("Power"),"topRiskFactors":factors_for("Power"),"sparklineData":[58,59,60,60,61,62,63,pow_conf]},
            {"id":"renewables","sector":"Renewables","sentiment":"Expanding" if sector_hits("Renewables") else "Steady","confidence":ren_conf,"changeVsYesterday":f"+{sector_hits('Renewables')/8:.1f}%","riskLevel":risk_level_for("Renewables"),"reason":"Live renewables score uses current solar, wind, grid congestion, storage, and policy signals in the headline stream.","watchItem":"Grid congestion / storage updates","affectedRegions":["Europe","North America"],"topRiskFactors":factors_for("Renewables"),"sparklineData":[60,61,62,64,65,66,68,ren_conf]},
        ],
        "executiveBriefing": {
            "whatChanged": "Overnight shift in OPEC+ production rhetoric signals a pivot toward defending market share over price floors.",
            "whyItMatters": "Short-term liquidity in Brent futures is increasing. Expect a breakdown in the $80–82 range.",
            "whatToWatchNext": ["Strait of Hormuz tanker activity", "European gas storage levels", "Gulf Coast refinery yields", "EU power market volatility"],
            "strategyBrief": ["Monitor North American pipeline operator exposure", "Maintain neutral stance on EU Power spot markets", "Track long-dated uranium calls"],
        },
        "intelligenceFeed": [
            {
                "id": h.get("id") or f"intel-{i}-{int(time.time()*1000)}",
                "impact": h.get("impact", "Medium Impact"),
                "headline": h.get("headline") or h.get("title", ""),
                "source": h.get("source", "GEI Intelligence"),
                "time": h.get("time", "Recently"),
                "timestamp": h.get("timestamp") or datetime.utcnow().isoformat() + "Z",
                "sector": h.get("sector", "Crude Oil"),
                "category": h.get("category", "Market Move"),
                "sentimentEffect": h.get("sentimentEffect", "Neutral"),
                "whyItMatters": h.get("whyItMatters") or h.get("context", ""),
                "context": h.get("context", ""),
                "marketReadThrough": h.get("marketReadThrough", ""),
                "relatedRegions": h.get("relatedRegions", []),
                "relatedSectors": h.get("relatedSectors", []),
            }
            for i, h in enumerate((headlines or [])[:6])
        ],
    }


async def analyze(payload: dict) -> dict:
    t0 = time.time()
    prices             = payload.get("prices") or []
    headlines          = payload.get("headlines") or []
    geo_risk_items     = payload.get("geoRiskItems") or []
    cross_market_signals = payload.get("crossMarketSignals") or []

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    gemini_key    = os.environ.get("GEMINI_API_KEY", "")
    groq_key      = os.environ.get("GROQ_API_KEY", "")
    openai_key    = os.environ.get("OPENAI_API_KEY", "")

    if anthropic_key:
        try:
            r = await _try_claude(anthropic_key, prices, headlines, geo_risk_items, cross_market_signals)
            print("[AI] Source: Claude")
            _at = datetime.utcnow().isoformat() + "Z"
            return {"status": "live_generated", "source": "Claude", "generatedAt": _at, "latencyMs": int((time.time()-t0)*1000), "lastSync": _at, **r}
        except Exception as e:
            print(f"[AI] Claude failed: {e}")

    if gemini_key:
        try:
            r = await _try_gemini(gemini_key, prices, headlines, geo_risk_items, cross_market_signals)
            print("[AI] Source: Gemini")
            _at = datetime.utcnow().isoformat() + "Z"
            return {"status": "live_generated", "source": "Gemini 1.5 Flash", "generatedAt": _at, "latencyMs": int((time.time()-t0)*1000), "lastSync": _at, **r}
        except Exception as e:
            print(f"[AI] Gemini failed: {e}")

    if groq_key:
        try:
            r = await _try_groq(groq_key, prices, headlines, geo_risk_items, cross_market_signals)
            print("[AI] Source: Groq (Llama 3)")
            _at = datetime.utcnow().isoformat() + "Z"
            return {"status": "live_generated", "source": "Groq / Llama 3", "generatedAt": _at, "latencyMs": int((time.time()-t0)*1000), "lastSync": _at, **r}
        except Exception as e:
            print(f"[AI] Groq failed: {e}")

    if openai_key:
        try:
            r = await _try_openai(openai_key, prices, headlines, geo_risk_items, cross_market_signals)
            print("[AI] Source: OpenAI")
            _at = datetime.utcnow().isoformat() + "Z"
            return {"status": "live_generated", "source": "OpenAI", "generatedAt": _at, "latencyMs": int((time.time()-t0)*1000), "lastSync": _at, **r}
        except Exception as e:
            print(f"[AI] OpenAI failed: {e}")

    r = _deterministic_analysis(prices, headlines, geo_risk_items, cross_market_signals)
    has_live = (
        any(not re.search(r"mock", p.get("source",""), re.I) for p in prices) or
        any(not re.search(r"mock|internal", h.get("source",""), re.I) for h in headlines) or
        any(not re.search(r"mock|internal", g.get("source",""), re.I) for g in geo_risk_items)
    )
    # Merge full 9-section briefing fields so BriefingModal renders without cached fallback
    try:
        prices_data = {"items": prices, "crossMarketSignals": cross_market_signals, "status": "live" if prices else "mock"}
        geo_data    = {"items": geo_risk_items, "status": "live" if geo_risk_items else "mock"}
        news_data   = {"items": headlines, "status": "live" if headlines else "mock"}
        briefing_fields = _gen_full_briefing(prices_data, geo_data, news_data)
        r.update(briefing_fields)
        print("[AI] Full briefing fields merged from analysis_engine")
    except Exception as _be:
        print(f"[AI] briefing fields merge failed (non-fatal): {_be}")
    generated_at = datetime.utcnow().isoformat() + "Z"
    return {
        "status": "deterministic_generated",
        "source": "Live-derived deterministic analysis" if has_live else "Deterministic analysis",
        "generatedAt": generated_at,
        "dataFreshness": {
            "prices":  "live" if prices else "mock",
            "geoRisk": "live" if geo_risk_items else "mock",
            "news":    "live" if headlines else "mock",
        },
        "latencyMs": int((time.time()-t0)*1000),
        "lastSync": generated_at,
        **r,
    }
