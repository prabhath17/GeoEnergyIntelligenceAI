/**
 * GeoEnergy Intelligence AI — Service Layer
 *
 * All fetch functions with mock fallback.
 * Data source adapters for future live integration.
 * Never expose API keys in frontend — use backend proxy endpoints.
 */

'use strict';

// ─── BASE CONFIG ─────────────────────────────────────────────────────────────
const GEI_CONFIG = {
  apiBase:    '/api',
  useMock:    false,           // always try live backend first; falls back to mock on error
  timeout:    8000,            // ms before fallback triggers
  retries:    2,
  lastUsedFallback: false
};

// ─── ALERT ITEMS ─────────────────────────────────────────────────────────────
const alertItems = [
  {
    id: 'alert-001',
    title: 'WTI Crude jumps +1.2% on supply concerns',
    sector: 'Crude Oil',
    level: 'Critical',
    timestamp: new Date(Date.now() - 14 * 60000).toISOString(),
    isNew: true,
    detail: 'Near-term supply disruption signals from the Persian Gulf are supporting WTI. Risk of further upside if tanker throughput data confirms.'
  },
  {
    id: 'alert-002',
    title: 'Strait of Hormuz risk score increased to 9.2',
    sector: 'Crude Oil',
    level: 'Critical',
    timestamp: new Date(Date.now() - 22 * 60000).toISOString(),
    isNew: true,
    detail: 'Satellite telemetry confirms reduction in tanker throughput. This is the highest risk reading in 6 weeks for the Strait of Hormuz chokepoint.'
  },
  {
    id: 'alert-003',
    title: 'Gulf Coast refinery maintenance reduces diesel output',
    sector: 'Refined Products',
    level: 'High',
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
    isNew: true,
    detail: 'Seasonal maintenance at Gulf Coast refineries is reducing diesel output by an estimated 4%. Crack spreads are widening.'
  },
  {
    id: 'alert-004',
    title: 'EU power volatility elevated — French nuclear output flagged',
    sector: 'Power',
    level: 'High',
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
    isNew: false,
    detail: 'French nuclear fleet running at 78% capacity. Risk of gas-for-power demand spike if output drops further.'
  },
  {
    id: 'alert-005',
    title: 'OPEC+ meeting confirmed for July — production posture uncertain',
    sector: 'Crude Oil',
    level: 'Moderate',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    isNew: false,
    detail: 'Policy shift rhetoric signals possible production increase. This would be a structural change from Q1 price-floor defense stance.'
  }
];

// ─── DATA SOURCE STATUS ───────────────────────────────────────────────────────
const dataSourceStatus = {
  prices:     { status: 'mock', label: 'Mock Data', source: 'Internal Mock', lastSync: new Date().toISOString() },
  news:       { status: 'mock', label: 'Mock Data', source: 'Internal Mock', lastSync: new Date().toISOString() },
  geoRisk:    { status: 'mock', label: 'Mock Data', source: 'Internal Mock', lastSync: new Date().toISOString() },
  aiAnalysis: { status: 'mock', label: 'Mock Data', source: 'GEI-AI-v2.4',   lastSync: new Date().toISOString() },
  satellite:  { status: 'mock', label: 'Simulated', source: 'SAT_ALPHA_47',  lastSync: new Date().toISOString() }
};

// ─── HISTORICAL TRENDS ────────────────────────────────────────────────────────
const historicalTrends = {
  'crude-oil': {
    sector: 'Crude Oil',
    priceHistory: [
      { date:'May 01', wti: 74.2, brent: 78.1 },
      { date:'May 05', wti: 75.8, brent: 79.4 },
      { date:'May 08', wti: 73.1, brent: 77.2 },
      { date:'May 12', wti: 76.4, brent: 80.1 },
      { date:'May 15', wti: 77.9, brent: 81.5 },
      { date:'May 19', wti: 76.2, brent: 80.3 },
      { date:'May 22', wti: 78.0, brent: 82.0 },
      { date:'May 26', wti: 77.5, brent: 81.8 },
      { date:'May 28', wti: 78.42,brent: 82.15}
    ],
    sentimentHistory: [
      { date:'May 01', confidence: 61, sentiment:'Neutral'  },
      { date:'May 08', confidence: 68, sentiment:'Bullish'  },
      { date:'May 15', confidence: 76, sentiment:'Bullish'  },
      { date:'May 22', confidence: 82, sentiment:'Bullish'  },
      { date:'May 28', confidence: 84, sentiment:'Bullish'  }
    ],
    keyEvents: [
      { date:'May 08', event:'Libya field outage confirmed' },
      { date:'May 19', event:'OPEC+ rhetoric shift detected' },
      { date:'May 26', event:'Hormuz tanker throughput drop' }
    ]
  },
  'natural-gas': {
    sector: 'Natural Gas',
    priceHistory: [
      { date:'May 01', natgas: 2.65 }, { date:'May 05', natgas: 2.58 },
      { date:'May 08', natgas: 2.51 }, { date:'May 12', natgas: 2.44 },
      { date:'May 15', natgas: 2.48 }, { date:'May 19', natgas: 2.39 },
      { date:'May 22', natgas: 2.41 }, { date:'May 26', natgas: 2.36 },
      { date:'May 28', natgas: 2.34 }
    ],
    sentimentHistory: [
      { date:'May 01', confidence: 70, sentiment:'Neutral' },
      { date:'May 08', confidence: 66, sentiment:'Bearish' },
      { date:'May 15', confidence: 64, sentiment:'Bearish' },
      { date:'May 22', confidence: 61, sentiment:'Bearish' },
      { date:'May 28', confidence: 62, sentiment:'Bearish' }
    ],
    keyEvents: [
      { date:'May 05', event:'EU storage above 5-yr average confirmed' },
      { date:'May 19', event:'Freeport LNG restart uncertainty flagged' }
    ]
  },
  'refined-products': {
    sector: 'Refined Products',
    priceHistory: [
      { date:'May 01', diesel: 118.2, gasoline: 2.45 },
      { date:'May 05', diesel: 119.8, gasoline: 2.49 },
      { date:'May 08', diesel: 120.5, gasoline: 2.51 },
      { date:'May 12', diesel: 121.3, gasoline: 2.53 },
      { date:'May 15', diesel: 122.0, gasoline: 2.55 },
      { date:'May 19', diesel: 122.8, gasoline: 2.56 },
      { date:'May 22', diesel: 123.5, gasoline: 2.57 },
      { date:'May 26', diesel: 124.1, gasoline: 2.58 },
      { date:'May 28', diesel: 124.5, gasoline: 2.58 }
    ],
    sentimentHistory: [
      { date:'May 01', confidence: 60, sentiment:'Neutral'  },
      { date:'May 08', confidence: 68, sentiment:'Bullish'  },
      { date:'May 15', confidence: 74, sentiment:'Volatile' },
      { date:'May 22', confidence: 77, sentiment:'Volatile' },
      { date:'May 28', confidence: 78, sentiment:'Volatile' }
    ],
    keyEvents: [
      { date:'May 08', event:'Gulf Coast maintenance season begins' },
      { date:'May 19', event:'Red Sea carrier insurance premium spike' }
    ]
  },
  'power': {
    sector: 'Power',
    priceHistory: [
      { date:'May 01', euPower: 88.3 }, { date:'May 05', euPower: 90.1 },
      { date:'May 08', euPower: 89.5 }, { date:'May 12', euPower: 91.2 },
      { date:'May 15', euPower: 92.0 }, { date:'May 19', euPower: 91.8 },
      { date:'May 22', euPower: 93.1 }, { date:'May 26', euPower: 93.8 },
      { date:'May 28', euPower: 94.2 }
    ],
    sentimentHistory: [
      { date:'May 01', confidence: 88, sentiment:'Steady' },
      { date:'May 08', confidence: 89, sentiment:'Steady' },
      { date:'May 15', confidence: 90, sentiment:'Steady' },
      { date:'May 22', confidence: 91, sentiment:'Steady' },
      { date:'May 28', confidence: 91, sentiment:'Steady' }
    ],
    keyEvents: [
      { date:'May 08', event:'French nuclear fleet at 78% capacity' },
      { date:'May 22', event:'UK-France interconnector at nominal limits' }
    ]
  },
  'renewables': {
    sector: 'Renewables',
    priceHistory: [
      { date:'May 01', solarIdx: 88 }, { date:'May 05', solarIdx: 90 },
      { date:'May 08', solarIdx: 91 }, { date:'May 12', solarIdx: 92 },
      { date:'May 15', solarIdx: 93 }, { date:'May 19', solarIdx: 94 },
      { date:'May 22', solarIdx: 95 }, { date:'May 26', solarIdx: 95 },
      { date:'May 28', solarIdx: 95 }
    ],
    sentimentHistory: [
      { date:'May 01', confidence: 88, sentiment:'Expanding' },
      { date:'May 08', confidence: 90, sentiment:'Expanding' },
      { date:'May 15', confidence: 92, sentiment:'Expanding' },
      { date:'May 22', confidence: 94, sentiment:'Expanding' },
      { date:'May 28', confidence: 95, sentiment:'Expanding' }
    ],
    keyEvents: [
      { date:'May 08', event:'Record solar output in Southern Europe' },
      { date:'May 22', event:'Grid congestion nodes flagged in Germany' }
    ]
  },
  'gold': {
    sector: 'Gold',
    priceHistory: [
      { date:'May 01', gold: 2210.4 }, { date:'May 05', gold: 2234.8 },
      { date:'May 08', gold: 2258.1 }, { date:'May 12', gold: 2291.3 },
      { date:'May 15', gold: 2318.6 }, { date:'May 19', gold: 2302.4 },
      { date:'May 22', gold: 2341.8 }, { date:'May 26', gold: 2358.9 },
      { date:'May 28', gold: 2341.2 }
    ],
    sentimentHistory: [
      { date:'May 01', confidence: 72, sentiment:'Bullish' },
      { date:'May 08', confidence: 76, sentiment:'Bullish' },
      { date:'May 15', confidence: 80, sentiment:'Bullish' },
      { date:'May 22', confidence: 84, sentiment:'Bullish' },
      { date:'May 28', confidence: 88, sentiment:'Bullish' }
    ],
    keyEvents: [
      { date:'May 08', event:'Geopolitical risk premium driving safe-haven demand' },
      { date:'May 19', event:'USD weakness accelerating gold bid' },
      { date:'May 26', event:'Gold breaks $2,350 — multi-week high' }
    ]
  },
  'copper': {
    sector: 'Copper',
    priceHistory: [
      { date:'May 01', copper: 4.72 }, { date:'May 05', copper: 4.68 },
      { date:'May 08', copper: 4.61 }, { date:'May 12', copper: 4.58 },
      { date:'May 15', copper: 4.55 }, { date:'May 19', copper: 4.53 },
      { date:'May 22', copper: 4.51 }, { date:'May 26', copper: 4.54 },
      { date:'May 28', copper: 4.52 }
    ],
    sentimentHistory: [
      { date:'May 01', confidence: 68, sentiment:'Neutral' },
      { date:'May 08', confidence: 65, sentiment:'Bearish' },
      { date:'May 15', confidence: 68, sentiment:'Bearish' },
      { date:'May 22', confidence: 72, sentiment:'Neutral' },
      { date:'May 28', confidence: 74, sentiment:'Bearish' }
    ],
    keyEvents: [
      { date:'May 05', event:'China PMI contraction flagged — demand signal weakens' },
      { date:'May 22', event:'LME copper inventory build above 100,000t' }
    ]
  },
  'wheat': {
    sector: 'Wheat',
    priceHistory: [
      { date:'May 01', wheat: 548.2 }, { date:'May 05', wheat: 561.4 },
      { date:'May 08', wheat: 558.1 }, { date:'May 12', wheat: 572.3 },
      { date:'May 15', wheat: 568.8 }, { date:'May 19', wheat: 574.5 },
      { date:'May 22', wheat: 580.1 }, { date:'May 26', wheat: 578.9 },
      { date:'May 28', wheat: 582.4 }
    ],
    sentimentHistory: [
      { date:'May 01', confidence: 62, sentiment:'Neutral' },
      { date:'May 08', confidence: 68, sentiment:'Bullish' },
      { date:'May 15', confidence: 72, sentiment:'Volatile' },
      { date:'May 22', confidence: 75, sentiment:'Volatile' },
      { date:'May 28', confidence: 79, sentiment:'Volatile' }
    ],
    keyEvents: [
      { date:'May 05', event:'Black Sea shipping corridor tightening flagged' },
      { date:'May 15', event:'Ukraine export quota concerns — MENA food inflation risk' },
      { date:'May 26', event:'Wheat breaks 3-month high on supply uncertainty' }
    ]
  },
  'uranium': {
    sector: 'Uranium',
    priceHistory: [
      { date:'May 01', uranium: 78.4 }, { date:'May 05', uranium: 80.1 },
      { date:'May 08', uranium: 82.8 }, { date:'May 12', uranium: 84.5 },
      { date:'May 15', uranium: 86.1 }, { date:'May 19', uranium: 87.3 },
      { date:'May 22', uranium: 88.8 }, { date:'May 26', uranium: 89.6 },
      { date:'May 28', uranium: 86.4 }
    ],
    sentimentHistory: [
      { date:'May 01', confidence: 74, sentiment:'Bullish' },
      { date:'May 08', confidence: 78, sentiment:'Bullish' },
      { date:'May 15', confidence: 80, sentiment:'Bullish' },
      { date:'May 22', confidence: 82, sentiment:'Bullish' },
      { date:'May 28', confidence: 82, sentiment:'Bullish' }
    ],
    keyEvents: [
      { date:'May 08', event:'US utilities accelerate long-term uranium contracting' },
      { date:'May 19', event:'Nuclear renaissance: France announces 6 new reactors' },
      { date:'May 26', event:'Uranium spot breaks $90/lb — 12-year high' }
    ]
  },
  'lithium': {
    sector: 'Lithium',
    priceHistory: [
      { date:'May 01', lithium: 52.4 }, { date:'May 05', lithium: 49.8 },
      { date:'May 08', lithium: 47.1 }, { date:'May 12', lithium: 45.6 },
      { date:'May 15', lithium: 44.2 }, { date:'May 19', lithium: 43.5 },
      { date:'May 22', lithium: 43.1 }, { date:'May 26', lithium: 43.4 },
      { date:'May 28', lithium: 42.8 }
    ],
    sentimentHistory: [
      { date:'May 01', confidence: 72, sentiment:'Bearish' },
      { date:'May 08', confidence: 70, sentiment:'Bearish' },
      { date:'May 15', confidence: 68, sentiment:'Bearish' },
      { date:'May 22', confidence: 67, sentiment:'Bearish' },
      { date:'May 28', confidence: 69, sentiment:'Bearish' }
    ],
    keyEvents: [
      { date:'May 05', event:'Chilean lithium production ramp outpacing demand' },
      { date:'May 19', event:'Albemarle cuts 2026 production guidance — oversupply persists' }
    ]
  }
};

// ─── CORE FETCH UTILITY ───────────────────────────────────────────────────────
async function _apiFetch(endpoint, mockData) {
  if (GEI_CONFIG.useMock) {
    GEI_CONFIG.lastUsedFallback = true;
    return mockData;
  }
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), GEI_CONFIG.timeout);
    const res = await fetch(`${GEI_CONFIG.apiBase}${endpoint}`, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    GEI_CONFIG.lastUsedFallback = false;
    return await res.json();
  } catch (err) {
    console.warn(`[GEI Services] ${endpoint} failed — using mock fallback.`, err.message);
    GEI_CONFIG.useMock = true;
    GEI_CONFIG.lastUsedFallback = true;
    GEIState.set({ dataMode: 'mock' });
    return mockData;
  }
}

// ─── SERVICE FUNCTIONS ────────────────────────────────────────────────────────

async function fetchDashboardSummary() {
  return _apiFetch('/dashboard/summary', {
    marketPulse:           marketPulse,
    topRiskRegion:         geoRiskItems[0],
    topAffectedSector:     sectorScores.find(s => s.sector === marketPulse.mostAffectedSector),
    latestExecutiveBriefing: executiveBriefing
  });
}

async function fetchPrices() {
  return _apiFetch('/prices', { tickerItems });
}

async function fetchSectorScores() {
  return _apiFetch('/sectors', { sectorScores });
}

async function fetchGeoRiskItems() {
  return _apiFetch('/georisk', { geoRiskItems });
}

async function fetchLiveFeed() {
  return _apiFetch('/live-feed', { liveFeedItems });
}

async function fetchHeadlines() {
  return _apiFetch('/headlines', { intelligenceFeed });
}

async function fetchExecutiveBriefing() {
  return _apiFetch('/executive-briefing', { executiveBriefing });
}

async function fetchHistoricalTrends(sectorId) {
  return _apiFetch(`/history/${sectorId}`, { history: historicalTrends[sectorId] || null });
}

async function fetchHighImpactEvents() {
  return _apiFetch('/events/high-impact', {
    events: intelligenceFeed.filter(i => i.impact === 'High Impact')
  });
}

// ─── STATISTICS — INSTRUMENT CONFIGS ─────────────────────────────────────────
const INSTRUMENT_CONFIGS = {
  'crude-oil':        { name:'Crude Oil',          unit:'USD/bbl',   currency:'$',  baseline:78.42,  vol:0.015, sentiment:'Bullish',  confidence:84, type:'energy',        relatedGeo:'Strait of Hormuz'   },
  'natural-gas':      { name:'Natural Gas',         unit:'USD/MMBtu', currency:'$',  baseline:2.34,   vol:0.025, sentiment:'Bearish',  confidence:62, type:'energy',        relatedGeo:'Eastern Europe'     },
  'refined-products': { name:'Refined Products',    unit:'USc/gal',   currency:'',   baseline:124.5,  vol:0.012, sentiment:'Volatile', confidence:78, type:'energy',        relatedGeo:'Gulf Coast'         },
  'power':            { name:'Power (EU)',           unit:'EUR/MWh',   currency:'€',  baseline:94.2,   vol:0.020, sentiment:'Steady',   confidence:91, type:'energy',        relatedGeo:'Europe'             },
  'renewables':       { name:'Renewables Index',    unit:'Index',     currency:'',   baseline:95.0,   vol:0.010, sentiment:'Expanding',confidence:95, type:'energy',        relatedGeo:'Southern Europe'    },
  'gold':             { name:'Gold',                unit:'USD/oz',    currency:'$',  baseline:2341.2, vol:0.008, sentiment:'Bullish',  confidence:88, type:'cross-market',  relatedGeo:'Global'             },
  'copper':           { name:'Copper',              unit:'USD/lb',    currency:'$',  baseline:4.52,   vol:0.015, sentiment:'Bearish',  confidence:74, type:'cross-market',  relatedGeo:'Asia Pacific'       },
  'wheat':            { name:'Wheat',               unit:'USc/bu',    currency:'',   baseline:582.4,  vol:0.018, sentiment:'Volatile', confidence:79, type:'cross-market',  relatedGeo:'Black Sea'          },
  'uranium':          { name:'Uranium',             unit:'USD/lb',    currency:'$',  baseline:86.4,   vol:0.012, sentiment:'Bullish',  confidence:82, type:'cross-market',  relatedGeo:'Kazakhstan'         },
  'lithium':          { name:'Lithium (LIT ETF)',   unit:'USD/share', currency:'$',  baseline:42.8,   vol:0.022, sentiment:'Bearish',  confidence:69, type:'cross-market',  relatedGeo:'South America'      }
};

// ─── STATISTICS DATA GENERATION ──────────────────────────────────────────────
function _statsDateLabels(range) {
  const now = new Date('2026-05-28');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const result = [];
  let points, stepDays;
  switch (range) {
    case '7D':  points = 7;  stepDays = 1;   break;
    case '30D': points = 10; stepDays = 3;   break;
    case '90D': points = 14; stepDays = 7;   break;
    case 'YTD': points = 5;  stepDays = 29;  break;  // Jan→May monthly
    case '1Y':  points = 13; stepDays = 28;  break;  // ~monthly for 12m
    case '5Y':  points = 21; stepDays = 91;  break;  // quarterly for 5y
    default:    points = 10; stepDays = 3;
  }
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * stepDays);
    const m = d.getMonth(), day = d.getDate(), yr = d.getFullYear();
    let label;
    if (range === '7D')       label = `${months[m]} ${day}`;
    else if (range === '30D') label = `${months[m]} ${day}`;
    else if (range === '90D') label = `${months[m]} ${day}`;
    else if (range === 'YTD') label = `${months[m]} '${String(yr).slice(2)}`;
    else if (range === '1Y')  label = `${months[m]} '${String(yr).slice(2)}`;
    else                      label = `${months[m]} '${String(yr).slice(2)}`;
    result.push({ date: label, isoDate: d.toISOString().split('T')[0] });
  }
  return result;
}

function generateStatsMockData(instrumentId, range) {
  const cfg = INSTRUMENT_CONFIGS[instrumentId];
  if (!cfg) return null;

  const dates = _statsDateLabels(range);
  const n = dates.length;

  // Seeded pseudo-random for consistent output per instrument+range
  const seed = instrumentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const prng = (i) => { const x = Math.sin(seed * 9.7 + i * 127.3) * 43758.5; return x - Math.floor(x); };

  // Range multiplier: how far back from current price the start can deviate
  const devFactor = { '7D':0.04,'30D':0.10,'90D':0.18,'YTD':0.22,'1Y':0.30,'5Y':0.55 }[range] || 0.10;
  const startOffset = (prng(0) * 2 - 1) * cfg.baseline * devFactor;
  const startPrice = cfg.baseline + startOffset;
  const dailyVol = cfg.vol * cfg.baseline * Math.sqrt({ '7D':1,'30D':3,'90D':7,'YTD':29,'1Y':28,'5Y':91 }[range] || 3);

  // Generate price series: linear drift from start to current + noise
  const priceSeries = dates.map((d, i) => {
    const t = n > 1 ? i / (n - 1) : 1;
    const trendedPrice = startPrice + (cfg.baseline - startPrice) * t;
    const noise = (prng(i + 5) - 0.5) * dailyVol * 1.2;
    const raw = trendedPrice + noise;
    return { date: d.date, isoDate: d.isoDate, value: parseFloat(Math.max(cfg.baseline * 0.4, raw).toFixed(2)) };
  });
  // Force last point to current actual price
  if (priceSeries.length) priceSeries[priceSeries.length - 1].value = cfg.baseline;

  // Confidence series (fewer points — every 2nd or 3rd)
  const confStep = Math.max(1, Math.floor(n / 6));
  const confidenceSeries = priceSeries
    .filter((_, i) => i % confStep === 0 || i === n - 1)
    .map((p, i, arr) => {
      const baseConf = cfg.confidence;
      const noise = Math.round((prng(i + 20) - 0.5) * 22);
      const conf = Math.max(35, Math.min(99, baseConf + noise));
      const isLast = i === arr.length - 1;
      return { date: p.date, confidence: isLast ? cfg.confidence : conf, sentiment: cfg.sentiment };
    });

  // Sentiment series (same points as confidence)
  const sentimentSeries = confidenceSeries.map(c => ({
    date: c.date, confidence: c.confidence, sentiment: c.sentiment
  }));

  // Key events: use historicalTrends if available, else generate
  const existingHist = typeof historicalTrends !== 'undefined' ? historicalTrends[instrumentId] : null;
  const existingEvents = existingHist?.keyEvents || [];
  const keyEvents = existingEvents.length >= 2 ? existingEvents : [
    { date: priceSeries[Math.max(0, Math.floor(n * 0.15))]?.date || 'Early', event: `${cfg.name} enters new pricing regime — AI signal triggered` },
    { date: priceSeries[Math.floor(n * 0.45)]?.date || 'Mid',   event: `Supply/demand balance shift detected — confidence updated` },
    { date: priceSeries[Math.max(0, Math.floor(n * 0.75))]?.date || 'Later', event: `Geopolitical event in ${cfg.relatedGeo} affects ${cfg.name}` },
    { date: priceSeries[n - 1]?.date || 'Recent', event: `AI confirms ${cfg.sentiment} momentum — ${cfg.confidence}% confidence` }
  ];

  // Summary stats
  const firstPrice = priceSeries[0]?.value || cfg.baseline;
  const periodChange = parseFloat(((cfg.baseline - firstPrice) / firstPrice * 100).toFixed(1));
  const avgConf = Math.round(confidenceSeries.reduce((s, c) => s + c.confidence, 0) / confidenceSeries.length);
  const highestRisk = keyEvents[keyEvents.length - 1]?.event || 'No major events';

  return {
    instrument: instrumentId,
    name: cfg.name,
    type: cfg.type,
    range,
    unit: cfg.unit,
    currency: cfg.currency,
    currentPrice: cfg.baseline,
    priceSeries,
    confidenceSeries,
    sentimentSeries,
    keyEvents,
    summaryStats: {
      currentSentiment: cfg.sentiment,
      currentConfidence: cfg.confidence,
      periodChange,
      highestRiskEvent: highestRisk,
      averageConfidence: avgConf
    }
  };
}

async function fetchStatistics(type, instrument, range) {
  const mock = generateStatsMockData(instrument, range);
  return _apiFetch(`/statistics/${type}/${instrument}?range=${encodeURIComponent(range)}`, { statistics: mock });
}

async function fetchPriceComparison(instrumentId) {
  const data = typeof priceComparison !== 'undefined' ? priceComparison : {};
  return _apiFetch(`/price-comparison/${instrumentId}`, {
    comparison: data[instrumentId] || null,
    history: historicalTrends[instrumentId] || null
  });
}

async function fetchAIReports() {
  return _apiFetch('/intelligence/reports', { reports: intelligenceFeed });
}

async function fetchIntelligenceLiveFeed() {
  return _apiFetch('/intelligence/live-feed', { items: liveFeedItems });
}

async function fetchDataSourceStatus() {
  return _apiFetch('/data-sources/status', { dataSourceStatus });
}

async function fetchAlerts() {
  return { alertItems };
}

// ─── LIVE DASHBOARD FETCH ─────────────────────────────────────────────────────
async function fetchLiveDashboard() {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 24000);
  try {
    const res = await fetch(`${GEI_CONFIG.apiBase}/dashboard/live`, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    applyLiveDashboardData(data);
    const now  = new Date().toISOString();
    GEIState.set({
      isLoading: false,
      lastUpdated: now,
      refreshCount: GEIState.get('refreshCount') + 1,
      dataMode: data.fallbackActive ? 'mock' : 'live',
      dataSourceStatus: data.dataSourceStatus || GEIState.get('dataSourceStatus')
    });
    GEI_CONFIG.useMock = !!data.fallbackActive;
    GEI_CONFIG.lastUsedFallback = !!data.fallbackActive;
    return { usedFallback: data.fallbackActive, mode: data.mode, dataSourceStatus: data.dataSourceStatus };
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
}

function applyLiveDashboardData(data) {
  if (!data) return;
  if (data.marketPulse)       Object.assign(marketPulse,       data.marketPulse);
  if (data.executiveBriefing) Object.assign(executiveBriefing, data.executiveBriefing);
  if (Array.isArray(data.tickerItems)          && data.tickerItems.length)          replaceArrayContents(tickerItems,          data.tickerItems);
  if (Array.isArray(data.sectorScores)         && data.sectorScores.length)         replaceArrayContents(sectorScores,         data.sectorScores);
  if (Array.isArray(data.geoRiskItems)         && data.geoRiskItems.length)         replaceArrayContents(geoRiskItems,         data.geoRiskItems);
  if (Array.isArray(data.liveFeedItems)        && data.liveFeedItems.length)        replaceArrayContents(liveFeedItems,        sanitizeEnergyFeedItems(data.liveFeedItems));
  if (Array.isArray(data.intelligenceFeed)     && data.intelligenceFeed.length)     replaceArrayContents(intelligenceFeed,     sanitizeEnergyFeedItems(data.intelligenceFeed));
  if (Array.isArray(data.crossMarketSignals)   && data.crossMarketSignals.length)   replaceArrayContents(crossMarketSignals,   data.crossMarketSignals);
  if (data.crossMarketSignalSummary) {
    if (typeof crossMarketSignalSummary !== 'undefined') Object.assign(crossMarketSignalSummary, data.crossMarketSignalSummary);
  }
  // Compute time field from timestamp for all feed items
  intelligenceFeed.forEach(i => { if (i.timestamp && !i.time) i.time = formatTimestamp(i.timestamp); else if (i.timestamp) i.time = formatTimestamp(i.timestamp); });
  liveFeedItems.forEach(i => { if (i.timestamp) i.time = formatTimestamp(i.timestamp); });
  marketPulse.lastUpdated = new Date().toISOString();
}

// ─── REFRESH ALL DASHBOARD DATA ───────────────────────────────────────────────
async function refreshDashboardData() {
  GEIState.set({ isLoading: true });
  GEI_CONFIG.lastUsedFallback = GEI_CONFIG.useMock;

  // Live mode: call aggregated backend endpoint
  if (!GEI_CONFIG.useMock) {
    try {
      return await fetchLiveDashboard();
    } catch (err) {
      console.warn('[GEI] Live dashboard failed, falling back to mock:', err.message);
      GEI_CONFIG.useMock = true;
      GEI_CONFIG.lastUsedFallback = true;
      GEIState.set({ dataMode: 'mock' });
      // Signal that fallback triggered
      return { usedFallback: true, liveError: err.message };
    }
  }

  // Mock mode: simulate local data refresh
  try {
    const [summary, prices, sectors, georisk, feed, headlines] = await Promise.all([
      fetchDashboardSummary(),
      fetchPrices(),
      fetchSectorScores(),
      fetchGeoRiskItems(),
      fetchLiveFeed(),
      fetchHeadlines()
    ]);
    applyFetchedDashboardData({ summary, prices, sectors, georisk, feed, headlines });
    GEIState.set({
      isLoading:    false,
      lastUpdated:  new Date().toISOString(),
      refreshCount: GEIState.get('refreshCount') + 1,
      dataSourceStatus: {
        prices: 'mock', news: 'mock', geoRisk: 'mock', aiAnalysis: 'mock',
        lastSyncTime: new Date().toISOString()
      }
    });
    return { summary, prices, sectors, georisk, feed, headlines, usedFallback: true };
  } catch (err) {
    GEIState.set({ isLoading: false });
    console.error('[GEI] Refresh failed:', err);
    return null;
  }
}

function replaceArrayContents(target, next) {
  if (Array.isArray(next)) target.splice(0, target.length, ...next);
}

function isEnergyRelevantHeadlineClient(item) {
  const text = [
    item?.headline,
    item?.title,
    item?.whyItMatters,
    item?.context,
    item?.marketReadThrough
  ].filter(Boolean).join(' ');
  if (/\b(crude bombs?|crude weapons?|group clash|police arrested|arrested|crime|violence|murder|celebrity|sports)\b/i.test(text)) return false;
  const hasEnergyKeyword = /\b(crude oil|oil prices?|brent|wti|opec|barrels?|bbl|refiner(?:y|ies)|oil production|oil supply|oil demand|oil exports?|oil inventories|tanker|petroleum|fuel markets?|diesel|gasoline|natural gas|lng|power grid|electricity|renewables?|solar|wind|nuclear|uranium|lithium|battery|pipeline|sanctions?|hormuz|red sea)\b/i.test(text);
  const hasMarketContext = /\b(price|prices|market|markets|futures?|supply|demand|exports?|inventor(?:y|ies)|production|refinery|shipping|tanker|barrels?|opec|brent|wti|lng|grid|power|sanction|geopolitical|volatility|crack spread|storage|outage|force majeure)\b/i.test(text);
  return hasEnergyKeyword && hasMarketContext;
}

function sanitizeEnergyFeedItems(items) {
  const seen = new Set();
  return (items || []).filter(item => {
    if (!isEnergyRelevantHeadlineClient(item)) return false;
    const key = String(item.headline || item.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applyFetchedDashboardData(payload) {
  const { summary, prices, sectors, georisk, feed, headlines } = payload || {};
  if (summary?.marketPulse) Object.assign(marketPulse, summary.marketPulse);
  if (summary?.latestExecutiveBriefing) Object.assign(executiveBriefing, summary.latestExecutiveBriefing);
  replaceArrayContents(tickerItems, prices?.tickerItems || prices?.items);
  replaceArrayContents(sectorScores, sectors?.sectorScores || sectors?.items);
  replaceArrayContents(geoRiskItems, georisk?.geoRiskItems || georisk?.items || georisk?.geoRisk);
  replaceArrayContents(liveFeedItems, sanitizeEnergyFeedItems(feed?.liveFeedItems || feed?.items));
  replaceArrayContents(intelligenceFeed, sanitizeEnergyFeedItems(headlines?.intelligenceFeed || headlines?.items));
  marketPulse.lastUpdated = new Date().toISOString();
}

// ─── FILTER FUNCTIONS ─────────────────────────────────────────────────────────
function filterLiveFeedByCategory(items, category) {
  if (category === 'All') return items;
  const map = {
    'High Impact':  i => i.impact === 'High Impact',
    'Geo Risk':     i => ['Geo Risk','Sanctions','Shipping Chokepoint','Transit Risk','Maritime Insurance Risk'].includes(i.eventType),
    'Market Move':  i => ['Price Movement','Market Move'].includes(i.eventType),
    'Policy':       i => i.eventType === 'Policy Event' || i.sector === 'Policy',
    'Supply Chain': i => ['Supply Chain','Refinery Outage','Production Disruption','Storage Report'].includes(i.eventType)
  };
  return items.filter(map[category] || (() => true));
}

function filterFeedBySector(items, sector) {
  if (!sector || sector === 'All') return items;
  return items.filter(i => i.sector === sector || (i.relatedSectors && i.relatedSectors.includes(sector)));
}

function filterFeedByImpact(items, impact) {
  if (!impact || impact === 'All') return items;
  return items.filter(i => i.impact === impact);
}

function filterFeedByRegion(items, region) {
  if (!region || region === 'All') return items;
  return items.filter(i =>
    i.region === region ||
    (i.relatedRegions && i.relatedRegions.some(r => r.includes(region)))
  );
}

function filterFeedByTime(items, timeRange) {
  if (!timeRange || timeRange === 'Today') return items;
  const hoursByRange = { '24H': 24, '7D': 24 * 7, '30D': 24 * 30 };
  const hours = hoursByRange[timeRange];
  if (!hours) return items;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return items.filter(i => new Date(i.timestamp || Date.now()).getTime() >= cutoff);
}

function applyAllFilters(items, filters) {
  let result = [...items];
  result = filterFeedBySector(result,       filters.sector);
  result = filterFeedByImpact(result,       filters.impact);
  result = filterFeedByRegion(result,       filters.region);
  result = filterFeedByTime(result,         filters.time);
  result = filterLiveFeedByCategory(result, filters.feedCategory);
  return result;
}

// ─── DATA SOURCE ADAPTERS (stubs for future live integration) ─────────────────
/**
 * All adapters follow the same pattern:
 *   - check if API key / endpoint is available
 *   - fetch + transform to GEI schema
 *   - on failure, return null so caller falls back to mock
 */

const dataSources = {

  // ── News & Headlines ──────────────────────────────────────────────────────
  newsAdapter: {
    name: 'NewsAPI',
    endpoint: '/api/proxy/news',  // backend proxy — never call with key from frontend
    status: 'not_configured',
    async fetch(query = 'energy oil gas') {
      console.info('[NewsAdapter] Stub — configure backend proxy at /api/proxy/news');
      return null; // falls back to mock
    }
  },

  gdeltAdapter: {
    name: 'GDELT',
    endpoint: '/api/proxy/gdelt',
    status: 'not_configured',
    async fetch(theme = 'ENERGY') {
      console.info('[GDELTAdapter] Stub — configure backend proxy at /api/proxy/gdelt');
      return null;
    }
  },

  rssAdapter: {
    name: 'RSS Feeds',
    endpoint: '/api/proxy/rss',
    status: 'not_configured',
    feeds: [
      'https://feeds.reuters.com/reuters/businessNews',
      'https://www.eia.gov/rss/todayinenergy.xml'
    ],
    async fetch() {
      console.info('[RSSAdapter] Stub — configure backend RSS aggregator at /api/proxy/rss');
      return null;
    }
  },

  // ── Market Prices ─────────────────────────────────────────────────────────
  eiaAdapter: {
    name: 'EIA API',
    endpoint: '/api/proxy/eia',
    status: 'not_configured',
    async fetch(seriesId = 'PET.RWTC.D') {
      console.info('[EIAAdapter] Stub — configure EIA API key in backend at /api/proxy/eia');
      return null;
    }
  },

  alphaVantageAdapter: {
    name: 'Alpha Vantage',
    endpoint: '/api/proxy/alphavantage',
    status: 'not_configured',
    async fetch(symbol = 'WTI') {
      console.info('[AlphaVantageAdapter] Stub — configure Alpha Vantage key in backend');
      return null;
    }
  },

  yahooFinanceAdapter: {
    name: 'Yahoo Finance (compatible)',
    endpoint: '/api/proxy/yfinance',
    status: 'not_configured',
    async fetch(symbols = ['CL=F','BZ=F','NG=F']) {
      console.info('[YahooAdapter] Stub — configure Yahoo Finance proxy in backend');
      return null;
    }
  },

  customPriceAdapter: {
    name: 'Custom Price Backend',
    endpoint: '/api/prices/live',
    status: 'not_configured',
    async fetch() {
      try {
        const res = await fetch(this.endpoint, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error('no live price endpoint');
        return await res.json();
      } catch { return null; }
    }
  },

  // ── Geopolitical Risk ─────────────────────────────────────────────────────
  geoRiskAdapter: {
    name: 'GeoRisk Monitor',
    endpoint: '/api/proxy/georisk',
    status: 'not_configured',
    async fetch() {
      console.info('[GeoRiskAdapter] Stub — configure geo-risk backend proxy');
      return null;
    }
  },

  sanctionsAdapter: {
    name: 'Sanctions / News Events',
    endpoint: '/api/proxy/sanctions',
    status: 'not_configured',
    async fetch() {
      console.info('[SanctionsAdapter] Stub');
      return null;
    }
  },

  maritimeAdapter: {
    name: 'Maritime / Shipping Risk',
    endpoint: '/api/proxy/maritime',
    status: 'not_configured',
    async fetch() {
      console.info('[MaritimeAdapter] Stub — integrate Lloyd\'s Intelligence or similar');
      return null;
    }
  },

  // ── Weather & Power Demand ────────────────────────────────────────────────
  weatherAdapter: {
    name: 'Weather API',
    endpoint: '/api/proxy/weather',
    status: 'not_configured',
    async fetch(region = 'EU') {
      console.info('[WeatherAdapter] Stub — configure weather API in backend');
      return null;
    }
  },

  powerDemandAdapter: {
    name: 'Power Demand / Index',
    endpoint: '/api/proxy/power',
    status: 'not_configured',
    async fetch() {
      console.info('[PowerDemandAdapter] Stub');
      return null;
    }
  },

  // ── AI Analysis ───────────────────────────────────────────────────────────
  aiAnalysisAdapter: {
    name: 'GEI AI Analysis Backend',
    endpoint: '/api/ai/analyze',  // NEVER call AI directly with secret key from frontend
    status: 'not_configured',
    async fetch(payload) {
      console.info('[AIAdapter] Stub — AI analysis must be called via backend proxy at /api/ai/analyze');
      return null;
    }
  }
};
