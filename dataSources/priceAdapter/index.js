'use strict';
/**
 * Price Adapter — EIA, Alpha Vantage, Yahoo Finance, mock fallback.
 * Priority: Alpha Vantage (API key) → Yahoo Finance (no key) → EIA (API key) → mock
 */
const https = require('https');

function httpsGetJSON(urlStr, extraHeaders) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.get({
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      headers: { 'User-Agent': 'GeoEnergyIntelligenceAI/1.0', ...(extraHeaders || {}) },
      timeout: 7000
    }, res => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { reject(new Error('invalid-json')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ─── Mock baseline ────────────────────────────────────────────────────────────
const MOCK_ITEMS = [
  { id:'WTI',      name:'WTI Crude',       price:78.42, unit:'USD/bbl',   currency:'$', change:0.93,  changePercent:1.2,  direction:'up',   source:'Mock' },
  { id:'BRENT',    name:'Brent Crude',      price:82.15, unit:'USD/bbl',   currency:'$', change:0.65,  changePercent:0.8,  direction:'up',   source:'Mock' },
  { id:'NATGAS',   name:'Natural Gas',      price:2.34,  unit:'USD/MMBtu', currency:'$', change:-0.06, changePercent:-2.4, direction:'down', source:'Mock' },
  { id:'DIESEL',   name:'Diesel',           price:124.50,unit:'USc/gal',   currency:'$', change:0,     changePercent:0.0,  direction:'flat', source:'Mock' },
  { id:'GASOLINE', name:'Gasoline',         price:2.58,  unit:'USD/gal',   currency:'$', change:0.01,  changePercent:0.5,  direction:'up',   source:'Mock' },
  { id:'EU_POWER', name:'Power Index (EU)', price:94.20, unit:'EUR/MWh',   currency:'€', change:2.82,  changePercent:3.1,  direction:'up',   source:'Mock' }
];

// ─── Cross-market mock baseline ───────────────────────────────────────────────
const MOCK_CROSS_MARKET = [
  { id:'GOLD',    name:'Gold',    price:2341.20, unit:'USD/oz',    currency:'$', change:18.40, changePercent:0.8,  direction:'up',   signalType:'Safe-Haven',      whyItMatters:'Geopolitical fear / USD stress signal. Rising gold supports energy risk premium.', source:'Mock' },
  { id:'COPPER',  name:'Copper',  price:4.52,    unit:'USD/lb',    currency:'$', change:-0.02, changePercent:-0.4, direction:'down', signalType:'Industrial Demand',whyItMatters:'Global industrial health. Copper weakness signals China / EM demand slowdown.',     source:'Mock' },
  { id:'WHEAT',   name:'Wheat',   price:582.40,  unit:'USc/bu',    currency:'',  change:6.80,  changePercent:1.2,  direction:'up',   signalType:'Food Inflation',   whyItMatters:'Black Sea supply risk. Food inflation feeds broad CPI and energy demand pressure.',source:'Mock' },
  { id:'URANIUM', name:'Uranium', price:86.40,   unit:'USD/lb',    currency:'$', change:1.80,  changePercent:2.1,  direction:'up',   signalType:'Nuclear Security', whyItMatters:'Nuclear power renaissance. Energy security re-rating driving long-term demand.',  source:'Mock' },
  { id:'LITHIUM', name:'Lithium', price:42.80,   unit:'USD/share', currency:'$', change:-0.78, changePercent:-1.8, direction:'down', signalType:'EV Supply Chain',  whyItMatters:'EV battery demand and clean energy storage. Oversupply currently weighing on price.',source:'Mock' }
];

// ─── Cross-market symbols for Yahoo Finance ───────────────────────────────────
const CROSS_MARKET_SPECS = [
  { sym:'GC=F',  id:'GOLD',    name:'Gold',    unit:'USD/oz',    currency:'$', signalType:'Safe-Haven',       whyItMatters:'Geopolitical fear / USD stress signal.' },
  { sym:'HG=F',  id:'COPPER',  name:'Copper',  unit:'USD/lb',    currency:'$', signalType:'Industrial Demand',whyItMatters:'Global industrial and China demand signal.' },
  { sym:'ZW=F',  id:'WHEAT',   name:'Wheat',   unit:'USc/bu',    currency:'',  signalType:'Food Inflation',   whyItMatters:'Black Sea / Russia supply risk. Food-energy inflation link.' },
  { sym:'URA',   id:'URANIUM', name:'Uranium', unit:'USD/share', currency:'$', signalType:'Nuclear Security', whyItMatters:'Nuclear power renaissance. Long-term energy security.' },
  { sym:'LIT',   id:'LITHIUM', name:'Lithium', unit:'USD/share', currency:'$', signalType:'EV Supply Chain',  whyItMatters:'EV battery demand and clean energy storage signal.' }
];

// ─── Alpha Vantage ────────────────────────────────────────────────────────────
async function tryAlphaVantage(apiKey) {
  const specs = [
    { fn:'WTI',          id:'WTI',    unit:'USD/bbl',   currency:'$' },
    { fn:'BRENT',        id:'BRENT',  unit:'USD/bbl',   currency:'$' },
    { fn:'NATURAL_GAS',  id:'NATGAS', unit:'USD/MMBtu', currency:'$' }
  ];
  const results = await Promise.all(specs.map(async sp => {
    try {
      const data = await httpsGetJSON(
        `https://www.alphavantage.co/query?function=${sp.fn}&interval=daily&apikey=${apiKey}`
      );
      if (data['Information'] || data['Note'] || !Array.isArray(data.data) || !data.data.length) return null;
      const [latest, prev] = data.data;
      const price     = parseFloat(latest.value);
      const prevPrice = prev ? parseFloat(prev.value) : price;
      if (isNaN(price)) return null;
      const change        = price - prevPrice;
      const changePercent = prevPrice ? (change / prevPrice) * 100 : 0;
      const base = MOCK_ITEMS.find(m => m.id === sp.id);
      return {
        id: sp.id, name: base.name, price,
        unit: sp.unit, currency: sp.currency,
        change: +change.toFixed(3),
        changePercent: +changePercent.toFixed(1),
        direction: change > 0.001 ? 'up' : change < -0.001 ? 'down' : 'flat',
        source: 'Alpha Vantage', timestamp: new Date().toISOString()
      };
    } catch { return null; }
  }));
  const valid = results.filter(Boolean);
  if (!valid.length) return null;
  const items = MOCK_ITEMS.map(m => valid.find(v => v.id === m.id) || { ...m, source: 'Partial Mock' });
  return { status: 'live', source: 'Alpha Vantage', items };
}

// ─── Yahoo Finance ────────────────────────────────────────────────────────────
async function fetchYahooSymbol(sp) {
  try {
    const data = await httpsGetJSON(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sp.sym)}?interval=1d&range=2d`
    );
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev  = meta.chartPreviousClose || meta.previousClose || price;
    const change        = price - prev;
    const changePercent = prev ? (change / prev) * 100 : 0;
    return {
      id: sp.id, name: sp.name, price: +price.toFixed(2),
      unit: sp.unit, currency: sp.currency,
      change: +change.toFixed(3),
      changePercent: +changePercent.toFixed(1),
      direction: change > 0.001 ? 'up' : change < -0.001 ? 'down' : 'flat',
      source: 'Yahoo Finance', timestamp: new Date().toISOString(),
      ...(sp.signalType ? { signalType: sp.signalType, whyItMatters: sp.whyItMatters } : {})
    };
  } catch { return null; }
}

async function tryYahooFinance() {
  const energySpecs = [
    { sym:'CL=F', id:'WTI',      name:'WTI Crude',       unit:'USD/bbl',   currency:'$' },
    { sym:'BZ=F', id:'BRENT',    name:'Brent Crude',      unit:'USD/bbl',   currency:'$' },
    { sym:'NG=F', id:'NATGAS',   name:'Natural Gas',      unit:'USD/MMBtu', currency:'$' },
    { sym:'HO=F', id:'DIESEL',   name:'Diesel',           unit:'USc/gal',   currency:'$' },
    { sym:'RB=F', id:'GASOLINE', name:'Gasoline',         unit:'USD/gal',   currency:'$' }
  ];
  const [energyResults, crossResults] = await Promise.all([
    Promise.all(energySpecs.map(fetchYahooSymbol)),
    Promise.all(CROSS_MARKET_SPECS.map(fetchYahooSymbol))
  ]);
  const valid = energyResults.filter(Boolean);
  if (valid.length < 3) return null;
  const euPower = { ...MOCK_ITEMS.find(m => m.id === 'EU_POWER'), source: 'Mock Fallback' };
  const crossValid = crossResults.filter(Boolean);
  const crossMarketSignals = MOCK_CROSS_MARKET.map(m => crossValid.find(v => v.id === m.id) || m);
  return { status: 'live', source: 'Yahoo Finance', items: [...valid, euPower], crossMarketSignals };
}

// ─── EIA ──────────────────────────────────────────────────────────────────────
async function tryEIA(apiKey) {
  try {
    const data = await httpsGetJSON(
      `https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=${apiKey}&frequency=daily&data[0]=value&facets[series][]=RWTC&sort[0][column]=period&sort[0][direction]=desc&length=2`
    );
    const rows = data?.response?.data || [];
    if (!rows.length) return null;
    const price = parseFloat(rows[0]?.value);
    if (isNaN(price)) return null;
    const prev   = rows[1] ? parseFloat(rows[1].value) : price;
    const change = price - prev;
    const items  = MOCK_ITEMS.map(m => m.id === 'WTI' ? {
      ...m, price, source: 'EIA',
      change: +change.toFixed(3),
      changePercent: prev ? +(change / prev * 100).toFixed(1) : 0,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
      timestamp: new Date().toISOString()
    } : { ...m, source: 'Partial Mock' });
    return { status: 'live', source: 'EIA', items };
  } catch { return null; }
}

// ─── Main export ──────────────────────────────────────────────────────────────
async function fetchPrices() {
  const t0  = Date.now();
  const eK  = process.env.EIA_API_KEY;
  const aK  = process.env.ALPHA_VANTAGE_API_KEY;

  // 1. Yahoo Finance — no key needed, covers all energy + cross-market instruments
  const yf = await tryYahooFinance().catch(e => { console.warn('[Price] Yahoo Finance failed:', e.message); return null; });
  if (yf) { console.log('[Price] Source: Yahoo Finance'); return { ...yf, latencyMs: Date.now() - t0, lastSync: new Date().toISOString() }; }

  // 2. Alpha Vantage — API key for crude/gas
  if (aK) {
    const av = await tryAlphaVantage(aK).catch(e => { console.warn('[Price] Alpha Vantage failed:', e.message); return null; });
    if (av) { console.log('[Price] Source: Alpha Vantage'); return { ...av, crossMarketSignals: MOCK_CROSS_MARKET, latencyMs: Date.now() - t0, lastSync: new Date().toISOString() }; }
  }

  // 3. EIA — official US energy data
  if (eK) {
    const r = await tryEIA(eK).catch(e => { console.warn('[Price] EIA failed:', e.message); return null; });
    if (r) { console.log('[Price] Source: EIA'); return { ...r, crossMarketSignals: MOCK_CROSS_MARKET, latencyMs: Date.now() - t0, lastSync: new Date().toISOString() }; }
  }

  // 4. Mock fallback
  console.warn('[Price] All live sources failed — using mock');
  return { status: 'mock', source: 'Internal Mock', items: MOCK_ITEMS, crossMarketSignals: MOCK_CROSS_MARKET, latencyMs: Date.now() - t0, lastSync: new Date().toISOString() };
}

module.exports = { fetchPrices };
