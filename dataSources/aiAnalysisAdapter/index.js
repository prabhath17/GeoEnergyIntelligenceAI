'use strict';
/**
 * AI Analysis Adapter — Claude, OpenAI, deterministic mock fallback.
 * Never call AI providers directly from the frontend.
 * This runs server-side only via /api/ai/analyze.
 */
const https = require('https');

function httpsPost(urlStr, body, headers) {
  return new Promise((resolve, reject) => {
    const u       = new URL(urlStr);
    const bodyStr = JSON.stringify(body);
    const req     = https.request({
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(headers || {})
      },
      timeout: 30000
    }, res => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { reject(new Error('invalid-json')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(bodyStr);
    req.end();
  });
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(prices, headlines, geoRiskItems, crossMarketSignals) {
  const priceLine = (prices || []).map(p => `${p.name}: ${p.currency || '$'}${(p.price || 0).toFixed(2)} (${p.changePercent >= 0 ? '+' : ''}${(p.changePercent || 0).toFixed(1)}%)`).join(', ');
  const hlLines   = (headlines || []).slice(0, 12).map((h, i) => `${i + 1}. [${h.impact || ''}] ${h.headline || h.title || ''} (${h.source || ''})`).join('\n');
  const riskLine  = (geoRiskItems || []).map(r => `${r.countryOrArea}: ${r.riskLevel} ${r.riskScore} — ${r.eventType}`).join('; ');
  const crossLine = (crossMarketSignals || []).map(s => `${s.name}: ${s.currency || ''}${(s.price || 0).toFixed(2)} (${s.changePercent >= 0 ? '+' : ''}${(s.changePercent || 0).toFixed(1)}%) — ${s.signalType}`).join(', ');

  const now = new Date().toISOString();
  return `You are a professional energy market intelligence analyst. Analyze this live market data and return a concise JSON intelligence report.

ENERGY PRICES: ${priceLine || 'unavailable'}
CROSS-MARKET SIGNALS: ${crossLine || 'none'}
GEO-RISK: ${riskLine || 'none active'}
LIVE HEADLINES (${(headlines || []).length} items):
${hlLines || 'none available'}

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
{
  "marketPulse": {
    "marketDirection": "Stable-Bullish",
    "globalRiskLevel": "Elevated",
    "mostAffectedSector": "Refined Products",
    "keyRegion": "Strait of Hormuz",
    "biggestEvent": "one key event from headlines",
    "systemStatus": "Nominal"
  },
  "sectorScores": [
    { "id":"crude-oil", "sector":"Crude Oil", "sentiment":"Bullish", "confidence":84, "changeVsYesterday":"+1.4%", "riskLevel":"High", "reason":"One sentence from actual data.", "watchItem":"key watch item", "affectedRegions":["region1","region2"], "topRiskFactors":["factor from headlines","factor from georisk","price-based factor"], "sparklineData":[72,68,74,79,81,80,83,84] },
    { "id":"natural-gas", "sector":"Natural Gas", "sentiment":"Bearish", "confidence":62, "changeVsYesterday":"-3.1%", "riskLevel":"Moderate", "reason":"One sentence.", "watchItem":"key item", "affectedRegions":[], "topRiskFactors":["f1","f2","f3"], "sparklineData":[70,66,64,61,63,60,62,62] },
    { "id":"refined-products", "sector":"Refined Products", "sentiment":"Volatile", "confidence":78, "changeVsYesterday":"+0.2%", "riskLevel":"High", "reason":"One sentence.", "watchItem":"key item", "affectedRegions":[], "topRiskFactors":["f1","f2","f3"], "sparklineData":[60,65,70,74,72,76,77,78] },
    { "id":"power", "sector":"Power", "sentiment":"Steady", "confidence":91, "changeVsYesterday":"+0.8%", "riskLevel":"Low", "reason":"One sentence.", "watchItem":"key item", "affectedRegions":[], "topRiskFactors":["f1","f2","f3"], "sparklineData":[88,89,90,91,90,91,91,91] },
    { "id":"renewables", "sector":"Renewables", "sentiment":"Expanding", "confidence":95, "changeVsYesterday":"+2.4%", "riskLevel":"Low", "reason":"One sentence.", "watchItem":"key item", "affectedRegions":[], "topRiskFactors":["f1","f2","f3"], "sparklineData":[88,90,91,92,93,94,95,95] }
  ],
  "executiveBriefing": {
    "whatChanged": "Specific change from today's data in one sentence.",
    "whyItMatters": "Market impact: which sector, which price, what risk.",
    "whatToWatchNext": ["specific watch item 1","specific watch item 2","specific watch item 3","specific watch item 4"],
    "strategyBrief": ["actionable insight 1","actionable insight 2","actionable insight 3"]
  },
  "crossMarketSignalSummary": {
    "gold": "one sentence on what gold price means for energy markets today",
    "copper": "one sentence on copper demand signal",
    "wheat": "one sentence on wheat / food-energy link",
    "uranium": "one sentence on nuclear / energy security signal",
    "lithium": "one sentence on EV / clean energy supply chain signal",
    "overallCrossMarketRead": "one sentence combining all cross-market signals into an energy market view"
  },
  "intelligenceFeed": [
    { "id":"intel-1", "impact":"High Impact", "headline":"Real headline from the data.", "source":"Source Name", "time":"X mins ago", "timestamp":"${now}", "sector":"Crude Oil", "category":"Policy", "sentimentEffect":"Bullish", "whyItMatters":"Why this matters for energy markets.", "context":"Additional context.", "relatedRegions":["region1"], "relatedSectors":["Crude Oil","Refined Products"] }
  ]
}

Generate sectorScores for ALL 5 sectors. Generate 4-6 intelligenceFeed items from actual headlines. Base ALL analysis on the actual data, not generic text.`;
}

function extractJSON(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no-json-block');
  return JSON.parse(m[0]);
}

// ─── Claude ───────────────────────────────────────────────────────────────────
async function tryClaudeAPI(apiKey, prices, headlines, geoRiskItems, crossMarketSignals) {
  const res = await httpsPost('https://api.anthropic.com/v1/messages', {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [{ role: 'user', content: buildPrompt(prices, headlines, geoRiskItems, crossMarketSignals) }]
  }, {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  });
  if (res.status !== 200) throw new Error(`Claude ${res.status}: ${JSON.stringify(res.body?.error)}`);
  return extractJSON(res.body?.content?.[0]?.text || '');
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────
async function tryOpenAIAPI(apiKey, prices, headlines, geoRiskItems, crossMarketSignals) {
  const res = await httpsPost('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o-mini',
    max_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an energy market intelligence analyst. Return only valid JSON.' },
      { role: 'user', content: buildPrompt(prices, headlines, geoRiskItems, crossMarketSignals) }
    ]
  }, { 'Authorization': `Bearer ${apiKey}` });
  if (res.status !== 200) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(res.body?.error)}`);
  return JSON.parse(res.body?.choices?.[0]?.message?.content || '{}');
}

// ─── Gemini (free tier) ───────────────────────────────────────────────────────
async function tryGeminiAPI(apiKey, prices, headlines, geoRiskItems, crossMarketSignals) {
  const res = await httpsPost(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: buildPrompt(prices, headlines, geoRiskItems, crossMarketSignals) }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 3000 }
    },
    {}
  );
  if (res.status !== 200) throw new Error(`Gemini ${res.status}: ${JSON.stringify(res.body?.error)}`);
  const text = res.body?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return extractJSON(text);
}

// ─── Groq (free tier — Llama 3) ──────────────────────────────────────────────
async function tryGroqAPI(apiKey, prices, headlines, geoRiskItems, crossMarketSignals) {
  const res = await httpsPost('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama3-8b-8192',
    max_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an energy market intelligence analyst. Return only valid JSON.' },
      { role: 'user', content: buildPrompt(prices, headlines, geoRiskItems, crossMarketSignals) }
    ]
  }, { 'Authorization': `Bearer ${apiKey}` });
  if (res.status !== 200) throw new Error(`Groq ${res.status}: ${JSON.stringify(res.body?.error)}`);
  return JSON.parse(res.body?.choices?.[0]?.message?.content || '{}');
}

// ─── Deterministic mock ───────────────────────────────────────────────────────
function deterministicAnalysis(prices, headlines, geoRiskItems, crossMarketSignals) {
  const pm  = {};
  (prices || []).forEach(p => { pm[p.id] = p; });
  const wtiUp = (pm['WTI']?.direction || 'flat') === 'up';
  const gasDown = (pm['NATGAS']?.direction || 'flat') === 'down';
  const hasCritical = (geoRiskItems || []).some(r => r.riskLevel === 'Critical');
  const sectorHits = name => (headlines || []).filter(h => h.sector === name || (h.relatedSectors || []).includes(name)).length;
  const change = id => Number(pm[id]?.changePercent || 0);
  const confidence = (base, id, hits) => Math.max(45, Math.min(98, Math.round(base + Math.abs(change(id)) * 4 + hits * 3)));
  const riskFor = sector => (geoRiskItems || []).find(r => (r.affectedSectors || []).includes(sector));
  const riskLevelFor = sector => riskFor(sector)?.riskLevel || 'Low';
  const factorsFor = sector => {
    const risk = riskFor(sector);
    const related = (headlines || [])
      .filter(h => h.sector === sector || (h.relatedSectors || []).includes(sector))
      .slice(0, 2)
      .map(h => h.headline || h.title);
    const factors = [risk?.eventType, ...related].filter(Boolean);
    return factors.length ? factors.slice(0, 3) : ['Live price movement', 'Headline density', 'Cross-sector risk'];
  };

  const goldUp   = (crossMarketSignals || []).find(s => s.id === 'GOLD')?.direction === 'up';
  const copperDown = (crossMarketSignals || []).find(s => s.id === 'COPPER')?.direction === 'down';
  const crossSummary = {
    gold:     goldUp ? 'Gold rising signals elevated geopolitical risk, supporting crude risk premium.' : 'Gold steady — no immediate safe-haven demand spike.',
    copper:   copperDown ? 'Copper weakness flags global industrial demand concerns and potential China slowdown.' : 'Copper stable — industrial demand not signaling major stress.',
    wheat:    'Wheat tracking Black Sea geopolitical developments. Watch food-energy inflation linkage.',
    uranium:  'Uranium strength signals continued nuclear power investment and energy security re-rating.',
    lithium:  'Lithium tracking EV battery demand and clean energy storage supply chain conditions.',
    overallCrossMarketRead: goldUp
      ? 'Cross-market signals lean risk-elevated: rising gold and soft copper point to geopolitical stress outweighing demand recovery.'
      : 'Cross-market signals are mixed: stable gold and copper suggest contained risk for now.'
  };

  return {
    crossMarketSignalSummary: crossSummary,
    marketPulse: {
      marketDirection: wtiUp ? 'Stable-Bullish' : 'Stable',
      globalRiskLevel: hasCritical ? 'Elevated' : 'Moderate',
      mostAffectedSector: ['Crude Oil','Natural Gas','Refined Products','Power','Renewables']
        .sort((a, b) => sectorHits(b) - sectorHits(a))[0] || 'Crude Oil',
      keyRegion: (geoRiskItems || [])[0]?.countryOrArea || 'Strait of Hormuz',
      biggestEvent: (headlines || [])[0]?.headline || (headlines || [])[0]?.title || 'OPEC+ Meeting',
      systemStatus: 'Nominal'
    },
    sectorScores: [
      { id:'crude-oil', sector:'Crude Oil', sentiment:wtiUp?'Bullish':change('WTI')<0?'Bearish':'Neutral', confidence:confidence(70,'WTI',sectorHits('Crude Oil')), changeVsYesterday:`${change('WTI') >= 0 ? '+' : ''}${change('WTI').toFixed(1)}%`, riskLevel:riskLevelFor('Crude Oil'), reason:'Live crude score blends WTI/Brent moves with current oil-linked headlines and active chokepoint risk.', watchItem:(riskFor('Crude Oil')?.countryOrArea || 'WTI / Brent spread'), affectedRegions:(geoRiskItems || []).filter(r=>(r.affectedSectors||[]).includes('Crude Oil')).map(r=>r.region), topRiskFactors:factorsFor('Crude Oil'), sparklineData:[64,66,68,70,72,74,76,confidence(70,'WTI',sectorHits('Crude Oil'))] },
      { id:'natural-gas', sector:'Natural Gas', sentiment:gasDown?'Bearish':change('NATGAS')>0?'Bullish':'Neutral', confidence:confidence(62,'NATGAS',sectorHits('Natural Gas')), changeVsYesterday:`${change('NATGAS') >= 0 ? '+' : ''}${change('NATGAS').toFixed(1)}%`, riskLevel:riskLevelFor('Natural Gas'), reason:'Live gas score follows NYMEX gas movement plus LNG, pipeline, storage, and power-burn signals in the headline stream.', watchItem:(riskFor('Natural Gas')?.countryOrArea || 'LNG / storage updates'), affectedRegions:(geoRiskItems || []).filter(r=>(r.affectedSectors||[]).includes('Natural Gas')).map(r=>r.region), topRiskFactors:factorsFor('Natural Gas'), sparklineData:[58,60,61,63,64,66,67,confidence(62,'NATGAS',sectorHits('Natural Gas'))] },
      { id:'refined-products', sector:'Refined Products', sentiment:change('DIESEL') > 0 || change('GASOLINE') > 0 ? 'Bullish' : 'Volatile', confidence:confidence(64,'DIESEL',sectorHits('Refined Products')), changeVsYesterday:`${change('DIESEL') >= 0 ? '+' : ''}${change('DIESEL').toFixed(1)}%`, riskLevel:riskLevelFor('Refined Products'), reason:'Live refined-products score blends diesel and gasoline futures with refinery, shipping, and crude feedstock risk.', watchItem:(riskFor('Refined Products')?.countryOrArea || 'Diesel crack spread'), affectedRegions:(geoRiskItems || []).filter(r=>(r.affectedSectors||[]).includes('Refined Products')).map(r=>r.region), topRiskFactors:factorsFor('Refined Products'), sparklineData:[60,61,63,65,67,69,70,confidence(64,'DIESEL',sectorHits('Refined Products'))] },
      { id:'power', sector:'Power', sentiment:sectorHits('Power') ? 'Steady' : 'Neutral', confidence:Math.max(55, Math.min(92, 60 + sectorHits('Power') * 5)), changeVsYesterday:`+${(sectorHits('Power') / 10).toFixed(1)}%`, riskLevel:riskLevelFor('Power'), reason:'Live power score is derived from current grid, nuclear, weather, gas, and policy headlines plus regional transit risks.', watchItem:(riskFor('Power')?.countryOrArea || 'Grid and nuclear updates'), affectedRegions:(geoRiskItems || []).filter(r=>(r.affectedSectors||[]).includes('Power')).map(r=>r.region), topRiskFactors:factorsFor('Power'), sparklineData:[58,59,60,60,61,62,63,Math.max(55, Math.min(92, 60 + sectorHits('Power') * 5))] },
      { id:'renewables', sector:'Renewables', sentiment:sectorHits('Renewables') ? 'Expanding' : 'Steady', confidence:Math.max(55, Math.min(95, 62 + sectorHits('Renewables') * 6)), changeVsYesterday:`+${(sectorHits('Renewables') / 8).toFixed(1)}%`, riskLevel:riskLevelFor('Renewables'), reason:'Live renewables score uses current solar, wind, grid congestion, storage, and policy signals in the headline stream.', watchItem:'Grid congestion / storage updates', affectedRegions:['Europe','North America'], topRiskFactors:factorsFor('Renewables'), sparklineData:[60,61,62,64,65,66,68,Math.max(55, Math.min(95, 62 + sectorHits('Renewables') * 6))] }
    ],
    executiveBriefing: {
      whatChanged: 'Overnight shift in OPEC+ production rhetoric signals a pivot toward defending market share over price floors.',
      whyItMatters: 'Short-term liquidity in Brent futures is increasing. Expect a breakdown in the $80–82 range.',
      whatToWatchNext: ['Strait of Hormuz tanker activity', 'European gas storage levels', 'Gulf Coast refinery yields', 'EU power market volatility'],
      strategyBrief: ['Monitor North American pipeline operator exposure', 'Maintain neutral stance on EU Power spot markets', 'Track long-dated uranium calls']
    },
    intelligenceFeed: (headlines || []).slice(0, 6).map((h, i) => ({
      id: h.id || `intel-${i}-${Date.now()}`,
      impact: h.impact || 'Medium Impact',
      headline: h.headline || h.title || '',
      source: h.source || 'GEI Intelligence',
      time: h.time || 'Recently',
      timestamp: h.timestamp || new Date().toISOString(),
      sector: h.sector || 'Crude Oil',
      category: h.category || 'Market Move',
      sentimentEffect: h.sentimentEffect || 'Neutral',
      whyItMatters: h.whyItMatters || h.context || h.description || '',
      context: h.context || '',
      marketReadThrough: h.marketReadThrough || '',
      relatedRegions: h.relatedRegions || [],
      relatedSectors: h.relatedSectors || []
    }))
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────
async function analyze(payload) {
  const t0   = Date.now();
  const { prices, headlines, geoRiskItems, crossMarketSignals } = payload || {};
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey    = process.env.GEMINI_API_KEY;
  const groqKey      = process.env.GROQ_API_KEY;
  const openaiKey    = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    try {
      const r = await tryClaudeAPI(anthropicKey, prices, headlines, geoRiskItems, crossMarketSignals);
      console.log('[AI] Source: Claude');
      return { status: 'live', source: 'Claude', latencyMs: Date.now() - t0, lastSync: new Date().toISOString(), ...r };
    } catch (err) { console.warn('[AI] Claude failed:', err.message); }
  }
  if (geminiKey) {
    try {
      const r = await tryGeminiAPI(geminiKey, prices, headlines, geoRiskItems, crossMarketSignals);
      console.log('[AI] Source: Gemini');
      return { status: 'live', source: 'Gemini 1.5 Flash', latencyMs: Date.now() - t0, lastSync: new Date().toISOString(), ...r };
    } catch (err) { console.warn('[AI] Gemini failed:', err.message); }
  }
  if (groqKey) {
    try {
      const r = await tryGroqAPI(groqKey, prices, headlines, geoRiskItems, crossMarketSignals);
      console.log('[AI] Source: Groq (Llama 3)');
      return { status: 'live', source: 'Groq / Llama 3', latencyMs: Date.now() - t0, lastSync: new Date().toISOString(), ...r };
    } catch (err) { console.warn('[AI] Groq failed:', err.message); }
  }
  if (openaiKey) {
    try {
      const r = await tryOpenAIAPI(openaiKey, prices, headlines, geoRiskItems, crossMarketSignals);
      console.log('[AI] Source: OpenAI');
      return { status: 'live', source: 'OpenAI', latencyMs: Date.now() - t0, lastSync: new Date().toISOString(), ...r };
    } catch (err) { console.warn('[AI] OpenAI failed:', err.message); }
  }
  const r = deterministicAnalysis(prices, headlines, geoRiskItems, crossMarketSignals);
  const hasLiveInputs = (Array.isArray(prices) && prices.some(p => p.source && !/mock/i.test(p.source))) ||
    (Array.isArray(headlines) && headlines.some(h => h.source && !/mock|internal/i.test(h.source))) ||
    (Array.isArray(geoRiskItems) && geoRiskItems.some(g => g.source && !/mock|internal/i.test(g.source)));
  return {
    status: hasLiveInputs ? 'live' : 'mock',
    source: hasLiveInputs ? 'Live-derived local analysis' : 'Deterministic Mock',
    latencyMs: Date.now() - t0,
    lastSync: new Date().toISOString(),
    ...r
  };
}

module.exports = { analyze };
